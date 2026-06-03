-- ═══════════════════════════════════════════════
-- GymBuddy Schema v3 — workout categories + cardio
-- Run AFTER schema.sql and schema_v2.sql. Idempotent.
-- ═══════════════════════════════════════════════

alter table workouts  add column if not exists category text;          -- push/pull/legs/fullbody/cardio/custom
alter table exercises add column if not exists kind text default 'strength'; -- strength | cardio

create table if not exists cardio_segments (
  id uuid default gen_random_uuid() primary key,
  exercise_id uuid references exercises(id) on delete cascade not null,
  activity text not null default 'run',   -- run/sprint/walk/incline/cycle/row/stairs
  minutes numeric not null default 0,
  speed_kmh numeric,
  incline_pct numeric,
  calories integer not null default 0,
  sort_order integer default 0
);

alter table cardio_segments enable row level security;

drop policy if exists "Users manage own cardio segments" on cardio_segments;
create policy "Users manage own cardio segments" on cardio_segments for all using (
  auth.uid() = (select w.user_id from workouts w join exercises e on e.workout_id = w.id where e.id = exercise_id)
);

create index if not exists cardio_segments_exercise on cardio_segments (exercise_id);
