import type { Habit, HabitCompletion, HabitCompletionStatus, WorkoutLog, RunLog } from '../types'
import { getHabitsDueOn, todayISO, addDays } from './habits'

// ============================================
// CONSTANTS
// ============================================

export const HABIT_BASE_XP = 10
export const WORKOUT_FINISH_XP = 30
export const WORKOUT_PR_BONUS_XP = 50
export const RUN_FINISH_XP = 25
export const RUN_PR_BONUS_XP = 50

export const LIVE_STREAK_THRESHOLD_DAYS = 3
export const BREADTH_BONUS_PER_HABIT = 0.1
export const BREADTH_BONUS_CAP = 0.5

function streakMultiplier(streak: number): number {
  if (streak >= 365) return 3
  if (streak >= 100) return 2
  if (streak >= 30) return 1.5
  if (streak >= 7) return 1.25
  return 1
}

// ============================================
// RANKS
// ============================================

export type RankId = 'wooden' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'mithril' | 'legendary'

export interface RankDef {
  id: RankId
  name: string
  threshold: number
  icon: string
  color: string // '' for legendary — rendered with a gradient instead, see .profile-rank-badge--legendary
}

export const RANKS: RankDef[] = [
  { id: 'wooden',    name: 'Wooden',    threshold: 0,       icon: '🪵', color: '#8a7256' },
  { id: 'bronze',    name: 'Bronze',    threshold: 150,     icon: '🥉', color: '#b08968' },
  { id: 'silver',    name: 'Silver',    threshold: 750,     icon: '🥈', color: '#9099a2' },
  { id: 'gold',      name: 'Gold',      threshold: 3000,    icon: '🥇', color: '#c9a800' },
  { id: 'platinum',  name: 'Platinum',  threshold: 10000,   icon: '💠', color: '#8fb8c9' },
  { id: 'diamond',   name: 'Diamond',   threshold: 30000,   icon: '💎', color: '#7ecbdb' },
  { id: 'mithril',   name: 'Mithril',   threshold: 100000,  icon: '⚔️', color: '#a78bd9' },
  { id: 'legendary', name: 'Legendary', threshold: 300000,  icon: '🏆', color: '' },
]

// ============================================
// HABIT XP (per-habit streak + breadth multiplier)
// ============================================

export interface HabitXpState {
  habitId: string
  streak: number
  streakMultiplier: number
  breadthBonus: number
  totalMultiplier: number
  xp: number
}

export interface HabitXpResult {
  totalXp: number
  perHabit: Record<string, HabitXpState>
}

export function getHabitXpHistory(habits: Habit[], completions: HabitCompletion[], todayStr: string = todayISO()): HabitXpResult {
  if (habits.length === 0) return { totalXp: 0, perHabit: {} }

  // O(1) status lookups instead of habits.ts's getHabitStatus (a linear .find())
  // — this loop runs habits.length * days-since-earliest-habit times, so a fast
  // lookup matters once a habit's history spans months/years.
  const completionMap = new Map<string, HabitCompletionStatus>()
  for (const c of completions) completionMap.set(`${c.habitId}|${c.date}`, c.status)
  const statusOf = (habitId: string, date: string): HabitCompletionStatus | 'pending' =>
    completionMap.get(`${habitId}|${date}`) ?? 'pending'

  const earliest = habits.reduce((min, h) => (h.createdAt.slice(0, 10) < min ? h.createdAt.slice(0, 10) : min), todayStr)

  const streaks: Record<string, number> = {}
  const xpByHabit: Record<string, number> = {}
  habits.forEach(h => { streaks[h.id] = 0; xpByHabit[h.id] = 0 })

  let totalXp = 0
  let cursor = earliest
  let liveIds = new Set<string>()

  while (cursor <= todayStr) {
    const due = getHabitsDueOn(habits, cursor)
    const isToday = cursor === todayStr

    // Pass 1: advance/reset each due habit's streak
    for (const habit of due) {
      const status = statusOf(habit.id, cursor)
      if (status === 'done') {
        streaks[habit.id]++
      } else if (status === 'pending' && isToday) {
        // Today isn't "in the books" yet — don't reset an in-progress streak.
      } else {
        streaks[habit.id] = 0
      }
    }

    // Pass 2: recompute the "live" set over all active habits (streaks persist
    // on off-days, so this must consider every habit, not just those due today).
    liveIds = new Set(
      habits.filter(h => h.isActive && streaks[h.id] >= LIVE_STREAK_THRESHOLD_DAYS).map(h => h.id)
    )

    // Pass 3: award XP for whatever was actually marked done today
    for (const habit of due) {
      if (statusOf(habit.id, cursor) !== 'done') continue
      const otherLive = liveIds.size - (liveIds.has(habit.id) ? 1 : 0)
      const breadthBonus = Math.min(BREADTH_BONUS_CAP, BREADTH_BONUS_PER_HABIT * otherLive)
      const mult = streakMultiplier(streaks[habit.id])
      const xp = HABIT_BASE_XP * mult * (1 + breadthBonus)
      xpByHabit[habit.id] += xp
      totalXp += xp
    }

    cursor = addDays(cursor, 1)
  }

  const perHabit: Record<string, HabitXpState> = {}
  for (const habit of habits) {
    const streak = streaks[habit.id]
    const streakMult = streakMultiplier(streak)
    const otherLive = liveIds.size - (liveIds.has(habit.id) ? 1 : 0)
    const breadthBonus = Math.min(BREADTH_BONUS_CAP, BREADTH_BONUS_PER_HABIT * otherLive)
    perHabit[habit.id] = {
      habitId: habit.id,
      streak,
      streakMultiplier: streakMult,
      breadthBonus,
      totalMultiplier: streakMult * (1 + breadthBonus),
      xp: xpByHabit[habit.id],
    }
  }

  return { totalXp, perHabit }
}

