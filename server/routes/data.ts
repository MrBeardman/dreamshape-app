import { Router } from "express";
import { z } from "zod";
import { prisma, Prisma } from "../db.js";
import { currentUserId } from "../auth/session.js";
import { HttpError, parse } from "../http.js";

/**
 * Data API used by src/lib/syncService.ts. Mounted behind requireUser, so every handler gets
 * the user id from the signed session (currentUserId) and scopes every query to it. That
 * replaces Supabase's row level security (auth.uid() = user_id on every table).
 * A client-supplied user id is never read.
 */
export const dataRouter = Router();

// ─── validation ──────────────────────────────────────────────────────────────────────────────
const idSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "must be a UUID")
  .transform((v) => v.toLowerCase());

const dateTimeSchema = z
  .string()
  .max(64)
  .refine((v) => !Number.isNaN(Date.parse(v)), "must be a date");

const dayStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD");

const looseExercise = z.looseObject({ name: z.string().min(1).max(500) });
const looseExerciseLog = z.looseObject({ exerciseName: z.string().min(1).max(500), sets: z.array(z.looseObject({})).max(500) });

const roleSchema = z.enum(["creator", "tester", "member"]);
const trackingModeSchema = z.enum(["weight-reps", "time"]);
const activityTypeSchema = z.enum(["workout", "cardio", "stretching", "recovery"]);

const profileBody = z.object({
  name: z.string().trim().min(1).max(255),
  role: roleSchema.nullish(),
  peakXp: z.number().finite().min(0).max(1e12).nullish(),
  xpStartDate: dayStringSchema.nullish(),
});

const templateBody = z.object({
  id: idSchema,
  name: z.string().min(1).max(255),
  exercises: z.array(looseExercise).max(500),
  notes: z.string().max(10_000).nullish(),
});

const workoutBody = z.object({
  id: idSchema,
  templateName: z.string().max(255),
  date: dateTimeSchema,
  duration: z.number().int().min(0).max(2_000_000_000),
  exercises: z.array(looseExerciseLog).max(500),
  activityType: activityTypeSchema.nullish(),
});

const workoutPatch = z.object({
  duration: z.number().int().min(0).max(2_000_000_000).optional(),
  date: dateTimeSchema.optional(),
});

const customExerciseBody = z.object({
  name: z.string().min(1).max(255),
  muscleGroup: z.string().max(255),
  equipment: z.string().max(255),
  trackingMode: trackingModeSchema.nullish(),
});

const weightBody = z.object({
  id: idSchema,
  date: z.string().min(1).max(32),
  weight: z.number().finite().min(0).max(100_000),
});

const runBody = z.object({
  id: idSchema,
  date: dateTimeSchema,
  distance: z.number().finite().min(0).max(100_000),
  duration: z.number().int().min(0).max(2_000_000_000),
  averagePace: z.number().int().min(0).max(2_000_000_000),
  paceIsManual: z.boolean().nullish(),
  averageHR: z.number().int().min(0).max(1000).nullish(),
  difficulty: z.number().int().min(1).max(10),
  notes: z.string().max(10_000).nullish(),
});

const habitBody = z.object({
  id: idSchema,
  name: z.string().min(1).max(255),
  icon: z.string().max(255).nullish(),
  recurrence: z.looseObject({ type: z.enum(["daily", "weekdays", "interval"]) }),
  timeOfDay: z.string().max(32).nullish(),
  linkedTemplateId: idSchema.nullish(),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(-1_000_000).max(1_000_000),
  createdAt: dateTimeSchema,
});

const habitReorderBody = z.object({
  items: z.array(z.object({ id: idSchema, sortOrder: z.number().int().min(-1_000_000).max(1_000_000) })).max(1000),
});

const habitCompletionBody = z.object({
  habitId: idSchema,
  date: dayStringSchema,
  status: z.enum(["done", "failed", "pending"]),
});

const idParam = z.object({ id: idSchema });

const json = (v: unknown) => v as Prisma.InputJsonValue;

