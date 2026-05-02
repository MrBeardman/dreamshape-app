export interface Exercise {
  id: string
  name: string
  equipment: string
  muscleGroup: string
  notes?: string
}

export interface WorkoutTemplate {
  id: string
  name: string
  exercises: Exercise[]
  notes?: string
}

export interface Set {
  id: string
  weight: number
  reps: number
  completed: boolean
  type?: 'warmup' | 'working'
}

export interface ExerciseLog {
  exerciseId: string
  exerciseName: string
  sets: Set[]
  restDuration?: number
  notes?: string
}

export interface WorkoutLog {
  id: string
  templateName: string
  date: string
  exercises: ExerciseLog[]
  duration: number
  activityType?: 'workout' | 'cardio' | 'stretching' | 'recovery'
}

export interface ActiveWorkout {
  templateName: string
  originalTemplateId: string | null
  exercises: ExerciseLog[]
  startTime: number
  notes?: string
}

export interface RunLog {
  id: string
  date: string         // ISO timestamp
  distance: number     // km, e.g. 5.02
  duration: number     // seconds
  averagePace: number  // seconds per km (calculated or manual override)
  paceIsManual: boolean
  averageHR?: number   // bpm
  difficulty: number   // 1–10
  notes?: string
}

export type PlanDayType = 'workout' | 'run' | 'rest'

export interface PlanDay {
  type: PlanDayType
  templateId?: string  // only when type === 'workout'
  label?: string       // optional custom label
}

export interface TrainingPlan {
  id: string
  name: string
  days: PlanDay[]      // the repeating cycle
  startDate: string    // YYYY-MM-DD — day 0 of the cycle
  isActive: boolean
}

export interface UserProfile {
  name: string
  memberSince: string
  role?: 'creator' | 'tester' | 'member'
}

export interface WeightEntry {
  id: string
  date: string   // YYYY-MM-DD
  weight: number // kg
}
