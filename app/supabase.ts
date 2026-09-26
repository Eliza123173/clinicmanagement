import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type Role = "Patient" | "Doctor" | "Admin";

export type Doctor = {
  id: string; name: string; spec: string; avail: string;
  rating: number; reviews: number; years: number; patients: number;
  initials: string; email: string; is_active: boolean;
};

export type Patient = {
  id: string; name: string; email: string; contact: string;
  dob: string; gender: string; blood: string; address: string;
};

export type Service = {
  id: string; name: string; description: string;
  duration_minutes: number; is_active: boolean;
};

export type Appointment = {
  id: string; patient: string; patient_email: string; doctor: string;
  doctor_id: string; date: string; time: string; status: string;
  reason: string; service: string; notes: string | null;
  cancelled_by: string | null; created_at: string;
};

export type Schedule = {
  id: string; doctor: string; day: string;
  start_time: string; end_time: string;
  is_available: boolean; slot_duration: number;
};

export type MedicalRecord = {
  id: string; appointment_id: string; patient: string; patient_email: string;
  doctor: string; date: string; diagnosis: string; treatment: string;
  notes: string; prescription: string; created_at: string;
};

export type Notification = {
  id: string; user_email: string; title: string;
  message: string; is_read: boolean; type: string; created_at: string;
};

export type ActivityLog = {
  id: string; actor_name: string; actor_role: string;
  action: string; details: string; target_name: string | null; created_at: string;
};

export type Message = {
  id: string; sender_email: string; sender_name: string;
  recipient_role: string; body: string; created_at: string; read_at: string | null;
};

// ── Helpers ────────────────────────────────────────────
export const uid = (prefix = "") => prefix + Date.now() + Math.random().toString(36).slice(2, 6);

export async function logActivity(action: string, actorName: string, actorRole: string, details: string, targetName?: string) {
  await supabase.from("activity_logs").insert({ actor_name: actorName, actor_role: actorRole, action, details, target_name: targetName ?? null });
}

export async function addActivityLog(entry: { actor_name: string; actor_role: string; action: string; details: string; target_name?: string }) {
  await supabase.from("activity_logs").insert({ ...entry, target_name: entry.target_name ?? null });
}

export async function sendNotification(userEmail: string, title: string, message: string, type = "info") {
  await supabase.from("notifications").insert({ id: uid("NOTIF"), user_email: userEmail, title, message, type });
}

// ── Doctors ────────────────────────────────────────────
export const getDoctors = () => supabase.from("doctors").select("*").eq("is_active", true).order("name");
export const getAllDoctors = () => supabase.from("doctors").select("*").order("name");
export const addDoctor = (d: Omit<Doctor, "id">) => supabase.from("doctors").insert({ ...d, id: uid("D") }).select().single();
export const updateDoctor = (id: string, d: Partial<Doctor>) => supabase.from("doctors").update(d).eq("id", id);
export const deleteDoctor = (id: string) => supabase.from("doctors").update({ is_active: false }).eq("id", id);

// ── Patients ───────────────────────────────────────────
export const getPatients = () => supabase.from("patients").select("*").order("name");
export const getPatientByEmail = (email: string) => supabase.from("patients").select("*").eq("email", email).single();
export const addPatient = (p: Omit<Patient, "id">) => supabase.from("patients").insert({ ...p, id: uid("P") }).select().single();
export const updatePatient = (id: string, p: Partial<Patient>) => supabase.from("patients").update(p).eq("id", id);
export const deletePatient = (id: string) => supabase.from("patients").delete().eq("id", id);

// ── Services ───────────────────────────────────────────
export const getServices = () => supabase.from("services").select("*").eq("is_active", true).order("name");
export const getAllServices = () => supabase.from("services").select("*").order("name");
export const addService = (s: Omit<Service, "id">) => supabase.from("services").insert({ ...s, id: uid("SV") }).select().single();
export const updateService = (id: string, s: Partial<Service>) => supabase.from("services").update(s).eq("id", id);
export const deleteService = (id: string) => supabase.from("services").update({ is_active: false }).eq("id", id);

