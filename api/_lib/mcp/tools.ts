import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { createAdminClient, getUserId } from "../supabase/admin.js";

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

export function registerMcpTools(server: McpServer) {
  const supabase = createAdminClient();

  // ─── Profile ──────────────────────────────────────────────────────────────
  server.registerTool(
    "get_profile",
    { title: "Get profile", description: "Get the user's profile (name, member since, role).", inputSchema: {} },
    async () =>
      safe(async () => {
        const userId = await getUserId(supabase);
        const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
        if (error) return fail(error.message);
        return ok(data);
      })
  );

  server.registerTool(
    "update_profile",
    { title: "Update profile", description: "Update the user's display name or role.", inputSchema: { name: z.string().optional(), role: z.enum(["creator", "tester", "member"]).nullable().optional() } },
    async ({ name, role }) =>
      safe(async () => {
        const userId = await getUserId(supabase);
        const updates: Record<string, unknown> = {};
        if (name !== undefined) updates.name = name;
        if (role !== undefined) updates.role = role;
        const { data, error } = await supabase.from("profiles").update(updates).eq("id", userId).select().single();
        if (error) return fail(error.message);
        return ok(data);
      })
  );

  // ─── Workout templates ────────────────────────────────────────────────────
  server.registerTool(
    "list_templates",
    { title: "List workout templates", description: "List all workout templates.", inputSchema: {} },
    async () =>
      safe(async () => {
        const userId = await getUserId(supabase);
        const { data, error } = await supabase.from("templates").select("*").eq("user_id", userId).order("created_at", { ascending: false });
        if (error) return fail(error.message);
        return ok(data);
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
        const userId = await getUserId(supabase);
        const { data, error } = await supabase
          .from("templates")
          .insert({
            id: randomUUID(),
            user_id: userId,
            name: input.name,
            exercises: withIds(input.exercises),
            notes: input.notes || null,
          })
          .select()
          .single();
        if (error) return fail(error.message);
        return ok(data);
      })
  );

  server.registerTool(
    "update_template",
    {
      title: "Update workout template",
      description: "Update a template's name, exercise list, or notes. Only provided fields are changed.",
      inputSchema: { templateId: z.string(), name: z.string().optional(), exercises: z.array(exerciseSchema).optional(), notes: z.string().nullable().optional() },
    },
    async ({ templateId, exercises, ...rest }) =>
      safe(async () => {
        const userId = await getUserId(supabase);
        const updates: Record<string, unknown> = { ...rest };
        if (exercises !== undefined) updates.exercises = withIds(exercises);
        const { data, error } = await supabase.from("templates").update(updates).eq("id", templateId).eq("user_id", userId).select().single();
        if (error) return fail(error.message);
        return ok(data);
      })
  );

  server.registerTool(
    "delete_template",
    { title: "Delete workout template", description: "Delete a workout template.", inputSchema: { templateId: z.string() } },
    async ({ templateId }) =>
      safe(async () => {
        const userId = await getUserId(supabase);
        const { error } = await supabase.from("templates").delete().eq("id", templateId).eq("user_id", userId);
        if (error) return fail(error.message);
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
        const userId = await getUserId(supabase);
        let query = supabase.from("workouts").select("*").eq("user_id", userId).order("date", { ascending: false });
        if (from) query = query.gte("date", from);
        if (to) query = query.lte("date", to);
        if (limit) query = query.limit(limit);
        const { data, error } = await query;
        if (error) return fail(error.message);
        return ok(data);
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
        const userId = await getUserId(supabase);
        const exercises = input.exercises.map((ex) => ({ ...ex, sets: withIds(ex.sets) }));
        const { data, error } = await supabase
          .from("workouts")
          .insert({
            id: randomUUID(),
            user_id: userId,
            template_name: input.templateName,
            date: input.date,
            duration: input.duration,
            exercises,
            activity_type: input.activityType ?? "workout",
          })
          .select()
          .single();
        if (error) return fail(error.message);
        return ok(data);
      })
  );

  server.registerTool(
    "update_workout",
    { title: "Update workout", description: "Update a logged workout's duration or date.", inputSchema: { workoutId: z.string(), duration: z.number().optional(), date: z.string().optional() } },
    async ({ workoutId, ...rest }) =>
      safe(async () => {
        const userId = await getUserId(supabase);
        const { data, error } = await supabase.from("workouts").update(rest).eq("id", workoutId).eq("user_id", userId).select().single();
        if (error) return fail(error.message);
        return ok(data);
      })
  );

  server.registerTool(
    "delete_workout",
    { title: "Delete workout", description: "Delete a logged workout.", inputSchema: { workoutId: z.string() } },
    async ({ workoutId }) =>
      safe(async () => {
        const userId = await getUserId(supabase);
        const { error } = await supabase.from("workouts").delete().eq("id", workoutId).eq("user_id", userId);
        if (error) return fail(error.message);
        return ok({ ok: true });
      })
  );

  // ─── Custom exercises ─────────────────────────────────────────────────────
  server.registerTool(
    "list_custom_exercises",
    { title: "List custom exercises", description: "List user-created exercises (in addition to the built-in library).", inputSchema: {} },
    async () =>
      safe(async () => {
        const userId = await getUserId(supabase);
        const { data, error } = await supabase.from("custom_exercises").select("*").eq("user_id", userId).order("name");
        if (error) return fail(error.message);
        return ok(data);
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
        const userId = await getUserId(supabase);
        const { data, error } = await supabase
          .from("custom_exercises")
          .insert({ user_id: userId, name, muscle_group: muscleGroup, equipment, tracking_mode: trackingMode ?? null })
          .select()
          .single();
        if (error) return fail(error.message);
        return ok(data);
      })
  );

  server.registerTool(
    "delete_custom_exercise",
    { title: "Delete custom exercise", description: "Remove an exercise from the personal exercise library, by name.", inputSchema: { name: z.string() } },
    async ({ name }) =>
      safe(async () => {
        const userId = await getUserId(supabase);
        const { error } = await supabase.from("custom_exercises").delete().eq("name", name).eq("user_id", userId);
        if (error) return fail(error.message);
        return ok({ ok: true });
      })
  );

  // ─── Weight entries ───────────────────────────────────────────────────────
  server.registerTool(
    "list_weight_entries",
    { title: "List weight entries", description: "List logged body-weight entries, oldest first. Optionally filter by date range.", inputSchema: { from: z.string().optional(), to: z.string().optional() } },
    async ({ from, to }) =>
      safe(async () => {
        const userId = await getUserId(supabase);
        let query = supabase.from("weight_entries").select("*").eq("user_id", userId).order("date", { ascending: true });
        if (from) query = query.gte("date", from);
        if (to) query = query.lte("date", to);
        const { data, error } = await query;
        if (error) return fail(error.message);
        return ok(data);
      })
  );

  server.registerTool(
    "log_weight_entry",
    { title: "Log body weight", description: "Log (or overwrite) the body-weight entry for a given date (YYYY-MM-DD), in kg.", inputSchema: { date: z.string(), weight: z.number() } },
    async ({ date, weight }) =>
      safe(async () => {
        const userId = await getUserId(supabase);
        const { data: existing } = await supabase.from("weight_entries").select("id").eq("user_id", userId).eq("date", date).maybeSingle();
        const { data, error } = await supabase
          .from("weight_entries")
          .upsert({ id: existing?.id ?? randomUUID(), user_id: userId, date, weight }, { onConflict: "id" })
          .select()
          .single();
        if (error) return fail(error.message);
        return ok(data);
      })
  );

  server.registerTool(
    "delete_weight_entry",
    { title: "Delete weight entry", description: "Delete a logged weight entry.", inputSchema: { entryId: z.string() } },
    async ({ entryId }) =>
      safe(async () => {
        const userId = await getUserId(supabase);
        const { error } = await supabase.from("weight_entries").delete().eq("id", entryId).eq("user_id", userId);
        if (error) return fail(error.message);
        return ok({ ok: true });
      })
  );

  // ─── Run logs ─────────────────────────────────────────────────────────────
  server.registerTool(
    "list_run_logs",
    { title: "List run logs", description: "List logged runs, most recent first. Optionally filter by date range.", inputSchema: { from: z.string().optional(), to: z.string().optional() } },
    async ({ from, to }) =>
      safe(async () => {
        const userId = await getUserId(supabase);
        let query = supabase.from("run_logs").select("*").eq("user_id", userId).order("date", { ascending: false });
        if (from) query = query.gte("date", from);
        if (to) query = query.lte("date", to);
        const { data, error } = await query;
        if (error) return fail(error.message);
        return ok(data);
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
        const userId = await getUserId(supabase);
        const averagePace = input.averagePace ?? Math.round(input.duration / Math.max(input.distance, 0.01));
        const { data, error } = await supabase
          .from("run_logs")
          .insert({
            id: randomUUID(),
            user_id: userId,
            date: input.date,
            distance: input.distance,
            duration: input.duration,
            average_pace: averagePace,
            pace_is_manual: input.paceIsManual ?? false,
            average_hr: input.averageHR ?? null,
            difficulty: input.difficulty,
            notes: input.notes ?? null,
          })
          .select()
          .single();
        if (error) return fail(error.message);
        return ok(data);
      })
  );

  server.registerTool(
    "delete_run_log",
    { title: "Delete run log", description: "Delete a logged run.", inputSchema: { runId: z.string() } },
    async ({ runId }) =>
      safe(async () => {
        const userId = await getUserId(supabase);
        const { error } = await supabase.from("run_logs").delete().eq("id", runId).eq("user_id", userId);
        if (error) return fail(error.message);
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
        const userId = await getUserId(supabase);
        let query = supabase.from("habits").select("*").eq("user_id", userId).order("sort_order", { ascending: true });
        if (!includeArchived) query = query.eq("is_active", true);
        const { data, error } = await query;
        if (error) return fail(error.message);
        return ok(data);
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
        const userId = await getUserId(supabase);
        const { data, error } = await supabase
          .from("habits")
          .insert({
            id: randomUUID(),
            user_id: userId,
            name: input.name,
            icon: input.icon ?? null,
            recurrence: input.recurrence,
            time_of_day: input.timeOfDay ?? null,
            linked_template_id: input.linkedTemplateId ?? null,
            is_active: true,
            sort_order: input.sortOrder ?? 0,
          })
          .select()
          .single();
        if (error) return fail(error.message);
        return ok(data);
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
    async ({ habitId, timeOfDay, linkedTemplateId, isActive, sortOrder, ...rest }) =>
      safe(async () => {
        const userId = await getUserId(supabase);
        const updates: Record<string, unknown> = { ...rest };
        if (timeOfDay !== undefined) updates.time_of_day = timeOfDay;
        if (linkedTemplateId !== undefined) updates.linked_template_id = linkedTemplateId;
        if (isActive !== undefined) updates.is_active = isActive;
        if (sortOrder !== undefined) updates.sort_order = sortOrder;
        const { data, error } = await supabase.from("habits").update(updates).eq("id", habitId).eq("user_id", userId).select().single();
        if (error) return fail(error.message);
        return ok(data);
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
        const userId = await getUserId(supabase);
        const { error } = await supabase.from("habits").delete().eq("id", habitId).eq("user_id", userId);
        if (error) return fail(error.message);
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
        const userId = await getUserId(supabase);
        if (status === "pending") {
          const { error } = await supabase.from("habit_completions").delete().eq("habit_id", habitId).eq("date", date).eq("user_id", userId);
          if (error) return fail(error.message);
          return ok({ habitId, date, status: "pending" });
        }
        const { data: existing } = await supabase.from("habit_completions").select("id").eq("habit_id", habitId).eq("date", date).eq("user_id", userId).maybeSingle();
        const { data, error } = await supabase
          .from("habit_completions")
          .upsert({ id: existing?.id ?? randomUUID(), user_id: userId, habit_id: habitId, date, status }, { onConflict: "id" })
          .select()
          .single();
        if (error) return fail(error.message);
        return ok(data);
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
        const userId = await getUserId(supabase);
        let query = supabase.from("habit_completions").select("*").eq("user_id", userId).order("date", { ascending: true });
        if (habitId) query = query.eq("habit_id", habitId);
        if (from) query = query.gte("date", from);
        if (to) query = query.lte("date", to);
        const { data, error } = await query;
        if (error) return fail(error.message);
        return ok(data);
      })
  );
}
