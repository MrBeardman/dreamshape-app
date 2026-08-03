import { useState, useMemo } from 'react'
import type { WorkoutTemplate, WorkoutLog, UserProfile, RunLog, Habit, HabitCompletion, HabitCompletionStatus } from '../types'
import { getHabitsDueOn, getHabitStatus, getHabitStreak, todayISO } from '../lib/habits'
import { getHabitXpHistory, previewHabitXp, type HabitXpPreview } from '../lib/xp'
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
  habits: Habit[]
  habitCompletions: HabitCompletion[]
  userProfile: UserProfile
  exerciseDatabase: ExerciseDbEntry[]
  onStartWorkout: (template: WorkoutTemplate) => void
  onStartEmptyWorkout: () => void
  onAddRun: (run: RunLog) => void
  onViewAllTemplates: () => void
  onViewHistory: () => void
  onCycleHabitStatus: (habitId: string) => void
  onManageHabits: () => void
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
  habits,
  habitCompletions,
  userProfile,
  exerciseDatabase,
  onStartWorkout,
  onStartEmptyWorkout,
  onAddRun,
  onViewAllTemplates,
  onViewHistory,
  onCycleHabitStatus,
  onManageHabits,
}: DashboardViewProps) {
  const [showLogRun, setShowLogRun] = useState(false)

  const todayStr = todayISO()

  const dueToday = useMemo(() => getHabitsDueOn(habits, todayStr), [habits, todayStr])
  const timedHabits = useMemo(
    () => dueToday.filter(h => h.timeOfDay).sort((a, b) => (a.timeOfDay || '').localeCompare(b.timeOfDay || '')),
    [dueToday]
  )
  const anytimeHabits = useMemo(
    () => dueToday.filter(h => !h.timeOfDay).sort((a, b) => a.sortOrder - b.sortOrder),
    [dueToday]
  )
  const habitStreak = useMemo(() => getHabitStreak(habits, habitCompletions, todayStr), [habits, habitCompletions, todayStr])
  const habitXp = useMemo(
    () => getHabitXpHistory(habits, habitCompletions, todayStr, userProfile.xpStartDate),
    [habits, habitCompletions, todayStr, userProfile.xpStartDate]
  )

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

      {/* Today's habits */}
      <div className="habits-today-card">
        <div className="habits-today-header">
          <span className="habits-today-title">Today's Habits</span>
          <div className="habits-today-header-actions">
            {habitStreak > 0 && <span className="habits-today-streak">🔥 {habitStreak}</span>}
            <button className="habits-manage-link" onClick={onManageHabits} aria-label="Manage habits">⚙️</button>
          </div>
        </div>

        {habits.length === 0 ? (
          <div className="habits-empty-card" onClick={onManageHabits}>
            <span>Set up your first habit →</span>
          </div>
        ) : dueToday.length === 0 ? (
          <p className="habits-empty-text">No habits due today.</p>
        ) : (
          <div className="habits-today-list">
            {timedHabits.length > 0 && (
              <>
                {timedHabits.map(habit => {
                  const status = getHabitStatus(habitCompletions, habit.id, todayStr)
                  return (
                    <HabitRow
                      key={habit.id}
                      habit={habit}
                      status={status}
                      preview={previewHabitXp(habitXp.perHabit[habit.id], status)}
                      onToggle={() => onCycleHabitStatus(habit.id)}
                    />
                  )
                })}
              </>
            )}
            {anytimeHabits.length > 0 && (
              <>
                {timedHabits.length > 0 && <span className="habits-section-label">Anytime</span>}
                {anytimeHabits.map(habit => {
                  const status = getHabitStatus(habitCompletions, habit.id, todayStr)
                  return (
                    <HabitRow
                      key={habit.id}
                      habit={habit}
                      status={status}
                      preview={previewHabitXp(habitXp.perHabit[habit.id], status)}
                      onToggle={() => onCycleHabitStatus(habit.id)}
                    />
                  )
                })}
              </>
            )}
          </div>
        )}
      </div>

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

function formatTimeOfDay(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

function HabitRow({
  habit,
  status,
  preview,
  onToggle,
}: {
  habit: Habit
  status: HabitCompletionStatus | 'pending'
  preview: HabitXpPreview
  onToggle: () => void
}) {
  const [popXp, setPopXp] = useState<number | null>(null)

  const handleClick = () => {
    if (status === 'pending') {
      setPopXp(Math.round(preview.xp))
      window.setTimeout(() => setPopXp(null), 900)
    }
    onToggle()
  }

  return (
    <div className="habit-row">
      <div className="habit-row-status-wrap">
        <button className={`habit-row-status habit-row-status--${status}`} onClick={handleClick} aria-label={`Mark ${habit.name} as ${status === 'pending' ? 'done' : status === 'done' ? 'failed' : 'pending'}`}>
          {status === 'done' ? '✓' : status === 'failed' ? '✗' : ''}
        </button>
        {popXp !== null && <span className="habit-xp-pop">+{popXp}</span>}
      </div>
      <span className="habit-row-icon">{habit.icon || '•'}</span>
      <div className="habit-row-main">
        <span className="habit-row-name">{habit.name}</span>
        <span className="habit-row-meta">
          {preview.streak > 0 && <span className="habit-row-streak">🔥{preview.streak}</span>}
          {status !== 'failed' && (
            <span className="habit-row-xp">
              +{Math.round(preview.xp)} XP{preview.multiplier > 1 ? ` · ${preview.multiplier.toFixed(2)}x` : ''}
            </span>
          )}
        </span>
      </div>
      {habit.timeOfDay && <span className="habit-row-time">{formatTimeOfDay(habit.timeOfDay)}</span>}
    </div>
  )
}
