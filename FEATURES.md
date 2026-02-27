# DreamShape — Implementation Roadmap

Ordered by priority. Items marked ✅ are done.

---

## #1 — Workout Session Persistence *(~1h)*
**Why first**: Actively loses user data when iPhone locks mid-workout. All other improvements are pointless if the workout disappears.

- Lazy-init `activeWorkout` and `originalTemplateExercises` from localStorage
- `useEffect` to write both to localStorage on every state change
- Clear both keys when workout finishes or is cancelled
- Optional: "Resume [Push Day] from 23 min ago?" prompt on reopen
- **Files**: `App.tsx`

---

## #2 — Rest Timer Persistence *(~30min)*
**Why second**: Same problem — timer state lives only in memory. Also persist the default rest duration setting.

- Store `endsAt = Date.now() + timeRemaining * 1000` (not `timeRemaining` — stale by the time app reopens)
- On restore: `timeRemaining = Math.round((endsAt - Date.now()) / 1000)` — naturally handles however long the app was closed
- Lazy-init `activeRestTimer` and `restDuration` from localStorage
- `useEffect` to sync both on change, `removeItem` when timer is null or finished
- **Files**: `src/hooks/useWorkoutTimer.ts`

---

## #3 — Lock Screen "Now Playing" Card *(~3h)* ⛔ SKIPPED
> **Conflict with music apps**: iOS has one "Now Playing" slot. Playing silent audio to claim the MediaSession widget would override Spotify/Apple Music on the lock screen and kill the playback controls. Since music during workouts is essentially universal, this is a bad trade-off. The only real fix is a native iOS app (Live Activities). Skipping until then.

~~## #3 — Lock Screen "Now Playing" Card *(~3h)*~~
**Why third**: At the gym, your phone is in your pocket or on a rack. You want to glance at the lock screen and see current exercise + weight without unlocking. The media controls let you complete a set or skip rest without opening the app.

**How it works**: Playing a near-silent audio loop keeps the iOS "Now Playing" widget alive on the lock screen. `MediaSession` API controls what it displays and remaps the playback buttons.

**Lock screen shows**:
```
🏋️ DreamShape
┌─────────────────────────────────┐
│  Bench Press — Set 3            │
│  100 kg × 8 reps                │
│  Push Day                       │
│  [⏮ back]  [⏸ complete]  [⏭ skip rest] │
└─────────────────────────────────┘
```

- Add `public/silence.mp3` — tiny near-silent loop (~1KB)
- New hook `src/hooks/useMediaSession.ts` — manages audio element + MediaSession metadata
- Update metadata whenever active exercise or set changes
- Remap controls: pause/play → complete current set, next → skip rest
- Stop audio + clear session on workout finish
- **Files**: `src/hooks/useMediaSession.ts` (new), `App.tsx`, `public/silence.mp3` (new)

---

## #4 — Rest Timer Push Notification *(~3h with OneSignal, ~7h DIY)*
**Why fourth**: When screen is locked, JS is suspended — the rest timer cannot fire a notification itself. Needs a server to push it. Reliable "ding" when rest is over even with phone locked.

- Register for push notifications on first workout start
- When rest timer starts → call backend with `{ delay, message, pushSubscription }`
- Backend sleeps N seconds → sends Web Push notification to iOS
- Notification has action buttons: "Complete Set" / "Skip Rest" → app handles via SW message
- **Option A (recommended)**: OneSignal free tier — 2–3h, no VAPID key management
- **Option B**: Supabase Edge Function + VAPID keys — 6–7h, fully self-hosted
- **Files**: `public/sw.js`, `App.tsx`, `src/hooks/useWorkoutTimer.ts`, `src/hooks/usePushNotifications.ts` (new)

> **iOS note**: Live Activities / Dynamic Island and lock screen widgets are native-only (ActivityKit/WidgetKit). Not available to any web app. The MediaSession card above is the closest equivalent available to PWAs.

---

