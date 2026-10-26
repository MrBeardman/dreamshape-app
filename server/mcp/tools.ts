import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { prisma, Prisma } from "../db.js";
import { completionRow, customExerciseRow, habitRow, profileRow, runRow, templateRow, weightRow, workoutRow } from "./rows.js";

// Tool names, descriptions, input schemas and output shapes are unchanged from the Supabase
// version, so the claude.ai connector keeps working. Only the data layer moved to Prisma/MySQL.

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

function ok(data: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function fail(message: string): ToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

async function safe(fn: () => Promise<ToolResult>): Promise<ToolResult> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return fail("duplicate key value: that record already exists");
    }
    return fail(err instanceof Error ? err.message : String(err));
  }
}

const setSchema = z.object({
  id: z.string().optional(),
  weight: z.number(),
  reps: z.number(),
  completed: z.boolean().optional(),
  type: z.enum(["warmup", "working"]).optional(),
});

const exerciseSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  equipment: z.string(),
  muscleGroup: z.string(),
  notes: z.string().optional(),
});

const exerciseLogSchema = z.object({
  exerciseId: z.string(),
  exerciseName: z.string(),
  sets: z.array(setSchema),
  restDuration: z.number().optional(),
  notes: z.string().optional(),
});

const habitRecurrenceSchema = z.object({
  type: z.enum(["daily", "weekdays", "interval"]),
  weekdays: z.array(z.number().int().min(0).max(6)).optional().describe("0=Sun..6=Sat"),
  intervalDays: z.number().int().min(1).optional(),
  anchorDate: z.string().optional().describe("YYYY-MM-DD"),
});

function withIds<T extends { id?: string }>(items: T[]): (Omit<T, "id"> & { id: string })[] {
  return items.map((item) => ({ ...item, id: item.id ?? randomUUID() }));
}

const json = (v: unknown) => v as Prisma.InputJsonValue;