/** Throws 409 if a row with this id exists but belongs to someone else (never touch it). */
function assertOwner(existing: { userId: string } | null, userId: string): void {
  if (existing && existing.userId !== userId) throw new HttpError(409, "Id already in use");
}

// ─── load everything (initial sync) ──────────────────────────────────────────────────────────
dataRouter.get("/data", async (_req, res) => {
  const userId = currentUserId(res);
  const [profile, templates, workouts, exercises, weights, runs, habits, completions] = await Promise.all([
    prisma.profile.findUnique({ where: { id: userId } }),
    prisma.template.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.workout.findMany({ where: { userId }, orderBy: { date: "desc" } }),
    prisma.customExercise.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.weightEntry.findMany({ where: { userId }, orderBy: { date: "asc" } }),
    prisma.runLog.findMany({ where: { userId }, orderBy: { date: "desc" } }),
    prisma.habit.findMany({ where: { userId }, orderBy: { sortOrder: "asc" } }),
    prisma.habitCompletion.findMany({ where: { userId } }),
  ]);

  // Same shapes syncService used to build from Supabase rows (see src/types.ts).
  res.json({
    profile: profile
      ? {
          name: profile.name,
          memberSince: profile.memberSince.toISOString(),
          role: profile.role ?? undefined,
          peakXp: profile.peakXp == null ? undefined : Number(profile.peakXp),
          xpStartDate: profile.xpStartDate ?? undefined,
        }
      : null,
    templates: templates.map((t) => ({ id: t.id, name: t.name, exercises: t.exercises, notes: t.notes })),
    workouts: workouts.map((w) => ({
      id: w.id,
      templateName: w.templateName,
      date: w.date.toISOString(),
      exercises: w.exercises,
      duration: w.duration,
      activityType: w.activityType,
    })),
    exercises: exercises.map((e) => ({
      name: e.name,
      muscleGroup: e.muscleGroup,
      equipment: e.equipment,
      trackingMode: e.trackingMode ?? undefined,
    })),
    weightEntries: weights.map((e) => ({ id: e.id, date: e.date, weight: Number(e.weight) })),
    runLogs: runs.map((r) => ({
      id: r.id,
      date: r.date,
      distance: Number(r.distance),
      duration: r.duration,
      averagePace: r.averagePace,
      paceIsManual: r.paceIsManual ?? false,
      averageHR: r.averageHr ?? undefined,
      difficulty: r.difficulty,
      notes: r.notes ?? undefined,
    })),
    habits: habits.map((h) => ({
      id: h.id,
      name: h.name,
      icon: h.icon ?? undefined,
      recurrence: h.recurrence,
      timeOfDay: h.timeOfDay ?? undefined,
      linkedTemplateId: h.linkedTemplateId ?? undefined,
      isActive: h.isActive ?? true,
      sortOrder: h.sortOrder ?? 0,
      createdAt: (h.createdAt ?? new Date(0)).toISOString(),
    })),
    habitCompletions: completions.map((c) => ({ id: c.id, habitId: c.habitId, date: c.date, status: c.status })),
  });
});

// ─── profile ─────────────────────────────────────────────────────────────────────────────────
dataRouter.put("/profile", async (req, res) => {
  const userId = currentUserId(res);
  const b = parse(profileBody, req.body);
  const data = { name: b.name, role: b.role ?? null, peakXp: b.peakXp ?? 0, xpStartDate: b.xpStartDate ?? null };
  await prisma.profile.upsert({ where: { id: userId }, update: data, create: { id: userId, ...data } });
  res.json({ ok: true });
});

// ─── templates ───────────────────────────────────────────────────────────────────────────────
async function saveTemplate(userId: string, b: z.infer<typeof templateBody>): Promise<void> {
  assertOwner(await prisma.template.findUnique({ where: { id: b.id }, select: { userId: true } }), userId);
  const data = { name: b.name, exercises: json(b.exercises), notes: b.notes || null };
  await prisma.template.upsert({ where: { id: b.id }, update: data, create: { id: b.id, userId, ...data } });
}

