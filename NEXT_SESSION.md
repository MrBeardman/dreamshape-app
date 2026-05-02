# DreamShape — Next Session Implementation Plan

Pick up from here. Three features to build, ordered by complexity (easiest first).

---

## 1. Exercise Alternatives in Switch Exercise Flow (Easiest)

### What
When a user is in an active workout and opens the context menu on an exercise (the "..." menu that lets you Switch Exercise), instead of showing the full exercise library list, add an **"Alternatives"** tab/section at the top that shows exercises of the **same muscle group** first, with a "Show All" fallback.

### Where the switch flow lives
- `src/components/WorkoutView.tsx` — the active workout screen
- `src/components/ExerciseCard.tsx` — the individual exercise card with the context menu. Look for the switch exercise dropdown/sheet logic here.
- The switch handler in `src/App.tsx` is `switchExerciseInWorkout()` and `createAndSwitchExerciseInWorkout()`

### How to implement
1. In the switch exercise UI (wherever the exercise list is rendered for switching), determine the **current exercise's muscle group** by looking it up in `exerciseDatabase`.
2. Split `exerciseDatabase` into two arrays:
   - `alternatives` = same muscle group, different name than current
   - `others` = everything else
3. Show `alternatives` first under a "Alternatives" heading, then `others` under "All Exercises". Both sections searchable.
4. No new types or Supabase changes needed — pure UI change.

### Key data
- `exerciseDatabase` already has `{ name, muscleGroup, equipment }` for all exercises
- `DEFAULT_EXERCISES` in `src/data/defaultExercises.ts` has 60+ exercises across muscle groups
- The current exercise being switched has its `exerciseName` available in `ExerciseLog`

---

## 2. 1RM Estimator (Medium)

### What
Auto-calculate estimated 1 Rep Max for each exercise using the **Epley formula**:
`1RM = weight × (1 + reps / 30)`

Apply it to the **best set** (highest estimated 1RM) from all workout logs for that exercise.

### Where to show it
- **In `ExerciseProgressSheet`** (`src/components/ExerciseProgressSheet.tsx`) — this already shows exercise history. Add a "Est. 1RM: X kg" stat at the top next to max weight/volume. This sheet appears when you tap the chart icon during a workout.
- **In `ExercisesView`** (`src/components/ExercisesView.tsx`) — in the exercise row, show the estimated 1RM if data exists: `~85 kg 1RM` in small text next to the exercise name. Or as a separate column.

### How to implement
Add a utility function in `src/lib/exerciseStats.ts` (already exists):
```typescript
export function estimateOneRepMax(workoutLogs: WorkoutLog[], exerciseName: string): number | null {
  let best = 0
  workoutLogs.forEach(workout => {
    workout.exercises
      .filter(e => e.exerciseName === exerciseName)
      .forEach(e => {
        e.sets.filter(s => s.completed && s.weight > 0 && s.reps > 0).forEach(s => {
          const estimated = s.weight * (1 + s.reps / 30)
          if (estimated > best) best = estimated
        })
      })
  })
  return best > 0 ? Math.round(best * 10) / 10 : null
}
```

Pass `workoutLogs` down to `ExercisesView` (currently not passed — add it to props in `App.tsx` render).

### Progressive overload recommendation (goes with 1RM)
**When finishing a workout**, for each exercise check the last 2 sessions:
- If the user hit **all target reps** in all working sets (e.g. 3×5 all completed) → suggest adding **2.5 kg** next time
- If the user **missed any set** (reps < target) → suggest **staying at same weight**
- Show this in the `FinishWorkoutModal` (`src/components/FinishWorkoutModal.tsx`) as a "Next session suggestions" section, or as a subtle note in `WorkoutDetailView` after saving.

**Rule for "hit all reps":** All `completed = true` working sets (type !== 'warmup') have `reps >= reps from previous session`. Simple: just check `set.completed === true` for all working sets.

**No new Supabase table needed** — calculated on the fly from `workoutLogs`.

---

## 3. Program / Plan Tracker (Largest)

