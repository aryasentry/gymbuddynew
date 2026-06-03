-- ═══════════════════════════════════════════════
-- GymBuddy Schema v5 — progress photos
-- Run AFTER v1–v4. Idempotent.
-- ═══════════════════════════════════════════════

create table if not exists progress_photos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  logged_at date default current_date not null,
  pose text check (pose in ('front','side','back')) not null,
  image_url text not null,
  created_at timestamptz default now()
);

alter table progress_photos enable row level security;
drop policy if exists "Users manage own progress photos" on progress_photos;
create policy "Users manage own progress photos" on progress_photos for all using (auth.uid() = user_id);
create index if not exists progress_photos_user on progress_photos (user_id, logged_at desc);

-- ── Progress photos storage bucket (public-read; users write their own folder) ──
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', true)
on conflict (id) do nothing;

drop policy if exists "Users upload own progress photos" on storage.objects;
create policy "Users upload own progress photos" on storage.objects
  for insert with check (bucket_id = 'progress-photos' and auth.uid()::text = (storage.foldername(name))[1]);
drop policy if exists "Anyone can view progress photos" on storage.objects;
create policy "Anyone can view progress photos" on storage.objects
  for select using (bucket_id = 'progress-photos');
drop policy if exists "Users delete own progress photos" on storage.objects;
create policy "Users delete own progress photos" on storage.objects
  for delete using (bucket_id = 'progress-photos' and auth.uid()::text = (storage.foldername(name))[1]);