dataRouter.post("/templates", async (req, res) => {
  await saveTemplate(currentUserId(res), parse(templateBody, req.body));
  res.status(201).json({ ok: true });
});

dataRouter.put("/templates/:id", async (req, res) => {
  const { id } = parse(idParam, req.params);
  await saveTemplate(currentUserId(res), parse(templateBody, { ...req.body, id }));
  res.json({ ok: true });
});

dataRouter.delete("/templates/:id", async (req, res) => {
  const { id } = parse(idParam, req.params);
  await prisma.template.deleteMany({ where: { id, userId: currentUserId(res) } });
  res.json({ ok: true });
});

// ─── workouts ────────────────────────────────────────────────────────────────────────────────
dataRouter.post("/workouts", async (req, res) => {
  const userId = currentUserId(res);
  const b = parse(workoutBody, req.body);
  assertOwner(await prisma.workout.findUnique({ where: { id: b.id }, select: { userId: true } }), userId);
  const data = {
    templateName: b.templateName,
    date: new Date(b.date),
    duration: b.duration,
    exercises: json(b.exercises),
    activityType: b.activityType || "workout",
  } as const;
  await prisma.workout.upsert({ where: { id: b.id }, update: data, create: { id: b.id, userId, ...data } });
  res.status(201).json({ ok: true });
});

dataRouter.patch("/workouts/:id", async (req, res) => {
  const { id } = parse(idParam, req.params);
  const b = parse(workoutPatch, req.body);
  await prisma.workout.updateMany({
    where: { id, userId: currentUserId(res) },
    data: { duration: b.duration, date: b.date ? new Date(b.date) : undefined },
  });
  res.json({ ok: true });
});

dataRouter.delete("/workouts/:id", async (req, res) => {
  const { id } = parse(idParam, req.params);
  await prisma.workout.deleteMany({ where: { id, userId: currentUserId(res) } });
  res.json({ ok: true });
});

// ─── custom exercises (identified by name, unique per user) ──────────────────────────────────
dataRouter.post("/custom-exercises", async (req, res) => {
  const userId = currentUserId(res);
  const b = parse(customExerciseBody, req.body);
  // The old client swallowed "duplicate" errors, so an existing name is simply left alone.
  await prisma.customExercise.upsert({
    where: { userId_name: { userId, name: b.name } },
    update: {},
    create: { userId, name: b.name, muscleGroup: b.muscleGroup, equipment: b.equipment, trackingMode: b.trackingMode ?? null },
  });
  res.status(201).json({ ok: true });
});

dataRouter.delete("/custom-exercises", async (req, res) => {
  const { name } = parse(z.object({ name: z.string().min(1).max(255) }), req.query);
  await prisma.customExercise.deleteMany({ where: { name, userId: currentUserId(res) } });
  res.json({ ok: true });
});

// ─── weight entries ──────────────────────────────────────────────────────────────────────────
async function saveWeight(userId: string, b: z.infer<typeof weightBody>): Promise<void> {
  assertOwner(await prisma.weightEntry.findUnique({ where: { id: b.id }, select: { userId: true } }), userId);
  const data = { date: b.date, weight: b.weight };
  await prisma.weightEntry.upsert({ where: { id: b.id }, update: data, create: { id: b.id, userId, ...data } });
}

dataRouter.put("/weight-entries/:id", async (req, res) => {
  const { id } = parse(idParam, req.params);
  await saveWeight(currentUserId(res), parse(weightBody, { ...req.body, id }));
  res.json({ ok: true });
});

dataRouter.delete("/weight-entries/:id", async (req, res) => {
  const { id } = parse(idParam, req.params);
  await prisma.weightEntry.deleteMany({ where: { id, userId: currentUserId(res) } });
  res.json({ ok: true });
});

