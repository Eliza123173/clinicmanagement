-- Run this once in Supabase Dashboard → SQL Editor.
-- Existing doctors, patients, appointments, records, and schedules tables remain unchanged.
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_email text not null,
  sender_name text not null,
  recipient_role text not null check (recipient_role in ('Admin', 'Patient', 'Doctor')),
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
alter table public.messages enable row level security;
create policy "signed-in users can send messages" on public.messages
  for insert to authenticated with check (auth.uid() is not null);
create policy "signed-in users can read messages" on public.messages
  for select to authenticated using (auth.uid() is not null);

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
create policy "signed-in users can write activity" on public.activity_logs
  for insert to authenticated with check (auth.uid() is not null);
create policy "signed-in users can read activity" on public.activity_logs
  for select to authenticated using (auth.uid() is not null);
