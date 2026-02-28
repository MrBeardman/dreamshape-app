# DreamShape

Personal fitness PWA — workout tracking, nutrition logging, and daily habit tracking.

**Live:** [dreamshape-app.vercel.app](https://dreamshape-app.vercel.app)

---

## Features

### Workout Tracking
- Create and edit workout templates
- Log workouts with sets, reps, and weight
- Auto-fill sets from previous workout data
- PR tracking per exercise with flash celebration
- Warmup sets (W badge) with smart working-set renumbering
- Add / remove / reorder exercises during active workouts (drag & drop)
- Per-exercise and global workout notes
- Inline rest timer per exercise with push notification support
- Minimized workout overlay — browse the app mid-workout without losing your session
- Resume prompt if the app is reopened with an in-progress workout

### Templates & History
- Template library with estimated duration (avg of past logs)
- Workout history with detailed per-session logs
- Swipe to delete history entries
- Smart finish flow — detects added/removed/reordered exercises, offers to update or save new template

### Analytics (Profile tab)
- Workout Calendar — week / month / 12-week heatmap views, tap a day for details
- Volume Trend chart — week / month / year toggle (Recharts area chart)
- Recent PRs (last 30 days) and Strength Trend (this vs last month)
- Weekly goal progress ring and volume delta vs last week
- Lifetime stats: total workouts, volume (tons), hours, favourite exercise

### Nutrition Tracking
- Daily calorie and macro logging (breakfast / lunch / dinner / snacks)
- Open Food Facts integration — search by name or scan a barcode
- Custom food library with named portions (e.g. "1 slice = 30 g")
- Dashboard widget showing today's calories and macro bars
- Nutrition goals set in Profile

### Habits & Tasks
- Daily habit tracker with completion ring
- Today's task list with active / completed sections
- Dashboard widget showing habit progress bar and tasks remaining

### Dashboard (Home)
- Greeting header, stats grid (workouts / streak / avg per week)
- Muscle group coverage widget — colour-coded by days since last trained
- Habits & Tasks widget
- Templates quick-launch carousel
- Nutrition summary widget
- Link to full Workout History

### Cloud & Offline
- Supabase authentication (email / password)
- Cloud sync across devices — localStorage first, then Supabase
- Automatic one-time migration of local data on first login
- Real-time sync indicator

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 7 |
| Backend / Auth / DB | Supabase (Postgres + Auth + RLS) |
| Charts | Recharts |
| Drag & Drop | @dnd-kit |
| Barcode | @zxing/browser |
| Styling | Modular plain CSS |
| Deployment | Vercel |

---

## Project Structure

```
src/
├── App.tsx                     — Root component, all global state & handlers
├── App-redesign.css            — Main CSS entry (imports all modules)
├── types.ts                    — All TypeScript interfaces
├── data/
│   └── defaultExercises.ts     — 55 built-in exercises
├── lib/
│   ├── supabase.ts             — Supabase client
│   ├── syncService.ts          — Supabase CRUD class
│   ├── openFoodFacts.ts        — Food search & barcode lookup (OFF API v2)
│   ├── exerciseStats.ts        — Progressive overload history helper
│   └── notifications.ts        — Rest timer push notifications
├── hooks/
│   ├── useWorkoutTimer.ts      — Elapsed time + rest timer logic
│   └── useConfirm.ts           — Async confirm dialog hook
├── components/
│   ├── BottomNav.tsx           — Mobile bottom nav (Home/Habits/Start/Nutrition/Profile)
│   ├── SidebarNav.tsx          — Desktop sidebar nav
│   ├── DashboardView.tsx       — Home tab
│   ├── HabitsView.tsx          — Habits & Tasks tab
│   ├── NutritionView.tsx       — Nutrition tab
│   ├── ProfileView.tsx         — Profile tab (goals, charts, stats, settings)
│   ├── WorkoutsView.tsx        — Workout history list
│   ├── WorkoutView.tsx         — Active workout screen
│   ├── TemplatesView.tsx       — Templates (Start tab)
│   ├── CreateTemplateView.tsx  — Create / edit template
│   ├── FoodSearchSheet.tsx     — Food search bottom sheet
│   ├── BarcodeScanner.tsx      — Camera barcode scanner
│   ├── ExerciseProgressSheet.tsx — Progressive overload chart
│   ├── ExerciseCard.tsx        — Sortable exercise card with sets
│   ├── FinishWorkoutModal.tsx  — Finish workout flow
│   ├── ConfirmDialog.tsx       — Bottom-sheet confirm modal
│   └── CircularProgress.tsx    — SVG circular progress widget
└── styles/
    ├── variables.css
    ├── base.css
    └── components/
        ├── dashboard.css
        ├── habits.css
        ├── nutrition.css
        ├── profile.css
        ├── workout.css
        └── ...
```

---

## Environment Variables

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

---

**Author:** Jan Matyas — [dreamshape-app.vercel.app](https://dreamshape-app.vercel.app)
