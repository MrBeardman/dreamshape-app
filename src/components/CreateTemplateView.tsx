import { useState } from 'react'
import type { Exercise } from '../types'

interface ExerciseDbEntry {
  name: string
  muscleGroup: string
  equipment: string
}

interface CreateTemplateViewProps {
  exerciseDatabase: ExerciseDbEntry[]
  templateToEdit: { id: string; name: string; exercises: Exercise[] } | null
  onSave: (name: string, exercises: Exercise[]) => void
  onCancel: () => void
  onAddToDatabase: (exercise: ExerciseDbEntry) => void
}

export default function CreateTemplateView({
  exerciseDatabase,
  templateToEdit,
  onSave,
  onCancel,
  onAddToDatabase
}: CreateTemplateViewProps) {
  const [templateName, setTemplateName] = useState(templateToEdit?.name || '')
  const [exercises, setExercises] = useState<Exercise[]>(templateToEdit?.exercises || [])
  const [exerciseInput, setExerciseInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState<ExerciseDbEntry[]>([])

  const handleExerciseInputChange = (value: string) => {
    setExerciseInput(value)
    
    if (value.trim().length > 0) {
      const filtered = exerciseDatabase.filter(ex =>
        ex.name.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 8)
      
      setFilteredSuggestions(filtered)
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
      setFilteredSuggestions([])
    }
  }

  const selectExerciseFromSuggestion = (name: string, muscleGroup: string, equipment: string) => {
    const exercise: Exercise = {
      id: Date.now().toString(),
      name,
      equipment,
      muscleGroup
    }
    
    setExercises([...exercises, exercise])
    setExerciseInput('')
    setShowSuggestions(false)
    setFilteredSuggestions([])
  }

  const addExercise = () => {
    if (!exerciseInput.trim()) return
    
    const exercise: Exercise = {
      id: Date.now().toString(),
      name: exerciseInput,
      equipment: 'Barbell',
      muscleGroup: 'Other'
    }
    
    // Add to database if it doesn't exist
    const existsInDb = exerciseDatabase.some(ex => 
      ex.name.toLowerCase() === exerciseInput.toLowerCase()
    )
    
    if (!existsInDb) {
      onAddToDatabase({
        name: exerciseInput,
        muscleGroup: exercise.muscleGroup,
        equipment: exercise.equipment
      })
    }
    
    setExercises([...exercises, exercise])
    setExerciseInput('')
    setShowSuggestions(false)
    setFilteredSuggestions([])
  }

  const removeExercise = (id: string) => {
    setExercises(exercises.filter(ex => ex.id !== id))
  }

  const handleSave = () => {
    if (!templateName.trim() || exercises.length === 0) return
    onSave(templateName, exercises)
  }

  return (
    <div className="create-view">
      <div className="create-header">
        <button 
          className="btn-back"
          onClick={onCancel}
        >
          ← Back
        </button>
        <h2>{templateToEdit ? 'Edit Template' : 'New Template'}</h2>
      </div>

      <div className="form-group">
        <label>Template Name</label>
        <input
          type="text"
          placeholder="e.g., Upper Body A"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          className="input"
        />
      </div>

      <div className="exercises-section">
        <h3>Exercises ({exercises.length})</h3>
        
        <div className="add-exercise">
          <div className="exercise-input-container">
            <input
              type="text"
              placeholder="Add exercise (e.g., Bench Press)"
              value={exerciseInput}
              onChange={(e) => handleExerciseInputChange(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addExercise()}
              onFocus={() => exerciseInput && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="input"
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="suggestions-dropdown">
                {filteredSuggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className="suggestion-item"
                    onClick={() => selectExerciseFromSuggestion(
                      suggestion.name,
                      suggestion.muscleGroup,
                      suggestion.equipment
                    )}
                  >
                    <span className="suggestion-name">{suggestion.name}</span>
                    <span className="suggestion-meta">
                      {suggestion.muscleGroup} • {suggestion.equipment}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={addExercise} className="btn-add">+</button>
        </div>

        <div className="exercise-list">
          {exercises.map((exercise, index) => (
            <div key={exercise.id} className="exercise-item">
              <span className="exercise-number">{index + 1}</span>
              <span className="exercise-name">{exercise.name}</span>
              <button 
                onClick={() => removeExercise(exercise.id)}
                className="btn-remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {exercises.length === 0 && (
          <div className="empty-exercises">
            <p>No exercises added yet</p>
          </div>
        )}
      </div>

      <button 
      className="btn-save"
      onClick={handleSave}
      disabled={!templateName.trim() || exercises.length === 0}
      >
      {templateToEdit ? 'Update Template' : 'Save Template'}
      </button>
    </div>
  )
}
