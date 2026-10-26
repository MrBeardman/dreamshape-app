import { api } from './api'
import type { WorkoutTemplate, WorkoutLog, UserProfile, WeightEntry, RunLog, Habit, HabitCompletion, HabitCompletionStatus } from '../types'

type CustomExercise = { name: string; muscleGroup: string; equipment: string; trackingMode?: 'weight-reps' | 'time' }

// Local-first sync: the app writes to localStorage immediately and calls these methods to
// mirror the change to the server (server/routes/data.ts). The server takes the user from the
// session cookie, so no user id is sent. Which calls throw and which swallow errors is the same
// as it was with Supabase; callers in App.tsx rely on that for rollbacks.
export class SyncService {
  private userId: string
  private syncInProgress = false

  constructor(userId: string) {
    this.userId = userId
  }

  // ============================================
  // INITIAL MIGRATION (localStorage → server)
  // ============================================
  async migrateLocalDataToServer(): Promise<void> {
    if (this.syncInProgress) return
    this.syncInProgress = true

    try {
      const migrationKey = `migration_completed_${this.userId}`
      if (localStorage.getItem(migrationKey) === 'true') {
        this.syncInProgress = false
        return
      }

      const localProfile = this.getLocalProfile()
      const localTemplates = this.getLocalTemplates()
      const localWorkouts = this.getLocalWorkouts()
      const localExercises = this.getLocalExercises()
      const localWeightEntries = this.getLocalWeightEntries()
      const localRunLogs = this.getLocalRunLogs()

      if (localProfile) await this.updateProfile(localProfile)
      for (const template of localTemplates) await this.createTemplate(template)
      for (const workout of localWorkouts) await this.createWorkout(workout)
      for (const exercise of localExercises) await this.createCustomExercise(exercise)
      for (const entry of localWeightEntries) await this.upsertWeightEntry(entry)
      for (const run of localRunLogs) await this.createRunLog(run)

      localStorage.setItem(migrationKey, 'true')
    } catch (error) {
      console.error('Migration failed:', error)
      throw error
    } finally {
      this.syncInProgress = false
    }
  }

  // ============================================
  // LOAD DATA FROM SERVER
  // ============================================
  async loadAllData(): Promise<{
    profile: UserProfile | null
    templates: WorkoutTemplate[]
    workouts: WorkoutLog[]
    exercises: Array<CustomExercise>
    weightEntries: WeightEntry[]
    runLogs: RunLog[]
    habits: Habit[]
    habitCompletions: HabitCompletion[]
  }> {
    try {
      // The server already returns the client-side shapes (see GET /api/data).
      return await api('GET', '/data')
    } catch (error) {
      console.error('Failed to load data:', error)
      return {
        profile: this.getLocalProfile(),
        templates: this.getLocalTemplates(),
        workouts: this.getLocalWorkouts(),
        exercises: this.getLocalExercises(),
        weightEntries: this.getLocalWeightEntries(),
        runLogs: this.getLocalRunLogs(),
        habits: this.getLocalHabits(),
        habitCompletions: this.getLocalHabitCompletions(),
      }
    }
  }

  // ============================================
  // PROFILE
  // ============================================
  async updateProfile(profile: UserProfile): Promise<void> {
    try {
      await api('PUT', '/profile', {
        name: profile.name,
        role: profile.role ?? null,
        peakXp: profile.peakXp ?? 0,
        xpStartDate: profile.xpStartDate ?? null,
      })
      localStorage.setItem('dreamshape_profile', JSON.stringify(profile))
    } catch (error) {
      console.error('Failed to update profile:', error)
      localStorage.setItem('dreamshape_profile', JSON.stringify(profile))
    }
  }

  // ============================================
  // TEMPLATES
  // ============================================
  async createTemplate(template: WorkoutTemplate): Promise<void> {
    await api('POST', '/templates', {
      id: template.id,
      name: template.name,
      exercises: template.exercises,
      notes: template.notes || null,
    })
  }

  async updateTemplate(template: WorkoutTemplate): Promise<void> {
    await api('PUT', `/templates/${template.id}`, {
      name: template.name,
      exercises: template.exercises,
      notes: template.notes || null,
    })
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await api('DELETE', `/templates/${templateId}`)
  }

  // ============================================
  // WORKOUTS
  // ============================================
  async createWorkout(workout: WorkoutLog): Promise<void> {
    await api('POST', '/workouts', {
      id: workout.id,
      templateName: workout.templateName,
      date: workout.date,
      duration: workout.duration,
      exercises: workout.exercises,
      activityType: workout.activityType || 'workout',
    })
  }

  async updateWorkout(workoutId: string, updates: { duration?: number; date?: string }): Promise<void> {
    await api('PATCH', `/workouts/${workoutId}`, updates)
  }

  async deleteWorkout(workoutId: string): Promise<void> {
    await api('DELETE', `/workouts/${workoutId}`)
  }

