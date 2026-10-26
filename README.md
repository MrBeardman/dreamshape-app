# DreamShape

Personal fitness PWA — workout tracking, nutrition logging, and daily habit tracking.


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
- Email / password login (signed session cookie, no third-party auth)
- Cloud sync across devices - localStorage first, then the server (MySQL)
- Automatic one-time migration of local data on first login
- Real-time sync indicator

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 7 |
| Backend | Node + Express (serves the app, JSON API, MCP endpoint) |
| Auth | Own login: bcrypt/scrypt password check, HMAC-signed session cookie |
| Database | MySQL / MariaDB via Prisma (`@prisma/adapter-mariadb`) |
| Charts | Recharts |
| Drag & Drop | @dnd-kit |
| Barcode | @zxing/browser |
| Styling | Modular plain CSS |
| Deployment | Hostinger Node.js app |

---

## Project Structure

```
src/                      React app (Vite). Talks to the server only through src/lib/api.ts
  App.tsx                 Root component, all global state & handlers
  lib/api.ts              fetch wrapper for /api
  lib/auth.ts             sign in / sign up / sign out / session
  lib/syncService.ts      local-first sync: localStorage first, then the server
  components/ hooks/ styles/ data/ ...
server/                   Express app (TypeScript, bundled to dist-server/index.js)
  index.ts                entry: listens on process.env.PORT, host 0.0.0.0
  app.ts                  serves dist/ (SPA fallback), mounts the routers
  auth/                   session cookie (HMAC) + password check (bcrypt / scrypt)
  routes/auth.ts          POST /api/auth/login | signup | logout, GET /api/auth/session
  routes/data.ts          the sync API (GET /api/data, templates, workouts, habits, ...)
  mcp/                    MCP endpoint (/api/mcp), OAuth shim (/api/oauth/*), /.well-known/*
prisma/
  schema.prisma           data model (MySQL)
  migrations/0_init       generated with `prisma migrate diff`
scripts/
  build-server.mjs        esbuild bundle of server/
  copy-from-supabase.mjs  one-off Supabase Postgres -> MySQL data copy
  hash-password.mjs       print a password hash
  create-user.mjs         insert a user + profile
docs/supabase_migrations.sql   the original Postgres schema (archive)
```

Every /api data route takes the user from the signed session cookie and scopes every query to it
(this replaces Supabase row level security). A client-supplied user id is never read.

---

## Local development

```bash
cp .env.example .env        # fill DATABASE_URL, SESSION_SECRET, MCP_AUTH_TOKEN, MCP_AUTHORIZE_PASSPHRASE
npm install                 # postinstall runs prisma generate
npm run db:deploy           # applies prisma/migrations to DATABASE_URL
npm run create-user -- you@example.com "password" "Your name" creator
npm run dev                 # API on :3001 (tsx watch) + Vite on :5173, /api is proxied
```

## Production (Hostinger Node.js app)

- Install: `npm install` (runs `prisma generate`), build: `npm run build` (Vite build to `dist/`, server bundle to `dist-server/index.js`)
- Entry file: `dist-server/index.js` (also `npm start`). It listens on `process.env.PORT`, host 0.0.0.0, and serves `dist/` itself.
- Run `npm run db:deploy` once (and after schema changes) against the Hostinger database.
- Env vars: `DATABASE_URL`, `SESSION_SECRET`, `MCP_AUTH_TOKEN`, `MCP_AUTHORIZE_PASSPHRASE`; optional `AUTH_SIGNUP_CODE`, `MCP_USER_ID`.

### Moving the data off Supabase

```bash
# DATABASE_URL = the new MySQL, SOURCE_DATABASE_URL = the old Supabase Postgres connection string
npm run db:deploy
npm run db:copy-from-supabase             # refuses if the target already has rows; add -- --replace to overwrite
```

`auth.users` is copied into `users` including the bcrypt password hash, so the existing password keeps working.

---

## Environment Variables

See `.env.example`. `DATABASE_URL`, `SESSION_SECRET`, `MCP_AUTH_TOKEN` and `MCP_AUTHORIZE_PASSPHRASE` are required in production. None of them is exposed to the browser.

---

**Author:** Jan Matyas — [dreamshape-app.vercel.app](https://dreamshape-app.vercel.app)
