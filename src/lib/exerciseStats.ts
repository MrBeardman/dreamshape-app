import type { WorkoutLog } from '../types'

export interface ExerciseSession {
  date: string
  maxWeight: number
  totalVolume: number
  totalSets: number
  sets: Array<{ weight: number; reps: number; type?: string }>
}

export function getExerciseHistory(workoutLogs: WorkoutLog[], exerciseName: string): ExerciseSession[] {
  const sessions: ExerciseSession[] = []
  // workoutLogs is newest-first — reverse for chronological chart display
  const chronological = [...workoutLogs].reverse()

  for (const workout of chronological) {
    const exercise = workout.exercises.find(e => e.exerciseName === exerciseName)
    if (!exercise || exercise.sets.length === 0) continue

    const workingSets = exercise.sets.filter(s => (s.type ?? 'working') === 'working')
    const setsToScore = workingSets.length > 0 ? workingSets : exercise.sets

    const maxWeight = Math.max(...setsToScore.map(s => s.weight))
    const totalVolume = setsToScore.reduce((sum, s) => sum + s.weight * s.reps, 0)

    sessions.push({
      date: workout.date.split('T')[0],
      maxWeight,
      totalVolume,
      totalSets: exercise.sets.length,
      sets: exercise.sets.map(s => ({ weight: s.weight, reps: s.reps, type: s.type })),
    })
  }

  return sessions
}
