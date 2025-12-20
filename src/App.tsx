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
const EXERCISES_KEY = 'dreamshape_exercises'

// Default exercise database
const DEFAULT_EXERCISES = [
  // Chest
  { name: 'Bench Press (Barbell)', muscleGroup: 'Chest', equipment: 'Barbell' },
  { name: 'Incline Bench Press (Barbell)', muscleGroup: 'Chest', equipment: 'Barbell' },
  { name: 'Decline Bench Press (Barbell)', muscleGroup: 'Chest', equipment: 'Barbell' },
  { name: 'Bench Press (Dumbbell)', muscleGroup: 'Chest', equipment: 'Dumbbell' },
  { name: 'Incline Bench Press (Dumbbell)', muscleGroup: 'Chest', equipment: 'Dumbbell' },
  { name: 'Chest Fly (Dumbbell)', muscleGroup: 'Chest', equipment: 'Dumbbell' },
  { name: 'Chest Fly (Cable)', muscleGroup: 'Chest', equipment: 'Cable' },
  { name: 'Chest Press (Machine)', muscleGroup: 'Chest', equipment: 'Machine' },
  { name: 'Dips (Chest)', muscleGroup: 'Chest', equipment: 'Bodyweight' },
  { name: 'Push-ups', muscleGroup: 'Chest', equipment: 'Bodyweight' },
  
  // Back
  { name: 'Deadlift (Barbell)', muscleGroup: 'Back', equipment: 'Barbell' },
  { name: 'Romanian Deadlift (Barbell)', muscleGroup: 'Back', equipment: 'Barbell' },
  { name: 'Bent Over Row (Barbell)', muscleGroup: 'Back', equipment: 'Barbell' },
  { name: 'Bent Over Row (Dumbbell)', muscleGroup: 'Back', equipment: 'Dumbbell' },
  { name: 'T-Bar Row', muscleGroup: 'Back', equipment: 'Barbell' },
  { name: 'Lat Pulldown (Cable)', muscleGroup: 'Back', equipment: 'Cable' },
  { name: 'Seated Row (Cable)', muscleGroup: 'Back', equipment: 'Cable' },
  { name: 'Pull-ups', muscleGroup: 'Back', equipment: 'Bodyweight' },
  { name: 'Chin-ups', muscleGroup: 'Back', equipment: 'Bodyweight' },
  
  // Shoulders
  { name: 'Overhead Press (Barbell)', muscleGroup: 'Shoulders', equipment: 'Barbell' },
  { name: 'Overhead Press (Dumbbell)', muscleGroup: 'Shoulders', equipment: 'Dumbbell' },
  { name: 'Lateral Raise (Dumbbell)', muscleGroup: 'Shoulders', equipment: 'Dumbbell' },
  { name: 'Front Raise (Dumbbell)', muscleGroup: 'Shoulders', equipment: 'Dumbbell' },
  { name: 'Rear Delt Fly (Dumbbell)', muscleGroup: 'Shoulders', equipment: 'Dumbbell' },
  { name: 'Face Pulls (Cable)', muscleGroup: 'Shoulders', equipment: 'Cable' },
  { name: 'Shrugs (Barbell)', muscleGroup: 'Shoulders', equipment: 'Barbell' },
  { name: 'Shrugs (Dumbbell)', muscleGroup: 'Shoulders', equipment: 'Dumbbell' },
  
  // Arms
  { name: 'Bicep Curl (Barbell)', muscleGroup: 'Arms', equipment: 'Barbell' },
  { name: 'Bicep Curl (Dumbbell)', muscleGroup: 'Arms', equipment: 'Dumbbell' },
  { name: 'Hammer Curl (Dumbbell)', muscleGroup: 'Arms', equipment: 'Dumbbell' },
  { name: 'Preacher Curl (Barbell)', muscleGroup: 'Arms', equipment: 'Barbell' },
  { name: 'Cable Curl', muscleGroup: 'Arms', equipment: 'Cable' },
  { name: 'Tricep Extension (Dumbbell)', muscleGroup: 'Arms', equipment: 'Dumbbell' },
  { name: 'Tricep Pushdown (Cable)', muscleGroup: 'Arms', equipment: 'Cable' },
  { name: 'Skullcrusher (Barbell)', muscleGroup: 'Arms', equipment: 'Barbell' },
  { name: 'Close Grip Bench Press', muscleGroup: 'Arms', equipment: 'Barbell' },
  { name: 'Dips (Triceps)', muscleGroup: 'Arms', equipment: 'Bodyweight' },
  
  // Legs
  { name: 'Squat (Barbell)', muscleGroup: 'Legs', equipment: 'Barbell' },
  { name: 'Front Squat (Barbell)', muscleGroup: 'Legs', equipment: 'Barbell' },
  { name: 'Leg Press (Machine)', muscleGroup: 'Legs', equipment: 'Machine' },
  { name: 'Leg Extension (Machine)', muscleGroup: 'Legs', equipment: 'Machine' },
  { name: 'Leg Curl (Machine)', muscleGroup: 'Legs', equipment: 'Machine' },
  { name: 'Lunges (Dumbbell)', muscleGroup: 'Legs', equipment: 'Dumbbell' },
  { name: 'Bulgarian Split Squat', muscleGroup: 'Legs', equipment: 'Dumbbell' },
  { name: 'Calf Raise (Machine)', muscleGroup: 'Legs', equipment: 'Machine' },
  { name: 'Hip Thrust (Barbell)', muscleGroup: 'Legs', equipment: 'Barbell' },
  
  // Core
  { name: 'Plank', muscleGroup: 'Core', equipment: 'Bodyweight' },
  { name: 'Crunches', muscleGroup: 'Core', equipment: 'Bodyweight' },
  { name: 'Russian Twists', muscleGroup: 'Core', equipment: 'Bodyweight' },
  { name: 'Hanging Leg Raise', muscleGroup: 'Core', equipment: 'Bodyweight' },
  { name: 'Cable Crunch', muscleGroup: 'Core', equipment: 'Cable' },
]

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

  // Load/initialize exercise database
  const [exerciseDatabase, setExerciseDatabase] = useState<Array<{name: string, muscleGroup: string, equipment: string}>>(() => {
    const saved = localStorage.getItem(EXERCISES_KEY)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Failed to load exercises:', e)
        return DEFAULT_EXERCISES
      }
    }
    return DEFAULT_EXERCISES
  })
  
  const [isCreating, setIsCreating] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newExerciseName, setNewExerciseName] = useState('')
  const [currentExercises, setCurrentExercises] = useState<Exercise[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState<Array<{name: string, muscleGroup: string, equipment: string}>>([])
  
  // Exercise creation in Exercises tab
  const [isCreatingExercise, setIsCreatingExercise] = useState(false)
  const [newExerciseForDb, setNewExerciseForDb] = useState({
    name: '',
    muscleGroup: 'Chest',
    equipment: 'Barbell'
  })
  // View state
  const [currentView, setCurrentView] = useState<'templates' | 'history' | 'exercises'>('templates')
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutLog | null>(null)
  
  // Workout logging state
  const [activeWorkout, setActiveWorkout] = useState<{
    templateName: string
    exercises: ExerciseLog[]
    startTime: number
  } | null>(null)
  
  // Timer states
  const [elapsedTime, setElapsedTime] = useState(0)
  const [restTimer, setRestTimer] = useState<number | null>(null)
  const [restDuration, setRestDuration] = useState(120) // Default 2 minutes

  // Workout timer - updates every second
  useEffect(() => {
    if (!activeWorkout) {
      setElapsedTime(0)
      return
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - activeWorkout.startTime) / 1000)
      setElapsedTime(elapsed)
    }, 1000)

    return () => clearInterval(interval)
  }, [activeWorkout])

  // Rest timer countdown
  useEffect(() => {
    if (restTimer === null || restTimer <= 0) {
      if (restTimer === 0) {
        // Timer finished - play sound/vibrate
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200])
        }
        setRestTimer(null)
      }
      return
    }

    const interval = setInterval(() => {
      setRestTimer(prev => prev !== null ? prev - 1 : null)
    }, 1000)

    return () => clearInterval(interval)
  }, [restTimer])

  // Save templates to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
  }, [templates])

  // Save workout logs to localStorage
  useEffect(() => {
    localStorage.setItem(WORKOUTS_KEY, JSON.stringify(workoutLogs))
  }, [workoutLogs])

  // Save exercise database to localStorage
  useEffect(() => {
    localStorage.setItem(EXERCISES_KEY, JSON.stringify(exerciseDatabase))
  }, [exerciseDatabase])

  // Handle exercise input change and filter suggestions
  const handleExerciseInputChange = (value: string) => {
    setNewExerciseName(value)
    
    if (value.trim().length > 0) {
      const filtered = exerciseDatabase.filter(ex =>
        ex.name.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 8) // Limit to 8 suggestions
      
      setFilteredSuggestions(filtered)
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
      setFilteredSuggestions([])
    }
  }

  const selectExerciseFromSuggestion = (exerciseName: string, muscleGroup: string, equipment: string) => {
    const exercise: Exercise = {
      id: Date.now().toString(),
      name: exerciseName,
      equipment: equipment,
      muscleGroup: muscleGroup
    }
    
    setCurrentExercises([...currentExercises, exercise])
    setNewExerciseName('')
    setShowSuggestions(false)
    setFilteredSuggestions([])
  }

  const addExercise = () => {
    if (!newExerciseName.trim()) return
    
    const exercise: Exercise = {
      id: Date.now().toString(),
      name: newExerciseName,
      equipment: 'Barbell', // Default for now
      muscleGroup: 'Other' // Default for now
    }
    
    // Add to exercise database if it doesn't exist
    const existsInDb = exerciseDatabase.some(ex => 
      ex.name.toLowerCase() === newExerciseName.toLowerCase()
    )
    
    if (!existsInDb) {
      setExerciseDatabase([...exerciseDatabase, {
        name: newExerciseName,
        muscleGroup: exercise.muscleGroup,
        equipment: exercise.equipment
      }])
    }
    
    setCurrentExercises([...currentExercises, exercise])
    setNewExerciseName('')
    setShowSuggestions(false)
    setFilteredSuggestions([])
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

  // Get the last workout for a specific template and exercise
  const getLastWorkoutData = (templateName: string, exerciseName: string) => {
    const lastWorkout = workoutLogs.find(w => w.templateName === templateName)
    if (!lastWorkout) return null

    const exercise = lastWorkout.exercises.find(e => e.exerciseName === exerciseName)
    return exercise || null
  }

  // Get personal record (highest weight) for an exercise
  const getPersonalRecord = (exerciseName: string): number => {
    let maxWeight = 0
    
    workoutLogs.forEach(workout => {
      const exercise = workout.exercises.find(e => e.exerciseName === exerciseName)
      if (exercise) {
        exercise.sets.forEach(set => {
          if (set.weight > maxWeight) {
            maxWeight = set.weight
          }
        })
      }
    })
    
    return maxWeight
  }

  const startWorkout = (template: WorkoutTemplate) => {
    const exerciseLogs: ExerciseLog[] = template.exercises.map(ex => {
      // Try to get data from last workout
      const lastData = getLastWorkoutData(template.name, ex.name)
      
      if (lastData && lastData.sets.length > 0) {
        // Pre-fill with last workout's sets
        return {
          exerciseId: ex.id,
          exerciseName: ex.name,
          sets: lastData.sets.map((set, idx) => ({
            id: (idx + 1).toString(),
            weight: set.weight,
            reps: set.reps,
            completed: false
          }))
        }
      } else {
        // No previous data, start fresh
        return {
          exerciseId: ex.id,
          exerciseName: ex.name,
          sets: [
            { id: '1', weight: 0, reps: 0, completed: false }
          ]
        }
      }
    })

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
    const isCompleting = !updatedExercises[exerciseIndex].sets[setIndex].completed
    
    updatedExercises[exerciseIndex].sets[setIndex].completed = isCompleting
    
    setActiveWorkout({
      ...activeWorkout,
      exercises: updatedExercises
    })
    
    // Start rest timer when completing a set
    if (isCompleting) {
      setRestTimer(restDuration)
    }
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

  const deleteWorkout = (id: string) => {
    if (confirm('Delete this workout?')) {
      setWorkoutLogs(workoutLogs.filter(w => w.id !== id))
      if (selectedWorkout?.id === id) {
        setSelectedWorkout(null)
      }
    }
  }

  const addExerciseToDatabase = () => {
    if (!newExerciseForDb.name.trim()) return

    const exists = exerciseDatabase.some(ex => 
      ex.name.toLowerCase() === newExerciseForDb.name.toLowerCase()
    )

    if (exists) {
      alert('Exercise already exists in database!')
      return
    }

    setExerciseDatabase([...exerciseDatabase, {
      name: newExerciseForDb.name,
      muscleGroup: newExerciseForDb.muscleGroup,
      equipment: newExerciseForDb.equipment
    }])

    setNewExerciseForDb({ name: '', muscleGroup: 'Chest', equipment: 'Barbell' })
    setIsCreatingExercise(false)
  }

  const deleteExerciseFromDatabase = (exerciseName: string) => {
    if (confirm(`Delete "${exerciseName}" from database?`)) {
      setExerciseDatabase(exerciseDatabase.filter(ex => ex.name !== exerciseName))
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const isToday = date.toDateString() === today.toDateString()
    const isYesterday = date.toDateString() === yesterday.toDateString()
    
    if (isToday) return 'Today'
    if (isYesterday) return 'Yesterday'
    
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    const remainingMins = mins % 60
    return `${hours}h ${remainingMins}m`
  }

  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatRestTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
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

          {/* Workout Timer */}
          <div className="workout-timer">
            <div>
              <span className="timer-label">Workout Duration</span>
              <span className="timer-value">{formatElapsedTime(elapsedTime)}</span>
            </div>
            <div className="rest-settings">
              <label className="rest-label-small">Rest: </label>
              <select 
                className="rest-select"
                value={restDuration}
                onChange={(e) => setRestDuration(Number(e.target.value))}
              >
                <option value={60}>1:00</option>
                <option value={90}>1:30</option>
                <option value={120}>2:00</option>
                <option value={180}>3:00</option>
                <option value={240}>4:00</option>
                <option value={300}>5:00</option>
              </select>
            </div>
          </div>

          {/* Rest Timer Overlay */}
          {restTimer !== null && restTimer > 0 && (
            <div className="rest-timer-overlay">
              <div className="rest-timer-content">
                <span className="rest-label">Rest Time</span>
                <span className="rest-time">{formatRestTime(restTimer)}</span>
                <button 
                  className="skip-rest-btn"
                  onClick={() => setRestTimer(null)}
                >
                  Skip Rest
                </button>
              </div>
            </div>
          )}

          <div className="workout-exercises">
            {activeWorkout.exercises.map((exerciseLog, exerciseIndex) => {
              const pr = getPersonalRecord(exerciseLog.exerciseName)
              
              return (
                <div key={exerciseLog.exerciseId} className="workout-exercise">
                  <div className="exercise-header">
                    <h3 className="exercise-title">{exerciseLog.exerciseName}</h3>
                    {pr > 0 && (
                      <span className="pr-badge">PR: {pr} kg</span>
                    )}
                  </div>
                  
                  <div className="sets-header">
                    <span className="set-col">Set</span>
                    <span className="kg-col">kg</span>
                    <span className="reps-col">Reps</span>
                    <span className="check-col">✓</span>
                  </div>

                  {exerciseLog.sets.map((set, setIndex) => (
                    <div key={set.id} className={`set-row ${set.completed ? 'completed' : ''}`}>
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
              )
            })}
          </div>

          <div className="workout-footer">
            <button className="btn-finish-large" onClick={finishWorkout}>
              Finish Workout
            </button>
          </div>
        </div>
      ) : selectedWorkout ? (
        // WORKOUT DETAIL VIEW
        <div className="workout-detail-view">
          <div className="workout-detail-header">
            <button className="btn-back" onClick={() => setSelectedWorkout(null)}>
              ← Back
            </button>
            <h2>{selectedWorkout.templateName}</h2>
            <button 
              className="btn-remove"
              onClick={() => deleteWorkout(selectedWorkout.id)}
            >
              ×
            </button>
          </div>

          <div className="workout-meta">
            <div className="meta-item">
              <span className="meta-label">Date</span>
              <span className="meta-value">{formatDate(selectedWorkout.date)}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Time</span>
              <span className="meta-value">{formatTime(selectedWorkout.date)}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Duration</span>
              <span className="meta-value">{formatDuration(selectedWorkout.duration)}</span>
            </div>
          </div>

          <div className="workout-exercises">
            {selectedWorkout.exercises.map((exerciseLog) => (
              <div key={exerciseLog.exerciseId} className="workout-exercise">
                <h3 className="exercise-title">{exerciseLog.exerciseName}</h3>
                
                <div className="sets-header">
                  <span className="set-col">Set</span>
                  <span className="kg-col">kg</span>
                  <span className="reps-col">Reps</span>
                  <span className="check-col">✓</span>
                </div>

                {exerciseLog.sets.map((set, setIndex) => (
                  <div key={set.id} className="set-row-readonly">
                    <span className="set-number">{setIndex + 1}</span>
                    <span className="set-value">{set.weight} kg</span>
                    <span className="set-value">{set.reps} reps</span>
                    <span className="set-check">{set.completed ? '✓' : '-'}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : !isCreating ? (
        <>
          {/* Navigation Tabs */}
          <div className="nav-tabs">
            <button
              className={`nav-tab ${currentView === 'templates' ? 'active' : ''}`}
              onClick={() => setCurrentView('templates')}
            >
              Templates
            </button>
            <button
              className={`nav-tab ${currentView === 'history' ? 'active' : ''}`}
              onClick={() => setCurrentView('history')}
            >
              History ({workoutLogs.length})
            </button>
            <button
              className={`nav-tab ${currentView === 'exercises' ? 'active' : ''}`}
              onClick={() => setCurrentView('exercises')}
            >
              Exercises ({exerciseDatabase.length})
            </button>
          </div>

          {currentView === 'templates' ? (
            // TEMPLATES VIEW
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
            // HISTORY VIEW
            <div className="main-view">
              <h2 style={{ marginBottom: '1rem' }}>Workout History</h2>
              
              {workoutLogs.length === 0 ? (
                <div className="empty-state">
                  <p>No workouts logged yet</p>
                  <p className="hint">Start a workout to begin tracking your progress!</p>
                </div>
              ) : (
                <div className="history-list">
                  {workoutLogs.map((workout) => (
                    <div 
                      key={workout.id} 
                      className="history-card"
                      onClick={() => setSelectedWorkout(workout)}
                    >
                      <div className="history-header">
                        <h3>{workout.templateName}</h3>
                        <span className="history-date">{formatDate(workout.date)}</span>
                      </div>
                      <div className="history-details">
                        <span className="history-detail">
                          🏋️ {workout.exercises.length} exercises
                        </span>
                        <span className="history-detail">
                          ⏱️ {formatDuration(workout.duration)}
                        </span>
                        <span className="history-detail">
                          🕐 {formatTime(workout.date)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // EXERCISES VIEW
            <div className="main-view">
              <div className="quick-start">
                <h2>Exercise Database ({exerciseDatabase.length})</h2>
                <button 
                  className="btn-primary"
                  onClick={() => setIsCreatingExercise(true)}
                >
                  + Add Exercise
                </button>
              </div>

              {isCreatingExercise && (
                <div className="exercise-form-card">
                  <h3>New Exercise</h3>
                  <div className="form-group">
                    <label>Exercise Name</label>
                    <input
                      type="text"
                      placeholder="e.g., Bench Press (Barbell)"
                      value={newExerciseForDb.name}
                      onChange={(e) => setNewExerciseForDb({...newExerciseForDb, name: e.target.value})}
                      className="input"
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Muscle Group</label>
                      <select
                        value={newExerciseForDb.muscleGroup}
                        onChange={(e) => setNewExerciseForDb({...newExerciseForDb, muscleGroup: e.target.value})}
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
                        value={newExerciseForDb.equipment}
                        onChange={(e) => setNewExerciseForDb({...newExerciseForDb, equipment: e.target.value})}
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
                        setIsCreatingExercise(false)
                        setNewExerciseForDb({ name: '', muscleGroup: 'Chest', equipment: 'Barbell' })
                      }}
                    >
                      Cancel
                    </button>
                    <button 
                      className="btn-save"
                      onClick={addExerciseToDatabase}
                      disabled={!newExerciseForDb.name.trim()}
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
                                onClick={() => deleteExerciseFromDatabase(exercise.name)}
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
          )}
        </>
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
              <div className="exercise-input-container">
                <input
                  type="text"
                  placeholder="Add exercise (e.g., Bench Press)"
                  value={newExerciseName}
                  onChange={(e) => handleExerciseInputChange(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addExercise()}
                  onFocus={() => newExerciseName && setShowSuggestions(true)}
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