# DreamShape — Codebase Reference

> Complete map of the project for fast feature work. Updated: 2026-02-22.

---

## What the app is

**DreamShape** is a mobile-first PWA workout tracker built with React 19 + TypeScript + Vite.
Users log in via Supabase Auth, create workout templates, run live workouts, and review history + progress charts.
Data is stored in **localStorage** (offline-first) and synced to **Supabase** (Postgres) on every write.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19, TypeScript |
| Build | Vite 7 |
| Backend / Auth / DB | Supabase (Postgres + Auth) |
| Drag & Drop | @dnd-kit/core, @dnd-kit/sortable |
| Charts | Recharts |
| Styling | Plain CSS (single App.css, ~2600 lines) |
| State | useState / useEffect (no global store) |

---

## File Tree

```
src/
├── main.tsx                    — React entry point
├── App.tsx                     — Root component, all global state & logic
├── App.css                     — ALL styles (~2600 lines, one big file)
├── App-new.css                 — Unused alternate CSS (can ignore)
├── types.ts                    — All TypeScript interfaces
├── data/
│   └── defaultExercises.ts     — 55 built-in exercises (Chest/Back/Shoulders/Arms/Legs/Core)
├── lib/
│   ├── supabase.ts             — Supabase client init (reads VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
│   └── syncService.ts          — SyncService class: all Supabase CRUD + localStorage migration
└── components/
    ├── AuthView.tsx            — Sign in / sign up form
    ├── BottomNav.tsx           — Fixed bottom navigation bar (5 tabs)
    ├── SyncIndicator.tsx       — Fixed top-right sync status badge
    ├── ThemeToggle.tsx         — Light/dark toggle button (in ProfileView header)
    ├── DashboardView.tsx       — Home tab: stats, PRs, template scroll, charts
    ├── WorkoutsView.tsx        — Progress tab: list of past workouts
    ├── WorkoutDetailView.tsx   — Read-only detail of a logged workout (pushes over nav)
    ├── TemplatesView.tsx       — Start tab: template list with Edit / Start Workout
    ├── LibraryView.tsx         — Library tab: Templates + Exercises sub-tabs
    ├── CreateTemplateView.tsx  — Full-screen form to create/edit a template
    ├── ProfileView.tsx         — Profile tab: edit name, stats, theme, export, sign out
    ├── WorkoutView.tsx         — Active workout screen (replaces all nav)
    └── FinishWorkoutModal.tsx  — Modal on workout finish: update/save-new/just-finish
```

---

## Types (`src/types.ts`)

```ts
Exercise         { id, name, equipment, muscleGroup, notes? }
WorkoutTemplate  { id, name, exercises: Exercise[], notes? }
Set              { id, weight, reps, completed, type?: 'warmup'|'working' }
ExerciseLog      { exerciseId, exerciseName, sets: Set[], restDuration?, notes? }
WorkoutLog       { id, templateName, date, exercises: ExerciseLog[], duration, activityType? }
ActiveWorkout    { templateName, originalTemplateId, exercises: ExerciseLog[], startTime, notes? }
UserProfile      { name, memberSince }
```

---

## App.tsx — Global State

All state lives in `App.tsx`. There is **no Redux / Zustand / Context API**.

| State variable | Type | Stored in |
|---|---|---|
| `templates` | `WorkoutTemplate[]` | localStorage `dreamshape_templates` |
| `workoutLogs` | `WorkoutLog[]` | localStorage `dreamshape_workouts` |
| `exerciseDatabase` | `{name,muscleGroup,equipment}[]` | localStorage `dreamshape_exercises` |
| `userProfile` | `UserProfile` | localStorage `dreamshape_profile` |
| `user` | `User \| null` | Supabase session |
| `syncService` | `SyncService \| null` | in-memory only |
| `isSyncing` | `boolean` | in-memory |
| `lastSyncTime` | `Date \| null` | in-memory |
| `activeWorkout` | `ActiveWorkout \| null` | in-memory |
| `showFinishModal` | `boolean` | in-memory |
| `currentView` | `'dashboard'\|'progress'\|'start'\|'library'\|'profile'` | in-memory |
| `selectedWorkout` | `WorkoutLog \| null` | in-memory |
| `selectedTemplate` | `WorkoutTemplate \| null` | in-memory |
| `isCreating` | `boolean` | in-memory |
| `elapsedTime` | `number` | in-memory (timer) |
| `restTimer` | `number \| null` | in-memory (global rest overlay) |
| `restDuration` | `number` | in-memory (default: 120s) |
| `activeRestTimer` | `{exerciseIndex, afterSetIndex, timeRemaining} \| null` | in-memory (inline rest) |

