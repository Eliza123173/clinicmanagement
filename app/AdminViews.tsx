"use client";
import { useState, useEffect } from "react";
import { Loading, Pagination, Modal, Alert } from "./ui";
import {
  getSchedules, addSchedule, updateSchedule, deleteSchedule, Schedule,
  getMedicalRecords, addMedicalRecord, updateMedicalRecord, deleteMedicalRecord, MedicalRecord,
  getAppointments, Appointment,
} from "./supabase";

const PER = 5;
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// ── Schedule Management ────────────────────────────────
export function ScheduleManagement() {
  const [list, setList] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Schedule | null | "new">(null);
  const [form, setForm] = useState<Partial<Schedule>>({});
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);

  const load = () => getSchedules().then(r => { setList(r.data ?? []); setLoading(false); });
  useEffect(() => { load(); }, []);

  const paged = list.slice(page * PER, page * PER + PER);

  function openNew() { setForm({ doctor: "", day: "Monday", start_time: "8:00 AM", end_time: "5:00 PM", slot_duration: 30, is_available: true }); setModal("new"); }
  function openEdit(s: Schedule) { setForm({ ...s }); setModal(s); }

  async function save() {
    setSaving(true);
    if (modal === "new") await addSchedule(form as Omit<Schedule, "id">);
    else await updateSchedule((modal as Schedule).id, form);
    setSaving(false); setModal(null); load();
  }

  async function del(id: string) {
    if (!confirm("Delete this schedule?")) return;
    await deleteSchedule(id); load();
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <div><h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Doctor Schedules</h1><p style={{ color: "#8190a5" }}>Manage doctor availability</p></div>
        <button className="btn btn-primary" onClick={openNew}>+ Add New Schedule</button>
      </div>
      {loading ? <Loading /> : (
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Doctor</th><th>Day</th><th>Start Time</th><th>End Time</th><th>Slot</th><th>Available</th><th>Action</th></tr></thead>
            <tbody>
              {paged.map(s => (
                <tr key={s.id}>
                  <td><b>{s.doctor}</b></td>
                  <td>{s.day}</td>
                  <td>{s.start_time}</td>
                  <td>{s.end_time}</td>
                  <td>{s.slot_duration} mins</td>
                  <td><span className={`st ${s.is_available ? "st-confirmed" : "st-cancelled"}`}>{s.is_available ? "Yes" : "No"}</span></td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <button className="btn-icon btn-edit" onClick={() => openEdit(s)}>✏</button>
                    <button className="btn-icon btn-del" onClick={() => del(s.id)}>🗑</button>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", color: "#8190a5", padding: 24 }}>No schedules found.</td></tr>}
            </tbody>
          </table>
          <div className="tbl-footer">
            <span>Showing {paged.length} of {list.length} entries</span>
            <Pagination total={list.length} page={page} setPage={setPage} />
          </div>
        </div>
      )}
      {modal && (
        <Modal title={modal === "new" ? "Add New Schedule" : "Edit Schedule"} onClose={() => setModal(null)}
          footer={<><button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save"}</button></>}>
          <div className="form-group"><label>Doctor Name</label><input value={form.doctor ?? ""} onChange={e => setForm(p => ({ ...p, doctor: e.target.value }))} /></div>
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

// ── Medical Records Management ─────────────────────────
export function MedicalRecordsManagement() {
  const [list, setList] = useState<MedicalRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<MedicalRecord | null | "new">(null);
  const [form, setForm] = useState<Partial<MedicalRecord>>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [page, setPage] = useState(0);

  const load = () => getMedicalRecords().then(r => { setList(r.data ?? []); setLoading(false); });
  useEffect(() => { load(); }, []);

  const filtered = list.filter(r => r.patient.toLowerCase().includes(search.toLowerCase()) || r.doctor.toLowerCase().includes(search.toLowerCase()));
  const paged = filtered.slice(page * PER, page * PER + PER);

  function openNew() { setForm({ patient: "", patient_email: "", doctor: "", date: "", diagnosis: "", treatment: "", prescription: "", notes: "", appointment_id: "" }); setErr(""); setModal("new"); }
  function openEdit(r: MedicalRecord) { setForm({ ...r }); setErr(""); setModal(r); }

  async function save() {
    if (!form.patient || !form.doctor) return setErr("Patient and doctor are required.");
    setSaving(true); setErr("");
    if (modal === "new") await addMedicalRecord(form as Omit<MedicalRecord, "id" | "created_at">);
    else await updateMedicalRecord((modal as MedicalRecord).id, form);
    setSaving(false); setModal(null); load();
  }

  async function del(id: string) {
    if (!confirm("Delete this record?")) return;
    await deleteMedicalRecord(id); load();
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <div><h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Medical Records</h1><p style={{ color: "#8190a5" }}>Manage patient medical records</p></div>
        <button className="btn btn-primary" onClick={openNew}>+ Add New Record</button>
      </div>
      <div className="filters"><input placeholder="Search patient or doctor..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} /></div>
      {loading ? <Loading /> : (
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Patient</th><th>Doctor</th><th>Date</th><th>Diagnosis</th><th>Treatment</th><th>Action</th></tr></thead>
            <tbody>
              {paged.map(r => (
                <tr key={r.id}>
                  <td><b>{r.patient}</b></td>
                  <td>{r.doctor}</td>
                  <td>{r.date}</td>
                  <td>{r.diagnosis}</td>
                  <td>{r.treatment || "—"}</td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <button className="btn-icon btn-edit" onClick={() => openEdit(r)}>✏</button>
                    <button className="btn-icon btn-del" onClick={() => del(r.id)}>🗑</button>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", color: "#8190a5", padding: 24 }}>No records found.</td></tr>}
            </tbody>
          </table>
          <div className="tbl-footer">
            <span>Showing {paged.length} of {filtered.length} entries</span>
            <Pagination total={filtered.length} page={page} setPage={setPage} />
          </div>
        </div>
      )}
      {modal && (
        <Modal title={modal === "new" ? "Add New Record" : "Edit Record"} onClose={() => setModal(null)}
          footer={<><button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save"}</button></>}>
          <Alert type="error" msg={err} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            {[["Patient Name", "patient", "text"], ["Patient Email", "patient_email", "email"], ["Doctor Name", "doctor", "text"], ["Date", "date", "date"], ["Diagnosis", "diagnosis", "text"], ["Treatment", "treatment", "text"], ["Prescription", "prescription", "text"]].map(([label, key, type]) => (
              <div className="form-group" key={key}>
                <label>{label}</label>
                <input type={type} value={(form as Record<string, string>)[key] ?? ""} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
              </div>
            ))}
          </div>
          <div className="form-group"><label>Notes</label><textarea value={form.notes ?? ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
        </Modal>
      )}
    </>
  );
}

// ── Reports ────────────────────────────────────────────
export function Reports() {
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getAppointments().then(r => { setAppts(r.data ?? []); setLoading(false); }); }, []);

  const total = appts.length;
  const completed = appts.filter(a => a.status === "Completed").length;
  const cancelled = appts.filter(a => a.status === "Cancelled").length;
  const pending = appts.filter(a => a.status === "Pending").length;
  const approved = appts.filter(a => a.status === "Approved").length;

  const dateCounts: Record<string, number> = {};
  appts.forEach(a => { dateCounts[a.date] = (dateCounts[a.date] ?? 0) + 1; });
  const barData = Object.entries(dateCounts).slice(-7).map(([label, val]) => ({ label, val }));
  const maxBar = Math.max(...barData.map(b => b.val), 1);

  if (loading) return <Loading />;

  return (
    <>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Reports</h1>
        <p style={{ color: "#8190a5" }}>As of {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
      </div>
      <div className="stats-grid">
        {[["Total Appointments", total], ["Completed", completed], ["Cancelled", cancelled], ["Pending", pending]].map(([label, val]) => (
          <div key={label as string} className="stat-card"><p>{label as string}</p><h2>{val as number}</h2><span style={{ fontSize: 11, color: "#8190a5" }}>All time</span></div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
        <div className="panel">
          <div className="panel-header"><h2>Appointments by Date</h2></div>
          {barData.length ? (
            <div className="chart-bars">
              {barData.map(b => (
                <div key={b.label} className="bar-col">
                  <div className="bar-fill" style={{ height: `${(b.val / maxBar) * 120}px` }} />
                  <div className="bar-label">{b.label.split(",")[0]}</div>
                </div>
              ))}
            </div>
          ) : <p style={{ color: "#8190a5", fontSize: 13 }}>No appointment data yet.</p>}
        </div>
        <div className="panel">
          <div className="panel-header"><h2>Appointments by Status</h2></div>
          <div className="donut-wrap">
            <div className="donut" />
            <div>
              {([["#148449", "Completed", completed], ["#0867d3", "Approved", approved], ["#d93025", "Cancelled", cancelled], ["#b46e00", "Pending", pending]] as [string, string, number][]).map(([color, label, val]) => (
                <div key={label} className="legend-item">
                  <div className="legend-dot" style={{ background: color }} />
                  <span>{label} — {val} ({total ? Math.round(val / total * 100) : 0}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Admin Settings ─────────────────────────────────────
export function AdminSettings() {
  const [tab, setTab] = useState("Profile");
  const [form, setForm] = useState({ name: "Administrator", email: "admin@carewell.com", contact: "0912 000 1111", clinic: "CareWell Clinic", address: "123 Health St, Cebu City", phone: "032-123-4567" });
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [msg, setMsg] = useState("");

  async function save() {
    if (tab === "Change Password") {
      if (!pwForm.current) return setMsg("❌ Enter your current password.");
      if (pwForm.next.length < 8) return setMsg("❌ New password must be at least 8 characters.");
      if (pwForm.next !== pwForm.confirm) return setMsg("❌ Passwords do not match.");
      const { supabase } = await import("./supabase");
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: "admin@carewell.com", password: pwForm.current });
      if (signInErr) return setMsg("❌ Current password is incorrect.");
      const { error } = await supabase.auth.updateUser({ password: pwForm.next });
      if (error) return setMsg("❌ " + error.message);
      setPwForm({ current: "", next: "", confirm: "" });
    }
    setMsg("✅ Changes saved successfully!");
    setTimeout(() => setMsg(""), 3000);
  }

  return (
    <>
      <div style={{ marginBottom: 22 }}><h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Settings</h1><p style={{ color: "#8190a5" }}>Manage your account and clinic settings</p></div>
      <div className="settings-tabs">
        {["Profile", "Clinic Information", "Change Password", "Notifications"].map(t => (
          <button key={t} className={`settings-tab ${tab === t ? "settings-tab-active" : ""}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {msg && <div style={{ background: msg.startsWith("❌") ? "#fff0f0" : "#e2f6e9", border: `1px solid ${msg.startsWith("❌") ? "#fcc" : "#a8e6c0"}`, borderRadius: 6, padding: "10px 14px", fontSize: 13, color: msg.startsWith("❌") ? "#c0392b" : "#148449", marginBottom: 16 }}>{msg}</div>}
      {tab === "Profile" && (
        <div className="panel">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>Admin Profile</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[["Full Name", "name"], ["Email Address", "email"], ["Contact Number", "contact"]].map(([label, key]) => (
              <div className="form-group" key={key}><label>{label}</label><input value={(form as Record<string, string>)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} /></div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <button className="btn btn-primary" onClick={save}>Save Changes</button>
          </div>
        </div>
      )}
      {tab === "Clinic Information" && (
        <div className="panel">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>Clinic Information</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[["Clinic Name", "clinic"], ["Address", "address"], ["Phone", "phone"]].map(([label, key]) => (
              <div className="form-group" key={key}><label>{label}</label><input value={(form as Record<string, string>)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} /></div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <button className="btn btn-primary" onClick={save}>Save Changes</button>
          </div>
        </div>
      )}
      {tab === "Change Password" && (
        <div className="panel">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>Change Password</h3>
          {[["Current Password", "current"], ["New Password", "next"], ["Confirm New Password", "confirm"]].map(([label, key]) => (
            <div className="form-group" key={key}><label>{label}</label><input type="password" value={(pwForm as Record<string, string>)[key]} onChange={e => setPwForm(p => ({ ...p, [key]: e.target.value }))} /></div>
          ))}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <button className="btn btn-primary" onClick={save}>Update Password</button>
          </div>
        </div>
      )}
      {tab === "Notifications" && (
        <div className="panel">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>Notification Preferences</h3>
          {["New appointment requests", "Appointment status changes", "New patient registrations", "Daily summary report"].map(item => (
            <div key={item} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #f0f4f9" }}>
              <span style={{ fontSize: 13 }}>{item}</span>
              <input type="checkbox" defaultChecked style={{ width: 16, height: 16 }} />
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <button className="btn btn-primary" onClick={save}>Save Preferences</button>
          </div>
        </div>
      )}
    </>
  );
}
