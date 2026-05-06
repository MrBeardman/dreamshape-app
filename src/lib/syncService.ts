import { supabase } from './supabase'
import type { WorkoutTemplate, WorkoutLog, UserProfile, WeightEntry, RunLog, TrainingPlan } from '../types'

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
      const localPlan = this.getLocalPlan()
      if (localPlan) await this.upsertPlan(localPlan)

      localStorage.setItem(migrationKey, 'true')
    } catch (error) {
      console.error('Migration failed:', error)
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
    exercises: Array<{ name: string; muscleGroup: string; equipment: string }>
    weightEntries: WeightEntry[]
    runLogs: RunLog[]
    activePlan: TrainingPlan | null
  }> {
    try {
      const [profileRes, templatesRes, workoutsRes, exercisesRes, weightRes, runsRes, plansRes] =
        await Promise.all([
          supabase.from('profiles').select('*').eq('id', this.userId).single(),
          supabase.from('templates').select('*').eq('user_id', this.userId).order('created_at', { ascending: false }),
          supabase.from('workouts').select('*').eq('user_id', this.userId).order('date', { ascending: false }),
          supabase.from('custom_exercises').select('*').eq('user_id', this.userId).order('name'),
          supabase.from('weight_entries').select('*').eq('user_id', this.userId).order('date', { ascending: true }),
          supabase.from('run_logs').select('*').eq('user_id', this.userId).order('date', { ascending: false }),
          supabase.from('training_plans').select('*').eq('user_id', this.userId).eq('is_active', true).maybeSingle(),
        ])

      const profile: UserProfile | null = profileRes.data
        ? {
            name: profileRes.data.name,
            memberSince: profileRes.data.member_since,
            role: profileRes.data.role ?? undefined,
          }
        : null

      const templates: WorkoutTemplate[] = (templatesRes.data || []).map(t => ({
        id: t.id,
        name: t.name,
        exercises: t.exercises,
        notes: t.notes,
      }))

      const workouts: WorkoutLog[] = (workoutsRes.data || []).map(w => ({
        id: w.id,
        templateName: w.template_name,
        date: w.date,
        exercises: w.exercises,
        duration: w.duration,
        activityType: w.activity_type,
      }))

      const exercises = (exercisesRes.data || []).map(e => ({
        name: e.name,
        muscleGroup: e.muscle_group,
        equipment: e.equipment,
      }))

      const weightEntries: WeightEntry[] = (weightRes.data || []).map(e => ({
        id: e.id,
        date: e.date,
        weight: e.weight,
      }))

      const runLogs: RunLog[] = (runsRes.data || []).map(r => ({
        id: r.id,
        date: r.date,
        distance: r.distance,
        duration: r.duration,
        averagePace: r.average_pace,
        paceIsManual: r.pace_is_manual ?? false,
        averageHR: r.average_hr ?? undefined,
        difficulty: r.difficulty,
        notes: r.notes ?? undefined,
      }))

      const activePlan: TrainingPlan | null = plansRes.data
        ? {
            id: plansRes.data.id,
            name: plansRes.data.name,
            days: plansRes.data.days,
            currentCycleIndex: plansRes.data.current_cycle_index ?? 0,
            checkIns: plansRes.data.check_ins ?? [],
            startDate: plansRes.data.start_date ?? undefined,
            isActive: true,
          }
        : null

      return { profile, templates, workouts, exercises, weightEntries, runLogs, activePlan }
    } catch (error) {
      console.error('Failed to load data:', error)
      return {
        profile: this.getLocalProfile(),
        templates: this.getLocalTemplates(),
        workouts: this.getLocalWorkouts(),
        exercises: this.getLocalExercises(),
        weightEntries: this.getLocalWeightEntries(),
        runLogs: this.getLocalRunLogs(),
        activePlan: this.getLocalPlan(),
      }
    }
  }

  // ============================================
  // PROFILE
  // ============================================
  async updateProfile(profile: UserProfile): Promise<void> {
    try {
      await supabase
        .from('profiles')
        .update({ name: profile.name, role: profile.role ?? null })
        .eq('id', this.userId)
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
    const { error } = await supabase.from('templates').insert({
      id: template.id,
      user_id: this.userId,
      name: template.name,
      exercises: template.exercises,
      notes: template.notes || null,
    }).select()
    if (error) throw error
  }

  async updateTemplate(template: WorkoutTemplate): Promise<void> {
    const { error } = await supabase
      .from('templates')
      .update({ name: template.name, exercises: template.exercises, notes: template.notes || null })
      .eq('id', template.id)
      .eq('user_id', this.userId)
    if (error) throw error
  }

  async deleteTemplate(templateId: string): Promise<void> {
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', templateId)
      .eq('user_id', this.userId)
    if (error) throw error
  }

  // ============================================
  // WORKOUTS
  // ============================================
  async createWorkout(workout: WorkoutLog): Promise<void> {
    const { error } = await supabase.from('workouts').insert({
      id: workout.id,
      user_id: this.userId,
      template_name: workout.templateName,
      date: workout.date,
      duration: workout.duration,
      exercises: workout.exercises,
      activity_type: workout.activityType || 'workout',
    }).select()
    if (error) throw error
  }

  async updateWorkout(workoutId: string, updates: { duration?: number; date?: string }): Promise<void> {
    const { error } = await supabase
      .from('workouts')
      .update(updates)
      .eq('id', workoutId)
      .eq('user_id', this.userId)
    if (error) throw error
  }

  async deleteWorkout(workoutId: string): Promise<void> {
    const { error } = await supabase
      .from('workouts')
      .delete()
      .eq('id', workoutId)
      .eq('user_id', this.userId)
    if (error) throw error
  }

  // ============================================
  // CUSTOM EXERCISES
  // ============================================
  async createCustomExercise(exercise: { name: string; muscleGroup: string; equipment: string }): Promise<void> {
    try {
      await supabase.from('custom_exercises').insert({
        user_id: this.userId,
        name: exercise.name,
        muscle_group: exercise.muscleGroup,
        equipment: exercise.equipment,
      })
    } catch (error) {
      if (!(error as any)?.message?.includes('duplicate')) {
        console.error('Failed to create custom exercise:', error)
      }
    }
  }

  async deleteCustomExercise(exerciseName: string): Promise<void> {
    await supabase
      .from('custom_exercises')
      .delete()
      .eq('name', exerciseName)
      .eq('user_id', this.userId)
  }

  // ============================================
  // WEIGHT ENTRIES
  // ============================================
  async upsertWeightEntry(entry: WeightEntry): Promise<void> {
    const { error } = await supabase.from('weight_entries').upsert({
      id: entry.id,
      user_id: this.userId,
      date: entry.date,
      weight: entry.weight,
    }, { onConflict: 'id' })
    if (error) throw error
  }

  async deleteWeightEntry(entryId: string): Promise<void> {
    await supabase
      .from('weight_entries')
      .delete()
      .eq('id', entryId)
      .eq('user_id', this.userId)
  }

  // ============================================
  // RUN LOGS
  // ============================================
  async createRunLog(run: RunLog): Promise<void> {
    const { error } = await supabase.from('run_logs').insert({
      id: run.id,
      user_id: this.userId,
      date: run.date,
      distance: run.distance,
      duration: run.duration,
      average_pace: run.averagePace,
      pace_is_manual: run.paceIsManual,
      average_hr: run.averageHR ?? null,
      difficulty: run.difficulty,
      notes: run.notes ?? null,
    })
    if (error) throw error
  }

  async deleteRunLog(runId: string): Promise<void> {
    await supabase
      .from('run_logs')
      .delete()
      .eq('id', runId)
      .eq('user_id', this.userId)
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

  private getLocalExercises(): Array<{ name: string; muscleGroup: string; equipment: string }> {
    try { return JSON.parse(localStorage.getItem('dreamshape_exercises') || '[]') } catch { return [] }
  }

  private getLocalWeightEntries(): WeightEntry[] {
    try { return JSON.parse(localStorage.getItem('dreamshape_weight') || '[]') } catch { return [] }
  }

  private getLocalRunLogs(): RunLog[] {
    try { return JSON.parse(localStorage.getItem('dreamshape_runs') || '[]') } catch { return [] }
  }

  private getLocalPlan(): TrainingPlan | null {
    try { return JSON.parse(localStorage.getItem('dreamshape_plan') || 'null') } catch { return null }
  }

  // ============================================
  // TRAINING PLANS
  // ============================================
  async upsertPlan(plan: TrainingPlan): Promise<void> {
    await supabase.from('training_plans').update({ is_active: false }).eq('user_id', this.userId)
    const { error } = await supabase.from('training_plans').upsert({
      id: plan.id,
      user_id: this.userId,
      name: plan.name,
      days: plan.days,
      start_date: plan.startDate ?? null,
      is_active: plan.isActive,
      current_cycle_index: plan.currentCycleIndex,
      check_ins: plan.checkIns,
    }, { onConflict: 'id' })
    if (error) throw error
  }

  async deletePlan(planId: string): Promise<void> {
    await supabase.from('training_plans').delete().eq('id', planId).eq('user_id', this.userId)
  }
}
