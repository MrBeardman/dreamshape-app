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
- ✅ Set type indicators (warmup vs working sets)
- ✅ Add/remove exercises during active workouts
- ✅ Drag & drop to reorder exercises

### ⏱️ Timers & Rest
- ✅ Real-time workout timer (elapsed time)
- ✅ Customizable rest timer with countdown
- ✅ Inline rest timer per exercise
- ✅ Vibration alerts on rest completion

### 📚 Exercise Database
- ✅ 60+ pre-loaded exercises
- ✅ Add custom exercises
- ✅ Autocomplete with muscle group grouping
- ✅ Delete custom exercises

### 📊 Dashboard & Analytics
- ✅ Modern dashboard with workout stats
- ✅ Workout frequency chart (last 8 weeks)
- ✅ Volume trend chart (tons per week)
- ✅ Consistency heatmap (GitHub-style, 12 weeks)
- ✅ Best PRs display
- ✅ Streak tracking (smart 1-day rest allowance)

### ☁️ Cloud Sync & Auth
- ✅ Supabase authentication (email/password)
- ✅ Cloud sync across devices
- ✅ Offline mode with localStorage fallback
- ✅ Real-time sync indicator
- ✅ Automatic migration from localStorage

### 📱 User Experience
- ✅ Bottom navigation (Instagram-style)
- ✅ Responsive design (desktop + mobile optimized)
- ✅ Template library with tabs
- ✅ User profile with stats
- ✅ Workout history with detailed logs
- ✅ Notes system (workout + template + exercise-level)

## 🛠️ Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Supabase (PostgreSQL + Auth + Row-Level Security)
- **Charts:** Recharts
- **Deployment:** Vercel
- **Storage:** Supabase + localStorage (offline support)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Supabase account (free tier works)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/MrBeardman/dreamshape-app.git
cd dreamshape-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get these from your Supabase project: **Settings** → **API**

4. Set up Supabase database:

Run the SQL script in your Supabase SQL Editor:
- Go to your Supabase project
- Navigate to **SQL Editor**
- Copy and paste the contents of `schema.sql` (if included) or the schema from setup docs
- Run the query

5. Start the development server:
```bash
npm run dev
```

6. Build for production:
```bash
npm run build
```

## 📖 Usage

### First Time Setup
1. Visit the app and create an account
2. Your localStorage data (if any) will automatically migrate to the cloud
3. Create workout templates or start an empty workout

### Creating Templates
1. Navigate to **Library** tab
2. Click "New Template"
3. Add exercises from the database
4. Save your template

### Logging Workouts
1. Go to **Start** tab or click a template
2. Fill in sets, reps, and weight
3. Complete sets (tap checkmark)
4. Rest timer starts automatically
5. Finish workout to save

### Viewing Progress
1. Check **Dashboard** for stats and charts
2. View **Progress** tab for workout history
3. Track your PRs and consistency

## 🗂️ Project Structure

```
dreamshape/
├── src/
│   ├── components/          # React components
│   │   ├── AuthView.tsx     # Authentication
│   │   ├── DashboardView.tsx
│   │   ├── WorkoutView.tsx
│   │   ├── TemplatesView.tsx
│   │   └── ...
│   ├── lib/
│   │   ├── supabase.ts      # Supabase client
│   │   └── syncService.ts   # Data sync logic
│   ├── data/
│   │   └── defaultExercises.ts
│   ├── types.ts             # TypeScript types
│   ├── App.tsx              # Main app component
│   └── main.tsx
├── public/
├── .env                     # Environment variables (not in git)
├── schema.sql               # Database schema (if included)
└── package.json
```

## 🔐 Security

- **Authentication:** Supabase Auth with email/password
- **Row-Level Security (RLS):** Users can only access their own data
- **API Keys:** Never commit `.env` to git
- **Policies:** All tables have strict RLS policies enforced at database level

## 📝 Roadmap

### Completed ✅
- [x] Core workout tracking
- [x] Templates & exercise database
- [x] Timers & rest periods
- [x] Dashboard with charts
- [x] Supabase authentication
- [x] Cloud sync with offline support
- [x] Notes system
- [x] Bottom navigation
- [x] User profiles

### In Progress 🚧
- [ ] 1RM calculator and progression tracking
- [ ] Exercise-specific history charts

### Planned 📋
- [ ] Google/Apple authentication
- [ ] Dark mode
- [ ] Workout programs & periodization
- [ ] Social features (share workouts)
- [ ] Exercise instruction videos/images
- [ ] Body measurements tracking
- [ ] Export data (CSV/JSON)
- [ ] Progressive overload suggestions
- [ ] Deload week recommendations

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