---

## App.tsx — Key Functions

### Workout lifecycle
| Function | Line | What it does |
|---|---|---|
| `startWorkout(template)` | ~349 | Creates `ActiveWorkout` from template, pre-fills sets from last workout |
| `startEmptyWorkout()` | ~384 | Creates `ActiveWorkout` with auto-generated name, no exercises |
| `finishWorkout()` | ~592 | Opens the FinishWorkoutModal |
| `saveWorkoutLog()` | ~705 | Saves `WorkoutLog` to localStorage + Supabase, clears active state |
| `cancelWorkout()` | ~742 | Confirms then clears `activeWorkout` |
| `deleteWorkout(id)` | ~748 | Removes from state + Supabase |

### Set manipulation (during active workout)
| Function | What it does |
|---|---|
| `updateSet(exIdx, setIdx, field, value)` | Updates weight/reps on a set |
| `toggleSetCompleted(exIdx, setIdx)` | Marks set done, starts inline rest timer |
| `addSet(exIdx)` | Appends set, copies last set's weight/reps |
| `removeSet(exIdx, setIdx)` | Removes set (min 1 set enforced) |
| `toggleSetType(exIdx, setIdx)` | Toggles warmup ↔ working |

### Exercise manipulation (during active workout)
| Function | What it does |
|---|---|
| `addExerciseToWorkout(name, mg, eq)` | Adds exercise, pre-fills from workout history |
| `removeExerciseFromWorkout(exIdx)` | Removes exercise (confirms if sets completed) |
| `reorderWorkoutExercises(old, new)` | Drag-reorder, updates rest timer indices |
| `setExerciseRestDuration(exIdx, dur)` | Per-exercise rest duration override |
| `setExerciseNotes(exIdx, notes)` | Per-exercise notes |
| `setWorkoutNotes(notes)` | Global workout notes |

### Finish modal handlers
| Function | What it does |
|---|---|
| `handleUpdateTemplate()` | Updates original template with current exercises, then saves workout |
| `handleSaveAsNewTemplate(name, exercises)` | Creates new template, then saves workout |
| `handleJustFinish()` | Saves workout without touching templates |

### Template CRUD
| Function | What it does |
|---|---|
| `saveTemplate(name, exercises)` | Create or update template in state + localStorage + Supabase |
| `editTemplate(template)` | Sets `selectedTemplate` and `isCreating=true` |
| `deleteTemplate(id)` | Removes template from state + Supabase |

### Exercise database
| Function | What it does |
|---|---|
| `addExerciseToDatabase(exercise)` | Appends custom exercise, syncs to Supabase |
| `deleteExerciseFromDatabase(name)` | Removes custom exercise, syncs to Supabase |

### Helper / utils
| Function | What it does |
|---|---|
| `getLastWorkoutData(templateName, exerciseName)` | Last sets for template+exercise combo |
| `getLastExerciseData(exerciseName)` | Last sets for any exercise across all history |
| `getAutoWorkoutName()` | "Monday Morning Workout" style name |
| `getWorkoutChanges()` | Diffs current exercises vs original template |

### Sync / Auth
| Function | What it does |
|---|---|
| `handleInitialSync(sync)` | On login: migrates local data → Supabase, then loads all data from Supabase |
| `handleUpdateProfile(profile)` | Updates profile in state + Supabase |
| `handleSignOut()` | Signs out, clears sync service |

---

## Routing / View Logic

There is **no router**. Views are conditionally rendered in `App.tsx`:

```
authLoading → loading screen
!user       → AuthView
activeWorkout → WorkoutView (+ FinishWorkoutModal overlay)
selectedWorkout → WorkoutDetailView
isCreating  → CreateTemplateView
else        → bottom-nav views:
  dashboard → DashboardView
  progress  → WorkoutsView
  start     → TemplatesView
  library   → LibraryView
  profile   → ProfileView
```

