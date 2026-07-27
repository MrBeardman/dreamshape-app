import { useState, useMemo } from 'react'
import type { Exercise, ExerciseLog, WorkoutLog, TrainingPlan } from '../types'
import { getTodayPlanDay } from './PlanSection'

interface FinishWorkoutModalProps {
  originalTemplateName: string | null
  originalTemplateId: string | null
  hasChanges: boolean
  changedExercises: {
    added: string[]
    removed: string[]
    isReordered: boolean
  }
  currentExercises: Exercise[]
  exerciseLogs: ExerciseLog[]
  duration: number // seconds
  workoutLogs: WorkoutLog[]
  exerciseDatabase?: Array<{ name: string; trackingMode?: 'weight-reps' | 'time' }>
  activePlan: TrainingPlan | null
  onUpdateTemplate: () => void
  onSaveAsNewTemplate: (name: string, exercises: Exercise[]) => void
  onJustFinish: () => void
  onCancel: () => void
  onCompleteDay?: () => void
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export default function FinishWorkoutModal({
  originalTemplateName,
  originalTemplateId,
  hasChanges,
  changedExercises,
  currentExercises,
  exerciseLogs,
  duration,
  workoutLogs,
  exerciseDatabase,
  activePlan,
  onUpdateTemplate,
  onSaveAsNewTemplate,
  onJustFinish,
  onCancel,
  onCompleteDay,
}: FinishWorkoutModalProps) {
  // Detect if this workout matches today's plan day
  const planMatchesWorkout = useMemo(() => {
    if (!activePlan || !originalTemplateId) return false
    const { day } = getTodayPlanDay(activePlan)
    if (day.type !== 'workout') return false
    const todayStr = new Date().toISOString().split('T')[0]
    const alreadyCheckedIn = activePlan.checkIns.some(ci => ci.date === todayStr)
    return day.templateId === originalTemplateId && !alreadyCheckedIn
  }, [activePlan, originalTemplateId])

  const [logToPlan, setLogToPlan] = useState(planMatchesWorkout)

  const isFromTemplate = !!originalTemplateId
  const isUnchanged = isFromTemplate && !hasChanges

  // Default option: update if there are changes to a template, otherwise finish
  const defaultOption = isFromTemplate && hasChanges ? 'update' : 'finish'
  const [selectedOption, setSelectedOption] = useState<'update' | 'new' | 'finish'>(defaultOption)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Workout summary stats (completed sets only)
  const completedSets = exerciseLogs.reduce(
    (sum, ex) => sum + ex.sets.filter(s => s.completed).length,
    0
  )
  const totalVolume = exerciseLogs.reduce(
    (sum, ex) =>
      sum +
      ex.sets
        .filter(s => s.completed)
        .reduce((s2, set) => s2 + set.weight * set.reps, 0),
    0
  )

  // Progressive overload suggestions — double progression: only recommend adding weight
  // once ALL working sets at the current weight have hit the rep target for TWO
  // consecutive sessions (this one + the last time this weight was used), not just
  // "everything got checked off" regardless of how many reps actually landed.
  //
  // There's no explicit "target reps" setting (adding one would mean a whole new
  // per-exercise settings UI); instead the target is inferred as the best working-set
  // rep count ever previously logged at this exact weight — which is exactly the number
  // the lifter was already chasing last time they were at this weight.
  const PROGRESSION_INCREMENT = 2.5

  const overloadSuggestions = useMemo(() => {
    const workingSetsAt = (sets: { weight: number; reps: number; type?: string }[], weight: number) =>
      sets.filter(s => (s.type ?? 'working') === 'working' && s.weight === weight)

    return exerciseLogs
      .map(ex => {
        // Time-tracked exercises (holds like planks) don't have a "weight" to progress
        if (exerciseDatabase?.find(e => e.name === ex.exerciseName)?.trackingMode === 'time') return null

        const workingSets = ex.sets.filter(s => (s.type ?? 'working') === 'working')
        if (workingSets.length === 0) return null
        if (!workingSets.every(s => s.completed)) return null

        const topWeight = Math.max(...workingSets.map(s => s.weight))
        if (topWeight <= 0) return null

        const setsAtTop = workingSetsAt(workingSets, topWeight)

        // Prior sessions (workoutLogs is newest-first) where this exercise was also
        // worked at exactly this weight
        const priorAtWeight = workoutLogs
          .map(w => {
            const pastEx = w.exercises.find(e => e.exerciseName === ex.exerciseName)
            if (!pastEx) return null
            const pastSets = workingSetsAt(pastEx.sets, topWeight)
            return pastSets.length > 0 ? pastSets : null
          })
          .filter((s): s is Array<{ weight: number; reps: number; type?: string }> => s !== null)

        // First time ever at this weight — nothing to compare against yet
        if (priorAtWeight.length === 0) return null

        const targetReps = Math.max(...priorAtWeight.flatMap(sets => sets.map(s => s.reps)))
        if (targetReps <= 0) return null

        const metThisSession = setsAtTop.every(s => s.reps >= targetReps)
        const metPriorSession = priorAtWeight[0].every(s => s.reps >= targetReps)

        if (metThisSession && metPriorSession) {
          const nextWeight = Math.round((topWeight + PROGRESSION_INCREMENT) * 10) / 10
          return {
            name: ex.exerciseName,
            status: 'ready' as const,
            message: `Hit ${targetReps} reps twice at ${topWeight} kg — try ${nextWeight} kg`,
          }
        }
        if (metThisSession && !metPriorSession) {
          return {
            name: ex.exerciseName,
            status: 'confirm' as const,
            message: `Hit ${targetReps} reps — repeat ${topWeight} kg once more to confirm`,
          }
        }
        return {
          name: ex.exerciseName,
          status: 'not-ready' as const,
          message: `Stick with ${topWeight} kg — aim for ${targetReps} reps on every set`,
        }
      })
      .filter((s): s is { name: string; status: 'ready' | 'confirm' | 'not-ready'; message: string } => s !== null)
  }, [exerciseLogs, workoutLogs, exerciseDatabase])

  const handleFinish = async () => {
    if (isSaving) return

    setError(null)
    setIsSaving(true)

    try {
      if (isUnchanged) {
        await onJustFinish()
      } else if (selectedOption === 'update' && originalTemplateId) {
        await onUpdateTemplate()
      } else if (selectedOption === 'new') {
        if (!newTemplateName.trim()) {
          setError('Please enter a template name.')
          setIsSaving(false)
          return
        }
        await onSaveAsNewTemplate(newTemplateName, currentExercises)
      } else {
        await onJustFinish()
      }
      if (logToPlan && onCompleteDay) onCompleteDay()
    } catch (err) {
      console.error('Error finishing workout:', err)
      setError('Failed to save workout. Please try again.')
      setIsSaving(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">Workout Complete</h2>
          <button className="modal-close-btn" onClick={onCancel} disabled={isSaving}>✕</button>
        </div>

        {/* Workout Summary */}
        <div className="workout-summary-stats">
          <div className="summary-stat">
            <span className="summary-stat-value">{formatDuration(duration)}</span>
            <span className="summary-stat-label">Duration</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-value">{exerciseLogs.length}</span>
            <span className="summary-stat-label">Exercises</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-value">{completedSets}</span>
            <span className="summary-stat-label">Sets</span>
          </div>
          {totalVolume > 0 && (
            <div className="summary-stat">
              <span className="summary-stat-value">
                {totalVolume >= 1000
                  ? `${(totalVolume / 1000).toFixed(1)}t`
                  : `${totalVolume}kg`}
              </span>
              <span className="summary-stat-label">Volume</span>
            </div>
          )}
        </div>

        {/* Changes summary — only when template was modified */}
        {isFromTemplate && hasChanges && (
          <div className="changes-summary">
            <p className="changes-title">Template changes detected</p>
            {changedExercises.added.length > 0 && (
              <p className="change-item add">+ {changedExercises.added.join(', ')}</p>
            )}
            {changedExercises.removed.length > 0 && (
              <p className="change-item remove">− {changedExercises.removed.join(', ')}</p>
            )}
            {changedExercises.isReordered && (
              <p className="change-item reorder">Exercise order changed</p>
            )}
          </div>
        )}

        {/* Template options — only when there's something to decide */}
        {!isUnchanged && (
          <div className="modal-options">
            {/* Update template — only if started from a template that was changed */}
            {isFromTemplate && hasChanges && (
              <label className="option-label">
                <input
                  type="radio"
                  name="finishOption"
                  checked={selectedOption === 'update'}
                  onChange={() => setSelectedOption('update')}
                />
                <span>Update "{originalTemplateName}"</span>
              </label>
            )}

            {/* Save as new template */}
            <label className="option-label">
              <input
                type="radio"
                name="finishOption"
                checked={selectedOption === 'new'}
                onChange={() => setSelectedOption('new')}
              />
              <span>Save as new template</span>
            </label>

            {selectedOption === 'new' && (
              <input
                type="text"
                className="input template-name-input"
                placeholder="Template name..."
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                autoFocus
              />
            )}

            {/* Just finish */}
            <label className="option-label">
              <input
                type="radio"
                name="finishOption"
                checked={selectedOption === 'finish'}
                onChange={() => setSelectedOption('finish')}
              />
              <span>Just finish</span>
            </label>
          </div>
        )}

        {/* Plan check-in */}
        {planMatchesWorkout && (
          <label className="plan-log-checkbox">
            <input
              type="checkbox"
              checked={logToPlan}
              onChange={e => setLogToPlan(e.target.checked)}
            />
            <span>Mark training plan step as complete</span>
          </label>
        )}

        {/* Progressive overload suggestions */}
        {overloadSuggestions.length > 0 && (
          <div className="overload-suggestions">
            <div className="overload-title">Next session suggestions</div>
            {overloadSuggestions.map(s => (
              <div key={s.name} className={`overload-row overload-row--${s.status}`}>
                <span className="overload-name">{s.name}</span>
                <span className="overload-rec">
                  {s.status === 'ready' && '↑ '}
                  {s.message}
                </span>
              </div>
            ))}
          </div>
        )}

        {error && <p className="modal-error">{error}</p>}

        <div className="modal-actions">
          <button
            className="btn-modal-cancel"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            className="btn-modal-finish"
            onClick={handleFinish}
            disabled={isSaving}
          >
            {isSaving ? 'Saving…' : 'Save Workout'}
          </button>
        </div>
      </div>
    </div>
  )
}
