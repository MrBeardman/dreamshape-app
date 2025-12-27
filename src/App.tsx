import { useState, useEffect } from 'react'
import './App.css'
import type { WorkoutTemplate, WorkoutLog, ActiveWorkout, Exercise, ExerciseLog } from './types'
import { DEFAULT_EXERCISES } from './data/defaultExercises'
import WorkoutView from './components/WorkoutView'
import WorkoutDetailView from './components/WorkoutDetailView'
import TemplatesView from './components/TemplatesView'
import HistoryView from './components/HistoryView'
import ExercisesView from './components/ExercisesView'
import CreateTemplateView from './components/CreateTemplateView'

const STORAGE_KEY = 'dreamshape_templates'
const WORKOUTS_KEY = 'dreamshape_workouts'
const EXERCISES_KEY = 'dreamshape_exercises'

function App() {
  // Load templates from localStorage
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

  // Load exercise database
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
  const [selectedTemplate, setSelectedTemplate] = useState<WorkoutTemplate | null>(null)
  const [currentView, setCurrentView] = useState<'templates' | 'history' | 'exercises'>('templates')
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutLog | null>(null)
  
  // Workout logging state
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null)
  
  // Timer states
  const [elapsedTime, setElapsedTime] = useState(0)
  const [restTimer, setRestTimer] = useState<number | null>(null)
  const [restDuration, setRestDuration] = useState(120)

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
  }, [templates])

  useEffect(() => {
    localStorage.setItem(WORKOUTS_KEY, JSON.stringify(workoutLogs))
  }, [workoutLogs])

  useEffect(() => {
    localStorage.setItem(EXERCISES_KEY, JSON.stringify(exerciseDatabase))
  }, [exerciseDatabase])

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

  // Get the last workout for a specific template and exercise
  const getLastWorkoutData = (templateName: string, exerciseName: string) => {
    const lastWorkout = workoutLogs.find(w => w.templateName === templateName)
    if (!lastWorkout) return null
    const exercise = lastWorkout.exercises.find(e => e.exerciseName === exerciseName)
    return exercise || null
  }

  const deleteTemplate = (id: string) => {
    if (confirm('Delete this template?')) {
      setTemplates(templates.filter(t => t.id !== id))
    }
  }

  const startWorkout = (template: WorkoutTemplate) => {
    const exerciseLogs: ExerciseLog[] = template.exercises.map(ex => {
      const lastData = getLastWorkoutData(template.name, ex.name)
      
      if (lastData && lastData.sets.length > 0) {
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

  const saveTemplate = (name: string, exercises: Exercise[]) => {
    if (selectedTemplate) {
      // Editing existing template
      const updatedTemplates = templates.map(t => 
        t.id === selectedTemplate.id 
          ? { ...t, name, exercises }
          : t
      )
      setTemplates(updatedTemplates)
    } else {
      // Creating new template
      const newTemplate: WorkoutTemplate = {
        id: Date.now().toString(),
        name,
        exercises
      }
      setTemplates([...templates, newTemplate])
    }
    
    setIsCreating(false)
    setSelectedTemplate(null)
  }

  const editTemplate = (template: WorkoutTemplate) => {
    setSelectedTemplate(template)
    setIsCreating(true)
  }

  const addExerciseToDatabase = (exercise: { name: string, muscleGroup: string, equipment: string }) => {
    setExerciseDatabase([...exerciseDatabase, exercise])
  }

  const deleteExerciseFromDatabase = (exerciseName: string) => {
    if (confirm(`Delete "${exerciseName}" from database?`)) {
      setExerciseDatabase(exerciseDatabase.filter(ex => ex.name !== exerciseName))
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1 className="logo">💪 DreamShape</h1>
      </header>

      {activeWorkout ? (
        <WorkoutView
          activeWorkout={activeWorkout}
          elapsedTime={elapsedTime}
          restTimer={restTimer}
          restDuration={restDuration}
          workoutLogs={workoutLogs}
          onCancel={cancelWorkout}
          onFinish={finishWorkout}
          onUpdateSet={updateSet}
          onToggleSetCompleted={toggleSetCompleted}
          onAddSet={addSet}
          onRemoveSet={removeSet}
          onSetRestDuration={setRestDuration}
          onSkipRest={() => setRestTimer(null)}
        />
      ) : selectedWorkout ? (
        <WorkoutDetailView
          workout={selectedWorkout}
          onBack={() => setSelectedWorkout(null)}
          onDelete={deleteWorkout}
        />
      ) : !isCreating ? (
        <>
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
            <TemplatesView
              templates={templates}
              onCreateTemplate={() => {
                setSelectedTemplate(null)
                setIsCreating(true)
              }}
              onEditTemplate={editTemplate}
              onDeleteTemplate={deleteTemplate}
              onStartWorkout={startWorkout}
            />
          ) : currentView === 'history' ? (
            <HistoryView
              workoutLogs={workoutLogs}
              onSelectWorkout={setSelectedWorkout}
            />
          ) : (
            <ExercisesView
              exerciseDatabase={exerciseDatabase}
              onAddExercise={addExerciseToDatabase}
              onDeleteExercise={deleteExerciseFromDatabase}
            />
          )}
        </>
      ) : (
        <CreateTemplateView
          exerciseDatabase={exerciseDatabase}
          templateToEdit={selectedTemplate}
          onSave={saveTemplate}
          onCancel={() => {
            setIsCreating(false)
            setSelectedTemplate(null)
          }}
          onAddToDatabase={addExerciseToDatabase}
        />
      )}
    </div>
  )
}

export default App