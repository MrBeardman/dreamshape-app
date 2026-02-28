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
  role?: 'creator' | 'tester' | 'member' // Creator = app creator, Tester = beta tester, Member = regular
  nutritionGoals?: NutritionGoals
}

export interface NutritionGoals {
  calories: number
  protein: number
  carbs: number
  fat: number
  sugar: number
}

export interface FoodPortion {
  name: string   // e.g. "1 slice", "1 cup"
  grams: number  // e.g. 30, 240
}

export interface FoodItem {
  id: string
  name: string
  brand?: string
  barcode?: string
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  sugarPer100g: number
  isCustom: boolean
  portions?: FoodPortion[]
}

export interface MealEntry {
  id: string
  foodId: string
  foodName: string
  brand?: string
  grams: number
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snacks'
  calories: number
  protein: number
  carbs: number
  fat: number
  sugar: number
}

export interface NutritionLog {
  id: string
  date: string // 'YYYY-MM-DD'
  entries: MealEntry[]
}