// ── Appointments ───────────────────────────────────────
export const getAppointments = () => supabase.from("appointments").select("*").order("created_at", { ascending: false });
export const getAppointmentsByPatient = (email: string) => supabase.from("appointments").select("*").eq("patient_email", email.trim().toLowerCase()).order("created_at", { ascending: false });
export const getAppointmentsByDoctor = (doctor: string) => supabase.from("appointments").select("*").eq("doctor", doctor).order("date");
export const addAppointment = (a: Omit<Appointment, "id" | "created_at">) => supabase.from("appointments").insert({ ...a, id: uid("A") }).select().single();
export const updateAppointment = (id: string, a: Partial<Appointment>) => supabase.from("appointments").update(a).eq("id", id);
export const deleteAppointment = (id: string) => supabase.from("appointments").delete().eq("id", id);

export async function isSlotAvailable(doctor: string, date: string, time: string, excludeId = "") {
  let q = supabase.from("appointments").select("id").eq("doctor", doctor).eq("date", date).eq("time", time).not("status", "in", '("Cancelled","Rejected")');
  if (excludeId) q = q.neq("id", excludeId);
  const { data } = await q;
  return !data || data.length === 0;
}

// ── Schedules ──────────────────────────────────────────
export const getSchedules = () => supabase.from("schedules").select("*").order("doctor");
export const getSchedulesByDoctor = (doctor: string) => supabase.from("schedules").select("*").eq("doctor", doctor);
export const addSchedule = (s: Omit<Schedule, "id">) => supabase.from("schedules").insert({ ...s, id: uid("S") }).select().single();
export const updateSchedule = (id: string, s: Partial<Schedule>) => supabase.from("schedules").update(s).eq("id", id);
export const deleteSchedule = (id: string) => supabase.from("schedules").delete().eq("id", id);

// ── Medical Records ────────────────────────────────────
export const getMedicalRecords = () => supabase.from("medical_records").select("*").order("created_at", { ascending: false });
export const getMedicalRecordsByPatient = (email: string) => supabase.from("medical_records").select("*").eq("patient_email", email).order("created_at", { ascending: false });
export const getMedicalRecordsByDoctor = (doctor: string) => supabase.from("medical_records").select("*").eq("doctor", doctor).order("created_at", { ascending: false });
export const addMedicalRecord = (r: Omit<MedicalRecord, "id" | "created_at">) => supabase.from("medical_records").insert({ ...r, id: uid("MR") }).select().single();
export const updateMedicalRecord = (id: string, r: Partial<MedicalRecord>) => supabase.from("medical_records").update(r).eq("id", id);
export const deleteMedicalRecord = (id: string) => supabase.from("medical_records").delete().eq("id", id);

// ── Notifications ──────────────────────────────────────
export const getNotifications = (email: string) => supabase.from("notifications").select("*").eq("user_email", email).order("created_at", { ascending: false });
export const markNotificationRead = (id: string) => supabase.from("notifications").update({ is_read: true }).eq("id", id);
export const markAllRead = (email: string) => supabase.from("notifications").update({ is_read: true }).eq("user_email", email);

// ── Activity Logs ──────────────────────────────────────
export const getActivityLogs = () => supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(200);

// ── Messages ───────────────────────────────────────────
export const getMessages = (email: string, role: string) => {
  if (role === "Admin") return supabase.from("messages").select("*").order("created_at", { ascending: false }).limit(100);
  return supabase.from("messages").select("*").or(`sender_email.eq.${email},recipient_role.eq.${role}`).order("created_at", { ascending: false }).limit(100);
};
export const addMessage = (m: Omit<Message, "id" | "created_at" | "read_at">) => supabase.from("messages").insert(m).select().single();
