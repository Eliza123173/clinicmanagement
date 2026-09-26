-- ============================================================
-- FIX: Drop and recreate all RLS policies to allow anon access
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- Allow anon to read/write appointments (needed for booking while logged in via anon key)
drop policy if exists "auth read appointments" on public.appointments;
drop policy if exists "auth write appointments" on public.appointments;
create policy "allow all appointments" on public.appointments for all using (true) with check (true);

-- Allow anon to read/write patients
drop policy if exists "public read patients" on public.patients;
drop policy if exists "auth write patients" on public.patients;
create policy "allow all patients" on public.patients for all using (true) with check (true);

-- Allow anon to read/write notifications
drop policy if exists "auth read notifications" on public.notifications;
drop policy if exists "auth write notifications" on public.notifications;
create policy "allow all notifications" on public.notifications for all using (true) with check (true);

-- Allow anon to read/write medical_records
drop policy if exists "auth read medical_records" on public.medical_records;
drop policy if exists "auth write medical_records" on public.medical_records;
create policy "allow all medical_records" on public.medical_records for all using (true) with check (true);

-- Allow anon to read/write activity_logs
drop policy if exists "signed-in users can write activity" on public.activity_logs;
drop policy if exists "signed-in users can read activity" on public.activity_logs;
create policy "allow all activity_logs" on public.activity_logs for all using (true) with check (true);

-- Allow anon to read/write schedules
drop policy if exists "public read schedules" on public.schedules;
drop policy if exists "auth write schedules" on public.schedules;
create policy "allow all schedules" on public.schedules for all using (true) with check (true);

-- Allow anon to read/write doctors
drop policy if exists "public read doctors" on public.doctors;
drop policy if exists "auth write doctors" on public.doctors;
create policy "allow all doctors" on public.doctors for all using (true) with check (true);

-- Allow anon to read/write services
drop policy if exists "public read services" on public.services;
drop policy if exists "auth write services" on public.services;
create policy "allow all services" on public.services for all using (true) with check (true);

-- Allow anon to read/write messages
drop policy if exists "signed-in users can send messages" on public.messages;
drop policy if exists "signed-in users can read messages" on public.messages;
create policy "allow all messages" on public.messages for all using (true) with check (true);
