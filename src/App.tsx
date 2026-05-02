import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { SyncService } from './lib/syncService'
import SyncIndicator from './components/SyncIndicator'
import AuthView from './components/AuthView'
import type { User } from '@supabase/supabase-js'
import './App-redesign.css'
import type { WorkoutTemplate, WorkoutLog, ActiveWorkout, Exercise, ExerciseLog, UserProfile, WeightEntry, RunLog } from './types'
import { DEFAULT_EXERCISES } from './data/defaultExercises'
import WorkoutView from './components/WorkoutView'
import WorkoutDetailView from './components/WorkoutDetailView'
import TemplatesView from './components/TemplatesView'
import WorkoutsView from './components/WorkoutsView'
import CreateTemplateView from './components/CreateTemplateView'
import FinishWorkoutModal from './components/FinishWorkoutModal'
import ConfirmDialog from './components/ConfirmDialog'
import DashboardView from './components/DashboardView'
import BottomNav from './components/BottomNav'
import SidebarNav from './components/SidebarNav'
import ProfileView from './components/ProfileView'
import ExercisesView from './components/ExercisesView'
import ExerciseProgressSheet from './components/ExerciseProgressSheet'
import { useConfirm } from './hooks/useConfirm'
import { useWorkoutTimer } from './hooks/useWorkoutTimer'
import { requestNotificationPermission, scheduleRestNotification, cancelRestNotification } from './lib/notifications'

const STORAGE_KEY = 'dreamshape_templates'
const WORKOUTS_KEY = 'dreamshape_workouts'
const EXERCISES_KEY = 'dreamshape_exercises'
const ACTIVE_WORKOUT_KEY = 'dreamshape_active_workout'
const ORIGINAL_EXERCISES_KEY = 'dreamshape_original_exercises'
const WEIGHT_KEY = 'dreamshape_weight'
const RUNS_KEY = 'dreamshape_runs'

