# DreamShape — Codebase Reference

> Complete map of the project for fast feature work. Updated: 2026-02-28.

---

## What the app is

**DreamShape** is a mobile-first PWA: workout tracker + nutrition logger + habit tracker.
Built with React 19 + TypeScript + Vite 7. Auth and cloud sync via Supabase.
Data is written to **localStorage** immediately (offline-first) and synced to **Supabase** async.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19, TypeScript |
| Build | Vite 7 |
| Backend / Auth / DB | Supabase (Postgres + Auth + RLS) |
| Drag & Drop | @dnd-kit/core, @dnd-kit/sortable |
| Charts | Recharts |
| Barcode | @zxing/browser |
| Styling | Modular plain CSS (`src/App-redesign.css` imports all) |
| State | useState / useEffect (no global store) |
| Deployment | Vercel |

---

## File Tree

```
src/
├── main.tsx
├── App.tsx                       — Root: all global state, handlers, view routing
├── App-redesign.css              — CSS entry point (imports all modules)
├── types.ts                      — All TypeScript interfaces
├── data/
│   └── defaultExercises.ts       — 55 built-in exercises (6 muscle groups)
├── lib/
│   ├── supabase.ts               — Supabase client (reads VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
│   ├── syncService.ts            — SyncService class: all Supabase CRUD + migration
│   ├── openFoodFacts.ts          — searchFoods(query), lookupBarcode(barcode) → OFF API v2
│   ├── exerciseStats.ts          — getExerciseHistory(workoutLogs, exerciseName)
│   └── notifications.ts          — requestNotificationPermission, scheduleRestNotification, cancelRestNotification
├── hooks/
│   ├── useWorkoutTimer.ts        — elapsedTime, restDuration, activeRestTimer + effects
│   └── useConfirm.ts             — async confirm dialog hook
├── components/
│   ├── AuthView.tsx              — Sign in / sign up form
│   ├── BottomNav.tsx             — Mobile bottom nav: Home | Habits | Start | Nutrition | Profile
│   ├── SidebarNav.tsx            — Desktop sidebar nav (same 5 tabs)
│   ├── SyncIndicator.tsx         — Fixed top-right sync status badge
│   ├── CircularProgress.tsx      — Reusable SVG circular progress widget
│   ├── ConfirmDialog.tsx         — Bottom-sheet confirm modal (used via useConfirm)
│   ├── DashboardView.tsx         — Home tab: stats, habits widget, templates, nutrition widget, history link
│   ├── HabitsView.tsx            — Habits & Tasks tab (two sub-tabs)
│   ├── NutritionView.tsx         — Nutrition tab: date nav, summary ring, meal sections
│   ├── FoodSearchSheet.tsx       — Food search bottom sheet (search + my foods + barcode)
│   ├── BarcodeScanner.tsx        — @zxing/browser camera scanner
│   ├── ProfileView.tsx           — Profile tab: goals, PRs, charts (calendar + volume), stats, settings
│   ├── WorkoutsView.tsx          — Workout history list (swipe to delete)
│   ├── WorkoutDetailView.tsx     — Read-only logged workout detail
│   ├── TemplatesView.tsx         — Start tab: template list
│   ├── CreateTemplateView.tsx    — Create / edit template (dnd-kit sortable)
│   ├── WorkoutView.tsx           — Active workout screen
│   ├── ExerciseCard.tsx          — Sortable exercise card: sets, rest timer, PR flash, notes
│   ├── ExerciseProgressSheet.tsx — Progressive overload bottom sheet (Recharts LineChart)
│   └── FinishWorkoutModal.tsx    — Finish workout flow (update / save-new / just finish)
└── styles/
    ├── variables.css             — CSS custom properties (--bg-primary, --primary #f5c518, etc.)
    ├── base.css
    └── components/
        ├── auth.css
        ├── bottom-nav.css
        ├── dashboard.css
        ├── desktop-layout.css
        ├── habits.css            — HabitsView + home habits widget
        ├── library.css
        ├── nutrition.css         — NutritionView, FoodSearchSheet, BarcodeScanner, dashboard widget
        ├── profile.css
        ├── progress-sheet.css    — ExerciseProgressSheet
        ├── sync-indicator.css
        ├── theme-toggle.css
        └── workout.css
```

---

## Types (`src/types.ts`)

