-- ============================================
-- DreamShape — New Tables Migration
-- Run these in your Supabase SQL editor
-- ============================================

-- Weight Entries table
create table if not exists weight_entries (
  id         uuid primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  date       text not null,
  weight     numeric not null,
  created_at timestamp with time zone default now()
);

alter table weight_entries enable row level security;

create policy "Users can manage their own weight entries"
  on weight_entries for all
  using (auth.uid() = user_id);

-- Run Logs table
create table if not exists run_logs (
  id             uuid primary key,
  user_id        uuid references auth.users(id) on delete cascade not null,
  date           text not null,
  distance       numeric not null,         -- km, e.g. 5.02
  duration       integer not null,         -- seconds
  average_pace   integer not null,         -- seconds per km
  pace_is_manual boolean default false,
  average_hr     integer,                  -- bpm, nullable
  difficulty     integer not null,         -- 1-10
  notes          text,
  created_at     timestamp with time zone default now()
);

alter table run_logs enable row level security;

create policy "Users can manage their own run logs"
  on run_logs for all
  using (auth.uid() = user_id);

-- Also add duration update support for workouts (already exists, just needs RLS update policy)
-- The workouts table already has RLS; the new updateWorkout() call uses the existing policy.

-- Training Plans table
create table if not exists training_plans (
  id         uuid primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  name       text not null,
  days       jsonb not null,
  start_date text not null,
  is_active  boolean default false,
  created_at timestamp with time zone default now()
);
alter table training_plans enable row level security;
create policy "Users can manage their own training plans"
  on training_plans for all using (auth.uid() = user_id);
