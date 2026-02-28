import { useState } from 'react'
import CircularProgress from './CircularProgress'
import ConfirmDialog from './ConfirmDialog'
import { useConfirm } from '../hooks/useConfirm'
import type { UserProfile, WorkoutLog, NutritionGoals } from '../types'

interface ProfileViewProps {
  userProfile: UserProfile
  workoutLogs: WorkoutLog[]
  onUpdateProfile: (profile: UserProfile) => void
  onSignOut: () => void
}

export default function ProfileView({
  userProfile,
  workoutLogs,
  onUpdateProfile,
  onSignOut,
}: ProfileViewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(userProfile.name)
  const [isEditingGoals, setIsEditingGoals] = useState(false)
  const [goalCalories, setGoalCalories] = useState(String(userProfile.nutritionGoals?.calories ?? 2000))
  const [goalProtein, setGoalProtein] = useState(String(userProfile.nutritionGoals?.protein ?? 150))
  const [goalCarbs, setGoalCarbs] = useState(String(userProfile.nutritionGoals?.carbs ?? 250))
  const [goalFat, setGoalFat] = useState(String(userProfile.nutritionGoals?.fat ?? 70))
  const [goalSugar, setGoalSugar] = useState(String(userProfile.nutritionGoals?.sugar ?? 50))
  const { confirm: showConfirm, confirmDialogProps } = useConfirm()

  const handleSaveGoals = () => {
    const goals: NutritionGoals = {
      calories: Number(goalCalories) || 2000,
      protein: Number(goalProtein) || 150,
      carbs: Number(goalCarbs) || 250,
      fat: Number(goalFat) || 70,
      sugar: Number(goalSugar) || 50,
    }
    onUpdateProfile({ ...userProfile, nutritionGoals: goals })
    setIsEditingGoals(false)
  }

  const handleSave = () => {
    onUpdateProfile({ ...userProfile, name })
    setIsEditing(false)
  }

  const getTotalVolume = () => {
    return workoutLogs.reduce((total, workout) => {
      return total + workout.exercises.reduce((exSum, exercise) => {
        return exSum + exercise.sets.reduce((setSum, set) => {
          return setSum + (set.weight * set.reps)
        }, 0)
      }, 0)
    }, 0)
  }

  const getTotalDuration = () => {
    const totalSeconds = workoutLogs.reduce((sum, w) => sum + w.duration, 0)
    const hours = Math.floor(totalSeconds / 3600)
    return hours
  }

  const getWeeklyGoalProgress = () => {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)

    const thisWeekWorkouts = workoutLogs.filter(w => {
      const workoutDate = new Date(w.date)
      return workoutDate >= weekStart
    }).length

    const goal = 4 // 4 workouts per week goal
    return Math.min((thisWeekWorkouts / goal) * 100, 100)
  }

  const getRecentPRs = () => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const historicalMax: Record<string, number> = {}
    const recentMax: Record<string, number> = {}
    const recentDate: Record<string, string> = {}

    workoutLogs.forEach(workout => {
      const workoutDate = new Date(workout.date)
      const isRecent = workoutDate >= thirtyDaysAgo
      workout.exercises.forEach(exercise => {
        exercise.sets.forEach(set => {
          if (set.weight > 0) {
            if (isRecent) {
              if ((recentMax[exercise.exerciseName] ?? 0) < set.weight) {
                recentMax[exercise.exerciseName] = set.weight
                recentDate[exercise.exerciseName] = workout.date
              }
            } else {
              historicalMax[exercise.exerciseName] = Math.max(historicalMax[exercise.exerciseName] ?? 0, set.weight)
            }
          }
        })
      })
    })

    return Object.entries(recentMax)
      .filter(([name, weight]) => weight > (historicalMax[name] ?? 0))
      .map(([name, weight]) => ({
        name,
        weight,
        delta: weight - (historicalMax[name] ?? 0),
        isNew: !historicalMax[name],
        date: recentDate[name],
      }))
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 5)
  }

  const getStrengthTrend = () => {
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    const exerciseCounts: Record<string, number> = {}
    workoutLogs.forEach(w => w.exercises.forEach(e => {
      exerciseCounts[e.exerciseName] = (exerciseCounts[e.exerciseName] ?? 0) + 1
    }))

    const top3 = Object.entries(exerciseCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name)

    return top3.map(name => {
      const thisMonthMax = workoutLogs
        .filter(w => new Date(w.date) >= thisMonthStart)
        .flatMap(w => w.exercises.filter(e => e.exerciseName === name))
        .flatMap(e => e.sets)
        .reduce((max, s) => Math.max(max, s.weight), 0)

      const lastMonthMax = workoutLogs
        .filter(w => { const d = new Date(w.date); return d >= lastMonthStart && d < thisMonthStart })
        .flatMap(w => w.exercises.filter(e => e.exerciseName === name))
        .flatMap(e => e.sets)
        .reduce((max, s) => Math.max(max, s.weight), 0)

      return { name, thisMonth: thisMonthMax, lastMonth: lastMonthMax }
    }).filter(t => t.thisMonth > 0 || t.lastMonth > 0)
  }

  const getVolumeWeekDelta = () => {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - 7)
    weekStart.setHours(0, 0, 0, 0)
    const prevWeekStart = new Date(weekStart)
    prevWeekStart.setDate(weekStart.getDate() - 7)

    const calcVol = (logs: typeof workoutLogs) =>
      logs.reduce((sum, w) =>
        sum + w.exercises.reduce((es, e) =>
          es + e.sets.reduce((ss, s) => ss + s.weight * s.reps, 0), 0), 0)

    const thisWeek = calcVol(workoutLogs.filter(w => new Date(w.date) >= weekStart))
    const lastWeek = calcVol(workoutLogs.filter(w => { const d = new Date(w.date); return d >= prevWeekStart && d < weekStart }))
    return { thisWeek, lastWeek }
  }

  const getMostFrequentExercise = () => {
    const exerciseCounts: Record<string, number> = {}

    workoutLogs.forEach(workout => {
      workout.exercises.forEach(exercise => {
        exerciseCounts[exercise.exerciseName] = (exerciseCounts[exercise.exerciseName] || 0) + 1
      })
    })

    const sorted = Object.entries(exerciseCounts).sort((a, b) => b[1] - a[1])
    return sorted[0] ? sorted[0][0] : 'None'
  }

  const totalVolume = getTotalVolume()
  const totalHours = getTotalDuration()
  const favoriteExercise = getMostFrequentExercise()
  const weeklyProgress = getWeeklyGoalProgress()
  const recentPRs = getRecentPRs()
  const strengthTrend = getStrengthTrend()
  const volumeDelta = getVolumeWeekDelta()

  return (
    <>
    <div className="profile-view">
      {/* Header */}
      <div className="profile-header">
        <h2 className="view-title">Profile</h2>
      </div>

      {/* User Info Card */}
      <div
        className="profile-user-card"
        onClick={() => !isEditing && setIsEditing(true)}
        style={{ cursor: isEditing ? 'default' : 'pointer' }}
      >
        <div className="profile-avatar-large">
          {userProfile.name.charAt(0).toUpperCase()}
        </div>

        {isEditing ? (
          <div className="profile-edit-form" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoFocus
            />
            <div className="profile-edit-actions">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setName(userProfile.name)
                  setIsEditing(false)
                }}
              >
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="profile-user-info">
            <div className="profile-name-container">
              <h1 className="profile-name">{userProfile.name}</h1>
              {userProfile.role === 'creator' && (
                <span className="creator-badge" title="App Creator">
                  👑
                </span>
              )}
              {userProfile.role === 'tester' && (
                <span className="tester-badge" title="Beta Tester">
                  🧪
                </span>
              )}
            </div>
            <p className="profile-member-since">
              {userProfile.role === 'creator' && 'Creator'}
              {userProfile.role === 'tester' && 'Beta Tester'}
              {(!userProfile.role || userProfile.role === 'member') && 'Member'}
              {' '}since {new Date(userProfile.memberSince).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>
        )}
      </div>

      {/* Goals */}
      <div className="profile-section">
        <h3 className="section-title">Goals</h3>

        {/* Weekly goal + volume delta */}
        <div className="goals-top-row">
          <div className="widget-card goals-weekly-card">
            <CircularProgress
              value={weeklyProgress}
              max={100}
              size={72}
              strokeWidth={6}
              color="#fbbf24"
              label="This Week"
              subtitle={`${Math.round(weeklyProgress / 25)} / 4 workouts`}
              displayMode="percentage"
            />
          </div>
          <div className="goals-volume-card">
            <div className="goals-volume-label">Volume this week</div>
            <div className="goals-volume-value">{(volumeDelta.thisWeek / 1000).toFixed(1)}t</div>
            {volumeDelta.lastWeek > 0 && (
              <div className={`goals-volume-delta ${volumeDelta.thisWeek >= volumeDelta.lastWeek ? 'positive' : 'negative'}`}>
                {volumeDelta.thisWeek >= volumeDelta.lastWeek ? '↑' : '↓'}
                {Math.abs(Math.round(((volumeDelta.thisWeek - volumeDelta.lastWeek) / volumeDelta.lastWeek) * 100))}% vs last week
              </div>
            )}
            {volumeDelta.lastWeek === 0 && volumeDelta.thisWeek > 0 && (
              <div className="goals-volume-delta positive">First data this week</div>
            )}
          </div>
        </div>

        {/* Recent PRs */}
        {recentPRs.length > 0 && (
          <div className="goals-card">
            <div className="goals-card-title">Recent PRs <span className="goals-card-subtitle">last 30 days</span></div>
            {recentPRs.map(pr => (
              <div key={pr.name} className="goals-pr-row">
                <span className="goals-pr-name">{pr.name}</span>
                <span className="goals-pr-value">
                  {pr.weight} kg
                  {pr.isNew
                    ? <span className="goals-pr-badge new">New</span>
                    : <span className="goals-pr-badge">+{pr.delta} kg</span>
                  }
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Strength trend */}
        {strengthTrend.length > 0 && (
          <div className="goals-card">
            <div className="goals-card-title">Strength Trend <span className="goals-card-subtitle">this vs last month</span></div>
            {strengthTrend.map(t => {
              const delta = t.thisMonth - t.lastMonth
              const pct = t.lastMonth > 0 ? Math.round((delta / t.lastMonth) * 100) : null
              return (
                <div key={t.name} className="goals-trend-row">
                  <span className="goals-trend-name">{t.name}</span>
                  <div className="goals-trend-right">
                    {t.lastMonth > 0 && <span className="goals-trend-prev">{t.lastMonth} kg →</span>}
                    <span className="goals-trend-curr">{t.thisMonth > 0 ? `${t.thisMonth} kg` : '—'}</span>
                    {pct !== null && delta !== 0 && (
                      <span className={`goals-trend-pct ${delta > 0 ? 'positive' : 'negative'}`}>
                        {delta > 0 ? '+' : ''}{pct}%
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {recentPRs.length === 0 && strengthTrend.length === 0 && (
          <p className="goals-empty">Complete more workouts to see your progress here.</p>
        )}
      </div>

      {/* Nutrition Goals */}
      <div className="profile-section">
        <div className="section-header-row">
          <h3 className="section-title">Nutrition Goals</h3>
          {!isEditingGoals && (
            <button className="btn-edit-section" onClick={() => setIsEditingGoals(true)}>
              {userProfile.nutritionGoals ? 'Edit' : 'Set Goals'}
            </button>
          )}
        </div>

        {isEditingGoals ? (
          <div className="nutrition-goals-form">
            {[
              { label: 'Daily Calories', value: goalCalories, setter: setGoalCalories, unit: 'kcal' },
              { label: 'Protein', value: goalProtein, setter: setGoalProtein, unit: 'g' },
              { label: 'Carbohydrates', value: goalCarbs, setter: setGoalCarbs, unit: 'g' },
              { label: 'Fat', value: goalFat, setter: setGoalFat, unit: 'g' },
              { label: 'Sugar', value: goalSugar, setter: setGoalSugar, unit: 'g' },
            ].map(({ label, value, setter, unit }) => (
              <div key={label} className="nutrition-goal-row">
                <label className="nutrition-goal-label">{label}</label>
                <div className="nutrition-goal-input-wrap">
                  <input
                    type="number"
                    className="input nutrition-goal-input"
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    inputMode="numeric"
                  />
                  <span className="nutrition-goal-unit">{unit}</span>
                </div>
              </div>
            ))}
            <div className="nutrition-goals-actions">
              <button className="btn btn-secondary" onClick={() => setIsEditingGoals(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveGoals}>Save Goals</button>
            </div>
          </div>
        ) : userProfile.nutritionGoals ? (
          <div className="nutrition-goals-display">
            {[
              { label: 'Calories', value: userProfile.nutritionGoals.calories, unit: 'kcal' },
              { label: 'Protein', value: userProfile.nutritionGoals.protein, unit: 'g' },
              { label: 'Carbs', value: userProfile.nutritionGoals.carbs, unit: 'g' },
              { label: 'Fat', value: userProfile.nutritionGoals.fat, unit: 'g' },
              { label: 'Sugar', value: userProfile.nutritionGoals.sugar, unit: 'g' },
            ].map(({ label, value, unit }) => (
              <div key={label} className="stat-item">
                <div className="stat-item-label">{label}</div>
                <div className="stat-item-value">{value} {unit}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="goals-empty">Set your daily nutrition targets to track calories and macros.</p>
        )}
      </div>

      {/* Stats Grid */}
      <div className="profile-section">
        <h3 className="section-title">Lifetime Stats</h3>

        <div className="stats-list">
          <div className="stat-item">
            <div className="stat-item-label">Total Workouts</div>
            <div className="stat-item-value">{workoutLogs.length}</div>
          </div>

          <div className="stat-item">
            <div className="stat-item-label">Total Volume</div>
            <div className="stat-item-value">{(totalVolume / 1000).toFixed(1)} tons</div>
          </div>

          <div className="stat-item">
            <div className="stat-item-label">Time Spent</div>
            <div className="stat-item-value">{totalHours} hours</div>
          </div>

          <div className="stat-item">
            <div className="stat-item-label">Favorite Exercise</div>
            <div className="stat-item-value">{favoriteExercise}</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="profile-section">
        <h3 className="section-title">Data & Settings</h3>

        <div className="action-list">
          <button
            className="action-item"
            onClick={async () => {
              if (await showConfirm({ title: 'Export Data', message: 'Your workouts and profile will be downloaded as a JSON file.', confirmLabel: 'Export' })) {
                const data = {
                  workouts: workoutLogs,
                  profile: userProfile,
                  exportedAt: new Date().toISOString()
                }
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `dreamshape-backup-${new Date().toISOString().split('T')[0]}.json`
                a.click()
                URL.revokeObjectURL(url)
              }
            }}
          >
            <span>Export Data</span>
            <span className="action-arrow">→</span>
          </button>

          <button className="action-item action-item-danger" onClick={onSignOut}>
            <span>Sign Out</span>
            <span className="action-arrow">→</span>
          </button>
        </div>
      </div>
    </div>
    {confirmDialogProps && <ConfirmDialog {...confirmDialogProps} />}
    </>
  )
}
