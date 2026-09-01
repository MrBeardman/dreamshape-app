import { useState } from 'react'
import type { WorkoutLog, WeightEntry, RunLog } from '../types'
import WeightTrackerSheet from './WeightTrackerSheet'
import RunsView from './RunsView'

const VISIBLE_WORKOUTS = 20

interface WorkoutsViewProps {
  workoutLogs: WorkoutLog[]
  weightEntries: WeightEntry[]
  runLogs: RunLog[]
  onStartWorkout: () => void
  onSelectWorkout: (workout: WorkoutLog) => void
  onDeleteWorkout: (id: string) => void
  onAddWeightEntry: (entry: WeightEntry) => void
  onDeleteWeightEntry: (id: string) => void
  onDeleteRun: (id: string) => void
}

export default function WorkoutsView({
  workoutLogs,
  weightEntries,
  runLogs,
  onStartWorkout,
  onSelectWorkout,
  onDeleteWorkout,
  onAddWeightEntry,
  onDeleteWeightEntry,
  onDeleteRun,
}: WorkoutsViewProps) {
  const [tab, setTab] = useState<'workouts' | 'runs'>('workouts')
  const [showWeightTracker, setShowWeightTracker] = useState(false)
  const [showAllWorkouts, setShowAllWorkouts] = useState(false)

  const sortedWeight = [...weightEntries].sort((a, b) => a.date.localeCompare(b.date))
  const latestWeight = sortedWeight[sortedWeight.length - 1]

  const sortedWorkouts = [...workoutLogs]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, showAllWorkouts ? undefined : VISIBLE_WORKOUTS)

  // No local confirm here — App.deleteWorkout already prompts, and wrapping it
  // again made every delete ask twice.
  const handleDeleteWorkout = (id: string) => onDeleteWorkout(id)

  return (
    <div className="workouts-view">
      {showWeightTracker && (
        <WeightTrackerSheet
          weightEntries={weightEntries}
          onAdd={onAddWeightEntry}
          onDelete={onDeleteWeightEntry}
          onClose={() => setShowWeightTracker(false)}
        />
      )}

      <div className="workouts-header">
        <h2 className="view-title">History</h2>
        {tab === 'workouts' && (
          <button className="btn-header" onClick={onStartWorkout}>New</button>
        )}
      </div>

      {/* Sub-tab switcher */}
      <div className="history-tabs">
        <button
          className={`history-tab ${tab === 'workouts' ? 'active' : ''}`}
          onClick={() => setTab('workouts')}
        >
          Workouts
        </button>
        <button
          className={`history-tab ${tab === 'runs' ? 'active' : ''}`}
          onClick={() => setTab('runs')}
        >
          Runs {runLogs.length > 0 && <span className="history-tab-count">{runLogs.length}</span>}
        </button>
      </div>

      {tab === 'runs' ? (
        <RunsView runLogs={runLogs} onDeleteRun={onDeleteRun} />
      ) : (
        <>
          {/* Weight tracker card */}
          <button className="weight-tracker-card" onClick={() => setShowWeightTracker(true)}>
            <div className="weight-tracker-card-left">
              <span className="weight-tracker-card-label">Body Weight</span>
              {latestWeight ? (
                <>
                  <span className="weight-tracker-card-value">{latestWeight.weight} kg</span>
                  <span className="weight-tracker-card-sub">
                    {new Date(latestWeight.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {weightEntries.length > 1 && ` · ${weightEntries.length} entries`}
                  </span>
                </>
              ) : (
                <span className="weight-tracker-card-value" style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-base)' }}>
                  Tap to log weight
                </span>
              )}
            </div>
            <span className="weight-tracker-card-arrow">›</span>
          </button>

          {workoutLogs.length > 0 && (
            <div className="workouts-summary">
              <div className="summary-stat">
                <div className="summary-value">{workoutLogs.length}</div>
                <div className="summary-label">Total</div>
              </div>
              <div className="summary-stat">
                <div className="summary-value">
                  {workoutLogs.filter(w => {
                    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
                    return new Date(w.date) >= weekAgo
                  }).length}
                </div>
                <div className="summary-label">This Week</div>
              </div>
              <div className="summary-stat">
                <div className="summary-value">
                  {Math.round(workoutLogs.reduce((sum, w) => sum + w.duration, 0) / 3600)}h
                </div>
                <div className="summary-label">Time</div>
              </div>
            </div>
          )}

          {workoutLogs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <h3 className="empty-title">No Workouts Yet</h3>
              <p className="empty-text">Start your first workout to begin tracking your progress</p>
              <button className="btn-action-primary" onClick={onStartWorkout}>Start First Workout</button>
            </div>
          ) : (
            <div className="workout-history-list">
              <div className="workout-history-hint">
                Tap a workout to view or edit it. The full calendar lives on your Profile.
              </div>
              {sortedWorkouts.map(w => {
                const volume = w.exercises.reduce(
                  (sum, ex) => sum + ex.sets.reduce((s, set) => s + set.weight * set.reps, 0), 0
                )
                return (
                  <div key={w.id} className="workout-history-row">
                    <button className="workout-history-main" onClick={() => onSelectWorkout(w)}>
                      <span className="workout-history-date">
                        {new Date(w.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                      <span className="workout-history-body">
                        <span className="workout-history-name">{w.templateName}</span>
                        <span className="workout-history-meta">
                          {Math.round(w.duration / 60)} min · {(volume / 1000).toFixed(1)}t · {w.exercises.length} exercises
                        </span>
                      </span>
                    </button>
                    <button
                      className="workout-history-delete"
                      onClick={() => handleDeleteWorkout(w.id)}
                      aria-label={`Delete ${w.templateName}`}
                    >
                      ×
                    </button>
                  </div>
                )
              })}
              {workoutLogs.length > VISIBLE_WORKOUTS && !showAllWorkouts && (
                <button className="workout-history-more" onClick={() => setShowAllWorkouts(true)}>
                  Show all {workoutLogs.length} workouts
                </button>
              )}
            </div>
          )}
        </>
      )}

    </div>
  )
}
