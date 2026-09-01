// How a set's numbers are captured. Missing/undefined means 'weight-reps' (the
// original, still the default). 'time' repurposes the existing `reps` field on
// Set to mean seconds held instead of rep count, and hides weight entirely —
// no schema change needed, just a different UI over the same Set shape.
export type ExerciseTrackingMode = 'weight-reps' | 'time'

export interface Exercise {
  id: string
  name: string
  equipment: string
  muscleGroup: string
  notes?: string
  trackingMode?: ExerciseTrackingMode
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
  /**
   * The template this workout was started from, when it was started from one.
   * Absent on ad-hoc workouts and on everything logged before this field existed —
   * consumers fall back to matching on templateName. See lib/workoutHabits.ts.
   */
  templateId?: string
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

export type HabitRecurrenceType = 'daily' | 'weekdays' | 'interval'

export interface HabitRecurrence {
  type: HabitRecurrenceType
  weekdays?: number[]   // type === 'weekdays' only. Date.getDay() convention: 0=Sun..6=Sat
  intervalDays?: number // type === 'interval' only, e.g. 3 = every 3rd day
  anchorDate?: string   // type === 'interval' only, YYYY-MM-DD "day 0" the interval counts from
}

export interface Habit {
  id: string
  name: string
  icon?: string
  recurrence: HabitRecurrence
  timeOfDay?: string          // 'HH:MM' 24h — display/sort only, no notifications
  linkedTemplateId?: string   // optional WorkoutTemplate.id, soft reference
  isActive: boolean           // false = archived: hidden from "due today", kept for history
  sortOrder: number
  createdAt: string           // ISO timestamp — also the earliest date the habit can be "due"
}

export type HabitCompletionStatus = 'done' | 'failed'

export interface HabitCompletion {
  id: string
  habitId: string
  date: string   // YYYY-MM-DD
  status: HabitCompletionStatus
}

export interface UserProfile {
  name: string
  memberSince: string
  role?: 'creator' | 'tester' | 'member'
  peakXp?: number // monotonic high-water mark; never decreases, even if computed XP drops from a retroactive edit
  xpStartDate?: string // YYYY-MM-DD; if set, only habit/workout/run events on or after this date count toward XP ("reset progress")
}

export interface WeightEntry {
  id: string
  date: string   // YYYY-MM-DD
  weight: number // kg
}
