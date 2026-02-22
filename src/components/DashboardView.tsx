import { useMemo } from 'react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
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
    const sortedLogs = [...workoutLogs].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(today.getDate() - i)
      const hasActivity = sortedLogs.some(log => {
        const logDate = new Date(log.date)
        logDate.setHours(0, 0, 0, 0)
        return logDate.getTime() === checkDate.getTime()
      })
      if (hasActivity) {
        streak++
      } else if (i > 0) {
        const prevDate = new Date(checkDate)
        prevDate.setDate(checkDate.getDate() - 1)
        const hasPrevActivity = sortedLogs.some(log => {
          const logDate = new Date(log.date)
          logDate.setHours(0, 0, 0, 0)
          return logDate.getTime() === prevDate.getTime()
        })
        if (!hasPrevActivity) break
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

  const frequencyData = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const offset = 7 - i
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - (offset * 7 + 7))
      weekStart.setHours(0, 0, 0, 0)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 7)
      const count = workoutLogs.filter(w => {
        const d = new Date(w.date)
        return d >= weekStart && d < weekEnd
      }).length
      return { week: offset === 0 ? 'This' : `-${offset}`, workouts: count }
    })
  }, [workoutLogs])

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
      return { week: offset === 0 ? 'This' : `-${offset}`, volume: Math.round(totalVolume / 1000) }
    })
  }, [workoutLogs])

  const heatmapData = useMemo(() => {
    const today = new Date()
    return Array.from({ length: 84 }, (_, i) => {
      const date = new Date(today)
      date.setDate(today.getDate() - (83 - i))
      date.setHours(0, 0, 0, 0)
      const hasActivity = workoutLogs.some(log => {
        const logDate = new Date(log.date)
        logDate.setHours(0, 0, 0, 0)
        return logDate.getTime() === date.getTime()
      })
      return { date: date.toISOString().split('T')[0], count: hasActivity ? 1 : 0 }
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
        
        {/* Workout Frequency */}
        <div className="chart-card">
          <h4 className="chart-title">Workout Frequency</h4>
          <p className="chart-subtitle">Last 8 weeks</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={frequencyData}>
              <XAxis dataKey="week" stroke="#555555" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#555555" fontSize={12} tickLine={false} axisLine={false} width={24} />
              <Tooltip
                contentStyle={{
                  background: '#1a1a1a',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '13px'
                }}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              />
              <Bar dataKey="workouts" fill="#f5c518" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Volume Trend */}
        <div className="chart-card">
          <h4 className="chart-title">Volume Trend</h4>
          <p className="chart-subtitle">Total volume (tons) per week</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={volumeData}>
              <XAxis dataKey="week" stroke="#555555" fontSize={12} tickLine={false} axisLine={false} />
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

        {/* Consistency Heatmap */}
        <div className="chart-card">
          <h4 className="chart-title">Consistency Calendar</h4>
          <p className="chart-subtitle">Last 12 weeks</p>
          
          <div className="calendar-wrapper">
            {/* Y-axis (days of week) */}
            <div className="calendar-y-axis">
              <div className="calendar-y-label">Mon</div>
              <div className="calendar-y-label"></div>
              <div className="calendar-y-label">Wed</div>
              <div className="calendar-y-label"></div>
              <div className="calendar-y-label">Fri</div>
              <div className="calendar-y-label"></div>
              <div className="calendar-y-label">Sun</div>
            </div>

            <div className="calendar-main">
              {/* Grid */}
              <div className="heatmap-grid">
                {heatmapData.map((day, idx) => (
                  <div
                    key={idx}
                    className={`heatmap-day ${day.count > 0 ? 'active' : ''}`}
                    title={day.date}
                  />
                ))}
              </div>

              {/* X-axis (months) */}
              <div className="calendar-x-axis">
                {(() => {
                  const labels = []
                  const today = new Date()
                  
                  for (let i = 0; i < 12; i++) {
                    const date = new Date(today)
                    date.setDate(today.getDate() - (11 - i) * 7)
                    
                    labels.push(
                      <div key={i} className="calendar-x-label">
                        {date.toLocaleDateString('en-US', { month: 'short' }).substring(0, 3)}
                      </div>
                    )
                  }
                  
                  return labels
                })()}
              </div>
            </div>
          </div>

          <div className="heatmap-legend">
            <span>Less</span>
            <div className="heatmap-day"></div>
            <div className="heatmap-day active"></div>
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  )
}