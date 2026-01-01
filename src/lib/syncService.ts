import { supabase } from './supabase'
import type { WorkoutTemplate, WorkoutLog, UserProfile } from '../types'

// ============================================
// SYNC SERVICE
// Handles syncing between localStorage and Supabase
// ============================================

export class SyncService {
  private userId: string
  private syncInProgress = false

  constructor(userId: string) {
    this.userId = userId
  }

  // ============================================
  // INITIAL MIGRATION (localStorage → Supabase)
  // ============================================
  async migrateLocalDataToSupabase(): Promise<void> {
    if (this.syncInProgress) return
    this.syncInProgress = true

    try {
      console.log('🔄 Starting data migration...')

      // Check if migration already happened
      const migrationKey = `migration_completed_${this.userId}`
      if (localStorage.getItem(migrationKey) === 'true') {
        console.log('✅ Migration already completed')
        this.syncInProgress = false
        return
      }

      // Get localStorage data
      const localTemplates = this.getLocalTemplates()
      const localWorkouts = this.getLocalWorkouts()
      const localExercises = this.getLocalExercises()
      const localProfile = this.getLocalProfile()

      // Migrate profile
      if (localProfile) {
        await this.updateProfile(localProfile)
      }

      // Migrate templates
      for (const template of localTemplates) {
        await this.createTemplate(template)
      }

      // Migrate workouts
      for (const workout of localWorkouts) {
        await this.createWorkout(workout)
      }

      // Migrate custom exercises
      for (const exercise of localExercises) {
        await this.createCustomExercise(exercise)
      }

      // Mark migration as complete
      localStorage.setItem(migrationKey, 'true')
      console.log('✅ Migration completed!')
    } catch (error) {
      console.error('❌ Migration failed:', error)
      throw error
    } finally {
      this.syncInProgress = false
    }
  }

  // ============================================
  // LOAD DATA FROM SUPABASE
  // ============================================
  async loadAllData(): Promise<{
    profile: UserProfile | null
    templates: WorkoutTemplate[]
    workouts: WorkoutLog[]
    exercises: Array<{name: string, muscleGroup: string, equipment: string}>
  }> {
    try {
      console.log('📥 Loading data from Supabase...')

      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', this.userId)
        .single()

      const profile: UserProfile | null = profileData
        ? {
            name: profileData.name,
            memberSince: profileData.member_since,
          }
        : null

      // Load templates
      const { data: templatesData } = await supabase
        .from('templates')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false })

      const templates: WorkoutTemplate[] = (templatesData || []).map(t => ({
        id: t.id,
        name: t.name,
        exercises: t.exercises,
        notes: t.notes,
      }))

      // Load workouts
      const { data: workoutsData } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', this.userId)
        .order('date', { ascending: false })

      const workouts: WorkoutLog[] = (workoutsData || []).map(w => ({
        id: w.id,
        templateName: w.template_name,
        date: w.date,
        exercises: w.exercises,
        duration: w.duration,
        activityType: w.activity_type,
      }))

      // Load custom exercises
      const { data: exercisesData } = await supabase
        .from('custom_exercises')
        .select('*')
        .eq('user_id', this.userId)
        .order('name')

      const exercises = (exercisesData || []).map(e => ({
        name: e.name,
        muscleGroup: e.muscle_group,
        equipment: e.equipment,
      }))

