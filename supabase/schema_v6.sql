-- ═══════════════════════════════════════════════
-- GymBuddy Schema v6 — reusable workout plans (templates)
-- Run AFTER v1–v5. Idempotent.
-- ═══════════════════════════════════════════════

create table if not exists workout_plans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  category text,                 -- push/pull/legs/fullbody/cardio/custom
  description text,
  plan jsonb not null,           -- { category, name, description, exercises: [...] }
  use_count integer not null default 0,
  last_used timestamptz,
  created_at timestamptz default now()
);

alter table workout_plans enable row level security;
drop policy if exists "Users manage own plans" on workout_plans;
create policy "Users manage own plans" on workout_plans for all using (auth.uid() = user_id);
create index if not exists workout_plans_user on workout_plans (user_id, last_used desc nulls last, created_at desc);
