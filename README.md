# 💪 DreamShape

Your personal workout tracking app - Shape your dreams and your physique!

**Live App:** [dreamshape-app.vercel.app](https://dreamshape-app.vercel.app)

## ✨ Features

### 🏋️ Workout Tracking
- ✅ Create and edit workout templates
- ✅ Log workouts with sets, reps, and weight
- ✅ Auto-fill from previous workout data
- ✅ Personal record (PR) tracking per exercise
- ✅ Visual feedback for completed sets (green background)
- ✅ Warmup sets (W badge) with smart working set renumbering
- ✅ Add/remove exercises during active workouts
- ✅ Drag & drop to reorder exercises

### ⏱️ Timers & Rest
- ✅ Real-time workout timer (elapsed time)
- ✅ Customizable rest timer with countdown
- ✅ Inline rest timer per exercise
- ✅ Vibration alerts on rest completion

### 📚 Exercise Library
- ✅ 60+ pre-loaded exercises grouped by muscle
- ✅ Add custom exercises (name, muscle group, equipment)
- ✅ Delete custom exercises
- ✅ Search exercises with live filtering
- ✅ Custom badge on user-added exercises

### 📊 Dashboard & Analytics
- ✅ Modern dashboard with circular progress stats
- ✅ Workout frequency chart (last 8 weeks)
- ✅ Volume trend chart (tons per week)
- ✅ Consistency heatmap (GitHub-style, 12 weeks)
- ✅ Best PRs display
- ✅ Streak tracking (smart 1-day rest allowance)

### 👤 Profile
- ✅ Weekly goal progress widget
- ✅ Consistency score (last 30 days)
- ✅ Volume progress widget
- ✅ Lifetime stats (workouts, volume, time, favorite exercise)
- ✅ Role badges (Creator 👑, Tester 🧪)
- ✅ Data export (JSON backup)

### ☁️ Cloud Sync & Auth
- ✅ Supabase authentication (email/password)
- ✅ Cloud sync across devices
- ✅ Offline mode with localStorage fallback
- ✅ Real-time sync indicator
- ✅ Automatic migration from localStorage

### 📱 User Experience
- ✅ Desktop sidebar + mobile bottom navigation
- ✅ Responsive design (desktop + mobile optimized)
- ✅ Smart finish workout flow (summary stats, template change detection)
- ✅ Native confirm dialogs (no browser popups)
- ✅ Notes system (workout + exercise-level)
- ✅ Workout history with detailed logs

## 🛠️ Tech Stack

- **Frontend:** React 19 + TypeScript + Vite 7
- **Backend:** Supabase (PostgreSQL + Auth + Row-Level Security)
- **Charts:** Recharts
- **Drag & Drop:** dnd-kit
- **Deployment:** Vercel
- **Storage:** Supabase + localStorage (offline support)

## 🗂️ Project Structure

```
dreamshape/
├── src/
│   ├── components/          # React components
│   │   ├── AuthView.tsx
│   │   ├── DashboardView.tsx
│   │   ├── WorkoutView.tsx
│   │   ├── ExerciseCard.tsx
│   │   ├── LibraryView.tsx
│   │   ├── ProfileView.tsx
│   │   ├── ConfirmDialog.tsx
│   │   └── ...
│   ├── hooks/
│   │   ├── useWorkoutTimer.ts
│   │   └── useConfirm.ts
│   ├── lib/
│   │   ├── supabase.ts
│   │   └── syncService.ts
│   ├── data/
│   │   └── defaultExercises.ts
│   ├── types.ts
│   ├── App.tsx
│   └── main.tsx
├── public/
└── package.json
```

## 📝 Roadmap

### Completed ✅
- [x] Core workout tracking (sets, reps, weight)
- [x] Workout templates & exercise library
- [x] Timers & rest periods with vibration
- [x] Dashboard with charts and heatmap
- [x] Supabase authentication & cloud sync
- [x] Offline mode with localStorage fallback
- [x] Notes system (workout & exercise level)
- [x] Desktop sidebar + mobile bottom navigation
- [x] User profile with lifetime stats
- [x] Circular progress widgets (weekly goal, consistency, volume)
- [x] Warmup set type with smart renumbering
- [x] Custom exercise add/delete in library
- [x] Smart finish workout flow with summary stats
- [x] Native confirm dialogs (no browser alerts)
- [x] Role-based user badges
- [x] Data export (JSON backup)
- [x] Drag & drop exercise reordering

### In Progress 🚧
- [ ] 1RM calculator and progression tracking
- [ ] Exercise-specific history charts

### Planned 📋
- [ ] Google/Apple authentication
- [ ] Workout programs & periodization
- [ ] Progressive overload suggestions

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 👨‍💻 Author

**Jan Matyas**
- GitHub: [@MrBeardman](https://github.com/MrBeardman)
- App: [dreamshape-app.vercel.app](https://dreamshape-app.vercel.app)

---

Built with ❤️ and 💪 by Jan
