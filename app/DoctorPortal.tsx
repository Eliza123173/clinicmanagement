"use client";
import { useState, useEffect } from "react";
import { Av, St, Loading, Modal, Alert, PageHeader } from "./ui";
import {
  getAppointmentsByDoctor, getSchedulesByDoctor, updateAppointment,
  addMedicalRecord, getMedicalRecordsByDoctor, addActivityLog,
  addSchedule, updateSchedule, deleteSchedule,
  sendNotification,
  Appointment, Schedule, MedicalRecord,
} from "./supabase";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function DoctorPortal({ doctorName, doctorSpec, doctorInitials }: {
  doctorName: string; doctorSpec: string; doctorInitials: string;
}) {
  const [tab, setTab] = useState("Dashboard");
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [a, s, r] = await Promise.all([
      getAppointmentsByDoctor(doctorName),
      getSchedulesByDoctor(doctorName),
      getMedicalRecordsByDoctor(doctorName),
    ]);
    setAppts(a.data ?? []);
    setSchedules(s.data ?? []);
    setRecords(r.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [doctorName]);

  const todayISO = new Date().toISOString().slice(0, 10);
  const todayAppts = appts.filter(a => {
    const d = new Date(a.date);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return iso === todayISO && ["Approved", "Pending"].includes(a.status);
  });
  const upcoming = appts.filter(a => ["Pending", "Approved"].includes(a.status));

  if (loading) return <Loading />;

  return (
    <>
      <div className="welcome-bar">
        <div>
          <h1>Welcome, Dr. {doctorName.split(" ").slice(1).join(" ") || doctorName}! 👋</h1>
          <p style={{ color: "#8190a5" }}>{doctorSpec}</p>
        </div>
        <Av x={doctorInitials} size="av-lg" />
      </div>

      <div className="stats-grid">
        {[
          ["Total Appointments", appts.length],
          ["Upcoming", upcoming.length],
          ["Today's Patients", todayAppts.length],
          ["Completed", appts.filter(a => a.status === "Completed").length],
        ].map(([label, val]) => (
          <div key={label as string} className="stat-card">
            <p>{label as string}</p>
            <h2>{val as number}</h2>
          </div>
        ))}
      </div>

      <div className="tabs" style={{ marginBottom: 20 }}>
        {["Dashboard", "Appointments", "Medical Records", "My Schedule"].map(t => (
          <button key={t} className={`tab ${tab === t ? "tab-active" : ""}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === "Dashboard" && <DoctorDashboardTab todayAppts={todayAppts} upcoming={upcoming} schedules={schedules} />}
      {tab === "Appointments" && <DoctorAppointmentsTab appts={appts} doctorName={doctorName} onRefresh={load} />}
      {tab === "Medical Records" && <DoctorRecordsTab records={records} />}
      {tab === "My Schedule" && <DoctorScheduleTab schedules={schedules} doctorName={doctorName} onRefresh={load} />}
    </>
  );
}

// ── Dashboard Tab ──────────────────────────────────────
function DoctorDashboardTab({ todayAppts, upcoming, schedules }: {
  todayAppts: Appointment[]; upcoming: Appointment[]; schedules: Schedule[];
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20 }}>
      <div>
        <div className="panel" style={{ marginBottom: 18 }}>
          <div className="panel-header"><h2>Today&apos;s Patients</h2></div>
          {todayAppts.length ? todayAppts.map(a => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid #f0f4f9" }}>
              <Av x={a.patient.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()} />
              <div style={{ flex: 1 }}>
                <b style={{ fontSize: 13 }}>{a.patient}</b>
                <p style={{ fontSize: 12, color: "#8190a5" }}>{a.time} — {a.service} — {a.reason}</p>
              </div>
              <St x={a.status} />
            </div>
          )) : <p style={{ color: "#8190a5", fontSize: 13 }}>No patients scheduled for today.</p>}
        </div>
        <div className="panel">
          <div className="panel-header"><h2>Upcoming Appointments</h2></div>
          {upcoming.slice(0, 5).length ? upcoming.slice(0, 5).map(a => (
            <div key={a.id} className="upcoming-appt">
              <Av x={a.patient.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()} />
              <div className="info"><b>{a.patient}</b><p>{a.service} — {a.reason}</p></div>
              <div className="time">{a.date}<small>{a.time}</small></div>
              <St x={a.status} />
            </div>
          )) : <p style={{ color: "#8190a5", fontSize: 13 }}>No upcoming appointments.</p>}
        </div>
      </div>
      <div className="panel">
        <div className="panel-header"><h2>My Schedule</h2></div>
        {schedules.length ? schedules.map(s => (
          <div key={s.id} className="schedule-row">
            <span>{s.day}</span>
            <span style={{ fontWeight: 600 }}>{s.start_time} – {s.end_time}</span>
          </div>
        )) : <p style={{ color: "#8190a5", fontSize: 13 }}>No schedule set. Contact admin.</p>}
      </div>
    </div>
  );
}

// ── Appointments Tab ───────────────────────────────────
function DoctorAppointmentsTab({ appts, doctorName, onRefresh }: {
  appts: Appointment[]; doctorName: string; onRefresh: () => void;
}) {
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [form, setForm] = useState({ status: "Approved", diagnosis: "", treatment: "", prescription: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const tabMap: Record<string, string[]> = {
    All: ["Pending", "Approved", "Completed", "Cancelled", "Rejected"],
    Upcoming: ["Pending", "Approved"],
    Completed: ["Completed"],
    Cancelled: ["Cancelled", "Rejected"],
  };
  const filtered = appts.filter(a => tabMap[filter].includes(a.status));

  function openProcess(a: Appointment) {
    setSelected(a);
    setForm({ status: a.status === "Pending" ? "Approved" : a.status, diagnosis: "", treatment: "", prescription: "", notes: a.notes ?? "" });
    setErr("");
  }

  async function save() {
    if (!selected) return;
    if (form.status === "Completed" && !form.diagnosis.trim()) return setErr("Diagnosis is required to complete an appointment.");
    setSaving(true); setErr("");
    await updateAppointment(selected.id, { status: form.status, notes: form.notes || null });
    if (form.status === "Completed" && form.diagnosis.trim()) {
      await addMedicalRecord({
        appointment_id: selected.id,
        patient: selected.patient,
        patient_email: selected.patient_email,
        doctor: doctorName,
        date: selected.date,
        diagnosis: form.diagnosis.trim(),
        treatment: form.treatment.trim(),
        prescription: form.prescription.trim(),
        notes: form.notes.trim(),
      });
      await sendNotification(selected.patient_email, "Appointment Completed",
        `Your appointment with Dr. ${doctorName} on ${selected.date} has been completed. A medical record has been created.`, "success");
    } else if (form.status === "Approved") {
      await sendNotification(selected.patient_email, "Appointment Approved",
        `Your appointment with Dr. ${doctorName} on ${selected.date} at ${selected.time} has been approved.`, "success");
    } else if (form.status === "Cancelled") {
      await sendNotification(selected.patient_email, "Appointment Cancelled",
        `Your appointment with Dr. ${doctorName} on ${selected.date} has been cancelled.`, "error");
    }
    await addActivityLog({ actor_name: doctorName, actor_role: "Doctor", action: `Set appointment to ${form.status}`, details: `Patient: ${selected.patient}, Date: ${selected.date}`, target_name: selected.patient });
    setSaving(false); setSelected(null); onRefresh();
  }

  return (
    <>
      <div className="tabs" style={{ marginBottom: 16 }}>
        {["All", "Upcoming", "Completed", "Cancelled"].map(t => (
          <button key={t} className={`tab ${filter === t ? "tab-active" : ""}`} onClick={() => setFilter(t)}>{t}</button>
        ))}
      </div>
      <div className="tbl-wrap">
        <table>
          <thead><tr><th>Patient</th><th>Service</th><th>Date</th><th>Time</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {filtered.length ? filtered.map(a => (
              <tr key={a.id}>
                <td><b>{a.patient}</b></td>
                <td>{a.service}</td>
                <td>{a.date}</td>
                <td>{a.time}</td>
                <td style={{ color: "#8190a5" }}>{a.reason}</td>
                <td><St x={a.status} /></td>
                <td>
                  {["Pending", "Approved"].includes(a.status) && (
                    <button className="btn btn-outline btn-sm" onClick={() => openProcess(a)}>Process</button>
                  )}
                  {a.status === "Completed" && a.notes && (
                    <button className="btn btn-sm" style={{ background: "#f0f6ff", color: "#0867d3", border: "1px solid #b8d8f8" }} onClick={() => openProcess(a)}>View Notes</button>
                  )}
                </td>
              </tr>
            )) : (
              <tr><td colSpan={7} style={{ textAlign: "center", color: "#8190a5", padding: 30 }}>No appointments found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <Modal title="Process Appointment" onClose={() => setSelected(null)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setSelected(null)}>Cancel</button>
              {["Pending", "Approved"].includes(selected.status) && (
                <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save"}</button>
              )}
            </>
          }>
          <Alert type="error" msg={err} />
          <div style={{ background: "#f8fbff", borderRadius: 8, padding: "12px 14px", marginBottom: 16, fontSize: 13 }}>
            <b>{selected.patient}</b> — {selected.service}<br />
            <span style={{ color: "#8190a5" }}>{selected.date} at {selected.time} — {selected.reason}</span>
          </div>
          {["Pending", "Approved"].includes(selected.status) && (
            <>
              <div className="form-group">
                <label>Update Status</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  {["Approved", "Completed", "Cancelled"].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              {form.status === "Completed" && (
                <>
                  <div className="form-group"><label>Diagnosis *</label><input value={form.diagnosis} onChange={e => setForm(p => ({ ...p, diagnosis: e.target.value }))} placeholder="e.g. Hypertension" /></div>
                  <div className="form-group"><label>Treatment</label><input value={form.treatment} onChange={e => setForm(p => ({ ...p, treatment: e.target.value }))} placeholder="e.g. Lifestyle modification" /></div>
                  <div className="form-group"><label>Prescription</label><input value={form.prescription} onChange={e => setForm(p => ({ ...p, prescription: e.target.value }))} placeholder="e.g. Amlodipine 5mg" /></div>
                </>
              )}
              <div className="form-group"><label>Notes / Remarks</label><textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Additional clinical notes..." /></div>
            </>
          )}
          {selected.status === "Completed" && (
            <div style={{ fontSize: 13, color: "#5a6a80" }}>
              <b>Notes:</b> {selected.notes || "—"}
            </div>
          )}
        </Modal>
      )}
    </>
  );
}

// ── Medical Records Tab ────────────────────────────────
function DoctorRecordsTab({ records }: { records: MedicalRecord[] }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<MedicalRecord | null>(null);
  const filtered = records.filter(r => r.patient.toLowerCase().includes(search.toLowerCase()) || r.diagnosis.toLowerCase().includes(search.toLowerCase()));
  return (
    <>
      <div className="filters"><input placeholder="Search patient or diagnosis..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      <div className="tbl-wrap">
        <table>
          <thead><tr><th>Patient</th><th>Date</th><th>Diagnosis</th><th>Treatment</th><th>Prescription</th><th>Action</th></tr></thead>
          <tbody>
            {filtered.length ? filtered.map(r => (
              <tr key={r.id}>
                <td><b>{r.patient}</b></td>
                <td>{r.date}</td>
                <td>{r.diagnosis}</td>
                <td>{r.treatment || "—"}</td>
                <td>{r.prescription || "—"}</td>
                <td><button className="btn btn-outline btn-sm" onClick={() => setSelected(r)}>View</button></td>
              </tr>
            )) : (
              <tr><td colSpan={6} style={{ textAlign: "center", color: "#8190a5", padding: 24 }}>No records found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {selected && (
        <Modal title="Medical Record" onClose={() => setSelected(null)}
          footer={<button className="btn btn-primary" onClick={() => setSelected(null)}>Close</button>}>
          {[["Patient", selected.patient], ["Date", selected.date], ["Diagnosis", selected.diagnosis], ["Treatment", selected.treatment || "—"], ["Prescription", selected.prescription || "—"], ["Notes", selected.notes || "—"]].map(([label, val]) => (
            <div key={label} style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#8190a5", textTransform: "uppercase", marginBottom: 4 }}>{label}</p>
              <p style={{ fontSize: 13, background: "#f8fbfe", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5edf6" }}>{val}</p>
            </div>
          ))}
        </Modal>
      )}
    </>
  );
}

// ── Schedule Tab ───────────────────────────────────────
function DoctorScheduleTab({ schedules, doctorName, onRefresh }: {
  schedules: Schedule[]; doctorName: string; onRefresh: () => void;
}) {
  const [modal, setModal] = useState<Schedule | null | "new">(null);
  const [form, setForm] = useState<Partial<Schedule>>({});
  const [saving, setSaving] = useState(false);

  function openNew() { setForm({ doctor: doctorName, day: "Monday", start_time: "8:00 AM", end_time: "5:00 PM", slot_duration: 30, is_available: true }); setModal("new"); }
  function openEdit(s: Schedule) { setForm({ ...s }); setModal(s); }

  async function save() {
    setSaving(true);
    if (modal === "new") await addSchedule(form as Omit<Schedule, "id">);
    else await updateSchedule((modal as Schedule).id, form);
    setSaving(false); setModal(null); onRefresh();
  }

  async function del(id: string) {
    if (!confirm("Delete this schedule?")) return;
    await deleteSchedule(id); onRefresh();
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={openNew}>+ Add Schedule</button>
      </div>
      <div className="tbl-wrap">
        <table>
          <thead><tr><th>Day</th><th>Start Time</th><th>End Time</th><th>Slot Duration</th><th>Available</th><th>Action</th></tr></thead>
          <tbody>
            {schedules.length ? schedules.map(s => (
              <tr key={s.id}>
                <td><b>{s.day}</b></td>
                <td>{s.start_time}</td>
                <td>{s.end_time}</td>
                <td>{s.slot_duration} mins</td>
                <td><span className={`st ${s.is_available ? "st-confirmed" : "st-cancelled"}`}>{s.is_available ? "Yes" : "No"}</span></td>
                <td style={{ display: "flex", gap: 6 }}>
                  <button className="btn-icon btn-edit" onClick={() => openEdit(s)}>✏</button>
                  <button className="btn-icon btn-del" onClick={() => del(s.id)}>🗑</button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={6} style={{ textAlign: "center", color: "#8190a5", padding: 24 }}>No schedule set yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title={modal === "new" ? "Add Schedule" : "Edit Schedule"} onClose={() => setModal(null)}
          footer={<><button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save"}</button></>}>
          <div className="form-group"><label>Day</label>
            <select value={form.day ?? "Monday"} onChange={e => setForm(p => ({ ...p, day: e.target.value }))}>
              {DAYS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group"><label>Start Time</label><input value={form.start_time ?? ""} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} placeholder="8:00 AM" /></div>
            <div className="form-group"><label>End Time</label><input value={form.end_time ?? ""} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} placeholder="5:00 PM" /></div>
            <div className="form-group"><label>Slot Duration (mins)</label><input type="number" value={form.slot_duration ?? 30} onChange={e => setForm(p => ({ ...p, slot_duration: Number(e.target.value) }))} /></div>
            <div className="form-group"><label>Available</label>
              <select value={form.is_available ? "yes" : "no"} onChange={e => setForm(p => ({ ...p, is_available: e.target.value === "yes" }))}>
                <option value="yes">Yes</option><option value="no">No</option>
              </select>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