---

## Components

### `AuthView.tsx`
- Sign in / sign up tabs
- Email + password form, calls `supabase.auth.signInWithPassword` / `signUp`
- No onAuthSuccess logic needed — auth change is caught by `onAuthStateChange` in App.tsx

### `BottomNav.tsx`
- 5 nav items: Home (dashboard), Progress, 💪 Start (elevated circle), Library, Profile
- Active state by `currentView` prop

### `SyncIndicator.tsx`
- Fixed top-right badge
- 3 states: offline (red pulse dot), syncing (blue spinner), synced (green ✓ + "X ago")
- Listens to `window online/offline` events

### `ThemeToggle.tsx`
- Reads/writes `localStorage.dreamshape_theme`
- Sets `document.documentElement.setAttribute('data-theme', theme)`
- Respects `prefers-color-scheme` as default
- **Note**: dark mode CSS variables are NOT yet implemented (only the toggle button exists)

### `DashboardView.tsx`
- Profile header with avatar (first letter of name)
- Stats grid: Total Workouts, Day Streak 🔥, Avg Per Week
- Best PRs (top 3 by max weight across all history)
- Quick action: Start Empty Workout
- Templates horizontal scroll (click to start)
- Charts (Recharts):
  - Bar chart: workout frequency (last 8 weeks)
  - Area chart: volume trend (tons, last 8 weeks)
  - Heatmap: consistency calendar (last 12 weeks, 84 days)
- Streak algo: counts consecutive days, allows 1 rest day gap

### `WorkoutsView.tsx` (Progress tab)
- Lists all `workoutLogs` newest first
- Each card shows: name, date (Today/Yesterday/full), exercises count, duration, time
- Click opens `WorkoutDetailView`

### `WorkoutDetailView.tsx`
- Read-only view of a logged workout
- Shows date/time/duration meta, then each exercise with sets (weight, reps, completed checkmark)
- Has delete button

### `TemplatesView.tsx` (Start tab)
- Lists templates with exercise count + first 3 exercise tags
- Edit (blue) / Start Workout (green) buttons per card
- Delete (×) button top-right of each card

### `LibraryView.tsx`
- Two sub-tabs: Templates | Exercises
- Templates tab: same grid as TemplatesView but with icon buttons
- Exercises tab: exercises grouped by muscle group, read-only list
- `onAddExercise` and `onDeleteExercise` props are passed but **currently commented out** (not wired to UI)

### `CreateTemplateView.tsx`
- Template name input
- Exercise search with dropdown (grouped by muscle group, filters on name/muscle)
- Typing an unknown exercise name + pressing + adds it to database (default: Barbell / Other)
- Exercise list is drag-sortable via @dnd-kit
- Save button disabled until name + at least 1 exercise

### `ProfileView.tsx`
- Avatar + name edit inline
- Stats: total workouts, total volume (tonnes), total hours, favorite exercise
- ThemeToggle button in header
- About section (version 1.0.0, "Created by Jan Matyas")
- Data management: Export JSON blob download, Sign Out button

### `WorkoutView.tsx`
- Sticky header: ✕ cancel | elapsed time | Finish button
- Workout title + global notes toggle
- Default rest duration selector (1:00 – 5:00)
- Global rest timer overlay (fullscreen dark) — currently only shown if `restTimer` > 0 but nothing sets `restTimer` anymore (inline timer replaced it)
- Exercise list sortable via @dnd-kit (drag handle = whole card)
- Per exercise:
  - Rest duration selector (overrides global)
  - PR badge (max weight from history)
  - ⋮ menu → add/edit note
  - × remove button
  - Sets table: [W/number badge] [kg input] [reps input] [✓ check] [× remove]
  - Warmup sets show "W" badge instead of number
  - Inline rest timer bar after each completed set
- Add Exercise section at bottom: search → grouped dropdown → adds exercise
- Fixed footer: Finish Workout button

