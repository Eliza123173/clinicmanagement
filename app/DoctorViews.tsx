"use client";
import { useState, useEffect } from "react";
import { Av, St, Loading, EmptyState, Pagination, PageHeader, Alert, Modal } from "./ui";
import {
  getAppointmentsByDoctor, getMedicalRecordsByDoctor, getSchedulesByDoctor,
  addSchedule, updateSchedule, deleteSchedule, updateAppointment,
  addMedicalRecord, sendNotification, addActivityLog,
  Appointment, MedicalRecord, Schedule,
} from "./supabase";

const PER = 5;

export function DoctorDashboard({ doctorName, doctorSpec, doctorInitials }: { doctorName: string; doctorSpec: string; doctorInitials: string }) {
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAppointmentsByDoctor(doctorName).then(r => { setAppts(r.data ?? []); setLoading(false); });
  }, [doctorName]);

  const todayISO = new Date().toISOString().slice(0, 10);
  const todayAppts = appts.filter(a => {
    const d = new Date(a.date);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return iso === todayISO && ["Pending", "Approved"].includes(a.status);
  });
  const upcoming = appts.filter(a => ["Pending", "Approved"].includes(a.status));

  if (loading) return <Loading />;

  return (
    <>
      <div className="welcome-bar">
        <div><h1>Welcome, {doctorName}! 👋</h1><p>{doctorSpec}</p></div>
        <Av x={doctorInitials} size="av-lg" />
      </div>
      <div className="stats-grid">
        {[["Today's Patients", todayAppts.length, "📅"], ["Upcoming", upcoming.length, "🗓"], ["Completed", appts.filter(a => a.status === "Completed").length, "✅"], ["Total", appts.length, "📋"]].map(([label, val, icon]) => (
          <div key={label as string} className="stat-card">
            <div className="stat-icon">{icon as string}</div>
            <p>{label as string}</p>
            <h2>{val as number}</h2>
          </div>
        ))}
      </div>
      <div className="panel">
        <div className="panel-header"><h2>Today&apos;s Appointments</h2></div>
        {todayAppts.length ? todayAppts.map(a => (
          <div key={a.id} className="upcoming-appt">
            <Av x={a.patient.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()} />
            <div className="info"><b>{a.patient}</b><p>{a.service} — {a.reason}</p></div>
            <div className="time">{a.time}</div>
            <St x={a.status} />
          </div>
        )) : <EmptyState msg="No appointments today." />}
      </div>
    </>
  );
}

