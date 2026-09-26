-- ============================================================
-- CareWell Clinic Management System — Full Schema
-- Run this ONCE in Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Doctors ──────────────────────────────────────────────────
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
alter table public.doctors enable row level security;
drop policy if exists "public read doctors" on public.doctors;
drop policy if exists "auth write doctors" on public.doctors;
create policy "public read doctors" on public.doctors for select using (true);
create policy "auth write doctors" on public.doctors for all to authenticated using (true) with check (true);

-- ── Patients ─────────────────────────────────────────────────
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
alter table public.patients enable row level security;
drop policy if exists "public read patients" on public.patients;
drop policy if exists "auth write patients" on public.patients;
create policy "public read patients" on public.patients for select to authenticated using (true);
create policy "auth write patients" on public.patients for all to authenticated using (true) with check (true);

-- ── Services ─────────────────────────────────────────────────
create table if not exists public.services (
  id text primary key,
  name text not null,
  description text not null default '',
  duration_minutes integer not null default 30,
  is_active boolean not null default true
);
alter table public.services enable row level security;
drop policy if exists "public read services" on public.services;
drop policy if exists "auth write services" on public.services;
create policy "public read services" on public.services for select using (true);
create policy "auth write services" on public.services for all to authenticated using (true) with check (true);

-- ── Schedules ────────────────────────────────────────────────
create table if not exists public.schedules (
  id text primary key,
  doctor text not null,
  day text not null,
  start_time text not null,
  end_time text not null,
  is_available boolean not null default true,
  slot_duration integer not null default 30
);
alter table public.schedules enable row level security;
drop policy if exists "public read schedules" on public.schedules;
drop policy if exists "auth write schedules" on public.schedules;
create policy "public read schedules" on public.schedules for select using (true);
create policy "auth write schedules" on public.schedules for all to authenticated using (true) with check (true);

-- ── Appointments ─────────────────────────────────────────────
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
alter table public.appointments enable row level security;
drop policy if exists "auth read appointments" on public.appointments;
drop policy if exists "auth write appointments" on public.appointments;
create policy "auth read appointments" on public.appointments for select to authenticated using (true);
create policy "auth write appointments" on public.appointments for all to authenticated using (true) with check (true);

-- ── Medical Records ───────────────────────────────────────────
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
alter table public.medical_records enable row level security;
drop policy if exists "auth read medical_records" on public.medical_records;
drop policy if exists "auth write medical_records" on public.medical_records;
create policy "auth read medical_records" on public.medical_records for select to authenticated using (true);
create policy "auth write medical_records" on public.medical_records for all to authenticated using (true) with check (true);

-- ── Notifications ─────────────────────────────────────────────
create table if not exists public.notifications (
  id text primary key,
  user_email text not null,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  type text not null default 'info',
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
drop policy if exists "auth read notifications" on public.notifications;
drop policy if exists "auth write notifications" on public.notifications;
create policy "auth read notifications" on public.notifications for select to authenticated using (true);
create policy "auth write notifications" on public.notifications for all to authenticated using (true) with check (true);

-- ── Activity Logs ─────────────────────────────────────────────
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

-- ── Messages ──────────────────────────────────────────────────
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
drop policy if exists "signed-in users can send messages" on public.messages;
drop policy if exists "signed-in users can read messages" on public.messages;
create policy "signed-in users can send messages" on public.messages
  for insert to authenticated with check (auth.uid() is not null);
create policy "signed-in users can read messages" on public.messages
  for select to authenticated using (auth.uid() is not null);

-- ── Sample Services (run once to seed) ───────────────────────
insert into public.services (id, name, description, duration_minutes, is_active)
values
  ('SV001', 'General Consultation', 'Routine check-up and general health assessment', 30, true),
  ('SV002', 'Pediatric Consultation', 'Health assessment for children and infants', 30, true),
  ('SV003', 'Dental Check-up', 'Oral health examination and cleaning', 45, true),
  ('SV004', 'Eye Examination', 'Vision test and eye health assessment', 30, true),
  ('SV005', 'Blood Test', 'Complete blood count and laboratory tests', 15, true),
  ('SV006', 'X-Ray', 'Diagnostic imaging services', 20, true)
on conflict (id) do nothing;
