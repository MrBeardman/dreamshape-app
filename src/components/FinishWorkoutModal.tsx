import { useState } from 'react'
import type { Exercise, ExerciseLog } from '../types'

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
  onUpdateTemplate: () => void
  onSaveAsNewTemplate: (name: string, exercises: Exercise[]) => void
  onJustFinish: () => void
  onCancel: () => void
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
  onUpdateTemplate,
  onSaveAsNewTemplate,
  onJustFinish,
  onCancel
}: FinishWorkoutModalProps) {
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