```ts
Exercise          { id, name, equipment, muscleGroup, notes? }
WorkoutTemplate   { id, name, exercises: Exercise[], notes? }
Set               { id, weight, reps, completed, type?: 'warmup'|'working' }
ExerciseLog       { exerciseId, exerciseName, sets: Set[], restDuration?, notes? }
WorkoutLog        { id, templateName, date, exercises: ExerciseLog[], duration, activityType? }
ActiveWorkout     { templateName, originalTemplateId, exercises: ExerciseLog[], startTime, notes? }
UserProfile       { name, memberSince, role?, nutritionGoals? }
NutritionGoals    { calories, protein, carbs, fat, sugar }
FoodPortion       { name, grams }
FoodItem          { id, name, brand?, barcode?, caloriesPer100g, proteinPer100g, carbsPer100g,
                    fatPer100g, sugarPer100g, isCustom, portions? }
MealEntry         { id, foodId, foodName, brand?, grams, meal, calories, protein, carbs, fat, sugar }
NutritionLog      { id, date (YYYY-MM-DD), entries: MealEntry[] }
Habit             { id, name, createdAt }
HabitCompletion   { habitId, date (YYYY-MM-DD) }
DailyTask         { id, text, date (YYYY-MM-DD), completed, createdAt }
```

---

## App.tsx — Global State

| State variable | Type | localStorage key |
|---|---|---|
| `templates` | `WorkoutTemplate[]` | `dreamshape_templates` |
| `workoutLogs` | `WorkoutLog[]` | `dreamshape_workouts` |
| `exerciseDatabase` | `{name,muscleGroup,equipment}[]` | `dreamshape_exercises` |
| `userProfile` | `UserProfile` | `dreamshape_profile` |
| `nutritionLogs` | `NutritionLog[]` | `dreamshape_nutrition_logs` |
| `customFoods` | `FoodItem[]` | `dreamshape_custom_foods` |
| `habits` | `Habit[]` | `dreamshape_habits` |
| `habitCompletions` | `HabitCompletion[]` | `dreamshape_habit_completions` |
| `dailyTasks` | `DailyTask[]` | `dreamshape_daily_tasks` |
| `activeWorkout` | `ActiveWorkout \| null` | `dreamshape_active_workout` |
| `originalTemplateExercises` | `Exercise[]` | `dreamshape_original_exercises` |
| `currentView` | `'dashboard'\|'habits'\|'progress'\|'start'\|'nutrition'\|'profile'` | in-memory |
| `user` | `User \| null` | Supabase session |
| `syncService` | `SyncService \| null` | in-memory |
| `isSyncing` | `boolean` | in-memory |
| `lastSyncTime` | `Date \| null` | in-memory |
| `selectedWorkout` | `WorkoutLog \| null` | in-memory |
| `selectedTemplate` | `WorkoutTemplate \| null` | in-memory |
| `isCreating` | `boolean` | in-memory |
| `showFinishModal` | `boolean` | in-memory |
| `showResumePrompt` | `boolean` | in-memory |
| `workoutMinimized` | `boolean` | in-memory |
| `exerciseHistoryTarget` | `string \| null` | in-memory |
| `elapsedTime` | `number` | in-memory (from useWorkoutTimer) |
| `restDuration` | `number` | `dreamshape_rest_duration` (via useWorkoutTimer) |
| `activeRestTimer` | `{exerciseIndex, afterSetIndex, timeRemaining} \| null` | in-memory |

---

## App.tsx — Key Handler Functions

### Workout lifecycle
| Function | What it does |
|---|---|
| `startWorkout(template)` | Creates `ActiveWorkout`, pre-fills sets from last workout |
| `startEmptyWorkout()` | Creates `ActiveWorkout` with auto-generated time-of-day name |
| `finishWorkout()` | Opens `FinishWorkoutModal` |
| `saveWorkoutLog()` | Saves to localStorage + Supabase, clears active state |
| `cancelWorkout()` | Confirms then clears `activeWorkout` |
| `deleteWorkout(id)` | Removes from state + Supabase |