function App() {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
  })

  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>(() => {
    try { return JSON.parse(localStorage.getItem(WORKOUTS_KEY) || '[]') } catch { return [] }
  })

  const [exerciseDatabase, setExerciseDatabase] = useState<Array<{ name: string; muscleGroup: string; equipment: string }>>(() => {
    try {
      const saved = localStorage.getItem(EXERCISES_KEY)
      return saved ? JSON.parse(saved) : DEFAULT_EXERCISES
    } catch { return DEFAULT_EXERCISES }
  })

  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem(WEIGHT_KEY) || '[]') } catch { return [] }
  })

  const [runLogs, setRunLogs] = useState<RunLog[]>(() => {
    try { return JSON.parse(localStorage.getItem(RUNS_KEY) || '[]') } catch { return [] }
  })

  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [syncService, setSyncService] = useState<SyncService | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try { return JSON.parse(localStorage.getItem('dreamshape_profile') || 'null') || { name: 'User', memberSince: new Date().toISOString() } }
    catch { return { name: 'User', memberSince: new Date().toISOString() } }
  })

  const [isCreating, setIsCreating] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<WorkoutTemplate | null>(null)
  const [currentView, setCurrentView] = useState<'dashboard' | 'exercises' | 'start' | 'history' | 'profile'>('dashboard')
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutLog | null>(null)

  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(() => {
    try { return JSON.parse(localStorage.getItem(ACTIVE_WORKOUT_KEY) || 'null') } catch { return null }
  })
  const [showFinishModal, setShowFinishModal] = useState(false)
  const [showResumePrompt, setShowResumePrompt] = useState(false)
  const [workoutMinimized, setWorkoutMinimized] = useState(false)
  const [exerciseHistoryTarget, setExerciseHistoryTarget] = useState<string | null>(null)
  const [originalTemplateExercises, setOriginalTemplateExercises] = useState<Exercise[]>(() => {
    try { return JSON.parse(localStorage.getItem(ORIGINAL_EXERCISES_KEY) || '[]') } catch { return [] }
  })

  const { elapsedTime, restDuration, setRestDuration, activeRestTimer, setActiveRestTimer } =
    useWorkoutTimer(activeWorkout?.startTime ?? null)

  // ============================================
  // PERSISTENCE — localStorage
  // ============================================

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(templates)) }, [templates])
  useEffect(() => { localStorage.setItem(WORKOUTS_KEY, JSON.stringify(workoutLogs)) }, [workoutLogs])
  useEffect(() => { localStorage.setItem(EXERCISES_KEY, JSON.stringify(exerciseDatabase)) }, [exerciseDatabase])
  useEffect(() => { localStorage.setItem('dreamshape_profile', JSON.stringify(userProfile)) }, [userProfile])
  useEffect(() => { localStorage.setItem(WEIGHT_KEY, JSON.stringify(weightEntries)) }, [weightEntries])
  useEffect(() => { localStorage.setItem(RUNS_KEY, JSON.stringify(runLogs)) }, [runLogs])

  useEffect(() => {
    if (activeWorkout) localStorage.setItem(ACTIVE_WORKOUT_KEY, JSON.stringify(activeWorkout))
    else localStorage.removeItem(ACTIVE_WORKOUT_KEY)
  }, [activeWorkout])

  useEffect(() => {
    if (originalTemplateExercises.length > 0) localStorage.setItem(ORIGINAL_EXERCISES_KEY, JSON.stringify(originalTemplateExercises))
    else localStorage.removeItem(ORIGINAL_EXERCISES_KEY)
  }, [originalTemplateExercises])

  const { confirm: showConfirm, confirmDialogProps } = useConfirm()

  // ============================================
  // AUTH & SYNC
  // ============================================

  const handleInitialSync = async (sync: SyncService, supabaseUser: User) => {
    try {
      setIsSyncing(true)
      await sync.migrateLocalDataToSupabase()
      const data = await sync.loadAllData()

      if (data.profile) {
        const profileWithRole = { ...data.profile, role: supabaseUser.user_metadata?.role || data.profile.role }
        setUserProfile(profileWithRole)
        localStorage.setItem('dreamshape_profile', JSON.stringify(profileWithRole))
      } else if (supabaseUser) {
        const newProfile: UserProfile = {
          name: supabaseUser.email?.split('@')[0] || 'User',
          memberSince: supabaseUser.created_at || new Date().toISOString(),
          role: supabaseUser.user_metadata?.role || undefined,
        }
        setUserProfile(newProfile)
        localStorage.setItem('dreamshape_profile', JSON.stringify(newProfile))
      }

      setTemplates(data.templates)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.templates))

      setWorkoutLogs(data.workouts)
      localStorage.setItem(WORKOUTS_KEY, JSON.stringify(data.workouts))

      const allExercises = [
        ...DEFAULT_EXERCISES,
        ...data.exercises.filter(e => !DEFAULT_EXERCISES.some(d => d.name === e.name)),
      ]
      setExerciseDatabase(allExercises)
      localStorage.setItem(EXERCISES_KEY, JSON.stringify(allExercises))

      setWeightEntries(data.weightEntries)
      localStorage.setItem(WEIGHT_KEY, JSON.stringify(data.weightEntries))

      setRunLogs(data.runLogs)
      localStorage.setItem(RUNS_KEY, JSON.stringify(data.runLogs))

      setLastSyncTime(new Date())
    } catch (error) {
      console.error('Initial sync failed:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    let hasInitializedSync = false

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return
      setUser(session?.user ?? null)
      setAuthLoading(false)
      if (session?.user && !hasInitializedSync) {
        hasInitializedSync = true
        const sync = new SyncService(session.user.id)
        setSyncService(sync)
        handleInitialSync(sync, session.user)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return
      if (event === 'INITIAL_SESSION') return
      setUser(session?.user ?? null)
      if (session?.user && event === 'SIGNED_IN') {
        const sync = new SyncService(session.user.id)
        setSyncService(sync)
        handleInitialSync(sync, session.user)
      } else if (event === 'SIGNED_OUT') {
        setSyncService(null)
      }
    })

    return () => { isMounted = false; subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!authLoading && user && activeWorkout) setShowResumePrompt(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading])

  // ============================================
  // PROFILE
  // ============================================

  const handleUpdateProfile = async (profile: UserProfile) => {
    setUserProfile(profile)
    if (syncService) {
      setIsSyncing(true)
      try { await syncService.updateProfile(profile); setLastSyncTime(new Date()) }
      catch (error) { console.error('Failed to update profile:', error) }
      finally { setIsSyncing(false) }
    }
  }

  const handleSignOut = async () => {
    if (await showConfirm({ title: 'Sign out?', confirmLabel: 'Sign Out' })) {
      await supabase.auth.signOut()
      setSyncService(null)
      setLastSyncTime(null)
    }
  }

  // ============================================
  // TEMPLATES
  // ============================================

  const deleteTemplate = async (id: string) => {
    if (await showConfirm({ title: 'Delete Template?', message: 'This cannot be undone.', confirmLabel: 'Delete', danger: true })) {
      const previous = templates
      setTemplates(templates.filter(t => t.id !== id))
      if (syncService) {
        setIsSyncing(true)
        try { await syncService.deleteTemplate(id); setLastSyncTime(new Date()) }
        catch { setTemplates(previous) }
        finally { setIsSyncing(false) }
      }
    }
  }

  const saveTemplate = async (name: string, exercises: Exercise[]) => {
    const template: WorkoutTemplate = selectedTemplate
      ? { ...selectedTemplate, name, exercises }
      : { id: crypto.randomUUID(), name, exercises }

    const updatedTemplates = selectedTemplate
      ? templates.map(t => t.id === selectedTemplate.id ? template : t)
      : [...templates, template]

    setTemplates(updatedTemplates)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTemplates))

    if (syncService) {
      setIsSyncing(true)
      try {
        if (selectedTemplate) await syncService.updateTemplate(template)
        else await syncService.createTemplate(template)
        setLastSyncTime(new Date())
      } catch (error) { console.error('Failed to sync template:', error) }
      finally { setIsSyncing(false) }
    }

    setIsCreating(false)
    setSelectedTemplate(null)
  }

  const editTemplate = (template: WorkoutTemplate) => {
    setSelectedTemplate(template)
    setIsCreating(true)
  }

  // ============================================
  // EXERCISES
  // ============================================

  const addExerciseToDatabase = async (exercise: { name: string; muscleGroup: string; equipment: string }) => {
    setExerciseDatabase(prev => [...prev, exercise])
    if (syncService) {
      setIsSyncing(true)
      try { await syncService.createCustomExercise(exercise); setLastSyncTime(new Date()) }
      catch (error) { console.error('Failed to sync exercise:', error) }
      finally { setIsSyncing(false) }
    }
  }

  const deleteExerciseFromDatabase = async (name: string) => {
    if (await showConfirm({ title: 'Delete Exercise?', message: `Remove "${name}" from your library?`, confirmLabel: 'Delete', danger: true })) {
      setExerciseDatabase(prev => prev.filter(e => e.name !== name))
      if (syncService) {
        try { await syncService.deleteCustomExercise(name) }
        catch (error) { console.error('Failed to delete exercise:', error) }
      }
    }
  }

  // ============================================
  // WORKOUTS
  // ============================================

  const getLastWorkoutData = (templateName: string, exerciseName: string) => {
    const lastWorkout = workoutLogs.find(w => w.templateName === templateName)
    if (!lastWorkout) return null
    return lastWorkout.exercises.find(e => e.exerciseName === exerciseName) || null
  }

  const getLastExerciseData = (exerciseName: string) => {
    for (const workout of workoutLogs) {
      const exercise = workout.exercises.find(e => e.exerciseName === exerciseName)
      if (exercise && exercise.sets.length > 0) return exercise
    }
    return null
  }

  const getAutoWorkoutName = () => {
    const hour = new Date().getHours()
    const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })
    let timeOfDay = 'Evening'
    if (hour >= 6 && hour < 12) timeOfDay = 'Morning'
    else if (hour >= 12 && hour < 15) timeOfDay = 'Lunch'
    else if (hour >= 15 && hour < 21) timeOfDay = 'Evening'
    else timeOfDay = 'Night'
    return `${dayName} ${timeOfDay} Workout`
  }

  const startWorkout = (template: WorkoutTemplate) => {
    const exerciseLogs: ExerciseLog[] = template.exercises.map(ex => {
      const lastData = getLastWorkoutData(template.name, ex.name)
      if (lastData && lastData.sets.length > 0) {
        return {
          exerciseId: ex.id,
          exerciseName: ex.name,
          sets: lastData.sets.map(set => ({ id: crypto.randomUUID(), weight: set.weight, reps: set.reps, completed: false, type: set.type })),
        }
      }
      return { exerciseId: ex.id, exerciseName: ex.name, sets: [{ id: crypto.randomUUID(), weight: 0, reps: 0, completed: false }] }
    })
    setOriginalTemplateExercises(template.exercises)
    setActiveWorkout({ templateName: template.name, originalTemplateId: template.id, exercises: exerciseLogs, startTime: Date.now() })
    void requestNotificationPermission()
  }

  const startEmptyWorkout = () => {
    setOriginalTemplateExercises([])
    setActiveWorkout({ templateName: getAutoWorkoutName(), originalTemplateId: null, exercises: [], startTime: Date.now() })
    void requestNotificationPermission()
  }

  const updateSet = (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps', value: number) => {
    if (!activeWorkout) return
    setActiveWorkout({
      ...activeWorkout,
      exercises: activeWorkout.exercises.map((ex, ei) =>
        ei !== exerciseIndex ? ex : { ...ex, sets: ex.sets.map((s, si) => si !== setIndex ? s : { ...s, [field]: value }) }
      ),
    })
  }

  const toggleSetCompleted = (exerciseIndex: number, setIndex: number) => {
    if (!activeWorkout) return
    const exercise = activeWorkout.exercises[exerciseIndex]
    const isCompleting = !exercise.sets[setIndex].completed
    setActiveWorkout({
      ...activeWorkout,
      exercises: activeWorkout.exercises.map((ex, ei) =>
        ei !== exerciseIndex ? ex : { ...ex, sets: ex.sets.map((s, si) => si !== setIndex ? s : { ...s, completed: isCompleting }) }
      ),
    })
    if (isCompleting) {
      const restTime = exercise.restDuration || restDuration
      setActiveRestTimer({ exerciseIndex, afterSetIndex: setIndex, timeRemaining: restTime })
      void scheduleRestNotification(restTime, exercise.exerciseName)
    }
  }

  const addSet = (exerciseIndex: number) => {
    if (!activeWorkout) return
    setActiveWorkout({
      ...activeWorkout,
      exercises: activeWorkout.exercises.map((ex, ei) => {
        if (ei !== exerciseIndex) return ex
        const lastSet = ex.sets[ex.sets.length - 1]
        return { ...ex, sets: [...ex.sets, { id: crypto.randomUUID(), weight: lastSet?.weight || 0, reps: lastSet?.reps || 0, completed: false }] }
      }),
    })
  }

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    if (!activeWorkout) return
    if (activeWorkout.exercises[exerciseIndex].sets.length <= 1) return
    setActiveWorkout({
      ...activeWorkout,
      exercises: activeWorkout.exercises.map((ex, ei) =>
        ei !== exerciseIndex ? ex : { ...ex, sets: ex.sets.filter((_, si) => si !== setIndex) }
      ),
    })
  }

  const addExerciseToWorkout = (exerciseName: string, _muscleGroup: string, _equipment: string) => {
    if (!activeWorkout) return
    const lastData = getLastExerciseData(exerciseName)
    const newExercise: ExerciseLog = {
      exerciseId: crypto.randomUUID(),
      exerciseName,
      sets: lastData && lastData.sets.length > 0
        ? lastData.sets.map(set => ({ id: crypto.randomUUID(), weight: set.weight, reps: set.reps, completed: false, type: set.type }))
        : [{ id: crypto.randomUUID(), weight: 0, reps: 0, completed: false }],
    }
    setActiveWorkout({ ...activeWorkout, exercises: [...activeWorkout.exercises, newExercise] })
  }

  const createAndAddExerciseToWorkout = async (name: string, muscleGroup: string, equipment: string) => {
    await addExerciseToDatabase({ name, muscleGroup, equipment })
    addExerciseToWorkout(name, muscleGroup, equipment)
  }

  const switchExerciseInWorkout = (exerciseIndex: number, exerciseName: string, _muscleGroup: string, _equipment: string) => {
    if (!activeWorkout) return
    const lastData = getLastExerciseData(exerciseName)
    const newExercise: ExerciseLog = {
      exerciseId: crypto.randomUUID(),
      exerciseName,
      sets: lastData && lastData.sets.length > 0
        ? lastData.sets.map(set => ({ id: crypto.randomUUID(), weight: set.weight, reps: set.reps, completed: false, type: set.type }))
        : [{ id: crypto.randomUUID(), weight: 0, reps: 0, completed: false }],
    }
    const updatedExercises = [...activeWorkout.exercises]
    updatedExercises[exerciseIndex] = newExercise
    setActiveWorkout({ ...activeWorkout, exercises: updatedExercises })
  }

  const createAndSwitchExerciseInWorkout = async (exerciseIndex: number, name: string, muscleGroup: string, equipment: string) => {
    await addExerciseToDatabase({ name, muscleGroup, equipment })
    switchExerciseInWorkout(exerciseIndex, name, muscleGroup, equipment)
  }

  const removeExerciseFromWorkout = async (exerciseIndex: number) => {
    if (!activeWorkout) return
    const exercise = activeWorkout.exercises[exerciseIndex]
    const completedSets = exercise.sets.filter(s => s.completed).length
    if (completedSets > 0) {
      const ok = await showConfirm({
        title: `Remove ${exercise.exerciseName}?`,
        message: `You've completed ${completedSets} set${completedSets > 1 ? 's' : ''}. Progress will be lost.`,
        confirmLabel: 'Remove',
        danger: true,
      })
      if (!ok) return
    }
    const updatedExercises = activeWorkout.exercises.filter((_, idx) => idx !== exerciseIndex)
    setActiveWorkout({ ...activeWorkout, exercises: updatedExercises })
    if (activeRestTimer?.exerciseIndex === exerciseIndex) setActiveRestTimer(null)
  }

  const setExerciseRestDuration = (exerciseIndex: number, duration: number) => {
    if (!activeWorkout) return
    setActiveWorkout({
      ...activeWorkout,
      exercises: activeWorkout.exercises.map((ex, idx) => idx !== exerciseIndex ? ex : { ...ex, restDuration: duration }),
    })
  }

  const reorderWorkoutExercises = (oldIndex: number, newIndex: number) => {
    if (!activeWorkout) return
    const updatedExercises = [...activeWorkout.exercises]
    const [movedExercise] = updatedExercises.splice(oldIndex, 1)
    updatedExercises.splice(newIndex, 0, movedExercise)
    setActiveWorkout({ ...activeWorkout, exercises: updatedExercises })
    if (activeRestTimer) {
      let newExerciseIndex = activeRestTimer.exerciseIndex
      if (activeRestTimer.exerciseIndex === oldIndex) newExerciseIndex = newIndex
      else if (oldIndex < activeRestTimer.exerciseIndex && newIndex >= activeRestTimer.exerciseIndex) newExerciseIndex--
      else if (oldIndex > activeRestTimer.exerciseIndex && newIndex <= activeRestTimer.exerciseIndex) newExerciseIndex++
      if (newExerciseIndex !== activeRestTimer.exerciseIndex) setActiveRestTimer({ ...activeRestTimer, exerciseIndex: newExerciseIndex })
    }
  }

  const setWorkoutNotes = (notes: string) => {
    if (!activeWorkout) return
    setActiveWorkout({ ...activeWorkout, notes })
  }

  const setExerciseNotes = (exerciseIndex: number, notes: string) => {
    if (!activeWorkout) return
    const updatedExercises = [...activeWorkout.exercises]
    updatedExercises[exerciseIndex].notes = notes
    setActiveWorkout({ ...activeWorkout, exercises: updatedExercises })
  }

  const toggleSetType = (exerciseIndex: number, setIndex: number) => {
    if (!activeWorkout) return
    const updatedExercises = [...activeWorkout.exercises]
    const currentType = updatedExercises[exerciseIndex].sets[setIndex].type || 'working'
    updatedExercises[exerciseIndex].sets[setIndex].type = currentType === 'warmup' ? 'working' : 'warmup'
    setActiveWorkout({ ...activeWorkout, exercises: updatedExercises })
  }

  const finishWorkout = () => { if (activeWorkout) setShowFinishModal(true) }

  const getWorkoutChanges = () => {
    if (!activeWorkout) return { hasChanges: false, added: [], removed: [], isReordered: false }
    const originalNames = originalTemplateExercises.map(e => e.name)
    const currentNames = activeWorkout.exercises.map(e => e.exerciseName)
    const added = currentNames.filter(name => !originalNames.includes(name))
    const removed = originalNames.filter(name => !currentNames.includes(name))
    const commonOriginalOrder = originalNames.filter(n => currentNames.includes(n))
    const commonCurrentOrder = currentNames.filter(n => originalNames.includes(n))
    const isReordered = commonOriginalOrder.some((name, i) => commonCurrentOrder[i] !== name)
    return { hasChanges: added.length > 0 || removed.length > 0 || isReordered, added, removed, isReordered }
  }

  const resolveExerciseFromLog = (ex: ExerciseLog, originalTemplateId?: string | null): Exercise => {
    if (originalTemplateId) {
      const originalTemplate = templates.find(t => t.id === originalTemplateId)
      const fromTemplate = originalTemplate?.exercises.find(e => e.id === ex.exerciseId || e.name === ex.exerciseName)
      if (fromTemplate) return { ...fromTemplate, name: ex.exerciseName }
    }
    const fromDb = exerciseDatabase.find(e => e.name === ex.exerciseName)
    return { id: ex.exerciseId, name: ex.exerciseName, equipment: fromDb?.equipment ?? 'Barbell', muscleGroup: fromDb?.muscleGroup ?? 'Other' }
  }

  const handleUpdateTemplate = async () => {
    if (!activeWorkout || !activeWorkout.originalTemplateId) return
    const originalTemplate = templates.find(t => t.id === activeWorkout.originalTemplateId)
    if (!originalTemplate) { await saveWorkoutLog(); return }
    const updatedExercises: Exercise[] = activeWorkout.exercises.map(ex => resolveExerciseFromLog(ex, activeWorkout.originalTemplateId))
    const newTemplate = { ...originalTemplate, exercises: updatedExercises }
    const updatedTemplates = templates.map(t => t.id === activeWorkout.originalTemplateId ? newTemplate : t)
    setTemplates(updatedTemplates)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTemplates))
    if (syncService) {
      setIsSyncing(true)
      try { await syncService.updateTemplate(newTemplate); setLastSyncTime(new Date()) }
      catch (error) { console.error('Failed to sync template:', error) }
      finally { setIsSyncing(false) }
    }
    await saveWorkoutLog()
  }

  const handleSaveAsNewTemplate = async (name: string, exercises: Exercise[]) => {
    const existingTemplate = templates.find(t => t.name.toLowerCase() === name.toLowerCase())
    if (existingTemplate) {
      const ok = await showConfirm({ title: 'Template Already Exists', message: `"${name}" already exists. Create a duplicate anyway?`, confirmLabel: 'Create Anyway' })
      if (!ok) { await saveWorkoutLog(); return }
    }
    const newTemplate: WorkoutTemplate = { id: crypto.randomUUID(), name, exercises }
    const updatedTemplates = [...templates, newTemplate]
    setTemplates(updatedTemplates)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTemplates))
    if (syncService) {
      setIsSyncing(true)
      try { await syncService.createTemplate(newTemplate); setLastSyncTime(new Date()) }
      catch (error) { console.error('Failed to sync template:', error) }
      finally { setIsSyncing(false) }
    }
    await saveWorkoutLog()
  }

  const handleJustFinish = async () => { await saveWorkoutLog() }

  const saveWorkoutLog = async () => {
    if (!activeWorkout) return
    const duration = Math.floor((Date.now() - activeWorkout.startTime) / 1000)
    const workoutLog: WorkoutLog = {
      id: crypto.randomUUID(),
      templateName: activeWorkout.templateName,
      date: new Date().toISOString(),
      exercises: activeWorkout.exercises,
      duration,
    }
    const updatedWorkouts = [workoutLog, ...workoutLogs]
    setWorkoutLogs(updatedWorkouts)
    localStorage.setItem(WORKOUTS_KEY, JSON.stringify(updatedWorkouts))
    if (syncService) {
      setIsSyncing(true)
      try { await syncService.createWorkout(workoutLog); setLastSyncTime(new Date()) }
      catch (error) { console.error('Failed to sync workout:', error) }
      finally { setIsSyncing(false) }
    }
    setActiveWorkout(null)
    setShowFinishModal(false)
    setOriginalTemplateExercises([])
    setWorkoutMinimized(false)
  }

  const cancelWorkout = async () => {
    if (await showConfirm({ title: 'Cancel Workout?', message: 'All progress will be lost.', confirmLabel: 'Cancel Workout', danger: true })) {
      setActiveWorkout(null)
      setWorkoutMinimized(false)
    }
  }

  const deleteWorkout = async (id: string) => {
    if (await showConfirm({ title: 'Delete Workout?', message: 'This cannot be undone.', confirmLabel: 'Delete', danger: true })) {
      const previous = workoutLogs
      setWorkoutLogs(workoutLogs.filter(w => w.id !== id))
      if (selectedWorkout?.id === id) setSelectedWorkout(null)
      if (syncService) {
        setIsSyncing(true)
        try { await syncService.deleteWorkout(id); setLastSyncTime(new Date()) }
        catch { setWorkoutLogs(previous) }
        finally { setIsSyncing(false) }
      }
    }
  }

  const updateWorkoutDuration = async (id: string, newDurationSeconds: number) => {
    setWorkoutLogs(prev => prev.map(w => w.id === id ? { ...w, duration: newDurationSeconds } : w))
    if (selectedWorkout?.id === id) setSelectedWorkout(prev => prev ? { ...prev, duration: newDurationSeconds } : prev)
    if (syncService) {
      try { await syncService.updateWorkout(id, { duration: newDurationSeconds }) }
      catch (error) { console.error('Failed to update workout duration:', error) }
    }
  }

  // ============================================
  // WEIGHT ENTRIES
  // ============================================

  const addWeightEntry = async (entry: WeightEntry) => {
    setWeightEntries(prev => [...prev, entry].sort((a, b) => a.date.localeCompare(b.date)))
    if (syncService) {
      try { await syncService.upsertWeightEntry(entry) }
      catch (error) { console.error('Failed to sync weight entry:', error) }
    }
  }

  const deleteWeightEntry = async (id: string) => {
    setWeightEntries(prev => prev.filter(e => e.id !== id))
    if (syncService) {
      try { await syncService.deleteWeightEntry(id) }
      catch (error) { console.error('Failed to delete weight entry:', error) }
    }
  }

  // ============================================
  // RUN LOGS
  // ============================================

  const addRunLog = async (run: RunLog) => {
    setRunLogs(prev => [run, ...prev])
    if (syncService) {
      setIsSyncing(true)
      try { await syncService.createRunLog(run); setLastSyncTime(new Date()) }
      catch (error) { console.error('Failed to sync run log:', error) }
      finally { setIsSyncing(false) }
    }
  }

  const deleteRunLog = async (id: string) => {
    if (await showConfirm({ title: 'Delete Run?', message: 'This cannot be undone.', confirmLabel: 'Delete', danger: true })) {
      setRunLogs(prev => prev.filter(r => r.id !== id))
      if (syncService) {
        try { await syncService.deleteRunLog(id) }
        catch (error) { console.error('Failed to delete run log:', error) }
      }
    }
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <>
    <div className="app">
      {authLoading ? (
        <div className="loading-screen">
          <h1 className="loading-logo">💪 DreamShape</h1>
          <p className="loading-text">Loading...</p>
        </div>
      ) : !user ? (
        <AuthView onAuthSuccess={() => { }} />
      ) : (
        <>
          {!activeWorkout && !selectedWorkout && !isCreating && (
            <SidebarNav currentView={currentView} onNavigate={setCurrentView} userName={userProfile.name} userProfile={userProfile} />
          )}

          <div className="desktop-main">
            <div className="desktop-content">
              {user && <SyncIndicator isSyncing={isSyncing} lastSyncTime={lastSyncTime} />}

              {activeWorkout && !showResumePrompt && !workoutMinimized ? (
                <>
                  <WorkoutView
                    activeWorkout={activeWorkout}
                    elapsedTime={elapsedTime}
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
                    onSkipInlineRest={() => { setActiveRestTimer(null); void cancelRestNotification() }}
                    onAddExercise={addExerciseToWorkout}
                    onRemoveExercise={removeExerciseFromWorkout}
                    onReorderExercises={reorderWorkoutExercises}
                    onSetWorkoutNotes={setWorkoutNotes}
                    onSetExerciseNotes={setExerciseNotes}
                    onToggleSetType={toggleSetType}
                    onCreateAndAddExercise={createAndAddExerciseToWorkout}
                    onSwitchExercise={switchExerciseInWorkout}
                    onCreateAndSwitchExercise={createAndSwitchExerciseInWorkout}
                    onViewExerciseHistory={setExerciseHistoryTarget}
                    onMinimize={() => setWorkoutMinimized(true)}
                  />
                  {showFinishModal && (() => {
                    const workoutChanges = getWorkoutChanges()
                    return (
                      <FinishWorkoutModal
                        originalTemplateName={activeWorkout.originalTemplateId ? templates.find(t => t.id === activeWorkout.originalTemplateId)?.name || null : null}
                        originalTemplateId={activeWorkout.originalTemplateId}
                        hasChanges={workoutChanges.hasChanges}
                        changedExercises={{ added: workoutChanges.added, removed: workoutChanges.removed, isReordered: workoutChanges.isReordered }}
                        currentExercises={activeWorkout.exercises.map(ex => resolveExerciseFromLog(ex, activeWorkout.originalTemplateId))}
                        exerciseLogs={activeWorkout.exercises}
                        duration={Math.floor((Date.now() - activeWorkout.startTime) / 1000)}
                        workoutLogs={workoutLogs}
                        onUpdateTemplate={handleUpdateTemplate}
                        onSaveAsNewTemplate={handleSaveAsNewTemplate}
                        onJustFinish={handleJustFinish}
                        onCancel={() => setShowFinishModal(false)}
                      />
                    )
                  })()}
                </>
              ) : selectedWorkout ? (
                <WorkoutDetailView
                  workout={selectedWorkout}
                  onBack={() => setSelectedWorkout(null)}
                  onDelete={deleteWorkout}
                  onUpdateDuration={updateWorkoutDuration}
                />
              ) : !isCreating ? (
                <>
                  {currentView === 'dashboard' && (
                    <DashboardView
                      templates={templates}
                      workoutLogs={workoutLogs}
                      runLogs={runLogs}
                      userProfile={userProfile}
                      exerciseDatabase={exerciseDatabase}
                      onStartWorkout={startWorkout}
                      onStartEmptyWorkout={startEmptyWorkout}
                      onViewAllTemplates={() => setCurrentView('start')}
                      onViewHistory={() => setCurrentView('history')}
                    />
                  )}

                  {currentView === 'exercises' && (
                    <ExercisesView
                      exerciseDatabase={exerciseDatabase}
                      workoutLogs={workoutLogs}
                      onAddToDatabase={addExerciseToDatabase}
                      onDeleteFromDatabase={deleteExerciseFromDatabase}
                    />
                  )}

                  {currentView === 'history' && (
                    <WorkoutsView
                      workoutLogs={workoutLogs}
                      weightEntries={weightEntries}
                      runLogs={runLogs}
                      onStartWorkout={startEmptyWorkout}
                      onSelectWorkout={setSelectedWorkout}
                      onDeleteWorkout={deleteWorkout}
                      onAddWeightEntry={addWeightEntry}
                      onDeleteWeightEntry={deleteWeightEntry}
                      onAddRun={addRunLog}
                      onDeleteRun={deleteRunLog}
                    />
                  )}

                  {currentView === 'start' && (
                    <TemplatesView
                      templates={templates}
                      workoutLogs={workoutLogs}
                      onCreateTemplate={() => { setSelectedTemplate(null); setIsCreating(true) }}
                      onEditTemplate={editTemplate}
                      onDeleteTemplate={deleteTemplate}
                      onStartWorkout={startWorkout}
                    />
                  )}

                  {currentView === 'profile' && (
                    <ProfileView
                      userProfile={userProfile}
                      workoutLogs={workoutLogs}
                      weightEntries={weightEntries}
                      onUpdateProfile={handleUpdateProfile}
                      onSignOut={handleSignOut}
                    />
                  )}

                  <BottomNav currentView={currentView} onNavigate={setCurrentView} />
                </>
              ) : (
                <CreateTemplateView
                  exerciseDatabase={exerciseDatabase}
                  templateToEdit={selectedTemplate}
                  onSave={saveTemplate}
                  onCancel={() => { setIsCreating(false); setSelectedTemplate(null) }}
                  onAddToDatabase={addExerciseToDatabase}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>

    {workoutMinimized && activeWorkout && (
      <div className="workout-minimized-bar" onClick={() => setWorkoutMinimized(false)}>
        <div className="minimized-bar-left">
          <span className="minimized-bar-dot" />
          <div className="minimized-bar-info">
            <span className="minimized-bar-name">{activeWorkout.templateName}</span>
            <span className="minimized-bar-time">{Math.floor(elapsedTime / 60)}:{String(elapsedTime % 60).padStart(2, '0')} · In progress</span>
          </div>
        </div>
        <button className="minimized-bar-resume" onClick={(e) => { e.stopPropagation(); setWorkoutMinimized(false) }}>Resume</button>
      </div>
    )}

    {showResumePrompt && activeWorkout && (
      <div className="confirm-dialog-overlay" style={{ zIndex: 400 }}>
        <div className="confirm-dialog">
          <h3 className="confirm-title">Resume workout?</h3>
          <p className="confirm-message">
            <strong>{activeWorkout.templateName}</strong> was started{' '}
            {Math.round((Date.now() - activeWorkout.startTime) / 60000)} min ago.
          </p>
          <div className="confirm-actions">
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setActiveWorkout(null); setOriginalTemplateExercises([]); setShowResumePrompt(false) }}>
              Discard
            </button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setShowResumePrompt(false)}>
              Resume
            </button>
          </div>
        </div>
      </div>
    )}

    {confirmDialogProps && <ConfirmDialog {...confirmDialogProps} />}
    {exerciseHistoryTarget && (
      <ExerciseProgressSheet
        exerciseName={exerciseHistoryTarget}
        workoutLogs={workoutLogs}
        onClose={() => setExerciseHistoryTarget(null)}
      />
    )}
    </>
  )
}

export default App