## #5 — Set Pre-fill Suggestions *(~1–2h)*
Show a hint below weight/reps inputs when the current value is 0 and historical data exists: *"Last session: 80 kg × 8"*

- `getLastExerciseData` already exists in App.tsx
- Pass `lastWorkoutSets` prop through `WorkoutView` → `ExerciseCard`
- Display ghost suggestion below the input row when `set.weight === 0`
- **Files**: `ExerciseCard.tsx`, `WorkoutView.tsx`, `App.tsx`

---

## #6 — Dashboard Graphs Redesign *(~4h)*
The current charts have two problems: confusing X-axis labels (`-7`, `-6`, ..., `This`), and the frequency bar chart + heatmap are redundant. Replace with one better view.

**6a. Fix volume trend X-axis** — show real dates: `"Jan 20"`, `"Jan 27"`, etc. One-line change in `DashboardView.tsx`.

**6b. Clickable weekly calendar** — replace the frequency BarChart + heatmap with a 12-week grid of day squares. Active days are highlighted. Tapping a day shows a bottom sheet: workout name, duration, volume. Removes two charts, adds one better one.

- Enrich `heatmapData` to include `{ date, workoutId, workoutName, duration }` per day
- Add `selectedDay` state, bottom sheet component
- Remove `frequencyData` useMemo and BarChart
- **Files**: `DashboardView.tsx`, `src/styles/components/dashboard.css`

---

## #7 — Exercise History / Progressive Overload Chart *(~5h)*
Tap an info button on any exercise (in the library or during a workout) to see a chart of your progress over time: max weight per session, total volume per session.

- New helper `src/lib/exerciseStats.ts` — `getExerciseHistory(workoutLogs, exerciseName)`
- New component `src/components/ExerciseProgressSheet.tsx` — bottom sheet with Recharts LineChart
- Shows: best PR badge, toggleable max weight / total volume lines, recent sessions table
- Trigger: `ⓘ` button on library exercise rows + three-dot menu on ExerciseCard
- **Files**: `src/lib/exerciseStats.ts` (new), `src/components/ExerciseProgressSheet.tsx` (new), `LibraryView.tsx`, `ExerciseCard.tsx`, `App.tsx`

---

## #8 — Profile Goals Redesign *(~4h)*
Replace the three abstract % wheels (Consistency, Weekly Goal, Volume) with data that's actually motivating: recent PRs, strength trends, volume vs last week.

- Keep weekly goal wheel (useful), shrink and add PR list next to it
- `getRecentPRs()` — scan last 30 days for any set exceeding previous lifetime max
- `getStrengthTrend()` — for top 3 most frequent exercises, compare max weight this month vs last
- Volume delta: "This week: 12.4t (+18% vs last week)"
- **Files**: `ProfileView.tsx`, `src/styles/components/profile.css`

---

## #9 — Add Custom Exercise While Mid-Workout *(~3h)*

**Option A (build now)**: When the workout's exercise search finds no match, show a `+ Create "[name]"` inline form — pick muscle group + equipment, then it's added to the library AND immediately to the workout. No navigation needed.

**Option B (future)**: Minimized workout overlay — a persistent floating banner at the bottom of the screen showing timer + exercise count. Lets you browse any view (library, history) while the workout runs, then tap to return. Bigger architectural change to App.tsx's view rendering.

- **Files**: `WorkoutView.tsx`, `App.tsx` (Option A only for now)

---

## #10 — PR Celebration *(~1h)*
When you complete a set that beats your personal record, briefly flash "🏆 New PR!" on that set row. `pr` prop already flows into ExerciseCard. Just compare `set.weight > pr` when toggling complete.

- **Files**: `ExerciseCard.tsx`

---

## Bonus Ideas (later)
- **Muscle group coverage widget** on dashboard — color-coded grid showing which muscles were hit this week (green/yellow/red based on days since last trained)
- **Workout duration estimate** on template cards — "~48 min avg" based on past logs
- **Swipe to delete** on workout history rows
- **Body measurement tracking** — weight, body fat %, measurements over time
