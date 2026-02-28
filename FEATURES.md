# DreamShape — Feature Log

All shipped features, newest first.

---

## ✅ Habits & Tasks view + Home redesign (2026-02-28)

### Habits & Tasks (`HabitsView.tsx`)
- New **Habits** tab in bottom nav / sidebar (replaces History tab)
- Two sub-tabs: **Habits** and **Tasks**
- Habits tab: daily completion ring (SVG), checkbox rows, inline add input, delete button
- Tasks tab: today's task list, active/completed sections, inline add input, delete button
- Data: `Habit`, `HabitCompletion`, `DailyTask` types in `types.ts`
- localStorage: `dreamshape_habits`, `dreamshape_habit_completions`, `dreamshape_daily_tasks`
- App.tsx handlers: `addHabit`, `deleteHabit`, `toggleHabitCompletion`, `addDailyTask`, `toggleTaskCompletion`, `deleteTask`
- CSS: `src/styles/components/habits.css`

### Home redesign (`DashboardView.tsx`)
- Removed: Best PRs section, Workout Calendar, Volume Trend chart
- Added: **Habits & Tasks widget** — shows `X/Y habits done` + tasks remaining, progress bar, taps to Habits view
- Added: **Workout History** link button — navigates to the history list (`'progress'` view)

### Profile enhancements (`ProfileView.tsx`)
- Workout Calendar (week / month / year toggle) moved here from Dashboard
- Volume Trend chart moved here from Dashboard
- All chart state (`chartPeriod`, `calPeriod`, `selectedDate`) is local to ProfileView

---

## ✅ Food search fix (2026-02-28)

- Switched `searchFoods()` from legacy `GET /cgi/search.pl` to v2 REST endpoint `GET /api/v2/search`
- Added `sort_by=unique_scans_n` — most-scanned (best-documented) products appear first
- Relaxed `parseNutriments` filter: products no longer dropped for missing calorie data (just requires a name); missing macros default to 0

---

## ✅ Custom food portions (2026-01-xx)

- `FoodPortion { name, grams }` type added to `FoodItem`
- Reference amount input on custom food form (scales all macros)
- Named portion chips shown in gram entry UI (e.g. "1 slice = 30 g")

---

## ✅ Barcode scanner (2026-01-xx)

- `BarcodeScanner.tsx` — `@zxing/browser` `BrowserMultiFormatReader`, full-frame scan with wide sweep line
- `lookupBarcode(barcode)` → Open Food Facts API v2
- Barcode button in FoodSearchSheet opens camera, auto-closes on detection

---

## ✅ Nutrition tracking (2025-12-xx)

- `NutritionView.tsx` — date navigation, daily summary ring, meal sections (breakfast/lunch/dinner/snacks)
- `FoodSearchSheet.tsx` — search tab (Open Food Facts debounced) + my foods tab (custom food library)
- Dashboard widget: today's calories + macro mini-bars, taps → nutrition view
- Nutrition Goals in ProfileView (calories / protein / carbs / fat / sugar)
- Types: `NutritionGoals`, `FoodItem`, `MealEntry`, `NutritionLog`
- localStorage: `dreamshape_nutrition_logs`, `dreamshape_custom_foods`

---

## ✅ Minimized workout overlay — Bonus E (2025-12-xx)

- Floating bottom bar when workout is minimized: name, elapsed time, Resume button
- Allows browsing other tabs mid-workout without losing state

---

## ✅ Muscle group coverage widget — Bonus A (2025-12-xx)

- Dashboard grid: Chest / Back / Shoulders / Arms / Legs / Core
- Status tiles: green (≤2 days ago), yellow (≤5 days), red (overdue), grey (never)

---

## ✅ Swipe to delete history — Bonus C (2025-12-xx)

- `WorkoutsView` rows support swipe-left gesture to reveal Delete button

---

## ✅ Duration estimate on templates — Bonus B (2025-12-xx)

- Template cards show `~48 min` based on average of past logs for that template

---

## ✅ Resume workout prompt — Bonus G (2025-12-xx)

- On app open: if `activeWorkout` is in localStorage, prompt "Resume [name] from X min ago?"
- Discard or Resume buttons

---

## ✅ #12 — Workout Calendar: Week / Month / Year (2025-11-xx)

- Week view: 7 large day cells with day name, date, yellow dot
- Month view: Mon-based calendar grid for current month
- Year view: 12-week heatmap (84 cells)
- All views share tap-to-expand workout detail card

---

## ✅ #11 — Volume Trend: Week / Month / Year (2025-11-xx)

- Week: 7 daily bars, "Mon"/"Tue" labels
- Month: 8 weekly bars, "Feb W2" style (tilted 40°)
- Year: 12 monthly bars, "Jan '26" marks boundaries

---

## ✅ #10 — PR Flash Celebration (2025-11-xx)

- Completing a set with a new all-time PR flashes "🏆 New PR!" for 2.5 s on the exercise card

---

## ✅ #9 — Create Exercise Mid-Workout (2025-11-xx)

- Exercise search shows `+ Create "[name]"` when no library match
- Inline form: muscle group + equipment dropdowns, saves to library and adds to workout

---

## ✅ #8 — Profile Goals Redesign (2025-11-xx)

- Weekly goal ring + volume delta card (this vs last week %)
- Recent PRs (last 30 days): exercises that beat their pre-window lifetime max
- Strength Trend: top 3 most frequent exercises, this month vs last month max weight

---

## ✅ #7 — Exercise History / Progressive Overload Chart (2025-11-xx)

- `ExerciseProgressSheet.tsx` — bottom sheet with Recharts LineChart
- Max weight / volume toggle, last 8 sessions list
- Accessible from ⋮ menu in ExerciseCard during workout

---

## ✅ #6 — Dashboard Calendar + Charts Redesign (2025-11-xx)

- Replaced old BarChart + heatmap with interactive calendar
- Today ring, tap active day → workout detail card

---

## ✅ #5 — Set Pre-fill Suggestions (2025-11-xx)

- Weight/reps inputs show last-session values as placeholder
- Hint line: `Last: 80×8 · 80×8 · 85×6`

---

## ✅ #4 — Rest Timer Push Notification (2025-11-xx)

- `src/lib/notifications.ts` — `requestNotificationPermission`, `scheduleRestNotification`, `cancelRestNotification`
- `public/sw.js` — handles notification scheduling via `setTimeout` + `event.waitUntil`
- Works when app is backgrounded

---

## ✅ #3 — SKIPPED: Lock Screen "Now Playing" Card

> iOS has one "Now Playing" slot — claiming it with silent audio would override Spotify/Apple Music. Native Live Activities (ActivityKit) not available to PWAs.

---

## ✅ #2 — Rest Timer Persistence (2025-11-xx)

- Stores `endsAt = Date.now() + timeRemaining * 1000`
- On restore: `Math.round((endsAt - Date.now()) / 1000)` — accurate after any gap
- `restDuration` persisted to `dreamshape_rest_duration`

---

## ✅ #1 — Workout Session Persistence (2025-11-xx)

- `activeWorkout` and `originalTemplateExercises` lazy-initialized from localStorage
- Cleared on finish or cancel
- Survived iOS PWA kill when screen locks
