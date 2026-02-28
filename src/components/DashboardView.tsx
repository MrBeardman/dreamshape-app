import { useMemo } from 'react'
import CircularProgress from './CircularProgress'
import type { WorkoutTemplate, WorkoutLog, UserProfile, NutritionLog, Habit, HabitCompletion, DailyTask } from '../types'

interface ExerciseDbEntry {
  name: string
  muscleGroup: string
  equipment: string
}

interface DashboardViewProps {
  templates: WorkoutTemplate[]
  workoutLogs: WorkoutLog[]
  userProfile: UserProfile
  exerciseDatabase: ExerciseDbEntry[]
  nutritionLogs: NutritionLog[]
  habits: Habit[]
  habitCompletions: HabitCompletion[]
  dailyTasks: DailyTask[]
  onStartWorkout: (template: WorkoutTemplate) => void
  onStartEmptyWorkout: () => void
  onEditProfile: () => void
  onViewAllTemplates: () => void
  onNavigateToNutrition: () => void
  onNavigateToHabits: () => void
  onViewHistory: () => void
}

const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core'] as const

export default function DashboardView({
  templates,
  workoutLogs,
  userProfile,
  exerciseDatabase,
  nutritionLogs,
  habits,
  habitCompletions,
  dailyTasks,
  onStartWorkout,
  onStartEmptyWorkout,
  onViewAllTemplates,
  onNavigateToNutrition,
  onNavigateToHabits,
  onViewHistory,
}: DashboardViewProps) {
  const todayStr = new Date().toISOString().split('T')[0]

  const todayNutrition = useMemo(
    () => nutritionLogs.find(l => l.date === todayStr),
    [nutritionLogs, todayStr]
  )
  const nutritionTotals = useMemo(() => {
    const entries = todayNutrition?.entries ?? []
    return {
      calories: Math.round(entries.reduce((s, e) => s + e.calories, 0)),
      protein: Math.round(entries.reduce((s, e) => s + e.protein, 0) * 10) / 10,
      carbs: Math.round(entries.reduce((s, e) => s + e.carbs, 0) * 10) / 10,
      fat: Math.round(entries.reduce((s, e) => s + e.fat, 0) * 10) / 10,
    }
  }, [todayNutrition])

  const totalWorkouts = workoutLogs.length

  const currentStreak = useMemo(() => {
    if (workoutLogs.length === 0) return 0
    const workoutDates = new Set(
      workoutLogs.map(log => {
        const d = new Date(log.date)
        d.setHours(0, 0, 0, 0)
        return d.toDateString()
      })
    )
    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(today.getDate() - i)
      if (workoutDates.has(checkDate.toDateString())) {
        streak++
      } else if (i > 0) {
        const prevDate = new Date(checkDate)
        prevDate.setDate(checkDate.getDate() - 1)
        if (!workoutDates.has(prevDate.toDateString())) break
      } else {
        break
      }
    }
    return streak
  }, [workoutLogs])

  const avgPerWeek = useMemo(() => {
    if (workoutLogs.length === 0) return '0'
    const oldestWorkout = new Date(workoutLogs[workoutLogs.length - 1].date)
    const weeksDiff = Math.max(
      1,
      Math.floor((Date.now() - oldestWorkout.getTime()) / (7 * 24 * 60 * 60 * 1000))
    )
    return (workoutLogs.length / weeksDiff).toFixed(1)
  }, [workoutLogs])

  const muscleGroupCoverage = useMemo(() => {
    const exToGroup: Record<string, string> = {}
    exerciseDatabase.forEach(ex => { exToGroup[ex.name] = ex.muscleGroup })

    const lastTrained: Record<string, number> = {}
    workoutLogs.forEach(workout => {
      const t = new Date(workout.date).getTime()
      workout.exercises.forEach(ex => {
        const g = exToGroup[ex.exerciseName]
        if (g && (MUSCLE_GROUPS as readonly string[]).includes(g)) {
          if (!lastTrained[g] || t > lastTrained[g]) lastTrained[g] = t
        }
      })
    })

    const now = Date.now()
    return MUSCLE_GROUPS.map(group => {
      const last = lastTrained[group]
      const daysSince = last !== undefined ? Math.floor((now - last) / 86400000) : null
      const status = daysSince === null ? 'never' : daysSince <= 2 ? 'good' : daysSince <= 5 ? 'ok' : 'due'
      return { group, daysSince, status }
    })
  }, [workoutLogs, exerciseDatabase])

  // Habits widget data
  const todayCompletedHabitIds = useMemo(
    () => new Set(habitCompletions.filter(c => c.date === todayStr).map(c => c.habitId)),
    [habitCompletions, todayStr]
  )
  const habitsCompleted = habits.filter(h => todayCompletedHabitIds.has(h.id)).length
  const habitsTotal = habits.length
  const todayTasks = dailyTasks.filter(t => t.date === todayStr)
  const tasksRemaining = todayTasks.filter(t => !t.completed).length

  return (
    <div className="dashboard-view">
      {/* Profile Header */}
      <div className="dashboard-header">
        <div className="profile-section">
          <div className="profile-avatar">
            {userProfile.name.charAt(0).toUpperCase()}
          </div>
          <div className="profile-info">
            <h2 className="profile-name">{userProfile.name}</h2>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="widget-card">
          <CircularProgress
            value={totalWorkouts}
            max={313}
            size={80}
            strokeWidth={6}
            color="#3b82f6"
            label="Workouts"
            subtitle="Total"
            displayMode="value"
          />
        </div>

        <div className="widget-card">
          <CircularProgress
            value={currentStreak}
            max={365}
            size={80}
            strokeWidth={6}
            color="#f59e0b"
            label="Day Streak"
            subtitle="Current"
            displayMode="value"
          />
        </div>

        <div className="widget-card">
          <CircularProgress
            value={Number(avgPerWeek)}
            max={5}
            size={80}
            strokeWidth={6}
            color="#10b981"
            label="Per Week"
            subtitle="Average"
            displayMode="value"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <button className="btn-action-primary" onClick={onStartEmptyWorkout}>
          <span>Start Empty Workout</span>
        </button>
      </div>

      {/* Habits & Tasks Widget */}
      <div className="home-habits-widget" onClick={onNavigateToHabits}>
        <div className="home-habits-top">
          <span className="home-habits-label">Habits &amp; Tasks</span>
          <span className="home-habits-arrow">→</span>
        </div>
        {habitsTotal === 0 && todayTasks.length === 0 ? (
          <p className="home-habits-empty">Track your daily habits and tasks</p>
        ) : (
          <div className="home-habits-stats">
            {habitsTotal > 0 && (
              <div className="home-habits-stat">
                <span className="home-habits-stat-val">{habitsCompleted}/{habitsTotal}</span>
                <span className="home-habits-stat-label">Habits done</span>
              </div>
            )}
            {todayTasks.length > 0 && (
              <div className="home-habits-stat">
                <span className="home-habits-stat-val">{tasksRemaining}</span>
                <span className="home-habits-stat-label">Tasks left</span>
              </div>
            )}
          </div>
        )}
        {habitsTotal > 0 && (
          <div className="home-habits-bar-row">
            <div className="home-habits-bar-track">
              <div
                className="home-habits-bar-fill"
                style={{ width: `${habitsTotal > 0 ? (habitsCompleted / habitsTotal) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Templates Horizontal Scroll */}
      {templates.length > 0 && (
        <div className="templates-section">
          <div className="section-header">
            <h3 className="section-title">Your Templates</h3>
            <button className="btn-see-all" onClick={onViewAllTemplates}>
              See All →
            </button>
          </div>

          <div className="templates-scroll">
            {templates.map(template => {
              const logs = workoutLogs.filter(w => w.templateName === template.name && w.duration > 60)
              const avgMin = logs.length > 0
                ? Math.round(logs.reduce((s, w) => s + w.duration, 0) / logs.length / 60)
                : null
              return (
                <div
                  key={template.id}
                  className="template-card-mini"
                  onClick={() => onStartWorkout(template)}
                >
                  <div className="template-card-name">{template.name}</div>
                  <div className="template-card-exercises">
                    {template.exercises.length} exercises{avgMin !== null && ` · ~${avgMin} min`}
                  </div>
                  <button className="btn-start-template">START →</button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Muscle Group Coverage */}
      {workoutLogs.length > 0 && (
        <div className="muscle-coverage-section">
          <h3 className="section-title">Muscle Coverage</h3>
          <div className="muscle-coverage-grid">
            {muscleGroupCoverage.map(({ group, daysSince, status }) => (
              <div key={group} className={`muscle-tile muscle-tile--${status}`}>
                <span className="muscle-tile-dot" />
                <span className="muscle-tile-name">{group}</span>
                <span className="muscle-tile-days">
                  {daysSince === null ? 'Never' : daysSince === 0 ? 'Today' : `${daysSince}d ago`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nutrition Widget */}
      <div className="dashboard-nutrition-widget" onClick={onNavigateToNutrition}>
        <div className="dashboard-nutrition-top">
          <span className="dashboard-nutrition-label">Today's Nutrition</span>
          <span className="dashboard-nutrition-arrow">→</span>
        </div>
        {userProfile.nutritionGoals ? (
          <>
            <div className="dashboard-cal-row">
              <span className="dashboard-cal-val">{nutritionTotals.calories}</span>
              <span className="dashboard-cal-unit">kcal</span>
              <span className="dashboard-cal-goal">/ {userProfile.nutritionGoals.calories}</span>
            </div>
            <div className="dashboard-macro-mini-bars">
              {[
                { label: 'Protein', val: nutritionTotals.protein, goal: userProfile.nutritionGoals.protein, color: '#4ade80' },
                { label: 'Carbs', val: nutritionTotals.carbs, goal: userProfile.nutritionGoals.carbs, color: '#60a5fa' },
                { label: 'Fat', val: nutritionTotals.fat, goal: userProfile.nutritionGoals.fat, color: '#f97316' },
              ].map(({ label, val, goal, color }) => (
                <div key={label} className="dashboard-macro-mini-row">
                  <span className="dashboard-macro-mini-label">{label}</span>
                  <div className="dashboard-macro-mini-track">
                    <div
                      className="dashboard-macro-mini-fill"
                      style={{ width: `${Math.min(val / goal * 100, 100)}%`, background: color }}
                    />
                  </div>
                  <span className="dashboard-macro-mini-val">{val}g</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="dashboard-nutrition-no-goals">
            Set nutrition goals in Profile to track your macros
          </p>
        )}
      </div>

      {/* Workout History link */}
      <button className="home-history-link" onClick={onViewHistory}>
        <span className="home-history-link-text">Workout History</span>
        <span className="home-history-link-arrow">→</span>
      </button>
    </div>
  )
}
