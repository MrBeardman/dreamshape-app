import { useMemo, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import CircularProgress from './CircularProgress'
import type { WorkoutTemplate, WorkoutLog, UserProfile } from '../types'

interface DashboardViewProps {
  templates: WorkoutTemplate[]
  workoutLogs: WorkoutLog[]
  userProfile: UserProfile
  onStartWorkout: (template: WorkoutTemplate) => void
  onStartEmptyWorkout: () => void
  onEditProfile: () => void
  onViewAllTemplates: () => void
}

export default function DashboardView({
  templates,
  workoutLogs,
  userProfile,
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

  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const volumeData = useMemo(() => {
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
      const totalVolume = weekWorkouts.reduce(
        (sum, wo) =>
          sum +
          wo.exercises.reduce(
            (es, ex) => es + ex.sets.reduce((ss, s) => ss + s.weight * s.reps, 0),
            0
          ),
        0
      )
      const label = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      return { week: label, volume: Math.round(totalVolume / 1000) }
    })
  }, [workoutLogs])

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
            {templates.map(template => (
              <div 
                key={template.id} 
                className="template-card-mini"
                onClick={() => onStartWorkout(template)}
              >
                <div className="template-card-name">{template.name}</div>
                <div className="template-card-exercises">
                  {template.exercises.length} exercises
                </div>
                <button className="btn-start-template">START →</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="charts-section">
        <h3 className="section-title">Progress</h3>

        {/* Workout Calendar — replaces Frequency chart + old Heatmap */}
        <div className="chart-card">
          <h4 className="chart-title">Workout Calendar</h4>
          <p className="chart-subtitle">Last 12 weeks — tap a day to see details</p>

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
                      if (day.workout) {
                        setSelectedDate(selectedDate === day.date ? null : day.date)
                      }
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

          {/* Selected day detail */}
          {selectedDate && (() => {
            const day = calendarData.find(d => d.date === selectedDate)
            if (!day?.workout) return null
            const w = day.workout
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
          <h4 className="chart-title">Volume Trend</h4>
          <p className="chart-subtitle">Total volume (tons) per week</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={volumeData}>
              <XAxis dataKey="week" stroke="#555555" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#555555" fontSize={12} tickLine={false} axisLine={false} width={24} />
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