"use client";
import { useState, useEffect } from "react";
import { Av, St, Loading, EmptyState, Pagination, PageHeader, Alert, Modal } from "./ui";
import {
  getAppointmentsByPatient, getMedicalRecordsByPatient,
  updateAppointment, getPatientByEmail, updatePatient,
  sendNotification, logActivity, Appointment, MedicalRecord, Patient,
} from "./supabase";

const PER = 5;

export function MyAppointments({ patientName, email }: { patientName: string; email: string }) {
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [tab, setTab] = useState("Upcoming");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState("");
  const [selected, setSelected] = useState<Appointment | null>(null);

  const load = () => getAppointmentsByPatient(email).then(r => { setAppts(r.data ?? []); setLoading(false); });
  useEffect(() => { load(); }, [email]);

  const tabMap: Record<string, string[]> = {
    Upcoming: ["Pending", "Approved"],
    History: ["Completed", "Cancelled", "Rejected"],
    All: ["Pending", "Approved", "Completed", "Cancelled", "Rejected"],
  };
  const filtered = appts.filter(a => tabMap[tab].includes(a.status));
  const paged = filtered.slice(page * PER, page * PER + PER);

  async function cancel(a: Appointment) {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    setCancelling(a.id);
    await updateAppointment(a.id, { status: "Cancelled", cancelled_by: "Patient" });
    await sendNotification("admin@carewell.com", "Appointment Cancelled",
      `${patientName} cancelled their appointment with ${a.doctor} on ${a.date}.`, "warning");
    await logActivity("Cancel Appointment", patientName, "Patient", `${a.date} ${a.time} with ${a.doctor}`, a.doctor);
    setCancelling("");
    load();
  }

  return (
    <>
      <PageHeader title="My Appointments" sub="View and manage your appointments" />
      <div className="tabs">
        {["Upcoming", "History", "All"].map(t => (
          <button key={t} className={`tab ${tab === t ? "tab-active" : ""}`} onClick={() => { setTab(t); setPage(0); }}>{t}</button>
        ))}
      </div>
      {loading ? <Loading /> : filtered.length ? (
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Doctor</th><th>Service</th><th>Date</th><th>Time</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {paged.map(a => (
                <tr key={a.id}>
                  <td><b>{a.doctor}</b></td>
                  <td>{a.service}</td>
                  <td>{a.date}</td>
                  <td>{a.time}</td>
                  <td style={{ color: "#8190a5" }}>{a.reason}</td>
                  <td><St x={a.status} /></td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setSelected(a)}>View</button>
                    {["Pending", "Approved"].includes(a.status) && (
                      <button className="btn btn-danger btn-sm" disabled={cancelling === a.id} onClick={() => cancel(a)}>
                        {cancelling === a.id ? "..." : "Cancel"}
                      </button>
                    )}
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
      ) : <EmptyState msg={tab === "Upcoming" ? "No upcoming appointments. Book one now!" : "No appointment history found."} />}

      {selected && (
        <Modal title="Appointment Details" onClose={() => setSelected(null)}
          footer={<button className="btn btn-primary" onClick={() => setSelected(null)}>Close</button>}>
          {[
            ["Doctor", selected.doctor],
            ["Service", selected.service],
            ["Date", selected.date],
            ["Time", selected.time],
            ["Reason", selected.reason],
            ["Status", selected.status],
            ["Notes", selected.notes || "—"],
          ].map(([label, val]) => (
            <div key={label} style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#8190a5", textTransform: "uppercase", marginBottom: 4 }}>{label}</p>
              {label === "Status"
                ? <St x={val as string} />
                : <p style={{ fontSize: 13, background: "#f8fbfe", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5edf6" }}>{val}</p>
              }
            </div>
          ))}
        </Modal>
      )}
    </>
  );
}

export function PatientMedicalRecords({ email }: { email: string }) {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MedicalRecord | null>(null);

  useEffect(() => {
    getMedicalRecordsByPatient(email).then(r => { setRecords(r.data ?? []); setLoading(false); });
  }, [email]);

  return (
    <>
      <PageHeader title="Medical Records" sub="Your consultation history" />
      {loading ? <Loading /> : records.length ? (
        <>
          {records.map(r => (
            <div key={r.id} className="panel" style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <b style={{ fontSize: 14 }}>{r.date}</b>
                  <p style={{ color: "#8190a5", fontSize: 12, marginTop: 2 }}>Dr. {r.doctor}</p>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => setSelected(r)}>View Details</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                {[["Diagnosis", r.diagnosis], ["Treatment", r.treatment], ["Prescription", r.prescription]].map(([label, val]) => (
                  <div key={label as string}>
                    <p style={{ fontSize: 11, color: "#8190a5", fontWeight: 700, textTransform: "uppercase" }}>{label as string}</p>
                    <p style={{ fontSize: 13, marginTop: 4 }}>{(val as string) || "—"}</p>
                  </div>
                ))}
              </div>
              {r.notes && (
                <div style={{ marginTop: 12, padding: "10px 14px", background: "#f8fbff", borderRadius: 6, fontSize: 13, color: "#5a6a80" }}>
                  <b>Notes:</b> {r.notes}
                </div>
              )}
            </div>
          ))}
        </>
      ) : <EmptyState msg="No medical records found." />}

      {selected && (
        <Modal title="Medical Record Details" onClose={() => setSelected(null)}
          footer={<button className="btn btn-primary" onClick={() => setSelected(null)}>Close</button>}>
          {[["Doctor", selected.doctor], ["Date", selected.date], ["Diagnosis", selected.diagnosis], ["Treatment", selected.treatment || "—"], ["Prescription", selected.prescription || "—"], ["Notes", selected.notes || "—"]].map(([label, val]) => (
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

export function PatientProfile({ email }: { email: string }) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [form, setForm] = useState<Partial<Patient>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    getPatientByEmail(email).then(r => {
      if (r.data) { setPatient(r.data); setForm(r.data); }
      else setForm({ name: "", email, contact: "", dob: "", gender: "", blood: "", address: "" });
    });
  }, [email]);

  async function save() {
    if (!form.name?.trim()) return setErr("Full name is required.");
    if (!form.contact?.trim()) return setErr("Contact number is required.");
    setSaving(true); setErr("");
    if (patient) await updatePatient(patient.id, form);
    setSaving(false);
    setMsg("Profile updated successfully!");
    setTimeout(() => setMsg(""), 3000);
  }

  const initials = (form.name || "U").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <>
      <PageHeader title="My Profile" sub="Manage your personal information" />
      <div className="profile-wrap">
        <div className="profile-header">
          <Av x={initials} size="av-xl" />
          <div>
            <b style={{ fontSize: 17, fontWeight: 700 }}>{form.name || "Patient"}</b>
            <p style={{ color: "#8190a5", marginTop: 4 }}>Patient</p>
            <p style={{ color: "#8190a5", fontSize: 12 }}>{email}</p>
          </div>
        </div>
        <Alert type="error" msg={err} />
        <Alert type="success" msg={msg} />
        <div className="form-grid">
          {[
            ["Full Name", "name", "text"],
            ["Email Address", "email", "email"],
            ["Date of Birth", "dob", "date"],
            ["Contact Number", "contact", "text"],
            ["Blood Type", "blood", "text"],
            ["Address", "address", "text"],
          ].map(([label, key, type]) => (
            <div className="form-group" key={key} style={key === "address" ? { gridColumn: "1/-1" } : {}}>
              <label>{label}</label>
              <input type={type} value={(form as Record<string, string>)[key] ?? ""} disabled={key === "email"}
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
            </div>
          ))}
          <div className="form-group">
            <label>Gender</label>
            <select value={form.gender ?? ""} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}>
              <option value="">Select gender</option>
              <option>Female</option><option>Male</option><option>Other</option>
            </select>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
          <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save Changes"}</button>
        </div>
      </div>
    </>
  );
}
