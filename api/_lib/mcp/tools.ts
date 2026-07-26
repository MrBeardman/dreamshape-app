import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { createAdminClient, getUserId } from "../supabase/admin";

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
    { title: "List custom exercises", description: "List user-created exercises (in addition to the 55 built-in ones).", inputSchema: {} },
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
      description: "Add a new exercise to the personal exercise library.",
      inputSchema: { name: z.string(), muscleGroup: z.string(), equipment: z.string() },
    },
    async ({ name, muscleGroup, equipment }) =>
      safe(async () => {
        const userId = await getUserId(supabase);
        const { data, error } = await supabase
          .from("custom_exercises")
          .insert({ user_id: userId, name, muscle_group: muscleGroup, equipment })
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

  // ─── Nutrition logs ───────────────────────────────────────────────────────
  server.registerTool(
    "list_nutrition_logs",
    { title: "List nutrition logs", description: "List logged days of nutrition entries. Optionally filter to a single date (YYYY-MM-DD).", inputSchema: { date: z.string().optional() } },
    async ({ date }) =>
      safe(async () => {
        const userId = await getUserId(supabase);
        let query = supabase.from("nutrition_logs").select("*").eq("user_id", userId).order("date", { ascending: false });
        if (date) query = query.eq("date", date);
        const { data, error } = await query;
        if (error) return fail(error.message);
        return ok(data);
      })
  );

  server.registerTool(
    "add_nutrition_entry",
    {
      title: "Log a meal entry",
      description: "Add a food entry to a day's nutrition log, creating that day's log if it doesn't exist yet.",
      inputSchema: {
        date: z.string().describe("YYYY-MM-DD"),
        meal: z.enum(["breakfast", "lunch", "dinner", "snacks"]),
        foodName: z.string(),
        brand: z.string().optional(),
        foodId: z.string().optional().describe("Reference an existing custom food id instead of foodName, if known"),
        grams: z.number(),
        calories: z.number(),
        protein: z.number(),
        carbs: z.number(),
        fat: z.number(),
        sugar: z.number(),
      },
    },
    async (input) =>
      safe(async () => {
        const userId = await getUserId(supabase);
        const { data: existing } = await supabase.from("nutrition_logs").select("*").eq("user_id", userId).eq("date", input.date).maybeSingle();

        const entry = {
          id: randomUUID(),
          foodId: input.foodId ?? randomUUID(),
          foodName: input.foodName,
          brand: input.brand,
          grams: input.grams,
          meal: input.meal,
          calories: input.calories,
          protein: input.protein,
          carbs: input.carbs,
          fat: input.fat,
          sugar: input.sugar,
        };

        const entries = existing ? [...(existing.entries as unknown[]), entry] : [entry];
        const { data, error } = await supabase
          .from("nutrition_logs")
          .upsert({ id: existing?.id ?? randomUUID(), user_id: userId, date: input.date, entries }, { onConflict: "id" })
          .select()
          .single();
        if (error) return fail(error.message);
        return ok(data);
      })
  );

  server.registerTool(
    "delete_nutrition_entry",
    {
      title: "Delete a meal entry",
      description: "Remove a single food entry from a day's nutrition log. Deletes the whole log if it becomes empty.",
      inputSchema: { date: z.string(), entryId: z.string() },
    },
    async ({ date, entryId }) =>
      safe(async () => {
        const userId = await getUserId(supabase);
        const { data: existing, error: fetchError } = await supabase.from("nutrition_logs").select("*").eq("user_id", userId).eq("date", date).maybeSingle();
        if (fetchError) return fail(fetchError.message);
        if (!existing) return fail("No nutrition log found for that date");

        const entries = (existing.entries as { id: string }[]).filter((e) => e.id !== entryId);
        if (entries.length === 0) {
          const { error } = await supabase.from("nutrition_logs").delete().eq("id", existing.id).eq("user_id", userId);
          if (error) return fail(error.message);
          return ok({ ok: true, deletedLog: true });
        }
        const { data, error } = await supabase.from("nutrition_logs").update({ entries }).eq("id", existing.id).eq("user_id", userId).select().single();
        if (error) return fail(error.message);
        return ok(data);
      })
  );

  server.registerTool(
    "delete_nutrition_log",
    { title: "Delete a full day's nutrition log", description: "Delete an entire day's nutrition log.", inputSchema: { logId: z.string() } },
    async ({ logId }) =>
      safe(async () => {
        const userId = await getUserId(supabase);
        const { error } = await supabase.from("nutrition_logs").delete().eq("id", logId).eq("user_id", userId);
        if (error) return fail(error.message);
        return ok({ ok: true });
      })
  );

  // ─── Custom foods ─────────────────────────────────────────────────────────
  server.registerTool(
    "list_custom_foods",
    { title: "List custom foods", description: "List foods saved to the personal food library.", inputSchema: {} },
    async () =>
      safe(async () => {
        const userId = await getUserId(supabase);
        const { data, error } = await supabase.from("custom_foods").select("*").eq("user_id", userId).order("name");
        if (error) return fail(error.message);
        return ok(data);
      })
  );

  server.registerTool(
    "create_custom_food",
    {
      title: "Add custom food",
      description: "Save a food to the personal food library, with macros per 100g.",
      inputSchema: {
        name: z.string(),
        brand: z.string().optional(),
        barcode: z.string().optional(),
        caloriesPer100g: z.number(),
        proteinPer100g: z.number(),
        carbsPer100g: z.number(),
        fatPer100g: z.number(),
        sugarPer100g: z.number(),
      },
    },
    async (input) =>
      safe(async () => {
        const userId = await getUserId(supabase);
        const { data, error } = await supabase
          .from("custom_foods")
          .insert({
            id: randomUUID(),
            user_id: userId,
            name: input.name,
            brand: input.brand ?? null,
            barcode: input.barcode ?? null,
            calories_per100g: input.caloriesPer100g,
            protein_per100g: input.proteinPer100g,
            carbs_per100g: input.carbsPer100g,
            fat_per100g: input.fatPer100g,
            sugar_per100g: input.sugarPer100g,
          })
          .select()
          .single();
        if (error) return fail(error.message);
        return ok(data);
      })
  );

  server.registerTool(
    "delete_custom_food",
    { title: "Delete custom food", description: "Remove a food from the personal food library.", inputSchema: { foodId: z.string() } },
    async ({ foodId }) =>
      safe(async () => {
        const userId = await getUserId(supabase);
        const { error } = await supabase.from("custom_foods").delete().eq("id", foodId).eq("user_id", userId);
        if (error) return fail(error.message);
        return ok({ ok: true });
      })
  );

  // ─── Food search (Open Food Facts) ────────────────────────────────────────
  server.registerTool(
    "search_foods",
    {
      title: "Search foods",
      description: "Search the Open Food Facts database for a food by name, to get macros per 100g for logging.",
      inputSchema: { query: z.string() },
    },
    async ({ query }) =>
      safe(async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        try {
          const url =
            `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}` +
            `&search_simple=1&action=process&json=1&page_size=10&fields=product_name,brands,nutriments,code`;
          const resp = await fetch(url, { signal: controller.signal });
          if (!resp.ok) return fail(`Open Food Facts search failed: ${resp.status}`);
          const data = (await resp.json()) as { products?: Record<string, unknown>[] };
          const products = (data.products ?? [])
            .map((p: Record<string, unknown>) => {
              const n = (p.nutriments ?? {}) as Record<string, number>;
              const name = (p.product_name as string) || "";
              if (!name.trim()) return null;
              const kcal = n["energy-kcal_100g"] ?? (n["energy_100g"] ? Math.round(n["energy_100g"] / 4.184) : 0);
              return {
                name: name.trim(),
                brand: (p.brands as string) || undefined,
                barcode: (p.code as string) || undefined,
                caloriesPer100g: Math.max(0, Math.round(kcal)),
                proteinPer100g: Math.round((n["proteins_100g"] ?? 0) * 10) / 10,
                carbsPer100g: Math.round((n["carbohydrates_100g"] ?? 0) * 10) / 10,
                fatPer100g: Math.round((n["fat_100g"] ?? 0) * 10) / 10,
                sugarPer100g: Math.round((n["sugars_100g"] ?? 0) * 10) / 10,
              };
            })
            .filter((p: unknown) => p !== null);
          return ok(products);
        } finally {
          clearTimeout(timeout);
        }
      })
  );
}