### `FinishWorkoutModal.tsx`
- Shows if exercises were added/removed vs original template
- Radio options:
  1. Update "[original name]" template (only if originalTemplateId exists AND hasChanges)
  2. Save as new template (with name input)
  3. Just finish (don't touch templates)
- Prevents double-submit with `isSaving` state

---

## SyncService (`src/lib/syncService.ts`)

Class instantiated per user session with `userId`.

### Supabase tables used
| Table | Columns |
|---|---|
| `profiles` | id, name, member_since |
| `templates` | id, user_id, name, exercises (jsonb), notes, created_at |
| `workouts` | id, user_id, template_name, date, duration, exercises (jsonb), activity_type |
| `custom_exercises` | id, user_id, name, muscle_group, equipment |

### Methods
| Method | What it does |
|---|---|
| `migrateLocalDataToSupabase()` | One-time migration of localStorage data to Supabase (guarded by `migration_completed_{userId}` key) |
| `loadAllData()` | Loads profile, templates, workouts, custom exercises from Supabase; falls back to localStorage on error |
| `updateProfile(profile)` | PATCH profiles row |
| `createTemplate(template)` | INSERT into templates |
| `updateTemplate(template)` | UPDATE templates by id |
| `deleteTemplate(id)` | DELETE from templates |
| `createWorkout(workout)` | INSERT into workouts |
| `deleteWorkout(id)` | DELETE from workouts |
| `createCustomExercise(exercise)` | INSERT into custom_exercises (silently ignores duplicates) |
| `deleteCustomExercise(name)` | DELETE from custom_exercises by name |

---

## localStorage Keys

| Key | Content |
|---|---|
| `dreamshape_templates` | `WorkoutTemplate[]` JSON |
| `dreamshape_workouts` | `WorkoutLog[]` JSON |
| `dreamshape_exercises` | exercise db JSON |
| `dreamshape_profile` | `UserProfile` JSON |
| `dreamshape_theme` | `'light'` or `'dark'` |
| `migration_completed_{userId}` | `'true'` after first sync |

---

## Exercise Database

`defaultExercises.ts` exports 55 exercises across 6 muscle groups:
- **Chest** (10): Bench Press variations, Fly, Machine, Dips, Push-ups
- **Back** (9): Deadlift, Rows, Pulldown, Pull-ups, Chin-ups
- **Shoulders** (8): OHP, Lateral/Front/Rear raises, Face Pulls, Shrugs
- **Arms** (10): Curls (Barbell/Dumbbell/Hammer/Preacher/Cable), Tricep extensions/pushdowns/skullcrushers, Dips
- **Legs** (9): Squat, Front Squat, Leg Press/Ext/Curl, Lunges, Bulgarian Split Squat, Calf Raise, Hip Thrust
- **Core** (5): Plank, Crunches, Russian Twists, Hanging Leg Raise, Cable Crunch

Custom exercises added at runtime are merged (DEFAULT_EXERCISES first, deduplicated by name).

---

## CSS Architecture

All styles are in **`src/App.css`** (~2630 lines). Organized in sections (marked with `==` comments):

- Global reset + body + `.app`
- Form elements (`.input`, `.btn-*`, `.form-group`)
- Template cards + exercise tags
- Workout view (set rows, timers, rest bar)
- Workout detail (read-only)
- Dashboard view (stats grid, PRs, charts, heatmap)
- Bottom navigation
- Library view
- Profile view
- Auth view
- Sync indicator
- Loading screen

Theme toggle sets `data-theme` on `<html>` but **dark mode CSS variables are not yet written**.

---

## Known Issues / Incomplete Features

1. **Dark mode not implemented** — ThemeToggle exists but no `[data-theme="dark"]` CSS variables
2. **LibraryView exercise add/delete not wired** — `onAddExercise` / `onDeleteExercise` are passed as props but commented out inside the component
3. **Global rest timer overlay dead code** — `restTimer` state exists but nothing sets it (inline timer replaced it). The overlay CSS + `onSkipRest` prop are unused
4. **`handleUpdateTemplate` loses equipment/muscleGroup** — hardcodes `'Barbell'` / `'Other'` when rebuilding exercises from ExerciseLog
5. **`HistoryView.tsx` / `ExercisesView.tsx` files listed in original tree but don't exist** — unused names in old plan
6. **Streak allows 1 rest day gap** — intentional but could confuse users
7. **`App-new.css`** — unused file in root src/

---

## Environment Variables (`.env`)

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
