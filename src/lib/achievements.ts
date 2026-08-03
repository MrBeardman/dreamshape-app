import type { Habit } from '../types'
import type { HabitXpResult, WorkoutXpResult, RunXpResult } from './xp'

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  achieved: boolean
}

/**
 * A fixed set of milestones, derived from the same xp.ts output ProfileView
 * already computes — no separate tracking or persistence. Achieved state
 * re-windows alongside a "Reset XP Progress" (the walk it's derived from is
 * the same reset-clamped one), consistent with a reset being a real fresh
 * start rather than a cosmetic-only change.
 */
export function getAchievements(
  habits: Habit[],
  habitXp: HabitXpResult,
  workoutXp: WorkoutXpResult,
  runXp: RunXpResult
): Achievement[] {
  const bestStreakOverall = habits.reduce((max, h) => Math.max(max, habitXp.perHabit[h.id]?.bestStreak ?? 0), 0)

  return [
    {
      id: 'first-week',
      name: 'First Week',
      description: 'Keep a habit going for 7 days straight',
      icon: '🔥',
      achieved: bestStreakOverall >= 7,
    },
    {
      id: 'iron-will',
      name: 'Iron Will',
      description: 'Keep a habit going for 30 days straight',
      icon: '🗿',
      achieved: bestStreakOverall >= 30,
    },
    {
      id: 'centurion',
      name: 'Centurion',
      description: 'Keep a habit going for 100 days straight',
      icon: '💯',
      achieved: bestStreakOverall >= 100,
    },
    {
      id: 'triple-threat',
      name: 'Triple Threat',
      description: 'Have 3 habits on a live streak at the same time',
      icon: '🌐',
      achieved: habitXp.maxLiveCount >= 3,
    },
    {
      id: 'new-pr',
      name: 'New PR',
      description: 'Beat a lifetime-best lift in a workout',
      icon: '🏋️',
      achieved: workoutXp.prCount >= 1,
    },
    {
      id: 'speed-demon',
      name: 'Speed Demon',
      description: 'Beat your best pace on a run',
      icon: '🏃',
      achieved: runXp.prCount >= 1,
    },
  ]
}
