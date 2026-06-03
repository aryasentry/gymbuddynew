-- ═══════════════════════════════════════════════
-- GymBuddy Supabase Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL)
-- ═══════════════════════════════════════════════

-- Profiles
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  height_cm numeric not null,
  weight_kg numeric not null,
  age integer not null,
  gender text check (gender in ('male', 'female', 'other')) not null,
  activity_level text check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')) not null,
  goal text check (goal in ('fat_loss', 'muscle_gain', 'recomp', 'maintenance')) not null,
  bmr numeric not null,
  tdee numeric not null,
  calorie_target integer not null,
  protein_target integer not null,
  carb_target integer not null,
  fat_target integer not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Food logs
create table if not exists food_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  logged_at date default current_date not null,
  meal_type text check (meal_type in ('breakfast','lunch','dinner','snack','pre_workout','post_workout')) not null,
  image_url text,
  caption text,
  total_calories integer not null default 0,
  total_protein numeric not null default 0,
  total_carbs numeric not null default 0,
  total_fat numeric not null default 0,
  user_correction text check (user_correction in ('accurate','too_low','too_high')),
  created_at timestamptz default now()
);

-- Food items (within a food log)
create table if not exists food_items (
  id uuid default gen_random_uuid() primary key,
  food_log_id uuid references food_logs(id) on delete cascade not null,
  name text not null,
  quantity numeric not null,
  unit text not null default 'g',
  calories integer not null default 0,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0
);

-- Workouts
create table if not exists workouts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  logged_at date default current_date not null,
  notes text,
  duration_minutes integer,
  created_at timestamptz default now()
);

-- Exercises (within a workout)
create table if not exists exercises (
  id uuid default gen_random_uuid() primary key,
  workout_id uuid references workouts(id) on delete cascade not null,
  name text not null,
  sort_order integer default 0
);

-- Sets (within an exercise)
create table if not exists sets (
  id uuid default gen_random_uuid() primary key,
  exercise_id uuid references exercises(id) on delete cascade not null,
  weight_kg numeric not null default 0,
  reps integer not null default 0,
  completed boolean default true,
  sort_order integer default 0
);

-- Weight logs
create table if not exists weight_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  logged_at date default current_date not null,
  weight_kg numeric not null,
  waist_cm numeric,
  chest_cm numeric,
  arms_cm numeric,
  created_at timestamptz default now(),
  unique (user_id, logged_at)
);

-- Water logs
create table if not exists water_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  logged_at date default current_date not null,
  amount_ml integer not null default 0,
  created_at timestamptz default now(),
  unique (user_id, logged_at)
);

-- ── Row Level Security ──────────────────────────

alter table profiles enable row level security;
alter table food_logs enable row level security;
alter table food_items enable row level security;
alter table workouts enable row level security;
alter table exercises enable row level security;
alter table sets enable row level security;
alter table weight_logs enable row level security;
alter table water_logs enable row level security;

-- Profiles policies
drop policy if exists "Users read own profile" on profiles;
create policy "Users read own profile" on profiles for select using (auth.uid() = id);
drop policy if exists "Users insert own profile" on profiles;
create policy "Users insert own profile" on profiles for insert with check (auth.uid() = id);
drop policy if exists "Users update own profile" on profiles;
create policy "Users update own profile" on profiles for update using (auth.uid() = id);

-- Food logs policies
drop policy if exists "Users manage own food logs" on food_logs;
create policy "Users manage own food logs" on food_logs for all using (auth.uid() = user_id);
drop policy if exists "Users manage own food items" on food_items;
create policy "Users manage own food items" on food_items for all using (
  auth.uid() = (select user_id from food_logs where id = food_log_id)
);

-- Workout policies
drop policy if exists "Users manage own workouts" on workouts;
create policy "Users manage own workouts" on workouts for all using (auth.uid() = user_id);
drop policy if exists "Users manage own exercises" on exercises;
create policy "Users manage own exercises" on exercises for all using (
  auth.uid() = (select user_id from workouts where id = workout_id)
);
drop policy if exists "Users manage own sets" on sets;
create policy "Users manage own sets" on sets for all using (
  auth.uid() = (select w.user_id from workouts w join exercises e on e.workout_id = w.id where e.id = exercise_id)
);

-- Body stats policies
drop policy if exists "Users manage own weight logs" on weight_logs;
create policy "Users manage own weight logs" on weight_logs for all using (auth.uid() = user_id);
drop policy if exists "Users manage own water logs" on water_logs;
create policy "Users manage own water logs" on water_logs for all using (auth.uid() = user_id);

-- ── Indexes ──────────────────────────────────────

create index if not exists food_logs_user_date on food_logs (user_id, logged_at desc);
create index if not exists workouts_user_date on workouts (user_id, logged_at desc);
create index if not exists weight_logs_user_date on weight_logs (user_id, logged_at desc);
create index if not exists water_logs_user_date on water_logs (user_id, logged_at desc);