export function DoctorAppointments({ doctorName, doctorEmail }: { doctorName: string; doctorEmail: string }) {
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [tab, setTab] = useState("Upcoming");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [noteForm, setNoteForm] = useState({ diagnosis: "", treatment: "", prescription: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = () => getAppointmentsByDoctor(doctorName).then(r => { setAppts(r.data ?? []); setLoading(false); });
  useEffect(() => { load(); }, [doctorName]);

  const tabMap: Record<string, string[]> = {
    Upcoming: ["Pending", "Approved"],
    Completed: ["Completed"],
    All: ["Pending", "Approved", "Completed", "Cancelled", "Rejected"],
  };
  const filtered = appts.filter(a => tabMap[tab].includes(a.status));
  const paged = filtered.slice(page * PER, page * PER + PER);

  async function complete(a: Appointment) {
    if (!noteForm.diagnosis) return setMsg("Please add a diagnosis before completing.");
    setSaving(true);
    await updateAppointment(a.id, { status: "Completed", notes: noteForm.notes });
    await addMedicalRecord({
      appointment_id: a.id, patient: a.patient, patient_email: a.patient_email,
      doctor: doctorName, date: a.date, diagnosis: noteForm.diagnosis,
      treatment: noteForm.treatment, prescription: noteForm.prescription, notes: noteForm.notes,
    });
    await sendNotification(a.patient_email, "Appointment Completed", `Your appointment with Dr. ${doctorName} on ${a.date} has been completed.`, "success");
    await addActivityLog({ actor_name: doctorName, actor_role: "Doctor", action: "Complete Appointment", details: `${a.date} — ${noteForm.diagnosis}`, target_name: a.patient });
    setSaving(false);
    setSelected(null);
    setNoteForm({ diagnosis: "", treatment: "", prescription: "", notes: "" });
    load();
  }

  return (
    <>
      <PageHeader title="My Appointments" sub="Manage your patient appointments" />
      <div className="tabs">
        {["Upcoming", "Completed", "All"].map(t => (
          <button key={t} className={`tab ${tab === t ? "tab-active" : ""}`} onClick={() => { setTab(t); setPage(0); }}>{t}</button>
        ))}
      </div>
      {loading ? <Loading /> : filtered.length ? (
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Patient</th><th>Service</th><th>Date</th><th>Time</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {paged.map(a => (
                <tr key={a.id}>
                  <td><b>{a.patient}</b></td>
                  <td>{a.service}</td>
                  <td>{a.date}</td>
                  <td>{a.time}</td>
                  <td style={{ color: "#8190a5" }}>{a.reason}</td>
                  <td><St x={a.status} /></td>
                  <td>
                    <button className="btn btn-outline btn-sm" onClick={() => { setSelected(a); setMsg(""); }}>
                      {["Approved", "Pending"].includes(a.status) ? "Add Notes" : "View"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="tbl-footer">
            <span>Showing {paged.length} of {filtered.length}</span>
            <Pagination total={filtered.length} page={page} setPage={setPage} />
          </div>
        </div>
      ) : <EmptyState msg="No appointments found." />}

      {selected && (
        <Modal title="Appointment Details" onClose={() => setSelected(null)} size="modal-lg"
          footer={<>
            <button className="btn btn-outline" onClick={() => setSelected(null)}>Close</button>
            {["Approved", "Pending"].includes(selected.status) && (
              <button className="btn btn-success" disabled={saving} onClick={() => complete(selected)}>
                {saving ? "Saving..." : "✓ Mark as Completed"}
              </button>
            )}
          </>}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[["Patient", selected.patient], ["Doctor", doctorName], ["Date", selected.date], ["Time", selected.time], ["Service", selected.service], ["Reason", selected.reason]].map(([k, v]) => (
              <div key={k}><p style={{ fontSize: 11, color: "#8190a5", fontWeight: 700, textTransform: "uppercase" }}>{k}</p><p style={{ fontSize: 13, marginTop: 3 }}>{v}</p></div>
            ))}
          </div>
          {["Approved", "Pending"].includes(selected.status) && (
            <>
              <hr style={{ border: "none", borderTop: "1px solid #f0f4f9", margin: "16px 0" }} />
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Consultation Notes</h3>
              <Alert type="error" msg={msg} />
              <div className="form-grid">
                {[["Diagnosis", "diagnosis"], ["Treatment", "treatment"], ["Prescription", "prescription"]].map(([label, key]) => (
                  <div className="form-group" key={key}>
                    <label>{label}</label>
                    <input value={(noteForm as Record<string, string>)[key]} onChange={e => setNoteForm(p => ({ ...p, [key]: e.target.value }))} />
                  </div>
                ))}
                <div className="form-group form-full">
                  <label>Notes</label>
                  <textarea value={noteForm.notes} onChange={e => setNoteForm(p => ({ ...p, notes: e.target.value }))} />
                </div>
              </div>
            </>
          )}
          {selected.status === "Completed" && selected.notes && (
            <div style={{ marginTop: 12, padding: "12px 14px", background: "#f8fbff", borderRadius: 6, fontSize: 13 }}>
              <b>Notes:</b> {selected.notes}
            </div>
          )}
        </Modal>
      )}
    </>
  );
}

export function DoctorSchedule({ doctorName }: { doctorName: string }) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Schedule | "new" | null>(null);
  const [form, setForm] = useState<Partial<Schedule>>({});
  const [saving, setSaving] = useState(false);
  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const load = () => getSchedulesByDoctor(doctorName).then(r => { setSchedules(r.data ?? []); setLoading(false); });
  useEffect(() => { load(); }, [doctorName]);

  async function save() {
    setSaving(true);
    if (modal === "new") await addSchedule({ ...form, doctor: doctorName, is_available: form.is_available ?? true, slot_duration: form.slot_duration || 30 } as Omit<Schedule, "id">);
    else await updateSchedule((modal as Schedule).id, form);
    setSaving(false); setModal(null); load();
  }

  return (
    <>
      <PageHeader title="My Schedule" sub="Manage your availability"
        action={<button className="btn btn-primary" onClick={() => { setForm({ day: "Monday", start_time: "8:00 AM", end_time: "5:00 PM", slot_duration: 30, is_available: true }); setModal("new"); }}>+ Add Schedule</button>} />
      {loading ? <Loading /> : schedules.length ? (
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Day</th><th>Start Time</th><th>End Time</th><th>Slot Duration</th><th>Available</th><th>Action</th></tr></thead>
            <tbody>
              {schedules.map(s => (
                <tr key={s.id}>
                  <td><b>{s.day}</b></td>
                  <td>{s.start_time}</td>
                  <td>{s.end_time}</td>
                  <td>{s.slot_duration} mins</td>
                  <td><span className={`st ${s.is_available ? "st-confirmed" : "st-cancelled"}`}>{s.is_available ? "Yes" : "No"}</span></td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <button className="btn-icon btn-edit" onClick={() => { setForm({ ...s }); setModal(s); }}>✏</button>
                    <button className="btn-icon btn-del" onClick={async () => { if (confirm("Delete?")) { await deleteSchedule(s.id); load(); } }}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <EmptyState msg="No schedule set yet." />}

      {modal && (
        <Modal title={modal === "new" ? "Add Schedule" : "Edit Schedule"} onClose={() => setModal(null)}
          footer={<><button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save"}</button></>}>
          <div className="form-group"><label>Day</label>
            <select value={form.day ?? "Monday"} onChange={e => setForm(p => ({ ...p, day: e.target.value }))}>
              {DAYS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-grid">
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

export function DoctorRecords({ doctorName }: { doctorName: string }) {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getMedicalRecordsByDoctor(doctorName).then(r => { setRecords(r.data ?? []); setLoading(false); }); }, [doctorName]);
  return (
    <>
      <PageHeader title="Patient Records" sub="Consultation records you have created" />
      {loading ? <Loading /> : records.length ? records.map(r => (
        <div key={r.id} className="panel" style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <div><b style={{ fontSize: 14 }}>{r.patient}</b><p style={{ color: "#8190a5", fontSize: 12, marginTop: 2 }}>{r.date}</p></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            {[["Diagnosis", r.diagnosis], ["Treatment", r.treatment], ["Prescription", r.prescription]].map(([label, val]) => (
              <div key={label as string}>
                <p style={{ fontSize: 11, color: "#8190a5", fontWeight: 700, textTransform: "uppercase" }}>{label as string}</p>
                <p style={{ fontSize: 13, marginTop: 4 }}>{(val as string) || "—"}</p>
              </div>
            ))}
          </div>
          {r.notes && <div style={{ marginTop: 10, padding: "8px 12px", background: "#f8fbff", borderRadius: 6, fontSize: 13 }}><b>Notes:</b> {r.notes}</div>}
        </div>
      )) : <EmptyState msg="No records found." />}
    </>
  );
}
