export interface Exercise {
  id: string
  name: string
  equipment: string
  muscleGroup: string
}

export interface WorkoutTemplate {
  id: string
  name: string
  exercises: Exercise[]
}

export interface Set {
  id: string
  weight: number
  reps: number
  completed: boolean
}

export interface ExerciseLog {
  exerciseId: string
  exerciseName: string
  sets: Set[]
  restDuration?: number  // Per-exercise rest duration in seconds
}

export interface WorkoutLog {
  id: string
  templateName: string
  date: string
  exercises: ExerciseLog[]
  duration: number
}

export interface ActiveWorkout {
  templateName: string
  originalTemplateId: string | null  // null if started as empty workout
  exercises: ExerciseLog[]
  startTime: number
}