  // ============================================
  // CUSTOM EXERCISES
  // ============================================
  async createCustomExercise(exercise: CustomExercise): Promise<void> {
    try {
      await api('POST', '/custom-exercises', {
        name: exercise.name,
        muscleGroup: exercise.muscleGroup,
        equipment: exercise.equipment,
        trackingMode: exercise.trackingMode ?? null,
      })
    } catch (error) {
      console.error('Failed to create custom exercise:', error)
    }
  }

  async deleteCustomExercise(exerciseName: string): Promise<void> {
    try {
      await api('DELETE', `/custom-exercises?name=${encodeURIComponent(exerciseName)}`)
    } catch (error) {
      console.error('Failed to delete custom exercise:', error)
    }
  }

  // ============================================
  // WEIGHT ENTRIES
  // ============================================
  async upsertWeightEntry(entry: WeightEntry): Promise<void> {
    await api('PUT', `/weight-entries/${entry.id}`, { date: entry.date, weight: entry.weight })
  }

  async deleteWeightEntry(entryId: string): Promise<void> {
    try {
      await api('DELETE', `/weight-entries/${entryId}`)
    } catch (error) {
      console.error('Failed to delete weight entry:', error)
    }
  }

  // ============================================
  // RUN LOGS
  // ============================================
  async createRunLog(run: RunLog): Promise<void> {
    await api('POST', '/run-logs', {
      id: run.id,
      date: run.date,
      distance: run.distance,
      duration: run.duration,
      averagePace: run.averagePace,
      paceIsManual: run.paceIsManual,
      averageHR: run.averageHR ?? null,
      difficulty: run.difficulty,
      notes: run.notes ?? null,
    })
  }

  async deleteRunLog(runId: string): Promise<void> {
    try {
      await api('DELETE', `/run-logs/${runId}`)
    } catch (error) {
      console.error('Failed to delete run log:', error)
    }
  }

  // ============================================
  // LOCALSTORAGE HELPERS
  // ============================================
  private getLocalProfile(): UserProfile | null {
    try { return JSON.parse(localStorage.getItem('dreamshape_profile') || 'null') } catch { return null }
  }

  private getLocalTemplates(): WorkoutTemplate[] {
    try { return JSON.parse(localStorage.getItem('dreamshape_templates') || '[]') } catch { return [] }
  }

  private getLocalWorkouts(): WorkoutLog[] {
    try { return JSON.parse(localStorage.getItem('dreamshape_workouts') || '[]') } catch { return [] }
  }

  private getLocalExercises(): Array<CustomExercise> {
    try { return JSON.parse(localStorage.getItem('dreamshape_exercises') || '[]') } catch { return [] }
  }

  private getLocalWeightEntries(): WeightEntry[] {
    try { return JSON.parse(localStorage.getItem('dreamshape_weight') || '[]') } catch { return [] }
  }

  private getLocalRunLogs(): RunLog[] {
    try { return JSON.parse(localStorage.getItem('dreamshape_runs') || '[]') } catch { return [] }
  }

  private getLocalHabits(): Habit[] {
    try { return JSON.parse(localStorage.getItem('dreamshape_habits') || '[]') } catch { return [] }
  }

  private getLocalHabitCompletions(): HabitCompletion[] {
    try { return JSON.parse(localStorage.getItem('dreamshape_habit_completions') || '[]') } catch { return [] }
  }

  // ============================================
  // HABITS
  // ============================================
  private habitBody(habit: Habit) {
    return {
      id: habit.id,
      name: habit.name,
      icon: habit.icon ?? null,
      recurrence: habit.recurrence,
      timeOfDay: habit.timeOfDay ?? null,
      linkedTemplateId: habit.linkedTemplateId ?? null,
      isActive: habit.isActive,
      sortOrder: habit.sortOrder,
      createdAt: habit.createdAt,
    }
  }

  async createHabit(habit: Habit): Promise<void> {
    await api('POST', '/habits', this.habitBody(habit))
  }

  async updateHabit(habit: Habit): Promise<void> {
    await api('PUT', `/habits/${habit.id}`, this.habitBody(habit))
  }

  async deleteHabit(habitId: string): Promise<void> {
    try {
      await api('DELETE', `/habits/${habitId}`)
    } catch (error) {
      console.error('Failed to delete habit:', error)
    }
  }

  async reorderHabits(habits: Habit[]): Promise<void> {
    try {
      await api('POST', '/habits/reorder', { items: habits.map(h => ({ id: h.id, sortOrder: h.sortOrder })) })
    } catch (error) {
      console.error('Failed to reorder habits:', error)
    }
  }

  async setHabitCompletion(habitId: string, date: string, status: HabitCompletionStatus | 'pending'): Promise<void> {
    if (status === 'pending') {
      try {
        await api('PUT', '/habit-completions', { habitId, date, status })
      } catch (error) {
        console.error('Failed to clear habit completion:', error)
      }
      return
    }
    await api('PUT', '/habit-completions', { habitId, date, status })
  }
}
