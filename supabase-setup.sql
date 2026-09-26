-- Run this entire script in Supabase SQL Editor

-- Services table
create table if not exists services (
  id text primary key,
  name text not null,
  description text,
  duration_minutes int default 30,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Add missing columns to doctors
alter table doctors add column if not exists email text;
alter table doctors add column if not exists is_active boolean default true;
alter table doctors add column if not exists password_set boolean default false;

-- Add missing columns to appointments
alter table appointments add column if not exists service text;
alter table appointments add column if not exists patient_email text;
alter table appointments add column if not exists doctor_id text;
alter table appointments add column if not exists cancelled_by text;
alter table appointments add column if not exists created_at timestamptz default now();

-- Add missing columns to schedules
alter table schedules add column if not exists is_available boolean default true;
alter table schedules add column if not exists slot_duration int default 30;

-- Medical records table
create table if not exists medical_records (
  id text primary key,
  appointment_id text,
  patient text not null,
  patient_email text,
  doctor text not null,
  date text not null,
  diagnosis text,
  treatment text,
  notes text,
  prescription text,
  created_at timestamptz default now()
);

-- Notifications table
create table if not exists notifications (
  id text primary key,
  user_email text not null,
  title text not null,
  message text not null,
  is_read boolean default false,
  type text default 'info',
  created_at timestamptz default now()
);

-- Activity logs table
create table if not exists activity_logs (
  id text primary key,
  action text not null,
  performed_by text not null,
  target text,
  details text,
  created_at timestamptz default now()
);

-- Seed services
insert into services (id, name, description, duration_minutes) values
  ('SV001', 'General Consultation', 'General health checkup and consultation', 30),
  ('SV002', 'Pediatric Consultation', 'Health checkup for children', 30),
  ('SV003', 'Dermatology Consultation', 'Skin-related consultation', 30),
  ('SV004', 'Cardiology Consultation', 'Heart and cardiovascular consultation', 45),
  ('SV005', 'Orthopedic Consultation', 'Bone and joint consultation', 30),
  ('SV006', 'Follow-up Consultation', 'Follow-up visit for existing patients', 15)
on conflict (id) do nothing;

-- Enable RLS but allow all for anon (for demo purposes)
alter table services enable row level security;
alter table medical_records enable row level security;
alter table notifications enable row level security;
alter table activity_logs enable row level security;

create policy if not exists "allow all services" on services for all using (true) with check (true);
create policy if not exists "allow all medical_records" on medical_records for all using (true) with check (true);
create policy if not exists "allow all notifications" on notifications for all using (true) with check (true);
create policy if not exists "allow all activity_logs" on activity_logs for all using (true) with check (true);