function parseDate(label: string, value: string): Date {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid ${label}: ${value}`);
  return d;
}

// Dreamshape is single-user, and a remote MCP call carries no browser session. The tools act
// on the one user: MCP_USER_ID if set, otherwise the oldest account.
async function getUserId(): Promise<string> {
  const fixed = process.env.MCP_USER_ID;
  if (fixed) return fixed;
  const profile = await prisma.profile.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
  if (!profile) throw new Error("Could not resolve the app's user id from the profiles table");
  return profile.id;
}

export function registerMcpTools(server: McpServer) {
  // ─── Profile ──────────────────────────────────────────────────────────────
  server.registerTool(
    "get_profile",
    { title: "Get profile", description: "Get the user's profile (name, member since, role).", inputSchema: {} },
    async () =>
      safe(async () => {
        const userId = await getUserId();
        const row = await prisma.profile.findUnique({ where: { id: userId } });
        if (!row) return fail("Profile not found");
        return ok(profileRow(row));
      })
  );

  server.registerTool(
    "update_profile",
    { title: "Update profile", description: "Update the user's display name or role.", inputSchema: { name: z.string().optional(), role: z.enum(["creator", "tester", "member"]).nullable().optional() } },
    async ({ name, role }) =>
      safe(async () => {
        const userId = await getUserId();
        const exists = await prisma.profile.findUnique({ where: { id: userId }, select: { id: true } });
        if (!exists) return fail("Profile not found");
        const row = await prisma.profile.update({ where: { id: userId }, data: { name, role } });
        return ok(profileRow(row));
      })
  );

  // ─── Workout templates ────────────────────────────────────────────────────
  server.registerTool(
    "list_templates",
    { title: "List workout templates", description: "List all workout templates.", inputSchema: {} },
    async () =>
      safe(async () => {
        const userId = await getUserId();
        const rows = await prisma.template.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
        return ok(rows.map(templateRow));
      })
  );

  server.registerTool(
    "create_template",
    {
      title: "Create workout template",
      description: "Create a new workout template with a list of exercises.",
      inputSchema: { name: z.string(), exercises: z.array(exerciseSchema), notes: z.string().optional() },
    },
    async (input) =>
      safe(async () => {
        const userId = await getUserId();
        const row = await prisma.template.create({
          data: { id: randomUUID(), userId, name: input.name, exercises: json(withIds(input.exercises)), notes: input.notes || null },
        });
        return ok(templateRow(row));
      })
  );

  server.registerTool(
    "update_template",
    {
      title: "Update workout template",
      description: "Update a template's name, exercise list, or notes. Only provided fields are changed.",
      inputSchema: { templateId: z.string(), name: z.string().optional(), exercises: z.array(exerciseSchema).optional(), notes: z.string().nullable().optional() },
    },
    async ({ templateId, exercises, name, notes }) =>
      safe(async () => {
        const userId = await getUserId();
        const result = await prisma.template.updateMany({
          where: { id: templateId, userId },
          data: { name, notes, exercises: exercises !== undefined ? json(withIds(exercises)) : undefined },
        });
        if (result.count === 0) return fail("Template not found");
        const row = await prisma.template.findFirst({ where: { id: templateId, userId } });
        return ok(templateRow(row!));
      })
  );

  server.registerTool(
    "delete_template",
    { title: "Delete workout template", description: "Delete a workout template.", inputSchema: { templateId: z.string() } },
    async ({ templateId }) =>
      safe(async () => {
        const userId = await getUserId();
        await prisma.template.deleteMany({ where: { id: templateId, userId } });
        return ok({ ok: true });
      })
  );

  // ─── Workouts (logged sessions) ───────────────────────────────────────────
  server.registerTool(
    "list_workouts",
    {
      title: "List logged workouts",
      description: "List logged workouts, most recent first. Optionally filter by date range.",
      inputSchema: { from: z.string().optional(), to: z.string().optional(), limit: z.number().int().optional() },
    },
    async ({ from, to, limit }) =>
      safe(async () => {
        const userId = await getUserId();
        const date: Prisma.DateTimeFilter = {};
        if (from) date.gte = parseDate("from", from);
        if (to) date.lte = parseDate("to", to);
        const rows = await prisma.workout.findMany({
          where: { userId, ...(from || to ? { date } : {}) },
          orderBy: { date: "desc" },
          ...(limit ? { take: limit } : {}),
        });
        return ok(rows.map(workoutRow));
      })
  );

  server.registerTool(
    "create_workout",
    {
      title: "Log a workout",
      description: "Log a completed (or in-progress) workout session with its exercises and sets.",
      inputSchema: {
        templateName: z.string(),
        date: z.string().describe("ISO date-time"),
        duration: z.number().describe("Duration in seconds"),
        exercises: z.array(exerciseLogSchema),
        activityType: z.enum(["workout", "cardio", "stretching", "recovery"]).optional(),
      },
    },
    async (input) =>
      safe(async () => {
        const userId = await getUserId();
        const exercises = input.exercises.map((ex) => ({ ...ex, sets: withIds(ex.sets) }));
        const row = await prisma.workout.create({
          data: {
            id: randomUUID(),
            userId,
            templateName: input.templateName,
            date: parseDate("date", input.date),
            duration: Math.round(input.duration),
            exercises: json(exercises),
            activityType: input.activityType ?? "workout",
          },
        });
        return ok(workoutRow(row));
      })
  );

  server.registerTool(
    "update_workout",
    { title: "Update workout", description: "Update a logged workout's duration or date.", inputSchema: { workoutId: z.string(), duration: z.number().optional(), date: z.string().optional() } },
    async ({ workoutId, duration, date }) =>
      safe(async () => {
        const userId = await getUserId();
        const result = await prisma.workout.updateMany({
          where: { id: workoutId, userId },
          data: { duration: duration !== undefined ? Math.round(duration) : undefined, date: date !== undefined ? parseDate("date", date) : undefined },
        });
        if (result.count === 0) return fail("Workout not found");
        const row = await prisma.workout.findFirst({ where: { id: workoutId, userId } });
        return ok(workoutRow(row!));
      })
  );

  server.registerTool(
    "delete_workout",
    { title: "Delete workout", description: "Delete a logged workout.", inputSchema: { workoutId: z.string() } },
    async ({ workoutId }) =>
      safe(async () => {
        const userId = await getUserId();
        await prisma.workout.deleteMany({ where: { id: workoutId, userId } });
        return ok({ ok: true });
      })
  );

  // ─── Custom exercises ─────────────────────────────────────────────────────
  server.registerTool(
    "list_custom_exercises",
    { title: "List custom exercises", description: "List user-created exercises (in addition to the built-in library).", inputSchema: {} },
    async () =>
      safe(async () => {
        const userId = await getUserId();
        const rows = await prisma.customExercise.findMany({ where: { userId }, orderBy: { name: "asc" } });
        return ok(rows.map(customExerciseRow));
      })
  );

  server.registerTool(
    "create_custom_exercise",
    {
      title: "Add custom exercise",
      description: "Add a new exercise to the personal exercise library. trackingMode 'time' is for holds like planks — reps is then read as seconds held instead of rep count.",
      inputSchema: { name: z.string(), muscleGroup: z.string(), equipment: z.string(), trackingMode: z.enum(["weight-reps", "time"]).optional() },
    },
    async ({ name, muscleGroup, equipment, trackingMode }) =>
      safe(async () => {
        const userId = await getUserId();
        const row = await prisma.customExercise.create({
          data: { userId, name, muscleGroup, equipment, trackingMode: trackingMode ?? null },
        });
        return ok(customExerciseRow(row));
      })
  );

  server.registerTool(
    "delete_custom_exercise",
    { title: "Delete custom exercise", description: "Remove an exercise from the personal exercise library, by name.", inputSchema: { name: z.string() } },
    async ({ name }) =>
      safe(async () => {
        const userId = await getUserId();
        await prisma.customExercise.deleteMany({ where: { name, userId } });
        return ok({ ok: true });
      })
  );

  // ─── Weight entries ───────────────────────────────────────────────────────
  server.registerTool(
    "list_weight_entries",
    { title: "List weight entries", description: "List logged body-weight entries, oldest first. Optionally filter by date range.", inputSchema: { from: z.string().optional(), to: z.string().optional() } },
    async ({ from, to }) =>
      safe(async () => {
        const userId = await getUserId();
        const rows = await prisma.weightEntry.findMany({
          where: { userId, ...(from || to ? { date: { gte: from, lte: to } } : {}) },
          orderBy: { date: "asc" },
        });
        return ok(rows.map(weightRow));
      })
  );

  server.registerTool(
    "log_weight_entry",
    { title: "Log body weight", description: "Log (or overwrite) the body-weight entry for a given date (YYYY-MM-DD), in kg.", inputSchema: { date: z.string(), weight: z.number() } },
    async ({ date, weight }) =>
      safe(async () => {
        const userId = await getUserId();
        const existing = await prisma.weightEntry.findFirst({ where: { userId, date }, select: { id: true } });
        const row = existing
          ? await prisma.weightEntry.update({ where: { id: existing.id }, data: { weight } })
          : await prisma.weightEntry.create({ data: { id: randomUUID(), userId, date, weight } });
        return ok(weightRow(row));
      })
  );

  server.registerTool(
    "delete_weight_entry",
    { title: "Delete weight entry", description: "Delete a logged weight entry.", inputSchema: { entryId: z.string() } },
    async ({ entryId }) =>
      safe(async () => {
        const userId = await getUserId();
        await prisma.weightEntry.deleteMany({ where: { id: entryId, userId } });
        return ok({ ok: true });
      })
  );

  // ─── Run logs ─────────────────────────────────────────────────────────────
  server.registerTool(
    "list_run_logs",
    { title: "List run logs", description: "List logged runs, most recent first. Optionally filter by date range.", inputSchema: { from: z.string().optional(), to: z.string().optional() } },
    async ({ from, to }) =>
      safe(async () => {
        const userId = await getUserId();
        const rows = await prisma.runLog.findMany({
          where: { userId, ...(from || to ? { date: { gte: from, lte: to } } : {}) },
          orderBy: { date: "desc" },
        });
        return ok(rows.map(runRow));
      })
  );

  server.registerTool(
    "create_run_log",
    {
      title: "Log a run",
      description: "Log a completed run. averagePace (seconds/km) is computed from distance/duration if omitted.",
      inputSchema: {
        date: z.string().describe("ISO date-time"),
        distance: z.number().describe("km, e.g. 5.02"),
        duration: z.number().describe("Duration in seconds"),
        averagePace: z.number().optional().describe("Seconds per km"),
        paceIsManual: z.boolean().optional(),
        averageHR: z.number().optional().describe("bpm"),
        difficulty: z.number().int().min(1).max(10),
        notes: z.string().optional(),
      },
    },
    async (input) =>
      safe(async () => {
        const userId = await getUserId();
        const averagePace = input.averagePace ?? Math.round(input.duration / Math.max(input.distance, 0.01));
        const row = await prisma.runLog.create({
          data: {
            id: randomUUID(),
            userId,
            date: input.date,
            distance: input.distance,
            duration: Math.round(input.duration),
            averagePace: Math.round(averagePace),
            paceIsManual: input.paceIsManual ?? false,
            averageHr: input.averageHR != null ? Math.round(input.averageHR) : null,
            difficulty: input.difficulty,
            notes: input.notes ?? null,
          },
        });
        return ok(runRow(row));
      })
  );

  server.registerTool(
    "delete_run_log",
    { title: "Delete run log", description: "Delete a logged run.", inputSchema: { runId: z.string() } },
    async ({ runId }) =>
      safe(async () => {
        const userId = await getUserId();
        await prisma.runLog.deleteMany({ where: { id: runId, userId } });
        return ok({ ok: true });
      })
  );

  // ─── Habits ───────────────────────────────────────────────────────────────
  server.registerTool(
    "list_habits",
    {
      title: "List habits",
      description: "List the user's habits, ordered by sort order. Archived habits are excluded unless includeArchived is set.",
      inputSchema: { includeArchived: z.boolean().optional() },
    },
    async ({ includeArchived }) =>
      safe(async () => {
        const userId = await getUserId();
        const rows = await prisma.habit.findMany({
          where: { userId, ...(includeArchived ? {} : { isActive: true }) },
          orderBy: { sortOrder: "asc" },
        });
        return ok(rows.map(habitRow));
      })
  );

  server.registerTool(
    "create_habit",
    {
      title: "Create habit",
      description: "Create a new recurring habit (e.g. morning stretch, no phone till 8am, daily gym/run).",
      inputSchema: {
        name: z.string(),
        icon: z.string().optional(),
        recurrence: habitRecurrenceSchema,
        timeOfDay: z.string().optional().describe("HH:MM 24h, display/sort only"),
        linkedTemplateId: z.string().optional().describe("Optional workout template id this habit is tied to"),
        sortOrder: z.number().int().optional(),
      },
    },
    async (input) =>
      safe(async () => {
        const userId = await getUserId();
        const row = await prisma.habit.create({
          data: {
            id: randomUUID(),
            userId,
            name: input.name,
            icon: input.icon ?? null,
            recurrence: json(input.recurrence),
            timeOfDay: input.timeOfDay ?? null,
            linkedTemplateId: input.linkedTemplateId ?? null,
            isActive: true,
            sortOrder: input.sortOrder ?? 0,
          },
        });
        return ok(habitRow(row));
      })
  );

  server.registerTool(
    "update_habit",
    {
      title: "Update habit",
      description: "Update a habit's name, icon, recurrence, time of day, linked template, active state, or sort order. Only provided fields are changed.",
      inputSchema: {
        habitId: z.string(),
        name: z.string().optional(),
        icon: z.string().nullable().optional(),
        recurrence: habitRecurrenceSchema.optional(),
        timeOfDay: z.string().nullable().optional(),
        linkedTemplateId: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
      },
    },
    async ({ habitId, name, icon, recurrence, timeOfDay, linkedTemplateId, isActive, sortOrder }) =>
      safe(async () => {
        const userId = await getUserId();
        const data: Prisma.HabitUpdateManyMutationInput = {};
        if (name !== undefined) data.name = name;
        if (icon !== undefined) data.icon = icon;
        if (recurrence !== undefined) data.recurrence = json(recurrence);
        if (timeOfDay !== undefined) data.timeOfDay = timeOfDay;
        if (linkedTemplateId !== undefined) data.linkedTemplateId = linkedTemplateId;
        if (isActive !== undefined) data.isActive = isActive;
        if (sortOrder !== undefined) data.sortOrder = sortOrder;
        if (Object.keys(data).length > 0) {
          const result = await prisma.habit.updateMany({ where: { id: habitId, userId }, data });
          if (result.count === 0) return fail("Habit not found");
        }
        const row = await prisma.habit.findFirst({ where: { id: habitId, userId } });
        if (!row) return fail("Habit not found");
        return ok(habitRow(row));
      })
  );

  server.registerTool(
    "delete_habit",
    {
      title: "Delete habit",
      description: "Permanently delete a habit and its completion history. To keep history but stop tracking it, use update_habit with isActive: false instead.",
      inputSchema: { habitId: z.string() },
    },
    async ({ habitId }) =>
      safe(async () => {
        const userId = await getUserId();
        await prisma.habit.deleteMany({ where: { id: habitId, userId } });
        return ok({ ok: true });
      })
  );

  server.registerTool(
    "set_habit_completion",
    {
      title: "Set habit completion status for a date",
      description: "Set a habit's status for a specific date (YYYY-MM-DD) to done, failed, or pending (pending clears any existing record for that day).",
      inputSchema: { habitId: z.string(), date: z.string(), status: z.enum(["done", "failed", "pending"]) },
    },
    async ({ habitId, date, status }) =>
      safe(async () => {
        const userId = await getUserId();
        if (status === "pending") {
          await prisma.habitCompletion.deleteMany({ where: { habitId, date, userId } });
          return ok({ habitId, date, status: "pending" });
        }
        const habit = await prisma.habit.findFirst({ where: { id: habitId, userId }, select: { id: true } });
        if (!habit) return fail("Habit not found");
        const existing = await prisma.habitCompletion.findFirst({ where: { habitId, date, userId }, select: { id: true } });
        const row = existing
          ? await prisma.habitCompletion.update({ where: { id: existing.id }, data: { status } })
          : await prisma.habitCompletion.create({ data: { id: randomUUID(), userId, habitId, date, status } });
        return ok(completionRow(row));
      })
  );

  server.registerTool(
    "list_habit_completions",
    {
      title: "List habit completions",
      description: "List habit completion records, optionally filtered by habit and/or date range.",
      inputSchema: { habitId: z.string().optional(), from: z.string().optional(), to: z.string().optional() },
    },
    async ({ habitId, from, to }) =>
      safe(async () => {
        const userId = await getUserId();
        const rows = await prisma.habitCompletion.findMany({
          where: { userId, ...(habitId ? { habitId } : {}), ...(from || to ? { date: { gte: from, lte: to } } : {}) },
          orderBy: { date: "asc" },
        });
        return ok(rows.map(completionRow));
      })
  );
}
