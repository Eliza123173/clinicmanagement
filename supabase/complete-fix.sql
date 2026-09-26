-- ============================================================
-- CareWell Clinic — COMPLETE FIX
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Ensure all tables exist ───────────────────────────────────

create table if not exists public.doctors (
  id text primary key,
  name text not null,
  spec text not null,
  avail text not null default 'Available Today',
  rating numeric(3,1) not null default 4.5,
  reviews integer not null default 0,
  years integer not null default 1,
  patients integer not null default 0,
  initials text not null default '',
  email text not null default '',
  is_active boolean not null default true
);

create table if not exists public.patients (
  id text primary key,
  name text not null,
  email text not null,
  contact text not null default '',
  dob text not null default '',
  gender text not null default '',
  blood text not null default '',
  address text not null default ''
);

create table if not exists public.services (
  id text primary key,
  name text not null,
  description text not null default '',
  duration_minutes integer not null default 30,
  is_active boolean not null default true
);

create table if not exists public.schedules (
  id text primary key,
  doctor text not null,
  day text not null,
  start_time text not null,
  end_time text not null,
  is_available boolean not null default true,
  slot_duration integer not null default 30
);

create table if not exists public.appointments (
  id text primary key,
  patient text not null,
  patient_email text not null,
  doctor text not null,
  doctor_id text not null default '',
  date text not null,
  time text not null,
  status text not null default 'Pending',
  reason text not null default '',
  service text not null default '',
  notes text,
  cancelled_by text,
  created_at timestamptz not null default now()
);

create table if not exists public.medical_records (
  id text primary key,
  appointment_id text not null default '',
  patient text not null,
  patient_email text not null,
  doctor text not null,
  date text not null,
  diagnosis text not null default '',
  treatment text not null default '',
  prescription text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id text primary key,
  user_email text not null,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  type text not null default 'info',
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_name text not null,
  actor_role text not null,
  action text not null,
  details text not null,
  target_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_email text not null,
  sender_name text not null,
  recipient_role text not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

-- ── Enable RLS on all tables ──────────────────────────────────

alter table public.doctors enable row level security;
alter table public.patients enable row level security;
alter table public.services enable row level security;
alter table public.schedules enable row level security;
alter table public.appointments enable row level security;
alter table public.medical_records enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;
alter table public.messages enable row level security;

-- ── Drop ALL existing policies ────────────────────────────────

drop policy if exists "public read doctors" on public.doctors;
drop policy if exists "auth write doctors" on public.doctors;
drop policy if exists "allow all doctors" on public.doctors;

drop policy if exists "public read patients" on public.patients;
drop policy if exists "auth write patients" on public.patients;
drop policy if exists "allow all patients" on public.patients;

drop policy if exists "public read services" on public.services;
drop policy if exists "auth write services" on public.services;
drop policy if exists "allow all services" on public.services;

drop policy if exists "public read schedules" on public.schedules;
drop policy if exists "auth write schedules" on public.schedules;
drop policy if exists "allow all schedules" on public.schedules;

drop policy if exists "auth read appointments" on public.appointments;
drop policy if exists "auth write appointments" on public.appointments;
drop policy if exists "allow all appointments" on public.appointments;

drop policy if exists "auth read medical_records" on public.medical_records;
drop policy if exists "auth write medical_records" on public.medical_records;
drop policy if exists "allow all medical_records" on public.medical_records;

drop policy if exists "auth read notifications" on public.notifications;
drop policy if exists "auth write notifications" on public.notifications;
drop policy if exists "allow all notifications" on public.notifications;

drop policy if exists "signed-in users can write activity" on public.activity_logs;
drop policy if exists "signed-in users can read activity" on public.activity_logs;
drop policy if exists "allow all activity_logs" on public.activity_logs;

drop policy if exists "signed-in users can send messages" on public.messages;
drop policy if exists "signed-in users can read messages" on public.messages;
drop policy if exists "allow all messages" on public.messages;

-- ── Create open policies for all tables (allows anon + auth) ──

create policy "allow all doctors"       on public.doctors       for all using (true) with check (true);
create policy "allow all patients"      on public.patients      for all using (true) with check (true);
create policy "allow all services"      on public.services      for all using (true) with check (true);
create policy "allow all schedules"     on public.schedules     for all using (true) with check (true);
create policy "allow all appointments"  on public.appointments  for all using (true) with check (true);
create policy "allow all medical_records" on public.medical_records for all using (true) with check (true);
create policy "allow all notifications" on public.notifications for all using (true) with check (true);
create policy "allow all activity_logs" on public.activity_logs for all using (true) with check (true);
create policy "allow all messages"      on public.messages      for all using (true) with check (true);

-- ── Seed services if empty ────────────────────────────────────

insert into public.services (id, name, description, duration_minutes, is_active) values
  ('SV001', 'General Consultation',   'Routine check-up and general health assessment', 30, true),
  ('SV002', 'Pediatric Consultation', 'Health assessment for children and infants',      30, true),
  ('SV003', 'Dental Check-up',        'Oral health examination and cleaning',            45, true),
  ('SV004', 'Eye Examination',        'Vision test and eye health assessment',           30, true),
  ('SV005', 'Blood Test',             'Complete blood count and laboratory tests',       15, true),
  ('SV006', 'X-Ray',                  'Diagnostic imaging services',                    20, true)
on conflict (id) do nothing;
