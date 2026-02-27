# DreamShape — Implementation Roadmap

Ordered by priority. Items marked ✅ are shipped.

---

## ✅ #1 — Workout Session Persistence
- Lazy-init `activeWorkout` + `originalTemplateExercises` from localStorage
- `useEffect` persists both on every change; cleared on finish/cancel
- **Files**: `App.tsx`

---

## ✅ #2 — Rest Timer Persistence
- Stores `endsAt = Date.now() + timeRemaining * 1000` (not raw `timeRemaining`)
- On restore: `Math.round((endsAt - Date.now()) / 1000)` — accurate after any gap
- `restDuration` also persisted to `dreamshape_rest_duration`
- **Files**: `src/hooks/useWorkoutTimer.ts`

---

## ⛔ #3 — Lock Screen "Now Playing" Card — SKIPPED
> iOS has one "Now Playing" slot. Claiming it with silent audio would override Spotify/Apple Music during workouts. Native Live Activities (ActivityKit) is the real fix — not available to PWAs.

---

## ✅ #4 — Rest Timer Push Notification
- `src/lib/notifications.ts` — `requestNotificationPermission`, `scheduleRestNotification`, `cancelRestNotification`
- `public/sw.js` — handles `SCHEDULE_NOTIFICATION` / `CANCEL_NOTIFICATION` messages via `setTimeout` + `event.waitUntil`
- Works when app is backgrounded; for fully locked screen, server-side push (OneSignal / Supabase Edge Function) is the upgrade path
- **Files**: `src/lib/notifications.ts` (new), `public/sw.js`, `App.tsx`

---

## ✅ #5 — Set Pre-fill Suggestions
- `getLastWorkoutSets(exerciseName)` helper in `WorkoutView.tsx` scans `workoutLogs`
- Passed as `lastWorkoutSets` prop into `ExerciseCard`
- Weight/reps inputs show last-session values as `placeholder`
- Hint line above sets: `Last: 80×8 · 80×8 · 85×6`
- **Files**: `ExerciseCard.tsx`, `WorkoutView.tsx`

---

## ✅ #6 — Dashboard Calendar + Charts Redesign
- Replaced redundant BarChart + old heatmap with one 12-week clickable calendar
- Calendar cells show a today-ring; tapping an active day shows workout detail card
- All 7 day labels (Mon–Sun) on Y-axis
- Volume Trend X-axis fixed to real dates
- **Files**: `DashboardView.tsx`, `src/styles/components/dashboard.css`

---

## ✅ #7 — Exercise History / Progressive Overload Chart
- `src/lib/exerciseStats.ts` — `getExerciseHistory(workoutLogs, exerciseName)`
- `src/components/ExerciseProgressSheet.tsx` — bottom sheet, Recharts LineChart, max weight / volume toggle, last 8 sessions list
- Accessible from: 📈 in LibraryView, ⋮ menu in ExerciseCard during workout
- **Files**: `src/lib/exerciseStats.ts` (new), `src/components/ExerciseProgressSheet.tsx` (new), `LibraryView.tsx`, `ExerciseCard.tsx`, `App.tsx`, `src/styles/components/progress-sheet.css` (new)

---

## ✅ #8 — Profile Goals Redesign
- Weekly goal wheel + volume delta card (this week vs last week %)
- `getRecentPRs()` — scans last 30 days for sets exceeding lifetime max before that window
- `getStrengthTrend()` — top 3 most frequent exercises, this month vs last month max weight
- **Files**: `ProfileView.tsx`, `src/styles/components/profile.css`

---

## ✅ #9 — Create Exercise Mid-Workout
- Exercise search shows `+ Create "[name]"` when no library match exists
- Inline form (muscle group + equipment dropdowns) saves to library AND adds to workout
- **Files**: `WorkoutView.tsx`, `App.tsx`

---

## ✅ #10 — PR Flash Celebration
- When completing a set where `set.weight > pr` (all-time PR), flashes "🏆 New PR!" for 2.5s
- `prFlashSetId` state + `handleToggleSet` wrapper in ExerciseCard
- **Files**: `ExerciseCard.tsx`, `src/styles/components/workout.css`

---

## ✅ #11 — Volume Trend: Week / Month / Year Toggle
- **Week**: 7 daily bars, "Mon" / "Tue" labels
- **Month**: 8 weekly bars, "Feb W2" style labels (tilted 40° to prevent overlap)
- **Year**: 12 monthly bars, "Jan '26" marks year boundaries
- Dynamic subtitle + XAxis config per period
- **Files**: `DashboardView.tsx`, `src/styles/components/dashboard.css`

---

## ✅ #12 — Workout Calendar: Week / Month / Year Toggle
- **Week**: 7 large day cells (day name + date number + yellow dot if worked out)
- **Month**: Standard Mon-based calendar grid for current month, numbered day cells
- **Year**: Original 12-week heatmap (unchanged)
- All three views share the same tap-to-expand workout detail card
- Switching period clears any active selection
- **Files**: `DashboardView.tsx`, `src/styles/components/dashboard.css`

---

## Bonus Ideas (next up)
- **Muscle group coverage widget** — color-coded grid on dashboard, green/yellow/red by days since last trained each group
- **Workout duration estimate** on template cards — "~48 min avg" based on past logs
- **Swipe to delete** on workout history rows
- **Body measurement tracking** — weight, body fat %, measurements over time
- **Minimized workout overlay** — floating banner while browsing other views mid-workout (Option B from #9)
- **Server-side push notifications** — upgrade #4 so rest timer fires even on fully locked screen (OneSignal free tier recommended)
- **Resume prompt** — "Resume Push Day from 23 min ago?" on reopen if `activeWorkout` found in localStorage
