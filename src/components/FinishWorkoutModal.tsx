import { useState } from 'react'
import type { Exercise } from '../types'

interface FinishWorkoutModalProps {
  originalTemplateName: string | null
  originalTemplateId: string | null
  hasChanges: boolean
  changedExercises: {
    added: string[]
    removed: string[]
  }
  currentExercises: Exercise[]
  onUpdateTemplate: () => void
  onSaveAsNewTemplate: (name: string, exercises: Exercise[]) => void
  onJustFinish: () => void
  onCancel: () => void
}

export default function FinishWorkoutModal({
  originalTemplateName,
  originalTemplateId,
  hasChanges,
  changedExercises,
  currentExercises,
  onUpdateTemplate,
  onSaveAsNewTemplate,
  onJustFinish,
  onCancel
}: FinishWorkoutModalProps) {
  const [selectedOption, setSelectedOption] = useState<'update' | 'new' | 'finish'>('finish')
  const [newTemplateName, setNewTemplateName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleFinish = async () => {
    if (isSaving) return // Prevent double-clicks
    
    setIsSaving(true)
    
    try {
      if (selectedOption === 'update' && originalTemplateId) {
        await onUpdateTemplate()
      } else if (selectedOption === 'new') {
        if (!newTemplateName.trim()) {
          alert('Please enter a template name')
          setIsSaving(false)
          return
        }
        await onSaveAsNewTemplate(newTemplateName, currentExercises)
      } else {
        await onJustFinish()
      }
    } catch (error) {
      console.error('Error finishing workout:', error)
      alert('Failed to save workout. Please try again.')
      setIsSaving(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>✅ Workout Complete!</h2>

        {hasChanges && (
          <div className="changes-summary">
            <p><strong>Changes detected:</strong></p>
            {changedExercises.added.length > 0 && (
              <p className="change-item add">+ Added: {changedExercises.added.join(', ')}</p>
            )}
            {changedExercises.removed.length > 0 && (
              <p className="change-item remove">- Removed: {changedExercises.removed.join(', ')}</p>
            )}
          </div>
        )}

        <div className="modal-options">
          {originalTemplateId && hasChanges && (
            <label className="option-label">
              <input
                type="radio"
                name="finishOption"
                checked={selectedOption === 'update'}
                onChange={() => setSelectedOption('update')}
              />
              <span>Update "{originalTemplateName}" template</span>
            </label>
          )}

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
              placeholder="Enter template name..."
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              autoFocus
            />
          )}

          <label className="option-label">
            <input
              type="radio"
              name="finishOption"
              checked={selectedOption === 'finish'}
              onChange={() => setSelectedOption('finish')}
            />
            <span>Just finish workout (don't save template)</span>
          </label>
        </div>

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
            {isSaving ? 'Saving...' : 'Finish'}
          </button>
        </div>
      </div>
    </div>
  )
}
