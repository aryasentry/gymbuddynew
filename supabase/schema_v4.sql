-- ═══════════════════════════════════════════════
-- GymBuddy Schema v4 — micronutrients + own food library
-- Run AFTER schema.sql, v2, v3. Idempotent.
-- ═══════════════════════════════════════════════

-- ── Micronutrients on food logs + items ──
do $$
declare col text;
begin
  foreach col in array array['fiber_g','sugar_g','sodium_mg','potassium_mg','calcium_mg','iron_mg','vitamin_c_mg']
  loop
    execute format('alter table food_logs  add column if not exists %I numeric default 0', 'total_' || col);
    execute format('alter table food_items add column if not exists %I numeric default 0', col);
  end loop;
end $$;

-- ── Own food library (built from logged foods; no external DB) ──
create table if not exists foods (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  unit text not null default 'g',
  ref_qty numeric not null default 100,     -- macros are per this quantity
  calories numeric not null default 0,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0,
  fiber_g numeric default 0,
  sugar_g numeric default 0,
  sodium_mg numeric default 0,
  potassium_mg numeric default 0,
  calcium_mg numeric default 0,
  iron_mg numeric default 0,
  vitamin_c_mg numeric default 0,
  use_count integer not null default 1,
  last_used timestamptz default now(),
  created_at timestamptz default now()
);

-- one row per food name per user (case-insensitive)
create unique index if not exists foods_user_name on foods (user_id, lower(name));
create index if not exists foods_user_recent on foods (user_id, use_count desc, last_used desc);

alter table foods enable row level security;
drop policy if exists "Users manage own foods" on foods;
create policy "Users manage own foods" on foods for all using (auth.uid() = user_id);
