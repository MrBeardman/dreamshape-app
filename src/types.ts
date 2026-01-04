export interface Exercise {
  id: string
  name: string
  equipment: string
  muscleGroup: string
  notes?: string  // Per-exercise notes
}

export interface WorkoutTemplate {
  id: string
  name: string
  exercises: Exercise[]
  notes?: string  // Global template notes
}

export interface Set {
  id: string
  weight: number
  reps: number
  completed: boolean
  type?: 'warmup' | 'working'  // Set type, defaults to working
}

export interface ExerciseLog {
  exerciseId: string
  exerciseName: string
  sets: Set[]
  restDuration?: number  // Per-exercise rest duration in seconds
  notes?: string  // Per-exercise notes during workout
}

export interface WorkoutLog {
  id: string
  templateName: string
  date: string
  exercises: ExerciseLog[]
  duration: number
  activityType?: 'workout' | 'cardio' | 'stretching' | 'recovery'  // For streak tracking
}

export interface ActiveWorkout {
  templateName: string
  originalTemplateId: string | null  // null if started as empty workout
  exercises: ExerciseLog[]
  startTime: number
  notes?: string  // Global workout notes
}

export interface UserProfile {
  name: string
  memberSince: string
  role?: 'creator' | 'member' // Creator badge for special users
}