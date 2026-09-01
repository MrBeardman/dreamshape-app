import type { Habit, HabitCompletion, WorkoutLog, WorkoutTemplate } from '../types'
import { getHabitStatus } from './habits'

/**
 * Local-calendar date key for a workout.
 *
 * WorkoutLog.date is a full ISO timestamp while habit dates are plain YYYY-MM-DD
 * strings, so the two need a common key. Deliberately built from the LOCAL date
 * parts rather than toISOString(), which returns UTC and lands a 21:00 workout in
 * Prague on the previous day.
 */
export function localDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Group workouts by their local calendar day. Days can hold more than one workout. */
export function getWorkoutsByDate(logs: WorkoutLog[]): Map<string, WorkoutLog[]> {
  const byDate = new Map<string, WorkoutLog[]>()
  for (const log of logs) {
    const key = localDateKey(new Date(log.date))
    const existing = byDate.get(key)
    if (existing) existing.push(log)
    else byDate.set(key, [log])
  }
  // Keep each day's workouts in chronological order; workoutLogs arrives newest-first.
  for (const list of byDate.values()) {
    list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }
  return byDate
}

/**
 * The habit a logged workout belongs to, if any.
 *
 * Prefers the durable templateId recorded at save time. Older workouts predate that
 * field and fall back to matching the free-text templateName against the template
 * list — the same name-matching convention getRecentPRs uses, and equally fragile if
 * a template is renamed, which is exactly why new workouts store the id.
 */
export function matchWorkoutToHabit(
  log: WorkoutLog,
  habits: Habit[],
  templates: WorkoutTemplate[]
): Habit | null {
  const templateId = log.templateId ?? templates.find(t => t.name === log.templateName)?.id
  if (!templateId) return null
  return habits.find(h => h.linkedTemplateId === templateId) ?? null
}

export interface DayActivity {
  /** Workouts that were a planned habit session AND had that habit ticked done — shown as one item. */
  merged: Array<{ workout: WorkoutLog; habit: Habit }>
  /** Workouts with no completed linked habit — shown on their own. */
  workoutsOnly: WorkoutLog[]
  /** Habits due that day that weren't already folded into a merged row. */
  habitsOnly: Habit[]
}

/**
 * Split a day's habits and workouts into what should render as one item vs. two.
 *
 * A workout that fulfilled a habit the user also ticked off is a single achievement,
 * not two, so it collapses into one row and its habit drops out of the habit list.
 * A workout whose habit is still pending or failed stays separate — the habit is
 * genuinely not done, and hiding it would remove the user's ability to tick it.
 */
export function getDayActivity(
  dueHabits: Habit[],
  dayWorkouts: WorkoutLog[],
  habits: Habit[],
  templates: WorkoutTemplate[],
  completions: HabitCompletion[],
  dateStr: string
): DayActivity {
  const merged: DayActivity['merged'] = []
  const workoutsOnly: WorkoutLog[] = []
  const mergedHabitIds = new Set<string>()

  for (const workout of dayWorkouts) {
    const habit = matchWorkoutToHabit(workout, habits, templates)
    const isDue = habit ? dueHabits.some(h => h.id === habit.id) : false
    const isDone = habit ? getHabitStatus(completions, habit.id, dateStr) === 'done' : false
    // One habit can only absorb one workout; a second session that day stands alone.
    if (habit && isDue && isDone && !mergedHabitIds.has(habit.id)) {
      merged.push({ workout, habit })
      mergedHabitIds.add(habit.id)
    } else {
      workoutsOnly.push(workout)
    }
  }

  return {
    merged,
    workoutsOnly,
    habitsOnly: dueHabits.filter(h => !mergedHabitIds.has(h.id)),
  }
}
