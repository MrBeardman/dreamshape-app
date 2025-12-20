# 💪 DreamShape

Your personal workout tracking app - Shape your dreams and your physique!

## Features

- ✅ Create workout templates with custom exercises
- 🏋️ Track your workouts (coming soon)
- 📊 Progress charts and analytics (coming soon)

## Tech Stack

- React + TypeScript
- Vite
- Supabase (PostgreSQL database)
- Deployed on Vercel

## Setup Instructions

### 1. Clone this repository

```bash
git clone <your-github-repo-url>
cd dreamshape
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Copy your project URL and anon key
4. Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run locally

```bash
npm run dev
```

Visit `http://localhost:5173` to see your app!

### 4. Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add your environment variables in Vercel settings
5. Deploy!

## Roadmap

- [x] Create workout templates
- [ ] Log workouts with sets, reps, and weight
- [ ] View workout history
- [ ] Track progress with charts
- [ ] Exercise library
- [ ] Rest timer

---

Built with ❤️ by Jan