      console.log('✅ Data loaded from Supabase')
      return { profile, templates, workouts, exercises }
    } catch (error) {
      console.error('❌ Failed to load data:', error)
      
      // Fallback to localStorage
      return {
        profile: this.getLocalProfile(),
        templates: this.getLocalTemplates(),
        workouts: this.getLocalWorkouts(),
        exercises: this.getLocalExercises(),
      }
    }
  }

  // ============================================
  // PROFILE OPERATIONS
  // ============================================
  async updateProfile(profile: UserProfile): Promise<void> {
    try {
      await supabase
        .from('profiles')
        .update({
          name: profile.name,
        })
        .eq('id', this.userId)

      // Also save to localStorage for offline
      localStorage.setItem('dreamshape_profile', JSON.stringify(profile))
    } catch (error) {
      console.error('Failed to update profile:', error)
      // Still save to localStorage
      localStorage.setItem('dreamshape_profile', JSON.stringify(profile))
    }
  }

  // ============================================
  // TEMPLATE OPERATIONS
  // ============================================
  async createTemplate(template: WorkoutTemplate): Promise<void> {
    try {
      await supabase.from('templates').insert({
        id: template.id,
        user_id: this.userId,
        name: template.name,
        exercises: template.exercises,
        notes: template.notes,
      })
    } catch (error) {
      console.error('Failed to create template:', error)
    }
  }

  async updateTemplate(template: WorkoutTemplate): Promise<void> {
    try {
      await supabase
        .from('templates')
        .update({
          name: template.name,
          exercises: template.exercises,
          notes: template.notes,
        })
        .eq('id', template.id)
        .eq('user_id', this.userId)
    } catch (error) {
      console.error('Failed to update template:', error)
    }
  }

  async deleteTemplate(templateId: string): Promise<void> {
    try {
      await supabase
        .from('templates')
        .delete()
        .eq('id', templateId)
        .eq('user_id', this.userId)
    } catch (error) {
      console.error('Failed to delete template:', error)
    }
  }

  // ============================================
  // WORKOUT OPERATIONS
  // ============================================
  async createWorkout(workout: WorkoutLog): Promise<void> {
    try {
      await supabase.from('workouts').insert({
        id: workout.id,
        user_id: this.userId,
        template_name: workout.templateName,
        date: workout.date,
        duration: workout.duration,
        exercises: workout.exercises,
        activity_type: workout.activityType || 'workout',
      })
    } catch (error) {
      console.error('Failed to create workout:', error)
    }
  }

  async deleteWorkout(workoutId: string): Promise<void> {
    try {
      await supabase
        .from('workouts')
        .delete()
        .eq('id', workoutId)
        .eq('user_id', this.userId)
    } catch (error) {
      console.error('Failed to delete workout:', error)
    }
  }

  // ============================================
  // CUSTOM EXERCISE OPERATIONS
  // ============================================
  async createCustomExercise(exercise: {name: string, muscleGroup: string, equipment: string}): Promise<void> {
    try {
      await supabase.from('custom_exercises').insert({
        user_id: this.userId,
        name: exercise.name,
        muscle_group: exercise.muscleGroup,
        equipment: exercise.equipment,
      })
    } catch (error) {
      // Ignore duplicate errors
      if (!(error as any)?.message?.includes('duplicate')) {
        console.error('Failed to create custom exercise:', error)
      }
    }
  }

  async deleteCustomExercise(exerciseName: string): Promise<void> {
    try {
      await supabase
        .from('custom_exercises')
        .delete()
        .eq('name', exerciseName)
        .eq('user_id', this.userId)
    } catch (error) {
      console.error('Failed to delete custom exercise:', error)
    }
  }

  // ============================================
  // LOCALSTORAGE HELPERS
  // ============================================
  private getLocalTemplates(): WorkoutTemplate[] {
    const saved = localStorage.getItem('dreamshape_templates')
    if (!saved) return []
    try {
      return JSON.parse(saved)
    } catch {
      return []
    }
  }

  private getLocalWorkouts(): WorkoutLog[] {
    const saved = localStorage.getItem('dreamshape_workouts')
    if (!saved) return []
    try {
      return JSON.parse(saved)
    } catch {
      return []
    }
  }

  private getLocalExercises(): Array<{name: string, muscleGroup: string, equipment: string}> {
    const saved = localStorage.getItem('dreamshape_exercises')
    if (!saved) return []
    try {
      return JSON.parse(saved)
    } catch {
      return []
    }
  }

  private getLocalProfile(): UserProfile | null {
    const saved = localStorage.getItem('dreamshape_profile')
    if (!saved) return null
    try {
      return JSON.parse(saved)
    } catch {
      return null
    }
  }
}