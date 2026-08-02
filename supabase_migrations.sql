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

-- Add action-based cycle columns to training_plans
-- Run these if you already created the training_plans table above
alter table training_plans add column if not exists current_cycle_index integer default 0;
alter table training_plans add column if not exists check_ins jsonb default '[]';

-- Exercise tracking mode: how a set's numbers are captured for a given exercise.
-- Null/omitted means 'weight-reps' (the original default). 'time' repurposes the
-- existing reps column on a set to mean seconds held instead of rep count.
alter table custom_exercises add column if not exists tracking_mode text
  check (tracking_mode in ('weight-reps', 'time'));

-- Habits table (replaces training_plans — that table/data is left in place, just unused)
create table if not exists habits (
  id                  uuid primary key,
  user_id             uuid references auth.users(id) on delete cascade not null,
  name                text not null,
  icon                text,
  recurrence          jsonb not null,   -- { type: 'daily'|'weekdays'|'interval', weekdays?, intervalDays?, anchorDate? }
  time_of_day         text,             -- 'HH:MM' 24h, nullable — display/sort only
  linked_template_id  uuid,             -- optional workout template id, soft reference (no FK)
  is_active           boolean default true,
  sort_order          integer default 0,
  created_at          timestamp with time zone default now()
);
alter table habits enable row level security;
create policy "Users can manage their own habits"
  on habits for all using (auth.uid() = user_id);

-- Habit completions table (one row per habit per calendar day)
create table if not exists habit_completions (
  id         uuid primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  habit_id   uuid references habits(id) on delete cascade not null,
  date       text not null,             -- YYYY-MM-DD
  status     text not null check (status in ('done', 'failed')),
  created_at timestamp with time zone default now(),
  unique (habit_id, date)
);
alter table habit_completions enable row level security;
create policy "Users can manage their own habit completions"
  on habit_completions for all using (auth.uid() = user_id);
