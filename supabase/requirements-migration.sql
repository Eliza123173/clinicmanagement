-- Run this in Supabase SQL Editor after the original schema.sql.
-- Adds the activity/history requirement without recreating existing policies.
alter table public.doctors add column if not exists is_active boolean not null default true;

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_name text not null,
  actor_role text not null,
  action text not null,
  details text not null,
  target_name text,
  created_at timestamptz not null default now()
);
alter table public.activity_logs enable row level security;
drop policy if exists "signed-in users can write activity" on public.activity_logs;
drop policy if exists "signed-in users can read activity" on public.activity_logs;
create policy "signed-in users can write activity" on public.activity_logs
  for insert to authenticated with check (auth.uid() is not null);
create policy "signed-in users can read activity" on public.activity_logs
  for select to authenticated using (auth.uid() is not null);
