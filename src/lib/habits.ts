import type { Habit, HabitCompletion, HabitCompletionStatus } from '../types'

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function dateOnly(dateStr: string): Date {
  return new Date(dateStr + 'T12:00:00')
}

function daysBetween(fromStr: string, toStr: string): number {
  const ms = dateOnly(toStr).getTime() - dateOnly(fromStr).getTime()
  return Math.round(ms / 86400000)
}

export function isHabitDueOnDate(habit: Habit, dateStr: string): boolean {
  if (!habit.isActive) return false
  const createdDate = habit.createdAt.slice(0, 10)
  if (dateStr < createdDate) return false

  const { recurrence } = habit
  if (recurrence.type === 'daily') return true

  if (recurrence.type === 'weekdays') {
    const weekdays = recurrence.weekdays ?? []
    return weekdays.includes(dateOnly(dateStr).getDay())
  }

  // interval
  const anchor = recurrence.anchorDate ?? createdDate
  if (dateStr < anchor) return false
  const every = Math.max(1, recurrence.intervalDays ?? 1)
  return daysBetween(anchor, dateStr) % every === 0
}

export function getHabitsDueOn(habits: Habit[], dateStr: string): Habit[] {
  return habits.filter(h => isHabitDueOnDate(h, dateStr))
}

export function getHabitStatus(completions: HabitCompletion[], habitId: string, dateStr: string): HabitCompletionStatus | 'pending' {
  const match = completions.find(c => c.habitId === habitId && c.date === dateStr)
  return match?.status ?? 'pending'
}

export function nextHabitStatus(current: HabitCompletionStatus | 'pending'): HabitCompletionStatus | 'pending' {
  if (current === 'pending') return 'done'
  if (current === 'done') return 'failed'
  return 'pending'
}

export interface DayCompletionRatio {
  due: number
  done: number
  ratio: number | null // null when nothing was due that day
}

export function getDayCompletionRatio(habits: Habit[], completions: HabitCompletion[], dateStr: string): DayCompletionRatio {
  const due = getHabitsDueOn(habits, dateStr)
  if (due.length === 0) return { due: 0, done: 0, ratio: null }
  const done = due.filter(h => getHabitStatus(completions, h.id, dateStr) === 'done').length
  return { due: due.length, done, ratio: done / due.length }
}

export function getHabitStreak(habits: Habit[], completions: HabitCompletion[], todayStr: string = todayISO()): number {
  if (habits.length === 0) return 0
  const earliest = habits.reduce((min, h) => (h.createdAt.slice(0, 10) < min ? h.createdAt.slice(0, 10) : min), todayStr)

  let streak = 0
  let cursor = todayStr
  let isToday = true

  while (cursor >= earliest) {
    const { due, ratio } = getDayCompletionRatio(habits, completions, cursor)
    if (due === 0) {
      // Nothing scheduled — skip without breaking the streak.
    } else if (ratio === 1) {
      streak++
    } else if (isToday) {
      // Today isn't "in the books" yet — an incomplete today doesn't break an in-progress streak.
    } else {
      break
    }
    isToday = false
    cursor = new Date(dateOnly(cursor).getTime() - 86400000).toISOString().slice(0, 10)
  }

  return streak
}