// ============================================
// WORKOUT XP (flat + all-time-max weight PR bonus)
// ============================================

export interface WorkoutXpResult {
  totalXp: number
  finishXp: number
  prXp: number
  prCount: number
}

export function getWorkoutXp(workoutLogs: WorkoutLog[]): WorkoutXpResult {
  const finishXp = workoutLogs.length * WORKOUT_FINISH_XP
  const sorted = [...workoutLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const historicalMax: Record<string, number> = {}
  let prXp = 0
  let prCount = 0

  for (const workout of sorted) {
    for (const exercise of workout.exercises) {
      const weights = exercise.sets.filter(s => s.weight > 0).map(s => s.weight)
      if (weights.length === 0) continue
      const maxThisWorkout = Math.max(...weights)
      const priorMax = historicalMax[exercise.exerciseName]
      // A first-ever appearance sets the baseline but isn't itself a PR —
      // prevents farming bonus XP by trying lots of new exercises once.
      if (priorMax !== undefined && maxThisWorkout > priorMax) {
        prCount++
        prXp += WORKOUT_PR_BONUS_XP
      }
      historicalMax[exercise.exerciseName] = Math.max(priorMax ?? 0, maxThisWorkout)
    }
  }

  return { totalXp: finishXp + prXp, finishXp, prXp, prCount }
}

// ============================================
// RUN XP (flat + best-pace-at-distance-bucket PR bonus)
// ============================================

export interface RunXpResult {
  totalXp: number
  finishXp: number
  prXp: number
  prCount: number
}

export function getRunXp(runLogs: RunLog[]): RunXpResult {
  const finishXp = runLogs.length * RUN_FINISH_XP
  const sorted = [...runLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const bestPaceByBucket: Record<number, number> = {}
  let prXp = 0
  let prCount = 0

  for (const run of sorted) {
    const bucket = Math.floor(run.distance)
    const priorBest = bestPaceByBucket[bucket]
    if (priorBest !== undefined && run.averagePace < priorBest) {
      prCount++
      prXp += RUN_PR_BONUS_XP
    }
    bestPaceByBucket[bucket] = Math.min(priorBest ?? Infinity, run.averagePace)
  }

  return { totalXp: finishXp + prXp, finishXp, prXp, prCount }
}

// ============================================
// RANK LOOKUP
// ============================================

export interface RankProgress {
  rank: RankDef
  rankIndex: number
  totalXp: number
  xpIntoRank: number
  nextRank: RankDef | null
  xpForNextRank: number | null // null at max rank
  progressRatio: number        // 0..1, always 1 at max rank
}

export function getRankForXp(totalXp: number): RankProgress {
  let rankIndex = 0
  for (let i = 0; i < RANKS.length; i++) {
    if (RANKS[i].threshold <= totalXp) rankIndex = i
    else break
  }
  const rank = RANKS[rankIndex]
  const nextRank = RANKS[rankIndex + 1] ?? null
  const xpIntoRank = totalXp - rank.threshold
  const xpForNextRank = nextRank ? nextRank.threshold - rank.threshold : null
  const progressRatio = nextRank && xpForNextRank ? Math.min(1, Math.max(0, xpIntoRank / xpForNextRank)) : 1
  return { rank, rankIndex, totalXp, xpIntoRank, nextRank, xpForNextRank, progressRatio }
}

// ============================================
// AGGREGATE
// ============================================

export interface TotalXpResult {
  totalXp: number
  habitXp: HabitXpResult
  workoutXp: WorkoutXpResult
  runXp: RunXpResult
  rank: RankProgress
}

export function getTotalXp(
  habits: Habit[],
  completions: HabitCompletion[],
  workoutLogs: WorkoutLog[],
  runLogs: RunLog[],
  todayStr: string = todayISO()
): TotalXpResult {
  const habitXp = getHabitXpHistory(habits, completions, todayStr)
  const workoutXp = getWorkoutXp(workoutLogs)
  const runXp = getRunXp(runLogs)
  const totalXp = habitXp.totalXp + workoutXp.totalXp + runXp.totalXp
  const rank = getRankForXp(totalXp)
  return { totalXp, habitXp, workoutXp, runXp, rank }
}

// ============================================
// DISPLAY HELPER
// ============================================

/** The single habit with the highest current multiplier, for a compact "current multiplier" readout. Null if no habit has a bonus above 1x. */
export function getTopMultiplierHabit(habits: Habit[], habitXp: HabitXpResult): { habitName: string; state: HabitXpState } | null {
  let best: { habitName: string; state: HabitXpState } | null = null
  for (const habit of habits) {
    const state = habitXp.perHabit[habit.id]
    if (!state || state.totalMultiplier <= 1) continue
    if (!best || state.totalMultiplier > best.state.totalMultiplier) {
      best = { habitName: habit.name, state }
    }
  }
  return best
}