### What
User defines a weekly rotation (a cycle) and the app shows:
- **Today's session** on the Dashboard ("Today: Full Body A")
- **Upcoming days** in the plan
- The cycle repeats indefinitely (no fixed end date)
- Sessions can be: a WorkoutTemplate | 'rest' | 'run'

### User's current plan
```
Day 1: Full Body A (template)
Day 2: Rest or Run
Day 3: Full Body B (template)
Day 4: Rest
→ repeat
```

### New types to add to `src/types.ts`
```typescript
export type PlanDayType = 'workout' | 'run' | 'rest'

export interface PlanDay {
  type: PlanDayType
  templateId?: string   // if type === 'workout'
  label?: string        // optional custom label e.g. "Full Body A"
}

export interface TrainingPlan {
  id: string
  name: string          // e.g. "My Current Split"
  days: PlanDay[]       // the repeating cycle, e.g. length 4
  startDate: string     // YYYY-MM-DD — day 0 of the cycle
  isActive: boolean
}
```

### Storage
- localStorage key: `'dreamshape_plan'`
- Supabase: new `training_plans` table (see SQL below)
- Only one active plan at a time (`isActive: true`)

### Supabase table to add
```sql
create table if not exists training_plans (
  id         uuid primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  name       text not null,
  days       jsonb not null,
  start_date text not null,
  is_active  boolean default false,
  created_at timestamp with time zone default now()
);
alter table training_plans enable row level security;
create policy "Users can manage their own plans"
  on training_plans for all using (auth.uid() = user_id);
```

Add this SQL to `supabase_migrations.sql`.

### Calculating today's session
```typescript
function getTodayPlanDay(plan: TrainingPlan): PlanDay {
  const start = new Date(plan.startDate)
  const today = new Date()
  start.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  const daysSinceStart = Math.floor((today.getTime() - start.getTime()) / 86400000)
  const cycleIndex = ((daysSinceStart % plan.days.length) + plan.days.length) % plan.days.length
  return plan.days[cycleIndex]
}
```

### UI changes needed
1. **New `PlanView.tsx`** — Plan editor. Create/edit a plan by adding days to the cycle. Each day you pick: Rest | Run | Workout (choose template from list). Set start date. Activate the plan.
2. **Dashboard widget** — Show today's session in a prominent card. If it's a workout, show a "Start →" button that launches that template directly. If it's a run, show run icon + "Log Run →". If rest, show rest message.
3. **Navigation** — Add "Plan" as a 6th tab, OR put it inside the Start tab as a section above Templates. The latter avoids adding a 6th nav item (bottom nav is already 5 items). Recommended: add a "Plan" section at the top of `TemplatesView`.
4. **App.tsx** — Add `plan` state (single `TrainingPlan | null`), localStorage persist, Supabase sync via new `syncService` methods.

### Sync methods to add to `syncService.ts`
```typescript
async createPlan(plan: TrainingPlan): Promise<void>
async updatePlan(plan: TrainingPlan): Promise<void>
async deletePlan(planId: string): Promise<void>
async loadActivePlan(): Promise<TrainingPlan | null>
```
Also include plan in `loadAllData()` return type.

---

## Implementation Order for Next Session

1. **Exercise Alternatives** — pure UI, no data model changes, ~1 hour
2. **1RM estimator** — utility function + UI in 2 places, ~1–2 hours  
3. **Progressive overload suggestions** — add to FinishWorkoutModal, ~1 hour
4. **Program Tracker** — new types, new table, new view, ~3–4 hours

Start with 1, then 2+3 together (they're related), then 4.

---

## Files to Read at Session Start
- `src/components/ExerciseCard.tsx` — switch exercise UI
- `src/components/WorkoutView.tsx` — active workout layout
- `src/components/FinishWorkoutModal.tsx` — end of workout modal
- `src/components/ExerciseProgressSheet.tsx` — exercise history sheet
- `src/lib/exerciseStats.ts` — existing stats utility
- `src/App.tsx` lines 1–60 (state) and render section (~line 280+)
