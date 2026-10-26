import type { Prisma } from "@prisma/client";
import type { CustomExercise, Habit, HabitCompletion, Profile, RunLog, Template, WeightEntry, Workout } from "@prisma/client";

/**
 * The MCP tools used to return raw Supabase rows (snake_case columns, ISO timestamps,
 * numerics as JSON numbers). These serializers keep that exact shape, in the same column
 * order, so Claude's view of the data does not change with the database move.
 */

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
const num = (d: Prisma.Decimal | null | undefined) => (d == null ? null : Number(d));

export const profileRow = (p: Profile) => ({
  id: p.id,
  name: p.name,
  member_since: iso(p.memberSince),
  created_at: iso(p.createdAt),
  updated_at: iso(p.updatedAt),
  peak_xp: num(p.peakXp),
  xp_start_date: p.xpStartDate,
  role: p.role,
});

export const templateRow = (t: Template) => ({
  id: t.id,
  user_id: t.userId,
  name: t.name,
  notes: t.notes,
  exercises: t.exercises,
  created_at: iso(t.createdAt),
  updated_at: iso(t.updatedAt),
});

export const workoutRow = (w: Workout) => ({
  id: w.id,
  user_id: w.userId,
  template_name: w.templateName,
  date: iso(w.date),
  duration: w.duration,
  activity_type: w.activityType,
  notes: w.notes,
  exercises: w.exercises,
  created_at: iso(w.createdAt),
  updated_at: iso(w.updatedAt),
  template_id: w.templateId,
});

export const customExerciseRow = (e: CustomExercise) => ({
  id: e.id,
  user_id: e.userId,
  name: e.name,
  muscle_group: e.muscleGroup,
  equipment: e.equipment,
  notes: e.notes,
  created_at: iso(e.createdAt),
  updated_at: iso(e.updatedAt),
  tracking_mode: e.trackingMode,
});

export const weightRow = (w: WeightEntry) => ({
  id: w.id,
  user_id: w.userId,
  date: w.date,
  weight: num(w.weight),
  created_at: iso(w.createdAt),
});

export const runRow = (r: RunLog) => ({
  id: r.id,
  user_id: r.userId,
  date: r.date,
  distance: num(r.distance),
  duration: r.duration,
  average_pace: r.averagePace,
  pace_is_manual: r.paceIsManual,
  average_hr: r.averageHr,
  difficulty: r.difficulty,
  notes: r.notes,
  created_at: iso(r.createdAt),
});

export const habitRow = (h: Habit) => ({
  id: h.id,
  user_id: h.userId,
  name: h.name,
  icon: h.icon,
  recurrence: h.recurrence,
  time_of_day: h.timeOfDay,
  linked_template_id: h.linkedTemplateId,
  is_active: h.isActive,
  sort_order: h.sortOrder,
  created_at: iso(h.createdAt),
});

export const completionRow = (c: HabitCompletion) => ({
  id: c.id,
  user_id: c.userId,
  habit_id: c.habitId,
  date: c.date,
  status: c.status,
  created_at: iso(c.createdAt),
});