### Set / Exercise manipulation
| Function | What it does |
|---|---|
| `updateSet(exIdx, setIdx, field, value)` | Updates weight or reps |
| `toggleSetCompleted(exIdx, setIdx)` | Marks done, starts inline rest timer |
| `addSet(exIdx)` | Appends set, copies last set's weight/reps |
| `removeSet(exIdx, setIdx)` | Removes set (min 1 enforced) |
| `toggleSetType(exIdx, setIdx)` | Toggles warmup ↔ working |
| `addExerciseToWorkout(name, mg, eq)` | Adds exercise, pre-fills from history |
| `removeExerciseFromWorkout(exIdx)` | Removes (confirms if sets completed) |
| `reorderWorkoutExercises(old, new)` | Drag-reorder, updates rest timer indices |
| `setExerciseRestDuration(exIdx, dur)` | Per-exercise rest duration override |
| `setExerciseNotes(exIdx, notes)` | Per-exercise notes |
| `setWorkoutNotes(notes)` | Global workout notes |

### Finish modal
| Function | What it does |
|---|---|
| `handleUpdateTemplate()` | Updates original template then saves workout |
| `handleSaveAsNewTemplate(name, exercises)` | Creates new template then saves workout |
| `handleJustFinish()` | Saves workout without touching templates |

### Template CRUD
| Function | What it does |
|---|---|
| `saveTemplate(name, exercises)` | Create or update in state + localStorage + Supabase |
| `editTemplate(template)` | Sets `selectedTemplate` + `isCreating=true` |
| `deleteTemplate(id)` | Removes from state + Supabase |

### Nutrition
| Function | What it does |
|---|---|
| `addNutritionEntry(date, entry)` | Adds MealEntry to the day's NutritionLog |
| `deleteNutritionEntry(date, entryId)` | Removes entry, drops log if empty |
| `addCustomFood(food)` | Appends to customFoods |
| `deleteCustomFood(foodId)` | Removes from customFoods |

### Habits & Tasks
| Function | What it does |
|---|---|
| `addHabit(name)` | Creates and saves new Habit |
| `deleteHabit(id)` | Removes Habit and all its completions |
| `toggleHabitCompletion(habitId, date)` | Add or remove a HabitCompletion for that date |
| `addDailyTask(text, date)` | Creates new DailyTask |
| `toggleTaskCompletion(id)` | Flips completed boolean |
| `deleteTask(id)` | Removes DailyTask |

### Sync / Auth
| Function | What it does |
|---|---|
| `handleInitialSync(sync, user)` | On login: migrates local data → Supabase, loads all data back |
| `handleUpdateProfile(profile)` | Updates profile in state + Supabase |
| `handleSignOut()` | Signs out, clears sync service |

---

## View Routing

No router. Conditional rendering in `App.tsx`:

```
authLoading             → loading screen
!user                   → AuthView
activeWorkout + !minimized + !resumePrompt → WorkoutView (+ FinishWorkoutModal overlay)
selectedWorkout         → WorkoutDetailView
isCreating              → CreateTemplateView
else:
  'dashboard'  → DashboardView
  'habits'     → HabitsView
  'progress'   → WorkoutsView
  'start'      → TemplatesView
  'nutrition'  → NutritionView
  'profile'    → ProfileView
  + BottomNav (mobile) / SidebarNav (desktop)
```

---

## Key Components

### `DashboardView.tsx`
Props: `templates`, `workoutLogs`, `userProfile`, `exerciseDatabase`, `nutritionLogs`, `habits`, `habitCompletions`, `dailyTasks` + callbacks.
Sections: profile header, stats grid, habits widget, quick action, templates carousel, muscle coverage, nutrition widget, history link.
Charts (calendar + volume trend) moved to **ProfileView**.

### `HabitsView.tsx`
Props: all habits/tasks state + 7 handlers.
Two sub-tabs: **Habits** (completion ring SVG, checkbox list, add input) | **Tasks** (active/completed sections, add input).
Date always = today for MVP.

### `ProfileView.tsx`
Sections: user card, Goals (weekly ring + volume delta + PRs + trend), Nutrition Goals, Lifetime Stats, **Progress** (Workout Calendar + Volume Trend), Data & Settings.
Local state: `chartPeriod`, `calPeriod`, `selectedDate` for the charts.

### `NutritionView.tsx`
Date navigation, daily summary ring (calories), macro breakdown, meal sections (breakfast/lunch/dinner/snacks), `FoodSearchSheet` bottom sheet.

