import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Types ──────────────────────────────────────────────
export type Doctor = {
  id: string; name: string; spec: string; avail: string;
  rating: number; reviews: number; years: number; patients: number; initials: string; email?: string; is_active?: boolean;
};
export type Patient = {
  id: string; name: string; email: string; contact: string;
  dob: string; gender: string; blood: string; address: string;
};
export type Appointment = {
  id: string; patient: string; doctor: string; date: string;
  time: string; status: string; reason: string; notes: string | null;
  created_at?: string;
};
export type Record_ = {
  id: string; patient: string; doctor: string; date: string;
  diagnosis: string; prescription: string; notes: string;
};
export type Schedule = {
  id: string; doctor: string; day: string; start_time: string; end_time: string;
};
export type Message = {
  id: string; sender_email: string; sender_name: string; recipient_role: string;
  body: string; created_at: string; read_at: string | null;
};
export type ActivityLog = {
  id: string; actor_name: string; actor_role: string; action: string;
  details: string; target_name: string | null; created_at: string;
};

// ── Doctors ────────────────────────────────────────────
export const getDoctors = () => supabase.from("doctors").select("*").order("name");
export const addDoctor = (d: Omit<Doctor, "id">) =>
  supabase.from("doctors").insert({ ...d, id: "D" + Date.now() }).select().single();
export const updateDoctor = (id: string, d: Partial<Doctor>) =>
  supabase.from("doctors").update(d).eq("id", id);
export const deleteDoctor = (id: string) =>
  supabase.from("doctors").delete().eq("id", id);

// ── Patients ───────────────────────────────────────────
export const getPatients = () => supabase.from("patients").select("*").order("name");
export const addPatient = (p: Omit<Patient, "id">) =>
  supabase.from("patients").insert({ ...p, id: "P" + Date.now() }).select().single();
export const updatePatient = (id: string, p: Partial<Patient>) =>
  supabase.from("patients").update(p).eq("id", id);
export const deletePatient = (id: string) =>
  supabase.from("patients").delete().eq("id", id);

// ── Appointments ───────────────────────────────────────
export const getAppointments = () => supabase.from("appointments").select("*").order("created_at", { ascending: false, nullsFirst: false });
export const addAppointment = (a: Omit<Appointment, "id" | "created_at">) =>
  supabase.from("appointments").insert({ ...a, id: "A" + Date.now(), created_at: new Date().toISOString() }).select().single();
export const updateAppointment = (id: string, a: Partial<Appointment>) =>
  supabase.from("appointments").update(a).eq("id", id);
export const deleteAppointment = (id: string) =>
  supabase.from("appointments").delete().eq("id", id);

// ── Records ────────────────────────────────────────────
export const getRecords = () => supabase.from("records").select("*").order("date");
export const addRecord = (r: Omit<Record_, "id">) =>
  supabase.from("records").insert({ ...r, id: "MR" + Date.now() }).select().single();
export const updateRecord = (id: string, r: Partial<Record_>) =>
  supabase.from("records").update(r).eq("id", id);
export const deleteRecord = (id: string) =>
  supabase.from("records").delete().eq("id", id);

// ── Schedules ──────────────────────────────────────────
export const getSchedules = () => supabase.from("schedules").select("*").order("doctor");
export const addSchedule = (s: Omit<Schedule, "id">) =>
  supabase.from("schedules").insert({ ...s, id: "S" + Date.now() }).select().single();
export const updateSchedule = (id: string, s: Partial<Schedule>) =>
  supabase.from("schedules").update(s).eq("id", id);
export const deleteSchedule = (id: string) =>
  supabase.from("schedules").delete().eq("id", id);

export const getMessages = (email: string, role: string) =>
  supabase.from("messages").select("*").or("sender_email.eq." + email + ",recipient_role.eq." + role).order("created_at", { ascending: false });
export const addMessage = (message: Omit<Message, "id" | "created_at" | "read_at">) =>
  supabase.from("messages").insert(message).select().single();

export const getActivityLogs = () =>
  supabase.from("activity_logs").select("*").order("created_at", { ascending: false });
export const addActivityLog = (activity: Omit<ActivityLog, "id" | "created_at">) =>
  supabase.from("activity_logs").insert(activity);
