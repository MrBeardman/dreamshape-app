import { useState } from 'react'

interface ExerciseDbEntry {
  name: string
  muscleGroup: string
  equipment: string
}

interface ExercisesViewProps {
  exerciseDatabase: ExerciseDbEntry[]
  onAddExercise: (exercise: ExerciseDbEntry) => void
  onDeleteExercise: (exerciseName: string) => void
}

export default function ExercisesView({
  exerciseDatabase,
  onAddExercise,
  onDeleteExercise
}: ExercisesViewProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [newExercise, setNewExercise] = useState({
    name: '',
    muscleGroup: 'Chest',
    equipment: 'Barbell'
  })

  const handleSaveExercise = () => {
    if (!newExercise.name.trim()) return

    const exists = exerciseDatabase.some(ex => 
      ex.name.toLowerCase() === newExercise.name.toLowerCase()
    )

    if (exists) {
      alert('Exercise already exists in database!')
      return
    }

    onAddExercise(newExercise)
    setNewExercise({ name: '', muscleGroup: 'Chest', equipment: 'Barbell' })
    setIsCreating(false)
  }

  return (
    <div className="main-view">
      <div className="quick-start">
        <h2>Exercise Database ({exerciseDatabase.length})</h2>
        <button 
          className="btn-primary"
          onClick={() => setIsCreating(true)}
        >
          + Add Exercise
        </button>
      </div>

      {isCreating && (
        <div className="exercise-form-card">
          <h3>New Exercise</h3>
          <div className="form-group">
            <label>Exercise Name</label>
            <input
              type="text"
              placeholder="e.g., Bench Press (Barbell)"
              value={newExercise.name}
              onChange={(e) => setNewExercise({...newExercise, name: e.target.value})}
              className="input"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Muscle Group</label>
              <select
                value={newExercise.muscleGroup}
                onChange={(e) => setNewExercise({...newExercise, muscleGroup: e.target.value})}
                className="input"
              >
                <option value="Chest">Chest</option>
                <option value="Back">Back</option>
                <option value="Shoulders">Shoulders</option>
                <option value="Arms">Arms</option>
                <option value="Legs">Legs</option>
                <option value="Core">Core</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Equipment</label>
              <select
                value={newExercise.equipment}
                onChange={(e) => setNewExercise({...newExercise, equipment: e.target.value})}
                className="input"
              >
                <option value="Barbell">Barbell</option>
                <option value="Dumbbell">Dumbbell</option>
                <option value="Cable">Cable</option>
                <option value="Machine">Machine</option>
                <option value="Bodyweight">Bodyweight</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button 
              className="btn-cancel"
              onClick={() => {
                setIsCreating(false)
                setNewExercise({ name: '', muscleGroup: 'Chest', equipment: 'Barbell' })
              }}
            >
              Cancel
            </button>
            <button 
              className="btn-save"
              onClick={handleSaveExercise}
              disabled={!newExercise.name.trim()}
            >
              Save Exercise
            </button>
          </div>
        </div>
      )}

      <div className="exercises-grid">
        {['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Other'].map(muscleGroup => {
          const exercises = exerciseDatabase.filter(ex => ex.muscleGroup === muscleGroup)
          if (exercises.length === 0) return null

          return (
            <div key={muscleGroup} className="muscle-group-section">
              <h3 className="muscle-group-title">{muscleGroup} ({exercises.length})</h3>
              <div className="exercise-cards">
                {exercises.map((exercise, idx) => (
                  <div key={idx} className="exercise-card">
                    <div className="exercise-card-header">
                      <span className="exercise-card-name">{exercise.name}</span>
                      <button 
                        className="btn-remove-small"
                        onClick={() => onDeleteExercise(exercise.name)}
                      >
                        ×
                      </button>
                    </div>
                    <span className="exercise-card-equipment">{exercise.equipment}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}