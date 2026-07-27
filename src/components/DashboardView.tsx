import { useState, useMemo } from 'react'
import type { WorkoutTemplate, WorkoutLog, UserProfile, RunLog, TrainingPlan } from '../types'
import { getTodayPlanDay, getPlanStreak } from './PlanSection'
import LogRunModal from './LogRunModal'

interface ExerciseDbEntry {
  name: string
  muscleGroup: string
  equipment: string
  trackingMode?: 'weight-reps' | 'time'
}

interface DashboardViewProps {
  templates: WorkoutTemplate[]
  workoutLogs: WorkoutLog[]
  runLogs: RunLog[]
  activePlan: TrainingPlan | null
  userProfile: UserProfile
  exerciseDatabase: ExerciseDbEntry[]
  onStartWorkout: (template: WorkoutTemplate) => void
  onStartEmptyWorkout: () => void
  onAddRun: (run: RunLog) => void
  onViewAllTemplates: () => void
  onViewHistory: () => void
  onCompleteDay: () => void
  onSkipDay: () => void
}

const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core'] as const

function formatPace(secondsPerKm: number): string {
  const mins = Math.floor(secondsPerKm / 60)
  const secs = Math.round(secondsPerKm % 60)
  return `${mins}:${String(secs).padStart(2, '0')} /km`
}

const DAY_TYPE_ICONS: Record<string, string> = { workout: '🏋️', run: '🏃', rest: '😴' }

export default function DashboardView({
  templates,
  workoutLogs,
  runLogs,
  activePlan,
  userProfile,
  exerciseDatabase,
  onStartWorkout,
  onStartEmptyWorkout,
  onAddRun,
  onViewAllTemplates,
  onViewHistory,
  onCompleteDay,
  onSkipDay,
}: DashboardViewProps) {
  const [showLogRun, setShowLogRun] = useState(false)

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
    // Runs count as Legs training
    runLogs.forEach(run => {
      const t = new Date(run.date).getTime()
      if (!lastTrained['Legs'] || t > lastTrained['Legs']) lastTrained['Legs'] = t
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

      {/* Today's plan / training step */}
      {activePlan && (() => {
        const { day, cycleIndex } = getTodayPlanDay(activePlan)
        const template = day.type === 'workout' ? templates.find(t => t.id === day.templateId) : null
        const label = day.type === 'workout' ? (template?.name ?? 'Workout') : day.type === 'run' ? 'Run' : 'Rest'
        const streak = getPlanStreak(activePlan.checkIns)
        const todayStr = new Date().toISOString().split('T')[0]
        const todayCheckIn = activePlan.checkIns.find(ci => ci.date === todayStr)
        return (
          <div className={`today-plan-card today-plan-${day.type}`}>
            <div className="today-plan-meta">
              <span className="today-plan-label">Training Plan · Step {cycleIndex + 1}/{activePlan.days.length}</span>
              {streak > 0 && <span className="today-plan-streak">🔥 {streak} streak</span>}
            </div>
            <div className="today-plan-main">
              <span className="today-plan-icon">{DAY_TYPE_ICONS[day.type]}</span>
              <span className="today-plan-session">{label}</span>
            </div>
            {!todayCheckIn ? (
              <div className="today-plan-actions">
                {day.type === 'workout' && template && (
                  <button className="today-plan-start-btn" onClick={() => onStartWorkout(template)}>
                    Start workout →
                  </button>
                )}
                {day.type === 'run' && (
                  <button className="today-plan-start-btn" onClick={() => setShowLogRun(true)}>
                    Log run →
                  </button>
                )}
                <button className="today-plan-done-btn" onClick={onCompleteDay}>✓ Done</button>
                <button className="today-plan-skip-btn" onClick={onSkipDay}>Skip</button>
              </div>
            ) : (
              <div className="today-plan-checked">
                {todayCheckIn.completed ? '✓ Completed today' : '✗ Skipped — same step tomorrow'}
              </div>
            )}
          </div>
        )
      })()}

      {/* Start actions */}
      <div className="start-action-row">
        <button className="start-action-btn start-action-workout" onClick={onStartEmptyWorkout}>
          <span className="start-action-icon">🏋️</span>
          <span>Start Workout</span>
        </button>
        <button className="start-action-btn start-action-run" onClick={() => setShowLogRun(true)}>
          <span className="start-action-icon">🏃</span>
          <span>Log Run</span>
        </button>
      </div>

      {showLogRun && (
        <LogRunModal
          onAdd={onAddRun}
          onClose={() => setShowLogRun(false)}
        />
      )}

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