// ─── run logs ────────────────────────────────────────────────────────────────────────────────
dataRouter.post("/run-logs", async (req, res) => {
  const userId = currentUserId(res);
  const b = parse(runBody, req.body);
  assertOwner(await prisma.runLog.findUnique({ where: { id: b.id }, select: { userId: true } }), userId);
  const data = {
    date: b.date,
    distance: b.distance,
    duration: b.duration,
    averagePace: b.averagePace,
    paceIsManual: b.paceIsManual ?? false,
    averageHr: b.averageHR ?? null,
    difficulty: b.difficulty,
    notes: b.notes ?? null,
  };
  await prisma.runLog.upsert({ where: { id: b.id }, update: data, create: { id: b.id, userId, ...data } });
  res.status(201).json({ ok: true });
});

dataRouter.delete("/run-logs/:id", async (req, res) => {
  const { id } = parse(idParam, req.params);
  await prisma.runLog.deleteMany({ where: { id, userId: currentUserId(res) } });
  res.json({ ok: true });
});

// ─── habits ──────────────────────────────────────────────────────────────────────────────────
async function saveHabit(userId: string, b: z.infer<typeof habitBody>): Promise<void> {
  assertOwner(await prisma.habit.findUnique({ where: { id: b.id }, select: { userId: true } }), userId);
  const data = {
    name: b.name,
    icon: b.icon ?? null,
    recurrence: json(b.recurrence),
    timeOfDay: b.timeOfDay ?? null,
    linkedTemplateId: b.linkedTemplateId ?? null,
    isActive: b.isActive,
    sortOrder: b.sortOrder,
  };
  // createdAt is only set on insert (updateHabit never changed it).
  await prisma.habit.upsert({
    where: { id: b.id },
    update: data,
    create: { id: b.id, userId, ...data, createdAt: new Date(b.createdAt) },
  });
}

dataRouter.post("/habits", async (req, res) => {
  await saveHabit(currentUserId(res), parse(habitBody, req.body));
  res.status(201).json({ ok: true });
});

// Registered before "/habits/:id" so "reorder" is not read as an id.
dataRouter.post("/habits/reorder", async (req, res) => {
  const userId = currentUserId(res);
  const b = parse(habitReorderBody, req.body);
  await prisma.$transaction(
    b.items.map((item) => prisma.habit.updateMany({ where: { id: item.id, userId }, data: { sortOrder: item.sortOrder } }))
  );
  res.json({ ok: true });
});

dataRouter.put("/habits/:id", async (req, res) => {
  const { id } = parse(idParam, req.params);
  await saveHabit(currentUserId(res), parse(habitBody, { ...req.body, id }));
  res.json({ ok: true });
});

dataRouter.delete("/habits/:id", async (req, res) => {
  const { id } = parse(idParam, req.params);
  // habit_completions go with it (ON DELETE CASCADE).
  await prisma.habit.deleteMany({ where: { id, userId: currentUserId(res) } });
  res.json({ ok: true });
});

// done / failed upserts the one record for (habit, date); pending clears it.
dataRouter.put("/habit-completions", async (req, res) => {
  const userId = currentUserId(res);
  const b = parse(habitCompletionBody, req.body);
  if (b.status === "pending") {
    await prisma.habitCompletion.deleteMany({ where: { habitId: b.habitId, date: b.date, userId } });
    res.json({ ok: true });
    return;
  }
  // Postgres only checked that the habit exists; here it must also be the caller's.
  const habit = await prisma.habit.findFirst({ where: { id: b.habitId, userId }, select: { id: true } });
  if (!habit) throw new HttpError(404, "Habit not found");
  const existing = await prisma.habitCompletion.findUnique({ where: { habitId_date: { habitId: b.habitId, date: b.date } } });
  assertOwner(existing, userId);
  await prisma.habitCompletion.upsert({
    where: { habitId_date: { habitId: b.habitId, date: b.date } },
    update: { status: b.status },
    create: { id: crypto.randomUUID(), userId, habitId: b.habitId, date: b.date, status: b.status },
  });
  res.json({ ok: true });
});
