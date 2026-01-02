import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { SyncService } from './lib/syncService'
import SyncIndicator from './components/SyncIndicator'
import AuthView from './components/AuthView'
import type { User } from '@supabase/supabase-js'
import './App.css'
import type { WorkoutTemplate, WorkoutLog, ActiveWorkout, Exercise, ExerciseLog, UserProfile } from './types'
import { DEFAULT_EXERCISES } from './data/defaultExercises'
import WorkoutView from './components/WorkoutView'
import WorkoutDetailView from './components/WorkoutDetailView'
import TemplatesView from './components/TemplatesView'
import WorkoutsView from './components/WorkoutsView'
import CreateTemplateView from './components/CreateTemplateView'
import FinishWorkoutModal from './components/FinishWorkoutModal'
import DashboardView from './components/DashboardView'
import BottomNav from './components/BottomNav'
import LibraryView from './components/LibraryView'
import ProfileView from './components/ProfileView'

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
  const [exerciseDatabase, setExerciseDatabase] = useState<Array<{ name: string, muscleGroup: string, equipment: string }>>(() => {
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

  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  // Sync state
  const [syncService, setSyncService] = useState<SyncService | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('dreamshape_profile')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        return { name: 'Jan', memberSince: new Date().toISOString() }
      }
    }
    return { name: 'Jan', memberSince: new Date().toISOString() }
  })
  const [isCreating, setIsCreating] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<WorkoutTemplate | null>(null)
  const [currentView, setCurrentView] = useState<'dashboard' | 'progress' | 'start' | 'library' | 'profile'>('dashboard')
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutLog | null>(null)

  // Workout logging state
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null)
  const [showFinishModal, setShowFinishModal] = useState(false)
  const [originalTemplateExercises, setOriginalTemplateExercises] = useState<Exercise[]>([])

  // Timer states
  const [elapsedTime, setElapsedTime] = useState(0)
  const [restTimer, setRestTimer] = useState<number | null>(null)
  const [restDuration, setRestDuration] = useState(120)
  const [activeRestTimer, setActiveRestTimer] = useState<{
    exerciseIndex: number
    afterSetIndex: number
    timeRemaining: number
  } | null>(null)


  // ============================================
  // FUNCTIONS - MUST BE BEFORE useEffect
  // ============================================

  const handleInitialSync = async (sync: SyncService) => {
    try {
      setIsSyncing(true)
      await sync.migrateLocalDataToSupabase()
      const data = await sync.loadAllData()

      if (data.profile) {
        setUserProfile(data.profile)
        localStorage.setItem('dreamshape_profile', JSON.stringify(data.profile))
      }

      setTemplates(data.templates)
      localStorage.setItem('dreamshape_templates', JSON.stringify(data.templates))

      setWorkoutLogs(data.workouts)
      localStorage.setItem('dreamshape_workouts', JSON.stringify(data.workouts))

      const allExercises = [
        ...DEFAULT_EXERCISES,
        ...data.exercises.filter(e =>
          !DEFAULT_EXERCISES.some(d => d.name === e.name)
        )
      ]
      setExerciseDatabase(allExercises)
      localStorage.setItem('dreamshape_exercises', JSON.stringify(allExercises))

      setLastSyncTime(new Date())
      console.log('✅ Sync complete! Templates:', data.templates.length, 'Workouts:', data.workouts.length)
    } catch (error) {
      console.error('Initial sync failed:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleUpdateProfile = async (profile: UserProfile) => {
    setUserProfile(profile)

    if (syncService) {
      setIsSyncing(true)
      try {
        await syncService.updateProfile(profile)
        setLastSyncTime(new Date())
      } catch (error) {
        console.error('Failed to update profile:', error)
      } finally {
        setIsSyncing(false)
      }
    }
  }

  const handleSignOut = async () => {
    if (confirm('Sign out?')) {
      await supabase.auth.signOut()
      setSyncService(null)
      setLastSyncTime(null)
    }
  }

  // ============================================
  // useEffect HOOKS
  // ============================================

  // Check authentication on mount
  useEffect(() => {
    let isMounted = true
    let hasInitializedSync = false

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return

      setUser(session?.user ?? null)
      setAuthLoading(false)

      // Initialize sync service if user is logged in
      if (session?.user && !hasInitializedSync) {
        hasInitializedSync = true
        const sync = new SyncService(session.user.id)
        setSyncService(sync)
        handleInitialSync(sync)
      }
    })

    // Listen for auth changes (sign in/out only, not initial session)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return

      // Only handle SIGNED_IN and SIGNED_OUT events, ignore INITIAL_SESSION
      if (event === 'INITIAL_SESSION') return

      setUser(session?.user ?? null)

      if (session?.user && event === 'SIGNED_IN') {
        const sync = new SyncService(session.user.id)
        setSyncService(sync)
        handleInitialSync(sync)
      } else if (event === 'SIGNED_OUT') {
        setSyncService(null)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

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

  // Save profile to localStorage
  useEffect(() => {
    localStorage.setItem('dreamshape_profile', JSON.stringify(userProfile))
  }, [userProfile])

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

  // Inline rest timer countdown
  useEffect(() => {
    if (!activeRestTimer || activeRestTimer.timeRemaining <= 0) {
      if (activeRestTimer?.timeRemaining === 0) {
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200])
        }
      }
      return
    }

    const interval = setInterval(() => {
      setActiveRestTimer(prev => {
        if (!prev || prev.timeRemaining <= 0) return null
        return {
          ...prev,
          timeRemaining: prev.timeRemaining - 1
        }
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [activeRestTimer])

  // Get the last workout for a specific template and exercise
  const getLastWorkoutData = (templateName: string, exerciseName: string) => {
    const lastWorkout = workoutLogs.find(w => w.templateName === templateName)
    if (!lastWorkout) return null
    const exercise = lastWorkout.exercises.find(e => e.exerciseName === exerciseName)
    return exercise || null
  }

  // Get last workout data for any exercise (not template-specific)
  const getLastExerciseData = (exerciseName: string) => {
    for (const workout of workoutLogs) {
      const exercise = workout.exercises.find(e => e.exerciseName === exerciseName)
      if (exercise && exercise.sets.length > 0) {
        return exercise
      }
    }
    return null
  }

  // Generate auto workout name based on time of day
  const getAutoWorkoutName = () => {
    const now = new Date()
    const hour = now.getHours()
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' })

    let timeOfDay = 'Evening'
    if (hour >= 6 && hour < 12) timeOfDay = 'Morning'
    else if (hour >= 12 && hour < 15) timeOfDay = 'Lunch'
    else if (hour >= 15 && hour < 21) timeOfDay = 'Evening'
    else timeOfDay = 'Night'

    return `${dayName} ${timeOfDay} Workout`
  }

  const deleteTemplate = async (id: string) => {
    if (confirm('Delete this template?')) {
      setTemplates(templates.filter(t => t.id !== id))

      // Sync to Supabase
      if (syncService) {
        setIsSyncing(true)
        try {
          await syncService.deleteTemplate(id)
          setLastSyncTime(new Date())
        } catch (error) {
          console.error('Failed to delete template:', error)
        } finally {
          setIsSyncing(false)
        }
      }
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

    setOriginalTemplateExercises(template.exercises)
    setActiveWorkout({
      templateName: template.name,
      originalTemplateId: template.id,
      exercises: exerciseLogs,
      startTime: Date.now()
    })
  }

  const startEmptyWorkout = () => {
    setOriginalTemplateExercises([])
    setActiveWorkout({
      templateName: getAutoWorkoutName(),
      originalTemplateId: null,
      exercises: [],
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
      // Get rest duration for this exercise (or use global default)
      const exerciseRestDuration = updatedExercises[exerciseIndex].restDuration || restDuration

      // Start inline rest timer below this set
      setActiveRestTimer({
        exerciseIndex,
        afterSetIndex: setIndex,
        timeRemaining: exerciseRestDuration
      })
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

  const addExerciseToWorkout = (exerciseName: string, _muscleGroup: string, _equipment: string) => {
    if (!activeWorkout) return

    // Get last workout data for this exercise
    const lastData = getLastExerciseData(exerciseName)

    const newExercise: ExerciseLog = {
      exerciseId: crypto.randomUUID(),
      exerciseName,
      sets: lastData && lastData.sets.length > 0
        ? lastData.sets.map((set, idx) => ({
          id: (idx + 1).toString(),
          weight: set.weight,
          reps: set.reps,
          completed: false
        }))
        : [{ id: '1', weight: 0, reps: 0, completed: false }]
    }

    setActiveWorkout({
      ...activeWorkout,
      exercises: [...activeWorkout.exercises, newExercise]
    })
  }

  const removeExerciseFromWorkout = (exerciseIndex: number) => {
    if (!activeWorkout) return

    const exercise = activeWorkout.exercises[exerciseIndex]
    const completedSets = exercise.sets.filter(s => s.completed).length

    if (completedSets > 0) {
      if (!confirm(`You've completed ${completedSets} set(s). Remove "${exercise.exerciseName}" anyway?`)) {
        return
      }
    }

    const updatedExercises = activeWorkout.exercises.filter((_, idx) => idx !== exerciseIndex)
    setActiveWorkout({
      ...activeWorkout,
      exercises: updatedExercises
    })

    // Clear rest timer if it was for this exercise
    if (activeRestTimer?.exerciseIndex === exerciseIndex) {
      setActiveRestTimer(null)
    }
  }

  const setExerciseRestDuration = (exerciseIndex: number, duration: number) => {
    if (!activeWorkout) return

    const updatedExercises = [...activeWorkout.exercises]
    updatedExercises[exerciseIndex].restDuration = duration

    setActiveWorkout({
      ...activeWorkout,
      exercises: updatedExercises
    })
  }

  const reorderWorkoutExercises = (oldIndex: number, newIndex: number) => {
    if (!activeWorkout) return

    const updatedExercises = [...activeWorkout.exercises]
    const [movedExercise] = updatedExercises.splice(oldIndex, 1)
    updatedExercises.splice(newIndex, 0, movedExercise)

    setActiveWorkout({
      ...activeWorkout,
      exercises: updatedExercises
    })

    // Update active rest timer indices if affected
    if (activeRestTimer) {
      let newExerciseIndex = activeRestTimer.exerciseIndex

      if (activeRestTimer.exerciseIndex === oldIndex) {
        newExerciseIndex = newIndex
      } else if (oldIndex < activeRestTimer.exerciseIndex && newIndex >= activeRestTimer.exerciseIndex) {
        newExerciseIndex = activeRestTimer.exerciseIndex - 1
      } else if (oldIndex > activeRestTimer.exerciseIndex && newIndex <= activeRestTimer.exerciseIndex) {
        newExerciseIndex = activeRestTimer.exerciseIndex + 1
      }

      if (newExerciseIndex !== activeRestTimer.exerciseIndex) {
        setActiveRestTimer({
          ...activeRestTimer,
          exerciseIndex: newExerciseIndex
        })
      }
    }
  }

  const setWorkoutNotes = (notes: string) => {
    if (!activeWorkout) return

    setActiveWorkout({
      ...activeWorkout,
      notes
    })
  }

  const setExerciseNotes = (exerciseIndex: number, notes: string) => {
    if (!activeWorkout) return

    const updatedExercises = [...activeWorkout.exercises]
    updatedExercises[exerciseIndex].notes = notes

    setActiveWorkout({
      ...activeWorkout,
      exercises: updatedExercises
    })
  }

  const toggleSetType = (exerciseIndex: number, setIndex: number) => {
    if (!activeWorkout) return

    const updatedExercises = [...activeWorkout.exercises]
    const currentType = updatedExercises[exerciseIndex].sets[setIndex].type || 'working'
    updatedExercises[exerciseIndex].sets[setIndex].type = currentType === 'warmup' ? 'working' : 'warmup'

    setActiveWorkout({
      ...activeWorkout,
      exercises: updatedExercises
    })
  }

  const finishWorkout = () => {
    if (!activeWorkout) return
    setShowFinishModal(true)
  }

  const getWorkoutChanges = () => {
    if (!activeWorkout) return { hasChanges: false, added: [], removed: [] }

    const originalNames = originalTemplateExercises.map(e => e.name)
    const currentNames = activeWorkout.exercises.map(e => e.exerciseName)

    const added = currentNames.filter(name => !originalNames.includes(name))
    const removed = originalNames.filter(name => !currentNames.includes(name))

    return {
      hasChanges: added.length > 0 || removed.length > 0,
      added,
      removed
    }
  }



  const handleUpdateTemplate = async () => {
    if (!activeWorkout || !activeWorkout.originalTemplateId) return

    const updatedExercises: Exercise[] = activeWorkout.exercises.map(ex => ({
      id: ex.exerciseId,
      name: ex.exerciseName,
      equipment: 'Barbell', // Keep original or default
      muscleGroup: 'Other' // Keep original or default
    }))

    const updatedTemplate = templates.find(t => t.id === activeWorkout.originalTemplateId)
    if (!updatedTemplate) {
      console.error('Template not found for update')
      await saveWorkoutLog()
      return
    }

    const newTemplate = { ...updatedTemplate, exercises: updatedExercises }
    const updatedTemplates = templates.map(t =>
      t.id === activeWorkout.originalTemplateId ? newTemplate : t
    )

    // Update state & immediately save to localStorage
    setTemplates(updatedTemplates)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTemplates))
    console.log('💾 Template updated in localStorage:', newTemplate.name)

    // Sync to Supabase BEFORE saving workout
    if (syncService) {
      setIsSyncing(true)
      try {
        await syncService.updateTemplate(newTemplate)
        setLastSyncTime(new Date())
        console.log('☁️ Template synced to Supabase:', newTemplate.name)
      } catch (error) {
        console.error('Failed to sync template:', error)
      } finally {
        setIsSyncing(false)
      }
    }

    // Now save the workout
    await saveWorkoutLog()
  }

  const handleSaveAsNewTemplate = async (name: string, exercises: Exercise[]) => {
    // Check if template with same name already exists
    const existingTemplate = templates.find(t => t.name.toLowerCase() === name.toLowerCase())
    if (existingTemplate) {
      if (!confirm(`A template named "${name}" already exists. Create anyway?`)) {
        // Still save the workout, just don't create the duplicate template
        await saveWorkoutLog()
        return
      }
    }

    const newTemplate: WorkoutTemplate = {
      id: crypto.randomUUID(),
      name,
      exercises
    }

    // Update state & immediately save to localStorage
    const updatedTemplates = [...templates, newTemplate]
    setTemplates(updatedTemplates)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTemplates))
    console.log('💾 Template saved to localStorage:', newTemplate.name)

    // Sync to Supabase BEFORE saving workout
    if (syncService) {
      setIsSyncing(true)
      try {
        await syncService.createTemplate(newTemplate)
        setLastSyncTime(new Date())
        console.log('☁️ Template synced to Supabase:', newTemplate.name)
      } catch (error) {
        console.error('Failed to sync template:', error)
      } finally {
        setIsSyncing(false)
      }
    }

    // Now save the workout
    await saveWorkoutLog()
  }

  const handleJustFinish = async () => {
    await saveWorkoutLog()
  }

  const saveWorkoutLog = async () => {
    if (!activeWorkout) return

    const duration = Math.floor((Date.now() - activeWorkout.startTime) / 1000)

    const workoutLog: WorkoutLog = {
      id: crypto.randomUUID(),
      templateName: activeWorkout.templateName,
      date: new Date().toISOString(),
      exercises: activeWorkout.exercises,
      duration
    }

    const updatedWorkouts = [workoutLog, ...workoutLogs]
    setWorkoutLogs(updatedWorkouts)
    localStorage.setItem(WORKOUTS_KEY, JSON.stringify(updatedWorkouts))
    console.log('💾 Workout saved to localStorage:', workoutLog.templateName)

    // Sync to Supabase
    if (syncService) {
      setIsSyncing(true)
      try {
        await syncService.createWorkout(workoutLog)
        setLastSyncTime(new Date())
        console.log('☁️ Workout synced to Supabase:', workoutLog.templateName)
      } catch (error) {
        console.error('Failed to sync workout:', error)
      } finally {
        setIsSyncing(false)
      }
    }

    setActiveWorkout(null)
    setShowFinishModal(false)
    setOriginalTemplateExercises([])
  }

  const cancelWorkout = () => {
    if (confirm('Cancel this workout? All progress will be lost.')) {
      setActiveWorkout(null)
    }
  }

  const deleteWorkout = async (id: string) => {
    if (confirm('Delete this workout?')) {
      setWorkoutLogs(workoutLogs.filter(w => w.id !== id))
      if (selectedWorkout?.id === id) {
        setSelectedWorkout(null)
      }

      // Sync to Supabase
      if (syncService) {
        setIsSyncing(true)
        try {
          await syncService.deleteWorkout(id)
          setLastSyncTime(new Date())
        } catch (error) {
          console.error('Failed to delete workout:', error)
        } finally {
          setIsSyncing(false)
        }
      }
    }
  }

  const saveTemplate = async (name: string, exercises: Exercise[]) => {
    const template: WorkoutTemplate = selectedTemplate
      ? { ...selectedTemplate, name, exercises }
      : {
        id: crypto.randomUUID(), // Generate proper UUID
        name,
        exercises
      }

    // Update state & immediately save to localStorage
    let updatedTemplates: WorkoutTemplate[]
    if (selectedTemplate) {
      updatedTemplates = templates.map(t =>
        t.id === selectedTemplate.id ? template : t
      )
    } else {
      updatedTemplates = [...templates, template]
    }

    setTemplates(updatedTemplates)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTemplates))
    console.log('💾 Template saved to localStorage:', template.name)

    // Sync to Supabase
    if (syncService) {
      setIsSyncing(true)
      try {
        if (selectedTemplate) {
          await syncService.updateTemplate(template)
        } else {
          await syncService.createTemplate(template)
        }
        setLastSyncTime(new Date())
        console.log('☁️ Template synced to Supabase:', template.name)
      } catch (error) {
        console.error('Failed to sync template:', error)
      } finally {
        setIsSyncing(false)
      }
    }

    setIsCreating(false)
    setSelectedTemplate(null)
  }

  const editTemplate = (template: WorkoutTemplate) => {
    setSelectedTemplate(template)
    setIsCreating(true)
  }

  const addExerciseToDatabase = async (exercise: { name: string, muscleGroup: string, equipment: string }) => {
    setExerciseDatabase([...exerciseDatabase, exercise])

    // Sync to Supabase
    if (syncService) {
      setIsSyncing(true)
      try {
        await syncService.createCustomExercise(exercise)
        setLastSyncTime(new Date())
      } catch (error) {
        console.error('Failed to sync exercise:', error)
      } finally {
        setIsSyncing(false)
      }
    }
  }

  const deleteExerciseFromDatabase = async (exerciseName: string) => {
    if (confirm(`Delete "${exerciseName}" from database?`)) {
      setExerciseDatabase(exerciseDatabase.filter(ex => ex.name !== exerciseName))

      // Sync to Supabase
      if (syncService) {
        setIsSyncing(true)
        try {
          await syncService.deleteCustomExercise(exerciseName)
          setLastSyncTime(new Date())
        } catch (error) {
          console.error('Failed to delete exercise:', error)
        } finally {
          setIsSyncing(false)
        }
      }
    }
  }





  return (
    <div className="app">
      {/* Sync Indicator */}
      {user && (
        <SyncIndicator isSyncing={isSyncing} lastSyncTime={lastSyncTime} />
      )}
      {/* Loading Screen */}
      {authLoading ? (
        <div className="loading-screen">
          <h1 className="loading-logo">💪 DreamShape</h1>
          <p className="loading-text">Loading...</p>
        </div>
      ) : !user ? (
        /* Auth Screen */
        <AuthView onAuthSuccess={() => { }} />
      ) : (
        <>   { }
          {activeWorkout ? (
            <>
              <WorkoutView
                activeWorkout={activeWorkout}
                elapsedTime={elapsedTime}
                restTimer={restTimer}
                restDuration={restDuration}
                activeRestTimer={activeRestTimer}
                workoutLogs={workoutLogs}
                exerciseDatabase={exerciseDatabase}
                onCancel={cancelWorkout}
                onFinish={finishWorkout}
                onUpdateSet={updateSet}
                onToggleSetCompleted={toggleSetCompleted}
                onAddSet={addSet}
                onRemoveSet={removeSet}
                onSetRestDuration={setRestDuration}
                onSetExerciseRestDuration={setExerciseRestDuration}
                onSkipRest={() => setRestTimer(null)}
                onSkipInlineRest={() => setActiveRestTimer(null)}
                onAddExercise={addExerciseToWorkout}
                onRemoveExercise={removeExerciseFromWorkout}
                onReorderExercises={reorderWorkoutExercises}
                onSetWorkoutNotes={setWorkoutNotes}
                onSetExerciseNotes={setExerciseNotes}
                onToggleSetType={toggleSetType}
              />
              {showFinishModal && (
                <FinishWorkoutModal
                  originalTemplateName={activeWorkout.originalTemplateId ? templates.find(t => t.id === activeWorkout.originalTemplateId)?.name || null : null}
                  originalTemplateId={activeWorkout.originalTemplateId}
                  hasChanges={getWorkoutChanges().hasChanges}
                  changedExercises={{
                    added: getWorkoutChanges().added,
                    removed: getWorkoutChanges().removed
                  }}
                  currentExercises={activeWorkout.exercises.map(ex => ({
                    id: ex.exerciseId,
                    name: ex.exerciseName,
                    equipment: 'Barbell',
                    muscleGroup: 'Other'
                  }))}
                  onUpdateTemplate={handleUpdateTemplate}
                  onSaveAsNewTemplate={handleSaveAsNewTemplate}
                  onJustFinish={handleJustFinish}
                  onCancel={() => setShowFinishModal(false)}
                />
              )}
            </>
          ) : selectedWorkout ? (
            <WorkoutDetailView
              workout={selectedWorkout}
              onBack={() => setSelectedWorkout(null)}
              onDelete={deleteWorkout}
            />
          ) : !isCreating ? (
            <>
              {currentView === 'dashboard' && (
                <DashboardView
                  templates={templates}
                  workoutLogs={workoutLogs}
                  userProfile={userProfile}
                  onStartWorkout={startWorkout}
                  onStartEmptyWorkout={startEmptyWorkout}
                  onEditProfile={() => setCurrentView('profile')}
                  onViewAllTemplates={() => setCurrentView('library')}
                />
              )}

              {currentView === 'progress' && (
                <WorkoutsView
                  workoutLogs={workoutLogs}
                  onStartWorkout={startEmptyWorkout}
                  onSelectWorkout={setSelectedWorkout}
                />
              )}

              {currentView === 'start' && (
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
              )}

              {currentView === 'library' && (
                <LibraryView
                  templates={templates}
                  exerciseDatabase={exerciseDatabase}
                  onCreateTemplate={() => {
                    setSelectedTemplate(null)
                    setIsCreating(true)
                  }}
                  onEditTemplate={editTemplate}
                  onDeleteTemplate={deleteTemplate}
                  onStartWorkout={startWorkout}
                  onAddExercise={addExerciseToDatabase}
                  onDeleteExercise={deleteExerciseFromDatabase}
                />
              )}

              {currentView === 'profile' && (
                <ProfileView
                  userProfile={userProfile}
                  workoutLogs={workoutLogs}
                  onUpdateProfile={handleUpdateProfile}
                  onSignOut={handleSignOut}
                />
              )}

              {/* Bottom Navigation */}
              <BottomNav
                currentView={currentView}
                onNavigate={setCurrentView}
              />
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
        </>
      )}
    </div>
  )
}

export default App