### `FoodSearchSheet.tsx`
Tab 1 — Search: debounced query → `searchFoods()` (OFF API v2), barcode scan button.
Tab 2 — My Foods: custom food library + create form with reference amount and named portions.

### `WorkoutView.tsx`
Sticky header (cancel / elapsed / finish), exercise list (dnd-kit sortable), per-exercise inline rest timer, PR badge, ⋮ menu, sets table with warmup/working types.

### `ExerciseCard.tsx`
5-column set grid: `40px 1fr 1fr 40px 24px` (type badge | weight | reps | complete ✓ | remove ×).
PR flash: "🏆 New PR!" for 2.5 s when a new all-time PR is completed.

---

## SyncService (`src/lib/syncService.ts`)

### Supabase tables
| Table | Key columns |
|---|---|
| `profiles` | id, name, member_since, role |
| `templates` | id, user_id, name, exercises (jsonb), notes |
| `workouts` | id, user_id, template_name, date, duration, exercises (jsonb), activity_type |
| `custom_exercises` | id, user_id, name, muscle_group, equipment |
| `nutrition_logs` | id, user_id, date, entries (jsonb) |
| `custom_foods` | id, user_id, food (jsonb) |

### Methods
| Method | What it does |
|---|---|
| `migrateLocalDataToSupabase()` | One-time migration (guarded by `migration_completed_{userId}`) |
| `loadAllData()` | Loads all data from Supabase, falls back to localStorage |
| `updateProfile(profile)` | PATCH profiles row |
| `createTemplate / updateTemplate / deleteTemplate` | Template CRUD |
| `createWorkout / deleteWorkout` | Workout CRUD |
| `createCustomExercise / deleteCustomExercise` | Exercise CRUD |

---

## openFoodFacts.ts

- `searchFoods(query)` — GET `api/v2/search?sort_by=unique_scans_n`, page_size=25. Requires product name; missing macros default to 0.
- `lookupBarcode(barcode)` — GET `api/v2/product/{barcode}.json`
- `parseNutriments` — maps OFF nutriments fields to `OFFProduct`. `energy-kcal_100g` preferred; falls back to `energy_100g / 4.184` (kJ→kcal).

---

## CSS Architecture

Entry: `src/App-redesign.css` — imports all modules in order.
Variables in `src/styles/variables.css`:
- `--bg-primary: #111111`, `--bg-secondary: #1a1a1a`, `--bg-tertiary: #222`, `--bg-hover: #2a2a2a`
- `--primary: #f5c518` (yellow), `--text-primary: #fff`, `--text-secondary: #888`

Key patterns:
- Circular progress ring: SVG `r=52` (or 40 in habits), `circumference = 2πr`, `strokeDashoffset = circumference * (1 - pct)`
- Sub-tabs: `.food-search-tabs` / `.habit-tab` pattern — flex row, active tab gets bg + box-shadow
- Calendar heatmap: `display: grid`, 7 rows (days of week) × n columns (weeks)

---

## localStorage Keys

| Key | Content |
|---|---|
| `dreamshape_templates` | `WorkoutTemplate[]` |
| `dreamshape_workouts` | `WorkoutLog[]` |
| `dreamshape_exercises` | exercise db array |
| `dreamshape_profile` | `UserProfile` |
| `dreamshape_theme` | `'light'` or `'dark'` |
| `dreamshape_active_workout` | `ActiveWorkout` (cleared on finish) |
| `dreamshape_original_exercises` | `Exercise[]` (cleared on finish) |
| `dreamshape_rest_duration` | number (seconds) |
| `dreamshape_nutrition_logs` | `NutritionLog[]` |
| `dreamshape_custom_foods` | `FoodItem[]` |
| `dreamshape_habits` | `Habit[]` |
| `dreamshape_habit_completions` | `HabitCompletion[]` |
| `dreamshape_daily_tasks` | `DailyTask[]` |
| `migration_completed_{userId}` | `'true'` after first sync |

---

## Known Dead Code

- `App-new.css` — unused alternate CSS file
- `App.css` — legacy styles, superseded by `App-redesign.css`
- `LibraryView.tsx` — component exists, not routed (exercise list view removed from nav)
- Global rest timer overlay — `restTimer` state referenced in some places but nothing sets it (inline timer replaced it)

---

## Environment Variables

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
