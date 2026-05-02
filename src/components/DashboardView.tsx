import { useMemo } from 'react'
import CircularProgress from './CircularProgress'
import type { WorkoutTemplate, WorkoutLog, UserProfile, RunLog } from '../types'

interface ExerciseDbEntry {
  name: string
  muscleGroup: string
  equipment: string
}

interface DashboardViewProps {
  templates: WorkoutTemplate[]
  workoutLogs: WorkoutLog[]
  runLogs: RunLog[]
  userProfile: UserProfile
  exerciseDatabase: ExerciseDbEntry[]
  onStartWorkout: (template: WorkoutTemplate) => void
  onStartEmptyWorkout: () => void
  onViewAllTemplates: () => void
  onViewHistory: () => void
}

const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core'] as const

function formatPace(secondsPerKm: number): string {
  const mins = Math.floor(secondsPerKm / 60)
  const secs = Math.round(secondsPerKm % 60)
  return `${mins}:${String(secs).padStart(2, '0')} /km`
}

export default function DashboardView({
  templates,
  workoutLogs,
  runLogs,
  userProfile,
  exerciseDatabase,
  onStartWorkout,
  onStartEmptyWorkout,
  onViewAllTemplates,
  onViewHistory,
}: DashboardViewProps) {
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
        break
      } else {
        break
      }
    }
    return streak
  }, [workoutLogs])

  const avgPerWeek = useMemo(() => {
    if (workoutLogs.length === 0) return '0'
    const oldestWorkout = new Date(workoutLogs[workoutLogs.length - 1].date)
    const weeksDiff = Math.max(1, Math.floor((Date.now() - oldestWorkout.getTime()) / (7 * 24 * 60 * 60 * 1000)))
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

  // Run stats
  const runStats = useMemo(() => {
    if (runLogs.length === 0) return null

    const totalRuns = runLogs.length
    const totalDistance = runLogs.reduce((s, r) => s + r.distance, 0)
    const avgPace = Math.round(runLogs.reduce((s, r) => s + r.averagePace, 0) / runLogs.length)

    // Group by floored km for 5k/10k averages
    const fiveKRuns = runLogs.filter(r => Math.floor(r.distance) === 5)
    const tenKRuns = runLogs.filter(r => Math.floor(r.distance) === 10)

    const avg5kPace = fiveKRuns.length > 0
      ? Math.round(fiveKRuns.reduce((s, r) => s + r.averagePace, 0) / fiveKRuns.length)
      : null
    const avg10kPace = tenKRuns.length > 0
      ? Math.round(tenKRuns.reduce((s, r) => s + r.averagePace, 0) / tenKRuns.length)
      : null

    return { totalRuns, totalDistance, avgPace, avg5kPace, avg10kPace, fiveKCount: fiveKRuns.length, tenKCount: tenKRuns.length }
  }, [runLogs])

  return (
    <div className="dashboard-view">
      {/* Profile Header */}
      <div className="dashboard-header">
        <div className="profile-section">
          <div className="profile-avatar">{userProfile.name.charAt(0).toUpperCase()}</div>
          <div className="profile-info">
            <h2 className="profile-name">{userProfile.name}</h2>
          </div>
        </div>
      </div>

      {/* Workout Stats Grid */}
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

      {/* Run Stats Widget */}
      {runStats && (
        <div className="run-stats-widget" onClick={onViewHistory}>
          <div className="run-stats-top">
            <span className="run-stats-label">Running</span>
            <span className="run-stats-arrow">→</span>
          </div>
          <div className="run-stats-grid">
            <div className="run-stat-cell">
              <span className="run-stat-cell-val">{runStats.totalRuns}</span>
              <span className="run-stat-cell-label">Runs</span>
            </div>
            <div className="run-stat-cell">
              <span className="run-stat-cell-val">{runStats.totalDistance.toFixed(1)} km</span>
              <span className="run-stat-cell-label">Total distance</span>
            </div>
            <div className="run-stat-cell">
              <span className="run-stat-cell-val">{formatPace(runStats.avgPace)}</span>
              <span className="run-stat-cell-label">Avg pace</span>
            </div>
          </div>
          {(runStats.avg5kPace !== null || runStats.avg10kPace !== null) && (
            <div className="run-pace-breakdown">
              {runStats.avg5kPace !== null && (
                <div className="run-pace-row">
                  <span className="run-pace-dist">5 km ({runStats.fiveKCount} runs)</span>
                  <span className="run-pace-val">{formatPace(runStats.avg5kPace)}</span>
                </div>
              )}
              {runStats.avg10kPace !== null && (
                <div className="run-pace-row">
                  <span className="run-pace-dist">10 km ({runStats.tenKCount} runs)</span>
                  <span className="run-pace-val">{formatPace(runStats.avg10kPace)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Templates Horizontal Scroll */}
      {templates.length > 0 && (
        <div className="templates-section">
          <div className="section-header">
            <h3 className="section-title">Your Templates</h3>
            <button className="btn-see-all" onClick={onViewAllTemplates}>See All →</button>
          </div>
          <div className="templates-scroll">
            {templates.map(template => {
              const logs = workoutLogs.filter(w => w.templateName === template.name && w.duration > 60)
              const avgMin = logs.length > 0
                ? Math.round(logs.reduce((s, w) => s + w.duration, 0) / logs.length / 60)
                : null
              return (
                <div key={template.id} className="template-card-mini" onClick={() => onStartWorkout(template)}>
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

      {/* Workout History link */}
      <button className="home-history-link" onClick={onViewHistory}>
        <span className="home-history-link-text">Full History</span>
        <span className="home-history-link-arrow">→</span>
      </button>
    </div>
  )
}
