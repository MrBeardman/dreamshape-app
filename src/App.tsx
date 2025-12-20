import { useState, useEffect } from 'react'
import './App.css'

interface Exercise {
  id: string
  name: string
  equipment: string
  muscleGroup: string
}

interface WorkoutTemplate {
  id: string
  name: string
  exercises: Exercise[]
}

interface Set {
  id: string
  weight: number
  reps: number
  completed: boolean
}

interface ExerciseLog {
  exerciseId: string
  exerciseName: string
  sets: Set[]
}

interface WorkoutLog {
  id: string
  templateName: string
  date: string
  exercises: ExerciseLog[]
  duration: number // in seconds
}

const STORAGE_KEY = 'dreamshape_templates'
const WORKOUTS_KEY = 'dreamshape_workouts'

function App() {
  // Load templates from localStorage on first render
  const [templates, setTemplates] = useState<WorkoutTemplate[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Failed to load templates:', e)
        return []
      }
    }
    return []
  })

  // Load workout logs
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>(() => {
    const saved = localStorage.getItem(WORKOUTS_KEY)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Failed to load workouts:', e)
        return []
      }
    }
    return []
  })
  
  const [isCreating, setIsCreating] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newExerciseName, setNewExerciseName] = useState('')
  const [currentExercises, setCurrentExercises] = useState<Exercise[]>([])
  
  // Workout logging state
  const [activeWorkout, setActiveWorkout] = useState<{
    templateName: string
    exercises: ExerciseLog[]
    startTime: number
  } | null>(null)

  // Save templates to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
  }, [templates])

  // Save workout logs to localStorage
  useEffect(() => {
    localStorage.setItem(WORKOUTS_KEY, JSON.stringify(workoutLogs))
  }, [workoutLogs])

  const addExercise = () => {
    if (!newExerciseName.trim()) return
    
    const exercise: Exercise = {
      id: Date.now().toString(),
      name: newExerciseName,
      equipment: 'Barbell', // Default for now
      muscleGroup: 'Chest' // Default for now
    }
    
    setCurrentExercises([...currentExercises, exercise])
    setNewExerciseName('')
  }

  const removeExercise = (id: string) => {
    setCurrentExercises(currentExercises.filter(ex => ex.id !== id))
  }

  const saveTemplate = () => {
    if (!newTemplateName.trim() || currentExercises.length === 0) return

    const template: WorkoutTemplate = {
      id: Date.now().toString(),
      name: newTemplateName,
      exercises: currentExercises
    }

    setTemplates([...templates, template])
    setNewTemplateName('')
    setCurrentExercises([])
    setIsCreating(false)
  }

  const deleteTemplate = (id: string) => {
    if (confirm('Delete this template?')) {
      setTemplates(templates.filter(t => t.id !== id))
    }
  }

  const startWorkout = (template: WorkoutTemplate) => {
    const exerciseLogs: ExerciseLog[] = template.exercises.map(ex => ({
      exerciseId: ex.id,
      exerciseName: ex.name,
      sets: [
        { id: '1', weight: 0, reps: 0, completed: false }
      ]
    }))

    setActiveWorkout({
      templateName: template.name,
      exercises: exerciseLogs,
      startTime: Date.now()
    })
  }

  const updateSet = (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps', value: number) => {
    if (!activeWorkout) return

    const updatedExercises = [...activeWorkout.exercises]
    updatedExercises[exerciseIndex].sets[setIndex][field] = value
    
    setActiveWorkout({
      ...activeWorkout,
      exercises: updatedExercises
    })
  }

  const toggleSetCompleted = (exerciseIndex: number, setIndex: number) => {
    if (!activeWorkout) return

    const updatedExercises = [...activeWorkout.exercises]
    updatedExercises[exerciseIndex].sets[setIndex].completed = 
      !updatedExercises[exerciseIndex].sets[setIndex].completed
    
    setActiveWorkout({
      ...activeWorkout,
      exercises: updatedExercises
    })
  }

  const addSet = (exerciseIndex: number) => {
    if (!activeWorkout) return

    const updatedExercises = [...activeWorkout.exercises]
    const lastSet = updatedExercises[exerciseIndex].sets[updatedExercises[exerciseIndex].sets.length - 1]
    
    updatedExercises[exerciseIndex].sets.push({
      id: Date.now().toString(),
      weight: lastSet?.weight || 0,
      reps: lastSet?.reps || 0,
      completed: false
    })
    
    setActiveWorkout({
      ...activeWorkout,
      exercises: updatedExercises
    })
  }

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    if (!activeWorkout) return

    const updatedExercises = [...activeWorkout.exercises]
    if (updatedExercises[exerciseIndex].sets.length > 1) {
      updatedExercises[exerciseIndex].sets.splice(setIndex, 1)
      
      setActiveWorkout({
        ...activeWorkout,
        exercises: updatedExercises
      })
    }
  }

  const finishWorkout = () => {
    if (!activeWorkout) return

    const duration = Math.floor((Date.now() - activeWorkout.startTime) / 1000)
    
    const workoutLog: WorkoutLog = {
      id: Date.now().toString(),
      templateName: activeWorkout.templateName,
      date: new Date().toISOString(),
      exercises: activeWorkout.exercises,
      duration
    }

    setWorkoutLogs([workoutLog, ...workoutLogs])
    setActiveWorkout(null)
  }

  const cancelWorkout = () => {
    if (confirm('Cancel this workout? All progress will be lost.')) {
      setActiveWorkout(null)
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1 className="logo">💪 DreamShape</h1>
      </header>

      {activeWorkout ? (
        // WORKOUT LOGGING VIEW
        <div className="workout-view">
          <div className="workout-header">
            <button className="btn-back" onClick={cancelWorkout}>
              ✕ Cancel
            </button>
            <h2>{activeWorkout.templateName}</h2>
            <button className="btn-finish" onClick={finishWorkout}>
              Finish
            </button>
          </div>

          <div className="workout-exercises">
            {activeWorkout.exercises.map((exerciseLog, exerciseIndex) => (
              <div key={exerciseLog.exerciseId} className="workout-exercise">
                <h3 className="exercise-title">{exerciseLog.exerciseName}</h3>
                
                <div className="sets-header">
                  <span className="set-col">Set</span>
                  <span className="kg-col">kg</span>
                  <span className="reps-col">Reps</span>
                  <span className="check-col">✓</span>
                </div>

                {exerciseLog.sets.map((set, setIndex) => (
                  <div key={set.id} className="set-row">
                    <span className="set-number">{setIndex + 1}</span>
                    
                    <input
                      type="number"
                      className="set-input"
                      value={set.weight || ''}
                      onChange={(e) => updateSet(exerciseIndex, setIndex, 'weight', Number(e.target.value))}
                      placeholder="0"
                    />
                    
                    <input
                      type="number"
                      className="set-input"
                      value={set.reps || ''}
                      onChange={(e) => updateSet(exerciseIndex, setIndex, 'reps', Number(e.target.value))}
                      placeholder="0"
                    />
                    
                    <button
                      className={`check-btn ${set.completed ? 'completed' : ''}`}
                      onClick={() => toggleSetCompleted(exerciseIndex, setIndex)}
                    >
                      {set.completed ? '✓' : ''}
                    </button>

                    {exerciseLog.sets.length > 1 && (
                      <button
                        className="remove-set-btn"
                        onClick={() => removeSet(exerciseIndex, setIndex)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}

                <button
                  className="add-set-btn"
                  onClick={() => addSet(exerciseIndex)}
                >
                  + Add Set
                </button>
              </div>
            ))}
          </div>

          <div className="workout-footer">
            <button className="btn-finish-large" onClick={finishWorkout}>
              Finish Workout
            </button>
          </div>
        </div>
      ) : !isCreating ? (
        <div className="main-view">
          <div className="quick-start">
            <h2>My Templates ({templates.length})</h2>
            <button 
              className="btn-primary"
              onClick={() => setIsCreating(true)}
            >
              + Create Template
            </button>
          </div>

          <div className="templates-list">
            {templates.map(template => (
              <div key={template.id} className="template-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <h3>{template.name}</h3>
                    <p className="exercise-count">
                      {template.exercises.length} exercise{template.exercises.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button 
                    onClick={() => deleteTemplate(template.id)}
                    className="btn-remove"
                    style={{ marginTop: '0.25rem' }}
                  >
                    ×
                  </button>
                </div>
                <div className="exercise-preview">
                  {template.exercises.slice(0, 3).map(ex => (
                    <span key={ex.id} className="exercise-tag">{ex.name}</span>
                  ))}
                  {template.exercises.length > 3 && (
                    <span className="exercise-tag">+{template.exercises.length - 3} more</span>
                  )}
                </div>
                <button
                  className="btn-start-workout"
                  onClick={() => startWorkout(template)}
                >
                  Start Workout
                </button>
              </div>
            ))}
          </div>

          {templates.length === 0 && (
            <div className="empty-state">
              <p>No templates yet</p>
              <p className="hint">Create your first workout template to get started!</p>
            </div>
          )}
        </div>
      ) : (
        <div className="create-view">
          <div className="create-header">
            <button 
              className="btn-back"
              onClick={() => {
                setIsCreating(false)
                setCurrentExercises([])
                setNewTemplateName('')
              }}
            >
              ← Back
            </button>
            <h2>New Template</h2>
          </div>

          <div className="form-group">
            <label>Template Name</label>
            <input
              type="text"
              placeholder="e.g., Upper Body A"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              className="input"
            />
          </div>

          <div className="exercises-section">
            <h3>Exercises ({currentExercises.length})</h3>
            
            <div className="add-exercise">
              <input
                type="text"
                placeholder="Add exercise (e.g., Bench Press)"
                value={newExerciseName}
                onChange={(e) => setNewExerciseName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addExercise()}
                className="input"
              />
              <button onClick={addExercise} className="btn-add">+</button>
            </div>

            <div className="exercise-list">
              {currentExercises.map((exercise, index) => (
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

            {currentExercises.length === 0 && (
              <div className="empty-exercises">
                <p>No exercises added yet</p>
              </div>
            )}
          </div>

          <button 
            className="btn-save"
            onClick={saveTemplate}
            disabled={!newTemplateName.trim() || currentExercises.length === 0}
          >
            Save Template
          </button>
        </div>
      )}
    </div>
  )
}

export default App
