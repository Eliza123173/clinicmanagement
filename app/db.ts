import { supabase } from "./supabase";

export type Doctor = {
  id: string; name: string; spec: string; avail: string;
  rating: number; reviews: number; years: number; patients: number; initials: string;
};
export type Patient = {
  id: string; name: string; email: string; contact: string;
  dob: string; gender: string; blood: string; address: string;
};
export type Appointment = {
  id: string; patient: string; doctor: string;
  date: string; time: string; status: string; reason: string; notes: string;
};
export type Record_ = {
  id: string; patient: string; doctor: string;
  date: string; diagnosis: string; prescription: string; notes: string;
};
export type Schedule = {
  id: string; doctor: string; day: string; start_time: string; end_time: string;
};

// ── Doctors ──────────────────────────────────────────────────────────────────
export async function getDoctors(): Promise<Doctor[]> {
  const { data, error } = await supabase.from("doctors").select("*").order("id");
  if (error) throw error;
  return data ?? [];
}
export async function addDoctor(d: Omit<Doctor, "id"> & { id: string }) {
  const { error } = await supabase.from("doctors").insert(d);
  if (error) throw error;
}
export async function deleteDoctor(id: string) {
  const { error } = await supabase.from("doctors").delete().eq("id", id);
  if (error) throw error;
}

// ── Patients ─────────────────────────────────────────────────────────────────
export async function getPatients(): Promise<Patient[]> {
  const { data, error } = await supabase.from("patients").select("*").order("id");
  if (error) throw error;
  return data ?? [];
}
export async function addPatient(p: Patient) {
  const { error } = await supabase.from("patients").insert(p);
  if (error) throw error;
}
export async function deletePatient(id: string) {
  const { error } = await supabase.from("patients").delete().eq("id", id);
  if (error) throw error;
}

// ── Appointments ──────────────────────────────────────────────────────────────
export async function getAppointments(): Promise<Appointment[]> {
  const { data, error } = await supabase.from("appointments").select("*").order("id");
  if (error) throw error;
  return data ?? [];
}
export async function addAppointment(a: Appointment) {
  const { error } = await supabase.from("appointments").insert(a);
  if (error) throw error;
}
export async function updateAppointmentStatus(id: string, status: string) {
  const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
  if (error) throw error;
}

// ── Records ───────────────────────────────────────────────────────────────────
export async function getRecords(): Promise<Record_[]> {
  const { data, error } = await supabase.from("records").select("*").order("id");
  if (error) throw error;
  return data ?? [];
}

// ── Schedules ─────────────────────────────────────────────────────────────────
export async function getSchedules(): Promise<Schedule[]> {
  const { data, error } = await supabase.from("schedules").select("*").order("id");
  if (error) throw error;
  return data ?? [];
}
export async function addSchedule(s: Schedule) {
  const { error } = await supabase.from("schedules").insert(s);
  if (error) throw error;
}
export async function deleteSchedule(id: string) {
  const { error } = await supabase.from("schedules").delete().eq("id", id);
  if (error) throw error;
}
