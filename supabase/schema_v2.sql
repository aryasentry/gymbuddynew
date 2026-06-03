-- ═══════════════════════════════════════════════
-- GymBuddy Schema v2 — chat memory, reminders, notes
-- Run AFTER schema.sql. Idempotent (safe to re-run).
-- ═══════════════════════════════════════════════

-- ── New columns ──────────────────────────────────
alter table workouts  add column if not exists description text;
alter table exercises add column if not exists notes text;

-- ── AI Coach: sessions ───────────────────────────
create table if not exists coach_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text,
  summary text,                       -- rolling summary of older turns
  ended boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── AI Coach: messages ───────────────────────────
create table if not exists coach_messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references coach_sessions(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  role text check (role in ('user','assistant')) not null,
  content text not null,
  created_at timestamptz default now()
);

-- ── Reminders / Plans ────────────────────────────
create table if not exists reminders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  kind text check (kind in ('meal','workout','water','weight','custom')) not null default 'custom',
  title text not null,
  body text,
  hour integer not null default 9,        -- 0-23
  minute integer not null default 0,       -- 0-59
  days_of_week integer[] default '{0,1,2,3,4,5,6}', -- 0=Sun .. 6=Sat
  enabled boolean default true,
  notification_ids text[] default '{}',    -- scheduled local notif ids
  created_at timestamptz default now()
);

-- ── RLS ──────────────────────────────────────────
alter table coach_sessions enable row level security;
alter table coach_messages enable row level security;
alter table reminders      enable row level security;

drop policy if exists "Users manage own coach sessions" on coach_sessions;
create policy "Users manage own coach sessions" on coach_sessions for all using (auth.uid() = user_id);

drop policy if exists "Users manage own coach messages" on coach_messages;
create policy "Users manage own coach messages" on coach_messages for all using (auth.uid() = user_id);

drop policy if exists "Users manage own reminders" on reminders;
create policy "Users manage own reminders" on reminders for all using (auth.uid() = user_id);

-- ── Indexes ──────────────────────────────────────
create index if not exists coach_sessions_user on coach_sessions (user_id, ended, updated_at desc);
create index if not exists coach_messages_session on coach_messages (session_id, created_at);
create index if not exists reminders_user on reminders (user_id, enabled);

-- ═══════════════════════════════════════════════
-- STORAGE (run in Supabase Dashboard → Storage, or here):
-- 1) Create a PUBLIC bucket named  food-images
-- 2) Then run these policies so users manage their own files:
-- ═══════════════════════════════════════════════
insert into storage.buckets (id, name, public)
values ('food-images', 'food-images', true)
on conflict (id) do nothing;

drop policy if exists "Users upload own food images" on storage.objects;
create policy "Users upload own food images" on storage.objects
  for insert with check (bucket_id = 'food-images' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Anyone can view food images" on storage.objects;
create policy "Anyone can view food images" on storage.objects
  for select using (bucket_id = 'food-images');

drop policy if exists "Users delete own food images" on storage.objects;
create policy "Users delete own food images" on storage.objects
  for delete using (bucket_id = 'food-images' and auth.uid()::text = (storage.foldername(name))[1]);
