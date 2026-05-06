import { useState, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import CircularProgress from './CircularProgress'
import ConfirmDialog from './ConfirmDialog'
import { useConfirm } from '../hooks/useConfirm'
import type { UserProfile, WorkoutLog, WeightEntry, TrainingPlan } from '../types'
import { getPlanStreak } from './PlanSection'

interface ProfileViewProps {
  userProfile: UserProfile
  workoutLogs: WorkoutLog[]
  weightEntries: WeightEntry[]
  activePlan: TrainingPlan | null
  onUpdateProfile: (profile: UserProfile) => void
  onSignOut: () => void
}

export default function ProfileView({
  userProfile,
  workoutLogs,
  weightEntries,
  activePlan,
  onUpdateProfile,
  onSignOut,
}: ProfileViewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(userProfile.name)
  const { confirm: showConfirm, confirmDialogProps } = useConfirm()

  const handleSave = () => {
    onUpdateProfile({ ...userProfile, name })
    setIsEditing(false)
  }

  // ─── Workout helpers ──────────────────────────────────────────────────────────

  const getTotalVolume = () =>
    workoutLogs.reduce((total, workout) =>
      total + workout.exercises.reduce((exSum, exercise) =>
        exSum + exercise.sets.reduce((setSum, set) => setSum + set.weight * set.reps, 0), 0), 0)

  const getTotalDuration = () =>
    Math.floor(workoutLogs.reduce((sum, w) => sum + w.duration, 0) / 3600)

  const getWeeklyGoalProgress = () => {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const thisWeekWorkouts = workoutLogs.filter(w => new Date(w.date) >= weekStart).length
    const goal = 4
    return { count: thisWeekWorkouts, goal, pct: Math.min((thisWeekWorkouts / goal) * 100, 100) }
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
    const top3 = Object.entries(exerciseCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name]) => name)
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
    return {
      thisWeek: calcVol(workoutLogs.filter(w => new Date(w.date) >= weekStart)),
      lastWeek: calcVol(workoutLogs.filter(w => { const d = new Date(w.date); return d >= prevWeekStart && d < weekStart })),
    }
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

  // ─── Weight helpers ───────────────────────────────────────────────────────────

  const sortedWeightEntries = useMemo(() =>
    [...weightEntries].sort((a, b) => a.date.localeCompare(b.date)), [weightEntries])

  const latestWeight = sortedWeightEntries[sortedWeightEntries.length - 1]
  const firstWeight = sortedWeightEntries[0]

  const weightSparkline = useMemo(() => {
    const entries = sortedWeightEntries.slice(-10)
    if (entries.length < 2) return null
    const values = entries.map(e => e.weight)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const svgW = 120
    const svgH = 40
    const range = max - min || 1
    const points = entries.map((e, i) => {
      const x = (i / (entries.length - 1)) * svgW
      const y = svgH - ((e.weight - min) / range) * (svgH - 6) - 3
      return `${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ')
    return points
  }, [sortedWeightEntries])

  // ─── Chart state ──────────────────────────────────────────────────────────────

  const [chartPeriod, setChartPeriod] = useState<'week' | 'month' | 'year'>('month')
  const [calPeriod, setCalPeriod] = useState<'week' | 'month' | 'year'>('month')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const volumeData = useMemo(() => {
    const calcVolume = (wos: typeof workoutLogs) =>
      wos.reduce((sum, wo) => sum + wo.exercises.reduce((es, ex) => es + ex.sets.reduce((ss, s) => ss + s.weight * s.reps, 0), 0), 0)

    if (chartPeriod === 'week') {
      return Array.from({ length: 7 }, (_, i) => {
        const day = new Date()
        day.setDate(day.getDate() - (6 - i))
        day.setHours(0, 0, 0, 0)
        const nextDay = new Date(day)
        nextDay.setDate(day.getDate() + 1)
        const dayWorkouts = workoutLogs.filter(w => { const d = new Date(w.date); return d >= day && d < nextDay })
        return { week: day.toLocaleDateString('en-US', { weekday: 'short' }), volume: Math.round(calcVolume(dayWorkouts) / 1000) }
      })
    }

    if (chartPeriod === 'year') {
      return Array.from({ length: 12 }, (_, i) => {
        const monthStart = new Date()
        monthStart.setDate(1)
        monthStart.setMonth(monthStart.getMonth() - (11 - i))
        monthStart.setHours(0, 0, 0, 0)
        const monthEnd = new Date(monthStart)
        monthEnd.setMonth(monthStart.getMonth() + 1)
        const monthWorkouts = workoutLogs.filter(w => { const d = new Date(w.date); return d >= monthStart && d < monthEnd })
        const isJan = monthStart.getMonth() === 0
        const yr = monthStart.getFullYear().toString().slice(2)
        const label = isJan ? `Jan '${yr}` : monthStart.toLocaleDateString('en-US', { month: 'short' })
        return { week: label, volume: Math.round(calcVolume(monthWorkouts) / 1000) }
      })
    }

    return Array.from({ length: 8 }, (_, i) => {
      const offset = 7 - i
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - (offset * 7 + 7))
      weekStart.setHours(0, 0, 0, 0)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 7)
      const weekWorkouts = workoutLogs.filter(w => { const d = new Date(w.date); return d >= weekStart && d < weekEnd })
      const monthName = weekStart.toLocaleDateString('en-US', { month: 'short' })
      const weekNum = Math.ceil(weekStart.getDate() / 7)
      return { week: `${monthName} W${weekNum}`, volume: Math.round(calcVolume(weekWorkouts) / 1000) }
    })
  }, [workoutLogs, chartPeriod])

  const calendarData = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTime = today.getTime()
    return Array.from({ length: 84 }, (_, i) => {
      const date = new Date(today)
      date.setDate(today.getDate() - (83 - i))
      date.setHours(0, 0, 0, 0)
      const dateStr = date.toISOString().split('T')[0]
      const workout = workoutLogs.find(log => {
        const logDate = new Date(log.date)
        logDate.setHours(0, 0, 0, 0)
        return logDate.getTime() === date.getTime()
      }) ?? null
      return { date: dateStr, workout, isToday: date.getTime() === todayTime }
    })
  }, [workoutLogs])

  const monthCalendarData = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTime = today.getTime()
    const year = today.getFullYear()
    const month = today.getMonth()
    const firstDay = new Date(year, month, 1)
    let startDow = firstDay.getDay() - 1
    if (startDow < 0) startDow = 6
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    type Cell = { date: string; dayNum: number; workout: WorkoutLog | null; isToday: boolean } | null
    const cells: Cell[] = []
    for (let i = 0; i < startDow; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d)
      date.setHours(0, 0, 0, 0)
      const dateStr = date.toISOString().split('T')[0]
      const workout = workoutLogs.find(log => {
        const logDate = new Date(log.date)
        logDate.setHours(0, 0, 0, 0)
        return logDate.getTime() === date.getTime()
      }) ?? null
      cells.push({ date: dateStr, dayNum: d, workout, isToday: date.getTime() === todayTime })
    }
    return cells
  }, [workoutLogs])

  const totalVolume = getTotalVolume()
  const totalHours = getTotalDuration()
  const favoriteExercise = getMostFrequentExercise()
  const weeklyGoal = getWeeklyGoalProgress()
  const recentPRs = getRecentPRs()
  const strengthTrend = getStrengthTrend()
  const volumeDelta = getVolumeWeekDelta()

  return (
    <>
    <div className="profile-view">
      <div className="profile-header">
        <h2 className="view-title">Profile</h2>
      </div>

      {/* User Info Card */}
      <div
        className="profile-user-card"
        onClick={() => !isEditing && setIsEditing(true)}
        style={{ cursor: isEditing ? 'default' : 'pointer' }}
      >
        <div className="profile-avatar-large">{userProfile.name.charAt(0).toUpperCase()}</div>

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
              <button className="btn btn-secondary" onClick={() => { setName(userProfile.name); setIsEditing(false) }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>Save</button>
            </div>
          </div>
        ) : (
          <div className="profile-user-info">
            <div className="profile-name-container">
              <h1 className="profile-name">{userProfile.name}</h1>
              {userProfile.role === 'creator' && <span className="creator-badge" title="App Creator">👑</span>}
              {userProfile.role === 'tester' && <span className="tester-badge" title="Beta Tester">🧪</span>}
            </div>
            <p className="profile-member-since">
              {userProfile.role === 'creator' && 'Creator'}
              {userProfile.role === 'tester' && 'Beta Tester'}
              {(!userProfile.role || userProfile.role === 'member') && 'Member'}
              {' '}since {new Date(userProfile.memberSince).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        )}
      </div>

      {/* Today — weekly goal ring */}
      <div className="profile-section">
        <h3 className="section-title">This Week</h3>
        <div className="goals-rings-row">
          <div className="goals-ring-cell">
            <CircularProgress
              value={weeklyGoal.pct}
              max={100}
              size={72}
              strokeWidth={6}
              color="#fbbf24"
              label="Workouts"
              subtitle={`${weeklyGoal.count} / 4 this wk`}
              displayMode="percentage"
            />
          </div>
        </div>
        <div className="goals-volume-mini">
          Volume this week: <strong>{(volumeDelta.thisWeek / 1000).toFixed(1)}t</strong>
          {volumeDelta.lastWeek > 0 && (
            <span className={`goals-volume-mini-delta ${volumeDelta.thisWeek >= volumeDelta.lastWeek ? 'positive' : 'negative'}`}>
              {' '}{volumeDelta.thisWeek >= volumeDelta.lastWeek ? '↑' : '↓'}
              {Math.abs(Math.round(((volumeDelta.thisWeek - volumeDelta.lastWeek) / volumeDelta.lastWeek) * 100))}% vs last wk
            </span>
          )}
        </div>
      </div>

      {/* Plan streak */}
      {activePlan && (() => {
        const streak = getPlanStreak(activePlan.checkIns)
        const total = activePlan.checkIns.length
        const completed = activePlan.checkIns.filter(c => c.completed).length
        return (
          <div className="plan-streak-profile">
            <div className="plan-streak-profile-top">
              <span className="plan-streak-profile-name">{activePlan.name}</span>
              <span className="plan-streak-profile-streak">
                {streak > 0 ? `🔥 ${streak} day streak` : 'No current streak'}
              </span>
            </div>
            {total > 0 && (
              <div className="plan-history-dots">
                {[...activePlan.checkIns]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .slice(0, 20)
                  .reverse()
                  .map(ci => (
                    <div
                      key={ci.id}
                      className={`plan-history-dot ${ci.completed ? 'done' : 'skipped'}`}
                      title={`${ci.date}: ${ci.completed ? '✓' : '✗'}`}
                    />
                  ))}
              </div>
            )}
            <div className="plan-streak-stats">
              <span>{completed} completed</span>
              <span>·</span>
              <span>{total - completed} skipped</span>
              <span>·</span>
              <span>{total > 0 ? Math.round((completed / total) * 100) : 0}% adherence</span>
            </div>
          </div>
        )
      })()}

      {/* Gym Progress */}
      <div className="profile-section">
        <h3 className="section-title">Gym Progress</h3>
        {recentPRs.length > 0 && (
          <div className="goals-card">
            <div className="goals-card-title">Recent PRs <span className="goals-card-subtitle">last 30 days</span></div>
            {recentPRs.map(pr => (
              <div key={pr.name} className="goals-pr-row">
                <span className="goals-pr-name">{pr.name}</span>
                <span className="goals-pr-value">
                  {pr.weight} kg
                  {pr.isNew ? <span className="goals-pr-badge new">New</span> : <span className="goals-pr-badge">+{pr.delta} kg</span>}
                </span>
              </div>
            ))}
          </div>
        )}
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

      {/* Progress charts */}
      <div className="profile-section">
        <h3 className="section-title">Progress</h3>

        <div className="chart-card">
          <div className="chart-header-row">
            <div>
              <h4 className="chart-title">Workout Calendar</h4>
              <p className="chart-subtitle">
                {calPeriod === 'week' && 'This week'}
                {calPeriod === 'month' && `${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
                {calPeriod === 'year' && 'Last 12 weeks'}
              </p>
            </div>
            <div className="chart-period-toggle">
              {(['week', 'month', 'year'] as const).map(p => (
                <button key={p} className={`period-btn${calPeriod === p ? ' active' : ''}`} onClick={() => { setCalPeriod(p); setSelectedDate(null) }}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {calPeriod === 'year' && (
            <div className="calendar-wrapper">
              <div className="calendar-y-axis">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                  <div key={d} className="calendar-y-label">{d}</div>
                ))}
              </div>
              <div className="calendar-main">
                <div className="heatmap-grid">
                  {calendarData.map((day) => (
                    <div
                      key={day.date}
                      className={['heatmap-day', day.workout ? 'active' : '', day.isToday ? 'today' : '', selectedDate === day.date ? 'selected' : ''].filter(Boolean).join(' ')}
                      onClick={() => { if (day.workout) setSelectedDate(selectedDate === day.date ? null : day.date) }}
                    />
                  ))}
                </div>
                <div className="calendar-x-axis">
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = new Date()
                    date.setDate(date.getDate() - (11 - i) * 7)
                    return <div key={i} className="calendar-x-label">{date.toLocaleDateString('en-US', { month: 'short' }).substring(0, 3)}</div>
                  })}
                </div>
              </div>
            </div>
          )}

          {calPeriod === 'week' && (
            <div className="week-cal-row">
              {calendarData.slice(-7).map((day) => {
                const d = new Date(day.date + 'T12:00:00')
                const isSelected = selectedDate === day.date
                return (
                  <div
                    key={day.date}
                    className={['week-cal-cell', day.workout ? 'active' : '', day.isToday ? 'today' : '', isSelected ? 'selected' : ''].filter(Boolean).join(' ')}
                    onClick={() => { if (day.workout) setSelectedDate(isSelected ? null : day.date) }}
                  >
                    <span className="week-cal-day">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    <span className="week-cal-num">{d.getDate()}</span>
                    {day.workout && <span className="week-cal-dot" />}
                  </div>
                )
              })}
            </div>
          )}

          {calPeriod === 'month' && (
            <div>
              <div className="month-cal-header">
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => <span key={d}>{d}</span>)}
              </div>
              <div className="month-cal-grid">
                {monthCalendarData.map((cell, i) =>
                  cell ? (
                    <div
                      key={cell.date}
                      className={['month-cal-cell', cell.workout ? 'active' : '', cell.isToday ? 'today' : '', selectedDate === cell.date ? 'selected' : ''].filter(Boolean).join(' ')}
                      onClick={() => { if (cell.workout) setSelectedDate(selectedDate === cell.date ? null : cell.date) }}
                    >
                      {cell.dayNum}
                    </div>
                  ) : (
                    <div key={`pad-${i}`} className="month-cal-cell empty" />
                  )
                )}
              </div>
            </div>
          )}

          {selectedDate && (() => {
            const w = workoutLogs.find(log => {
              const logDate = new Date(log.date)
              logDate.setHours(0, 0, 0, 0)
              return logDate.toISOString().split('T')[0] === selectedDate
            })
            if (!w) return null
            const vol = w.exercises.reduce((sum, ex) => sum + ex.sets.reduce((s, set) => s + set.weight * set.reps, 0), 0)
            const dur = Math.floor(w.duration / 60)
            return (
              <div className="calendar-day-detail">
                <div className="day-detail-header">
                  <span className="day-detail-date">
                    {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <button className="day-detail-close" onClick={() => setSelectedDate(null)}>×</button>
                </div>
                <div className="day-detail-name">{w.templateName}</div>
                <div className="day-detail-meta">
                  <span>{dur} min</span>
                  <span>{(vol / 1000).toFixed(1)}t volume</span>
                  <span>{w.exercises.length} exercises</span>
                </div>
                <div className="day-detail-exercises">
                  {w.exercises.slice(0, 5).map(ex => (
                    <span key={ex.exerciseId} className="day-detail-exercise-tag">{ex.exerciseName}</span>
                  ))}
                  {w.exercises.length > 5 && <span className="day-detail-exercise-tag muted">+{w.exercises.length - 5} more</span>}
                </div>
              </div>
            )
          })()}
        </div>

        <div className="chart-card">
          <div className="chart-header-row">
            <div>
              <h4 className="chart-title">Volume Trend</h4>
              <p className="chart-subtitle">
                {chartPeriod === 'week' && 'Daily volume — this week (tons)'}
                {chartPeriod === 'month' && 'Weekly totals — last 8 weeks (tons)'}
                {chartPeriod === 'year' && 'Monthly totals — last 12 months (tons)'}
              </p>
            </div>
            <div className="chart-period-toggle">
              {(['week', 'month', 'year'] as const).map(p => (
                <button key={p} className={`period-btn${chartPeriod === p ? ' active' : ''}`} onClick={() => setChartPeriod(p)}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={volumeData} margin={{ bottom: chartPeriod === 'month' ? 24 : 0, left: 0, right: 4 }}>
              <XAxis dataKey="week" stroke="#555555" fontSize={10} tickLine={false} axisLine={false} interval={0}
                angle={chartPeriod === 'month' ? -40 : 0} textAnchor={chartPeriod === 'month' ? 'end' : 'middle'}
                height={chartPeriod === 'month' ? 48 : 20} />
              <YAxis stroke="#555555" fontSize={11} tickLine={false} axisLine={false} width={28} />
              <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#ffffff', fontSize: '13px' }} cursor={{ stroke: 'rgba(255,255,255,0.08)' }} />
              <Area type="monotone" dataKey="volume" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Body Weight */}
      {weightEntries.length > 0 && latestWeight && firstWeight && (
        <div className="profile-section">
          <h3 className="section-title">Body Weight</h3>
          <div className="weight-profile-card">
            <div className="weight-profile-top">
              <div className="weight-profile-latest">
                <span className="weight-profile-value">{latestWeight.weight} kg</span>
                <span className="weight-profile-date">
                  {new Date(latestWeight.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              {firstWeight.date !== latestWeight.date && (
                <div className={`weight-profile-delta ${latestWeight.weight <= firstWeight.weight ? 'negative' : 'positive'}`}>
                  {latestWeight.weight <= firstWeight.weight ? '−' : '+'}{Math.abs(latestWeight.weight - firstWeight.weight).toFixed(1)} kg
                  {' '}since {new Date(firstWeight.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              )}
            </div>
            {weightSparkline && (
              <svg className="weight-sparkline-svg" viewBox="0 0 120 40" preserveAspectRatio="none">
                <polyline points={weightSparkline} fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Lifetime Stats */}
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

      {/* Data & Settings */}
      <div className="profile-section">
        <h3 className="section-title">Data & Settings</h3>
        <div className="action-list">
          <button
            className="action-item"
            onClick={async () => {
              if (await showConfirm({ title: 'Export Data', message: 'Your workouts and profile will be downloaded as a JSON file.', confirmLabel: 'Export' })) {
                const data = { workouts: workoutLogs, profile: userProfile, exportedAt: new Date().toISOString() }
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
