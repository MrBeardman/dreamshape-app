import { useMemo, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import CircularProgress from './CircularProgress'
import type { WorkoutTemplate, WorkoutLog, UserProfile } from '../types'

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
  onStartWorkout: (template: WorkoutTemplate) => void
  onStartEmptyWorkout: () => void
  onEditProfile: () => void
  onViewAllTemplates: () => void
}

const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core'] as const

export default function DashboardView({
  templates,
  workoutLogs,
  userProfile,
  exerciseDatabase,
  onStartWorkout,
  onStartEmptyWorkout,
  //onEditProfile, - not used currently
  onViewAllTemplates,
}: DashboardViewProps) {
  
  const totalWorkouts = workoutLogs.length

  const currentStreak = useMemo(() => {
    if (workoutLogs.length === 0) return 0
    // Build a Set of workout date strings for O(1) lookup instead of O(n) .some()
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
        // Allow 1-day rest gap: check if the day before also has no workout
        const prevDate = new Date(checkDate)
        prevDate.setDate(checkDate.getDate() - 1)
        if (!workoutDates.has(prevDate.toDateString())) break
      } else {
        break
      }
    }
    return streak
  }, [workoutLogs])

  const bestPRs = useMemo(() => {
    const exercisePRs: Record<string, number> = {}
    workoutLogs.forEach(workout => {
      workout.exercises.forEach(exercise => {
        exercise.sets.forEach(set => {
          const current = exercisePRs[exercise.exerciseName] || 0
          if (set.weight > current) exercisePRs[exercise.exerciseName] = set.weight
        })
      })
    })
    return Object.entries(exercisePRs).sort((a, b) => b[1] - a[1]).slice(0, 3)
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

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [chartPeriod, setChartPeriod] = useState<'week' | 'month' | 'year'>('month')

  const volumeData = useMemo(() => {
    const calcVolume = (workouts: typeof workoutLogs) =>
      workouts.reduce(
        (sum, wo) => sum + wo.exercises.reduce(
          (es, ex) => es + ex.sets.reduce((ss, s) => ss + s.weight * s.reps, 0), 0
        ), 0
      )

    if (chartPeriod === 'week') {
      // 7 days — daily totals
      return Array.from({ length: 7 }, (_, i) => {
        const day = new Date()
        day.setDate(day.getDate() - (6 - i))
        day.setHours(0, 0, 0, 0)
        const nextDay = new Date(day)
        nextDay.setDate(day.getDate() + 1)
        const dayWorkouts = workoutLogs.filter(w => {
          const d = new Date(w.date)
          return d >= day && d < nextDay
        })
        return {
          week: day.toLocaleDateString('en-US', { weekday: 'short' }),
          volume: Math.round(calcVolume(dayWorkouts) / 1000),
        }
      })
    }

    if (chartPeriod === 'year') {
      // 12 months — monthly totals
      return Array.from({ length: 12 }, (_, i) => {
        const monthStart = new Date()
        monthStart.setDate(1)
        monthStart.setMonth(monthStart.getMonth() - (11 - i))
        monthStart.setHours(0, 0, 0, 0)
        const monthEnd = new Date(monthStart)
        monthEnd.setMonth(monthStart.getMonth() + 1)
        const monthWorkouts = workoutLogs.filter(w => {
          const d = new Date(w.date)
          return d >= monthStart && d < monthEnd
        })
        const isJan = monthStart.getMonth() === 0
        const yr = monthStart.getFullYear().toString().slice(2)
        const label = isJan
          ? `Jan '${yr}`
          : monthStart.toLocaleDateString('en-US', { month: 'short' })
        return { week: label, volume: Math.round(calcVolume(monthWorkouts) / 1000) }
      })
    }

    // month (default) — 8 weeks, "Feb W2" labels
    return Array.from({ length: 8 }, (_, i) => {
      const offset = 7 - i
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - (offset * 7 + 7))
      weekStart.setHours(0, 0, 0, 0)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 7)
      const weekWorkouts = workoutLogs.filter(w => {
        const d = new Date(w.date)
        return d >= weekStart && d < weekEnd
      })
      const monthName = weekStart.toLocaleDateString('en-US', { month: 'short' })
      const weekNum = Math.ceil(weekStart.getDate() / 7)
      return {
        week: `${monthName} W${weekNum}`,
        volume: Math.round(calcVolume(weekWorkouts) / 1000),
      }
    })
  }, [workoutLogs, chartPeriod])

  const [calPeriod, setCalPeriod] = useState<'week' | 'month' | 'year'>('month')

  // Enriched calendar data — each day knows its workout (if any) and whether it's today
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

  // Month calendar — current month days, padded to Mon-based week rows
  const monthCalendarData = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTime = today.getTime()
    const year = today.getFullYear()
    const month = today.getMonth()
    const firstDay = new Date(year, month, 1)
    let startDow = firstDay.getDay() - 1 // Mon=0 ... Sun=6
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
            max={313} // 365 days - 52 weeks × 2 rest days = 261 workout days target
            size={80}
            strokeWidth={6}
            color="#3b82f6"
            label="Workouts"
            subtitle="Total"
            displayMode="value" // Show actual number
          />
        </div>
        
        <div className="widget-card">
          <CircularProgress
            value={currentStreak}
            max={365} // Full year streak as max goal
            size={80}
            strokeWidth={6}
            color="#f59e0b"
            label="Day Streak"
            subtitle="Current"
            displayMode="value" // Show actual days
          />
        </div>
        
        <div className="widget-card">
          <CircularProgress
            value={Number(avgPerWeek)}
            max={5} // 5 workouts per week (realistic sustainable goal)
            size={80}
            strokeWidth={6}
            color="#10b981"
            label="Per Week"
            subtitle="Average"
            displayMode="value" // Show actual number
          />
        </div>
      </div>

      {/* Best PRs */}
      {bestPRs.length > 0 && (
        <div className="prs-section">
          <h3 className="section-title">Best PRs</h3>
          <div className="prs-list">
            {bestPRs.map(([exercise, weight], idx) => (
              <div key={exercise} className="pr-item">
                <span className="pr-rank">#{idx + 1}</span>
                <span className="pr-exercise">{exercise}</span>
                <span className="pr-weight">{weight} kg</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions">
        <button className="btn-action-primary" onClick={onStartEmptyWorkout}>
          <span>Start Empty Workout</span>
        </button>
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

      {/* Charts Section */}
      <div className="charts-section">
        <h3 className="section-title">Progress</h3>

        {/* Workout Calendar */}
        <div className="chart-card">
          <div className="chart-header-row">
            <div>
              <h4 className="chart-title">Workout Calendar</h4>
              <p className="chart-subtitle">
                {calPeriod === 'week' && 'This week — tap a workout to see details'}
                {calPeriod === 'month' && `${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
                {calPeriod === 'year' && 'Last 12 weeks — tap a workout to see details'}
              </p>
            </div>
            <div className="chart-period-toggle">
              {(['week', 'month', 'year'] as const).map(p => (
                <button
                  key={p}
                  className={`period-btn${calPeriod === p ? ' active' : ''}`}
                  onClick={() => { setCalPeriod(p); setSelectedDate(null) }}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Year view — 12-week heatmap */}
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
                      className={[
                        'heatmap-day',
                        day.workout ? 'active' : '',
                        day.isToday ? 'today' : '',
                        selectedDate === day.date ? 'selected' : '',
                      ].filter(Boolean).join(' ')}
                      title={day.date}
                      onClick={() => {
                        if (day.workout) setSelectedDate(selectedDate === day.date ? null : day.date)
                      }}
                    />
                  ))}
                </div>
                <div className="calendar-x-axis">
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = new Date()
                    date.setDate(date.getDate() - (11 - i) * 7)
                    return (
                      <div key={i} className="calendar-x-label">
                        {date.toLocaleDateString('en-US', { month: 'short' }).substring(0, 3)}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Week view — 7 large day cells */}
          {calPeriod === 'week' && (
            <div className="week-cal-row">
              {calendarData.slice(-7).map((day) => {
                const d = new Date(day.date + 'T12:00:00')
                const isSelected = selectedDate === day.date
                return (
                  <div
                    key={day.date}
                    className={[
                      'week-cal-cell',
                      day.workout ? 'active' : '',
                      day.isToday ? 'today' : '',
                      isSelected ? 'selected' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => {
                      if (day.workout) setSelectedDate(isSelected ? null : day.date)
                    }}
                  >
                    <span className="week-cal-day">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    <span className="week-cal-num">{d.getDate()}</span>
                    {day.workout && <span className="week-cal-dot" />}
                  </div>
                )
              })}
            </div>
          )}

          {/* Month view — standard Mon-based calendar grid */}
          {calPeriod === 'month' && (
            <div>
              <div className="month-cal-header">
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className="month-cal-grid">
                {monthCalendarData.map((cell, i) =>
                  cell ? (
                    <div
                      key={cell.date}
                      className={[
                        'month-cal-cell',
                        cell.workout ? 'active' : '',
                        cell.isToday ? 'today' : '',
                        selectedDate === cell.date ? 'selected' : '',
                      ].filter(Boolean).join(' ')}
                      onClick={() => {
                        if (cell.workout) setSelectedDate(selectedDate === cell.date ? null : cell.date)
                      }}
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

          {/* Day detail — shared across all views */}
          {selectedDate && (() => {
            const w = workoutLogs.find(log => {
              const logDate = new Date(log.date)
              logDate.setHours(0, 0, 0, 0)
              return logDate.toISOString().split('T')[0] === selectedDate
            })
            if (!w) return null
            const totalVolume = w.exercises.reduce(
              (sum, ex) => sum + ex.sets.reduce((s, set) => s + set.weight * set.reps, 0), 0
            )
            const dur = Math.floor(w.duration / 60)
            return (
              <div className="calendar-day-detail">
                <div className="day-detail-header">
                  <span className="day-detail-date">
                    {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric'
                    })}
                  </span>
                  <button className="day-detail-close" onClick={() => setSelectedDate(null)}>×</button>
                </div>
                <div className="day-detail-name">{w.templateName}</div>
                <div className="day-detail-meta">
                  <span>{dur} min</span>
                  <span>{(totalVolume / 1000).toFixed(1)}t volume</span>
                  <span>{w.exercises.length} exercises</span>
                </div>
                <div className="day-detail-exercises">
                  {w.exercises.slice(0, 5).map(ex => (
                    <span key={ex.exerciseId} className="day-detail-exercise-tag">{ex.exerciseName}</span>
                  ))}
                  {w.exercises.length > 5 && (
                    <span className="day-detail-exercise-tag muted">+{w.exercises.length - 5} more</span>
                  )}
                </div>
              </div>
            )
          })()}
        </div>

        {/* Volume Trend */}
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
                <button
                  key={p}
                  className={`period-btn${chartPeriod === p ? ' active' : ''}`}
                  onClick={() => setChartPeriod(p)}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart
              data={volumeData}
              margin={{ bottom: chartPeriod === 'month' ? 24 : 0, left: 0, right: 4 }}
            >
              <XAxis
                dataKey="week"
                stroke="#555555"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={chartPeriod === 'month' ? -40 : 0}
                textAnchor={chartPeriod === 'month' ? 'end' : 'middle'}
                height={chartPeriod === 'month' ? 48 : 20}
              />
              <YAxis stroke="#555555" fontSize={11} tickLine={false} axisLine={false} width={28} />
              <Tooltip
                contentStyle={{
                  background: '#1a1a1a',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '13px'
                }}
                cursor={{ stroke: 'rgba(255,255,255,0.08)' }}
              />
              <Area
                type="monotone"
                dataKey="volume"
                stroke="#22c55e"
                fill="#22c55e"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}