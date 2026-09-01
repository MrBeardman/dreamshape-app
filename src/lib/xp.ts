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
  bestStreak: number // highest streak this habit ever reached during the walk, not just its current one
  streakMultiplier: number
  breadthBonus: number
  totalMultiplier: number
  xp: number
}

export interface HabitXpResult {
  totalXp: number
  perHabit: Record<string, HabitXpState>
  maxLiveCount: number // highest number of simultaneously-live habits ever reached during the walk
}

export function getHabitXpHistory(
  habits: Habit[],
  completions: HabitCompletion[],
  todayStr: string = todayISO(),
  startDate?: string,
  rangeFrom?: string,
  rangeTo?: string
): HabitXpResult {
  if (habits.length === 0) return { totalXp: 0, perHabit: {}, maxLiveCount: 0 }

  // O(1) status lookups instead of habits.ts's getHabitStatus (a linear .find())
  // — this loop runs habits.length * days-since-earliest-habit times, so a fast
  // lookup matters once a habit's history spans months/years.
  const completionMap = new Map<string, HabitCompletionStatus>()
  for (const c of completions) completionMap.set(`${c.habitId}|${c.date}`, c.status)
  const statusOf = (habitId: string, date: string): HabitCompletionStatus | 'pending' =>
    completionMap.get(`${habitId}|${date}`) ?? 'pending'

  const earliestHabit = habits.reduce((min, h) => (h.createdAt.slice(0, 10) < min ? h.createdAt.slice(0, 10) : min), todayStr)
  // A reset ("start from scratch") clamps the walk forward — streaks and XP
  // both begin counting fresh from startDate, same as a brand-new habit would.
  const earliest = startDate && startDate > earliestHabit ? startDate : earliestHabit

  const streaks: Record<string, number> = {}
  const bestStreaks: Record<string, number> = {}
  const xpByHabit: Record<string, number> = {}
  habits.forEach(h => { streaks[h.id] = 0; bestStreaks[h.id] = 0; xpByHabit[h.id] = 0 })

  let totalXp = 0
  let cursor = earliest
  let liveIds = new Set<string>()
  let maxLiveCount = 0

  while (cursor <= todayStr) {
    const due = getHabitsDueOn(habits, cursor)
    const isToday = cursor === todayStr
    const inRange = (!rangeFrom || cursor >= rangeFrom) && (!rangeTo || cursor <= rangeTo)

    // Pass 1: advance/reset each due habit's streak
    for (const habit of due) {
      const status = statusOf(habit.id, cursor)
      if (status === 'done') {
        streaks[habit.id]++
        if (streaks[habit.id] > bestStreaks[habit.id]) bestStreaks[habit.id] = streaks[habit.id]
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
    if (liveIds.size > maxLiveCount) maxLiveCount = liveIds.size

    // Pass 3: award XP for whatever was actually marked done today (only if
    // within the optional range window, on top of the existing startDate floor)
    if (inRange) {
      for (const habit of due) {
        if (statusOf(habit.id, cursor) !== 'done') continue
        const otherLive = liveIds.size - (liveIds.has(habit.id) ? 1 : 0)
        const breadthBonus = Math.min(BREADTH_BONUS_CAP, BREADTH_BONUS_PER_HABIT * otherLive)
        const mult = streakMultiplier(streaks[habit.id])
        const xp = HABIT_BASE_XP * mult * (1 + breadthBonus)
        xpByHabit[habit.id] += xp
        totalXp += xp
      }
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
      bestStreak: bestStreaks[habit.id],
      streakMultiplier: streakMult,
      breadthBonus,
      totalMultiplier: streakMult * (1 + breadthBonus),
      xp: xpByHabit[habit.id],
    }
  }

  return { totalXp, perHabit, maxLiveCount }
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

export function getWorkoutXp(workoutLogs: WorkoutLog[], startDate?: string, rangeFrom?: string, rangeTo?: string): WorkoutXpResult {
  const sorted = [...workoutLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // PR baselines always use full history — a "PR" must mean a genuine lifetime
  // best, otherwise a reset would let old numbers be re-beaten for free XP.
  // Only whether an event *counts toward XP* is gated by startDate/range.
  const historicalMax: Record<string, number> = {}
  let finishXp = 0
  let prXp = 0
  let prCount = 0

  for (const workout of sorted) {
    const d = workout.date.slice(0, 10)
    const countsForXp = (!startDate || d >= startDate) && (!rangeFrom || d >= rangeFrom) && (!rangeTo || d <= rangeTo)
    if (countsForXp) finishXp += WORKOUT_FINISH_XP
    for (const exercise of workout.exercises) {
      const weights = exercise.sets.filter(s => s.weight > 0).map(s => s.weight)
      if (weights.length === 0) continue
      const maxThisWorkout = Math.max(...weights)
      const priorMax = historicalMax[exercise.exerciseName]
      // A first-ever appearance sets the baseline but isn't itself a PR —
      // prevents farming bonus XP by trying lots of new exercises once.
      if (countsForXp && priorMax !== undefined && maxThisWorkout > priorMax) {
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

export function getRunXp(runLogs: RunLog[], startDate?: string, rangeFrom?: string, rangeTo?: string): RunXpResult {
  const sorted = [...runLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const bestPaceByBucket: Record<number, number> = {}
  let finishXp = 0
  let prXp = 0
  let prCount = 0

  for (const run of sorted) {
    const d = run.date.slice(0, 10)
    const countsForXp = (!startDate || d >= startDate) && (!rangeFrom || d >= rangeFrom) && (!rangeTo || d <= rangeTo)
    if (countsForXp) finishXp += RUN_FINISH_XP
    const bucket = Math.floor(run.distance)
    const priorBest = bestPaceByBucket[bucket]
    if (countsForXp && priorBest !== undefined && run.averagePace < priorBest) {
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

/**
 * The date XP actually starts counting from.
 *
 * An explicit reset (profile.xpStartDate) always wins. Otherwise XP starts the day
 * the first habit was created — "since we introduced the habits" — so the months of
 * workout history that predate the habit system don't hand out a rank that was never
 * really earned under these rules.
 *
 * Note getHabitXpHistory already clamps its walk to the earliest habit, so this
 * mostly gates getWorkoutXp/getRunXp. Returns undefined when there are no habits
 * yet, which means "count everything" — the original behavior.
 */
export function getEffectiveXpStart(habits: Habit[], profile: { xpStartDate?: string }): string | undefined {
  if (profile.xpStartDate) return profile.xpStartDate
  if (habits.length === 0) return undefined
  return habits.reduce<string | undefined>((earliest, h) => {
    const created = h.createdAt.slice(0, 10)
    return earliest === undefined || created < earliest ? created : earliest
  }, undefined)
}

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
  todayStr: string = todayISO(),
  startDate?: string
): TotalXpResult {
  const habitXp = getHabitXpHistory(habits, completions, todayStr, startDate)
  const workoutXp = getWorkoutXp(workoutLogs, startDate)
  const runXp = getRunXp(runLogs, startDate)
  const totalXp = habitXp.totalXp + workoutXp.totalXp + runXp.totalXp
  const rank = getRankForXp(totalXp)
  return { totalXp, habitXp, workoutXp, runXp, rank }
}

/** Total XP earned strictly within [rangeFrom, rangeTo] (inclusive), e.g. for a weekly recap or a single day's total. Respects an active xpStartDate floor the same way getTotalXp does. */
export function getXpInRange(
  habits: Habit[],
  completions: HabitCompletion[],
  workoutLogs: WorkoutLog[],
  runLogs: RunLog[],
  rangeFrom: string,
  rangeTo: string,
  todayStr: string = todayISO(),
  startDate?: string
): number {
  const habitXp = getHabitXpHistory(habits, completions, todayStr, startDate, rangeFrom, rangeTo)
  const workoutXp = getWorkoutXp(workoutLogs, startDate, rangeFrom, rangeTo)
  const runXp = getRunXp(runLogs, startDate, rangeFrom, rangeTo)
  return habitXp.totalXp + workoutXp.totalXp + runXp.totalXp
}

// ============================================
// DISPLAY HELPER
// ============================================

export interface HabitXpPreview {
  xp: number
  multiplier: number
  streak: number
}

/**
 * What a habit is currently worth, for a per-row "+N XP" display. For a
 * still-pending habit this previews the streak it WOULD reach if completed
 * right now (state.streak + 1); for an already-done habit it reflects the
 * streak it actually reached today (state.streak, unchanged); a failed habit
 * is worth nothing this cycle.
 */
export function previewHabitXp(state: HabitXpState, status: HabitCompletionStatus | 'pending'): HabitXpPreview {
  if (status === 'failed') return { xp: 0, multiplier: 1, streak: 0 }
  const streak = status === 'done' ? state.streak : state.streak + 1
  const multiplier = streakMultiplier(streak) * (1 + state.breadthBonus)
  return { xp: HABIT_BASE_XP * multiplier, multiplier, streak }
}

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
