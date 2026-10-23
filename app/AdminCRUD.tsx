"use client";
import { useState, useEffect } from "react";
import { St, Loading, Pagination, Modal, Alert } from "./ui";
import {
  getPatients, addPatient, updatePatient, deletePatient, Patient,
  getAllDoctors, addDoctor, updateDoctor, deleteDoctor, Doctor,
  getAppointments, updateAppointment, deleteAppointment, Appointment,
  getAllServices, addService, updateService, deleteService, Service,
  sendNotification, logActivity, addMedicalRecord, addSchedule, getSchedules, Schedule,
} from "./supabase";

const PER = 5;
const DOCTOR_WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// ── Patient Management ─────────────────────────────────
export function PatientManagement() {
  const [list, setList] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Patient | null | "new">(null);
  const [form, setForm] = useState<Partial<Patient>>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const load = () => getPatients().then(r => { setList(r.data ?? []); setLoading(false); });
  useEffect(() => { load(); }, []);

  const filtered = list.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  );
  const paged = filtered.slice(page * PER, page * PER + PER);

  function openNew() { setForm({ name: "", email: "", contact: "", dob: "", gender: "Female", blood: "", address: "" }); setErr(""); setModal("new"); }
  function openEdit(p: Patient) { setForm({ ...p }); setErr(""); setModal(p); }

  async function save() {
    if (!form.name?.trim()) return setErr("Full name is required.");
    if (!form.email?.trim()) return setErr("Email is required.");
    setSaving(true); setErr("");
    if (modal === "new") await addPatient(form as Omit<Patient, "id">);
    else await updatePatient((modal as Patient).id, form);
    setSaving(false); setModal(null); load();
  }

  async function del(id: string) {
    if (!confirm("Delete this patient? This cannot be undone.")) return;
    await deletePatient(id); load();
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <div><h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4, color: "#12304A" }}>Patients</h1><p style={{ color: "#475569" }}>Manage patient records</p></div>
        <button className="btn btn-primary" onClick={openNew}>+ Add New Patient</button>
      </div>
      <div className="filters">
        <input placeholder="Search patients..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
      </div>
      {loading ? <Loading /> : (
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Contact</th><th>Gender</th><th>Blood</th><th>Action</th></tr></thead>
            <tbody>
              {paged.map(p => (
                <tr key={p.id}>
                  <td><b>{p.name}</b></td>
                  <td>{p.email}</td>
                  <td>{p.contact}</td>
                  <td>{p.gender}</td>
                  <td>{p.blood || "—"}</td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <button className="btn-icon btn-edit" onClick={() => openEdit(p)}>✏</button>
                    <button className="btn-icon btn-del" onClick={() => del(p.id)}>🗑</button>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", color: "#475569", padding: 24 }}>No patients found.</td></tr>}
            </tbody>
          </table>
          <div className="tbl-footer">
            <span>Showing {paged.length} of {filtered.length} entries</span>
            <Pagination total={filtered.length} page={page} setPage={setPage} />
          </div>
        </div>
      )}
      {modal && (
        <Modal title={modal === "new" ? "Add New Patient" : "Edit Patient"} onClose={() => setModal(null)}
          footer={<><button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save"}</button></>}>
          <Alert type="error" msg={err} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            {[["Full Name", "name", "text"], ["Email", "email", "email"], ["Contact", "contact", "text"], ["Date of Birth", "dob", "date"], ["Blood Type", "blood", "text"], ["Address", "address", "text"]].map(([label, key, type]) => (
              <div className="form-group" key={key}>
                <label>{label}</label>
                <input type={type} value={(form as Record<string, string>)[key] ?? ""} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
              </div>
            ))}
            <div className="form-group"><label>Gender</label>
              <select value={form.gender ?? ""} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}>
                <option>Female</option><option>Male</option><option>Other</option>
              </select>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

// ── Doctor Management ──────────────────────────────────
export function DoctorManagement({ onManageSchedules }: { onManageSchedules?: () => void } = {}) {
  const [list, setList] = useState<Doctor[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Doctor | null | "new">(null);
  const [form, setForm] = useState<Partial<Doctor> & { password?: string }>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [scheduleStart, setScheduleStart] = useState("8:00 AM");
  const [scheduleEnd, setScheduleEnd] = useState("5:00 PM");
  const [scheduleDuration, setScheduleDuration] = useState(30);

  const load = () => Promise.all([getAllDoctors(), getSchedules()]).then(([doctorResult, scheduleResult]) => {
    setList(doctorResult.data ?? []);
    setSchedules(scheduleResult.data ?? []);
    setLoading(false);
  });
  useEffect(() => { load(); }, []);

  const filtered = list.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.spec.toLowerCase().includes(search.toLowerCase())
  );
  const paged = filtered.slice(page * PER, page * PER + PER);

  function openNew() {
    setForm({ name: "", spec: "", email: "", password: "", avail: "Available Today", rating: 4.5, reviews: 0, years: 1, patients: 0, initials: "", is_active: true });
    setAvailableDays([]); setScheduleStart("8:00 AM"); setScheduleEnd("5:00 PM"); setScheduleDuration(30);
    setErr(""); setModal("new");
  }
  function openEdit(d: Doctor) { setForm({ ...d, password: "" }); setErr(""); setModal(d); }

  async function save() {
    if (!form.name?.trim()) return setErr("Name is required.");
    if (!form.spec?.trim()) return setErr("Specialization is required.");
    if (modal === "new" && availableDays.length === 0) return setErr("Select at least one weekly available day.");
    if (modal === "new" && (!scheduleStart.trim() || !scheduleEnd.trim() || scheduleDuration < 1)) return setErr("Enter valid schedule hours and slot duration.");
    setSaving(true); setErr("");
    const initials = form.initials?.trim() || form.name!.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
    if (modal === "new") {
      if (form.email && form.password) {
        const res = await fetch("/api/create-doctor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email, password: form.password }),
        });
        const result = await res.json();
        if (result.error) { setSaving(false); setErr("Account error: " + result.error); return; }
      }
      const { password: _, ...docData } = form;
      const { data: createdDoctor, error: createError } = await addDoctor({ ...docData, initials } as Omit<Doctor, "id">);
      if (createError || !createdDoctor) {
        setSaving(false);
        setErr("Could not save doctor: " + (createError?.message ?? "No doctor record was returned."));
        return;
      }
      const scheduleResults = await Promise.all(availableDays.map(day => addSchedule({
        doctor: createdDoctor.name,
        day,
        start_time: scheduleStart.trim(),
        end_time: scheduleEnd.trim(),
        slot_duration: scheduleDuration,
        is_available: true,
      })));
      await logActivity("Add Doctor", "Administrator", "Admin", `Added Dr. ${form.name}`, form.name);
      if (scheduleResults.some(result => result.error)) {
        setModal(createdDoctor);
        setSaving(false);
        setErr("Doctor was added, but one or more schedules could not be saved. Open Schedules to finish setting availability.");
        load();
        return;
      }
    } else {
      const { password: _, ...docData } = form;
      await updateDoctor((modal as Doctor).id, { ...docData, initials });
      await logActivity("Update Doctor", "Administrator", "Admin", `Updated Dr. ${form.name}`, form.name);
    }
    setSaving(false); setModal(null); load();
  }

  async function toggleActive(d: Doctor) {
    await updateDoctor(d.id, { is_active: !d.is_active });
    await logActivity(d.is_active ? "Deactivate Doctor" : "Activate Doctor", "Administrator", "Admin", `Dr. ${d.name}`, d.name);
    load();
  }

  async function del(d: Doctor) {
    if (!confirm("Deactivate this doctor?")) return;
    await deleteDoctor(d.id);
    await logActivity("Deactivate Doctor", "Administrator", "Admin", `Dr. ${d.name}`, d.name);
    load();
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <div><h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4, color: "#12304A" }}>Doctors</h1><p style={{ color: "#475569" }}>Manage doctor records</p></div>
        <button className="btn btn-primary" onClick={openNew}>+ Add New Doctor</button>
      </div>
      <div className="filters">
        <input placeholder="Search doctors..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
      </div>
      {loading ? <Loading /> : (
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Name</th><th>Specialization</th><th>Email</th><th>Weekly Availability</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {paged.map(d => (
                <tr key={d.id}>
                  <td><b>{d.name}</b></td>
                  <td>{d.spec}</td>
                  <td>{d.email}</td>
                  <td>
                    {schedules.filter(s => s.doctor.trim().replace(/^dr\.?\s*/i, "").toLowerCase() === d.name.trim().replace(/^dr\.?\s*/i, "").toLowerCase() && s.is_available).length
                      ? schedules.filter(s => s.doctor.trim().replace(/^dr\.?\s*/i, "").toLowerCase() === d.name.trim().replace(/^dr\.?\s*/i, "").toLowerCase() && s.is_available).map(s => `${s.day} ${s.start_time}–${s.end_time}`).join(", ")
                      : <span style={{ color: "#b45309" }}>No availability set</span>}
                  </td>
                  <td>
                    <button className={d.is_active ? "btn btn-success btn-sm" : "btn btn-outline btn-sm"} onClick={() => toggleActive(d)}>
                      {d.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <button className="btn btn-outline btn-sm" onClick={onManageSchedules}>Manage availability</button>
                    <button className="btn-icon btn-edit" onClick={() => openEdit(d)}>✏</button>
                    <button className="btn-icon btn-del" onClick={() => del(d)}>🗑</button>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", color: "#475569", padding: 24 }}>No doctors found.</td></tr>}
            </tbody>
          </table>
          <div className="tbl-footer">
            <span>Showing {paged.length} of {filtered.length} entries</span>
            <Pagination total={filtered.length} page={page} setPage={setPage} />
          </div>
        </div>
      )}
      {modal && (
        <Modal title={modal === "new" ? "Add New Doctor" : "Edit Doctor"} onClose={() => setModal(null)}
          footer={<><button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save"}</button></>}>
          <Alert type="error" msg={err} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            {[["Full Name", "name", "text"], ["Specialization", "spec", "text"], ["Initials (2 letters)", "initials", "text"], ["Years Experience", "years", "number"], ["Total Patients", "patients", "number"]].map(([label, key, type]) => (
              <div className="form-group" key={key}>
                <label>{label}</label>
                <input type={type} value={(form[key as keyof Doctor] as string | number) ?? ""} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
              </div>
            ))}
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" value={form.email ?? ""} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="doctor@carewell.com" />
            </div>
            {modal === "new" && (
              <div className="form-group">
                <label>Login Password</label>
                <input type="password" value={form.password ?? ""} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Set login password" />
              </div>
            )}
          </div>
          {modal === "new" && (
            <div style={{ marginTop: 14, padding: 14, border: "1px solid #DCEEF2", borderRadius: 8, background: "#F7FCFD" }}>
              <b style={{ display: "block", marginBottom: 4, color: "#12304A", fontSize: 13 }}>Weekly Availability *</b>
              <p style={{ color: "#475569", fontSize: 12, marginBottom: 10 }}>Choose the weekdays and hours patients can book. This schedule repeats each week.</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 14px", marginBottom: 12 }}>
                {DOCTOR_WEEKDAYS.map(day => (
                  <label key={day} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#12304A" }}>
                    <input type="checkbox" checked={availableDays.includes(day)} onChange={e => setAvailableDays(days => e.target.checked ? [...days, day] : days.filter(d => d !== day))} />
                    {day}
                  </label>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div className="form-group"><label>Start Time</label><input value={scheduleStart} onChange={e => setScheduleStart(e.target.value)} placeholder="8:00 AM" /></div>
                <div className="form-group"><label>End Time</label><input value={scheduleEnd} onChange={e => setScheduleEnd(e.target.value)} placeholder="5:00 PM" /></div>
                <div className="form-group"><label>Slot (minutes)</label><input type="number" min={1} value={scheduleDuration} onChange={e => setScheduleDuration(Number(e.target.value))} /></div>
              </div>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}

// ── Appointment Management ─────────────────────────────
export function AppointmentManagement({ focusAppointmentId }: { focusAppointmentId?: string | null } = {}) {
  const [list, setList] = useState<Appointment[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [recordForm, setRecordForm] = useState({ diagnosis: "", treatment: "", prescription: "", notes: "" });
  const [savingRecord, setSavingRecord] = useState(false);
  const [recordError, setRecordError] = useState("");

  const load = () => getAppointments().then(r => {
    const appointments = r.data ?? [];
    setList(appointments);
    if (focusAppointmentId) {
      setSelected(appointments.find(a => a.id === focusAppointmentId) ?? null);
    }
    setLoading(false);
  });
  useEffect(() => { load(); }, [focusAppointmentId]);

  const filtered = list.filter(a => {
    const q = search.toLowerCase();
    return (a.patient.toLowerCase().includes(q) || a.doctor.toLowerCase().includes(q)) &&
      (statusFilter === "All Status" || a.status === statusFilter);
  });
  const paged = filtered.slice(page * PER, page * PER + PER);

  async function changeStatus(a: Appointment, status: string) {
    await updateAppointment(a.id, { status });
    if (status === "Approved") {
      await sendNotification(a.patient_email, "Appointment Approved", `Your appointment with ${a.doctor} on ${a.date} at ${a.time} has been approved.`, "success");
      await logActivity("Approve Appointment", "Administrator", "Admin", `${a.patient} with ${a.doctor} on ${a.date}`, a.patient);
    } else if (status === "Rejected") {
      await sendNotification(a.patient_email, "Appointment Rejected", `Your appointment with ${a.doctor} on ${a.date} has been rejected. Please contact the clinic.`, "error");
      await logActivity("Reject Appointment", "Administrator", "Admin", `${a.patient} with ${a.doctor} on ${a.date}`, a.patient);
    } else if (status === "Cancelled") {
      await sendNotification(a.patient_email, "Appointment Cancelled", `Your appointment with ${a.doctor} on ${a.date} has been cancelled by the clinic.`, "warning");
      await logActivity("Cancel Appointment", "Administrator", "Admin", `${a.patient} with ${a.doctor} on ${a.date}`, a.patient);
    }
    setSelected(null); load();
  }

  async function del(id: string) {
    if (!confirm("Delete this appointment?")) return;
    await deleteAppointment(id); load();
  }

  async function completeAppointment(a: Appointment) {
    if (!recordForm.diagnosis.trim()) return setRecordError("Please enter a diagnosis before completing this appointment.");
    setSavingRecord(true);
    setRecordError("");
    const { error } = await addMedicalRecord({
      appointment_id: a.id,
      patient: a.patient,
      patient_email: a.patient_email,
      doctor: a.doctor,
      date: a.date,
      diagnosis: recordForm.diagnosis.trim(),
      treatment: recordForm.treatment.trim(),
      prescription: recordForm.prescription.trim(),
      notes: recordForm.notes.trim(),
    });
    if (error) {
      setSavingRecord(false);
      return setRecordError("Could not save medical record: " + error.message);
    }
    await updateAppointment(a.id, { status: "Completed", notes: recordForm.notes.trim() || null });
    await sendNotification(a.patient_email, "Appointment Completed", `Your appointment with ${a.doctor} on ${a.date} has been completed. A medical record is available.`, "success");
    await logActivity("Complete Appointment", "Administrator", "Admin", `${a.patient} with ${a.doctor} on ${a.date}`, a.patient);
    setSavingRecord(false);
    setSelected(null);
    setRecordForm({ diagnosis: "", treatment: "", prescription: "", notes: "" });
    load();
  }

  return (
    <>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4, color: "#12304A" }}>Appointments</h1>
        <p style={{ color: "#475569" }}>Manage all appointments</p>
      </div>
      <div className="filters">
        <input placeholder="Search patient or doctor..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}>
          {["All Status", "Pending", "Approved", "Completed", "Cancelled", "Rejected"].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      {loading ? <Loading /> : (
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Patient</th><th>Doctor</th><th>Service</th><th>Date</th><th>Time</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {paged.map(a => (
                <tr key={a.id}>
                  <td><b>{a.patient}</b></td>
                  <td>{a.doctor}</td>
                  <td>{a.service}</td>
                  <td>{a.date}</td>
                  <td>{a.time}</td>
                  <td><St x={a.status} /></td>
                  <td style={{ display: "flex", gap: 4 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setSelected(a)}>View</button>
                    {a.status === "Pending" && (
                      <>
                        <button className="btn btn-success btn-sm" title="Approve" onClick={() => changeStatus(a, "Approved")}>✓</button>
                        <button className="btn btn-danger btn-sm" title="Reject" onClick={() => changeStatus(a, "Rejected")}>✕</button>
                      </>
                    )}
                    <button className="btn-icon btn-del" onClick={() => del(a.id)}>🗑</button>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", color: "#475569", padding: 24 }}>No appointments found.</td></tr>}
            </tbody>
          </table>
          <div className="tbl-footer">
            <span>Showing {paged.length} of {filtered.length} entries</span>
            <Pagination total={filtered.length} page={page} setPage={setPage} />
          </div>
        </div>
      )}
      {selected && (
        <Modal title="Appointment Details" onClose={() => setSelected(null)}
          footer={
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {selected.status === "Pending" && (
                <>
                  <button className="btn btn-success" onClick={() => changeStatus(selected, "Approved")}>✓ Approve</button>
                  <button className="btn btn-danger" onClick={() => changeStatus(selected, "Rejected")}>✕ Reject</button>
                </>
              )}
              {selected.status === "Approved" && (
                <button className="btn btn-success" disabled={savingRecord} onClick={() => completeAppointment(selected)}>
                  {savingRecord ? "Saving..." : "Complete Appointment"}
                </button>
              )}
              {["Pending", "Approved"].includes(selected.status) && (
                <button className="btn btn-outline" onClick={() => changeStatus(selected, "Cancelled")}>Cancel Appointment</button>
              )}
              <button className="btn btn-primary" onClick={() => setSelected(null)}>Close</button>
            </div>
          }>
          {selected.status === "Approved" && (
            <div style={{ marginBottom: 16, padding: 14, background: "#f0f9ff", border: "1px solid #dceef2", borderRadius: 8 }}>
              <h3 style={{ fontSize: 14, marginBottom: 10, color: "#07516B" }}>Medical Record</h3>
              <p style={{ fontSize: 12, color: "#475569", marginBottom: 12 }}>Enter the consultation details before completing this appointment.</p>
              {recordError && <Alert type="error" msg={recordError} />}
              {([["diagnosis", "Diagnosis *"], ["treatment", "Treatment"], ["prescription", "Prescription"], ["notes", "Notes"]] as const).map(([key, label]) => (
                <div className="form-group" key={key}>
                  <label>{label}</label>
                  <textarea value={recordForm[key]} onChange={e => setRecordForm(f => ({ ...f, [key]: e.target.value }))} rows={key === "diagnosis" ? 2 : 3} />
                </div>
              ))}
            </div>
          )}
          {[
            ["Patient", selected.patient],
            ["Patient Email", selected.patient_email],
            ["Doctor", selected.doctor],
            ["Service", selected.service],
            ["Date", selected.date],
            ["Time", selected.time],
            ["Reason", selected.reason],
            ["Status", selected.status],
            ["Notes", selected.notes || "—"],
          ].map(([label, val]) => (
            <div key={label} style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#07516B", textTransform: "uppercase", marginBottom: 3 }}>{label}</p>
              {label === "Status"
                ? <St x={val as string} />
                : <p style={{ fontSize: 13, background: "#f8fbfe", padding: "7px 12px", borderRadius: 6, border: "1px solid #e5edf6", color: "#12304A" }}>{val}</p>
              }
            </div>
          ))}
        </Modal>
      )}
    </>
  );
}

// ── Service Management ─────────────────────────────────
export function ServiceManagement() {
  const [list, setList] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Service | null | "new">(null);
  const [form, setForm] = useState<Partial<Service>>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [page, setPage] = useState(0);

  const load = () => getAllServices().then(r => { setList(r.data ?? []); setLoading(false); });
  useEffect(() => { load(); }, []);

  const paged = list.slice(page * PER, page * PER + PER);

  function openNew() { setForm({ name: "", description: "", duration_minutes: 30, is_active: true }); setErr(""); setModal("new"); }
  function openEdit(s: Service) { setForm({ ...s }); setErr(""); setModal(s); }

  async function save() {
    if (!form.name?.trim()) return setErr("Service name is required.");
    setSaving(true); setErr("");
    if (modal === "new") await addService(form as Omit<Service, "id">);
    else await updateService((modal as Service).id, form);
    setSaving(false); setModal(null); load();
  }

  async function del(id: string) {
    if (!confirm("Deactivate this service?")) return;
    await deleteService(id); load();
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <div><h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4, color: "#12304A" }}>Services</h1><p style={{ color: "#475569" }}>Manage clinic services</p></div>
        <button className="btn btn-primary" onClick={openNew}>+ Add New Service</button>
      </div>
      {loading ? <Loading /> : (
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Name</th><th>Description</th><th>Duration</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {paged.map(s => (
                <tr key={s.id}>
                  <td><b>{s.name}</b></td>
                  <td style={{ color: "#475569" }}>{s.description}</td>
                  <td>{s.duration_minutes} mins</td>
                  <td><span className={`st ${s.is_active ? "st-confirmed" : "st-cancelled"}`}>{s.is_active ? "Active" : "Inactive"}</span></td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <button className="btn-icon btn-edit" onClick={() => openEdit(s)}>✏</button>
                    <button className="btn-icon btn-del" onClick={() => del(s.id)}>🗑</button>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", color: "#475569", padding: 24 }}>No services found.</td></tr>}
            </tbody>
          </table>
          <div className="tbl-footer">
            <span>Showing {paged.length} of {list.length} entries</span>
            <Pagination total={list.length} page={page} setPage={setPage} />
          </div>
        </div>
      )}
      {modal && (
        <Modal title={modal === "new" ? "Add New Service" : "Edit Service"} onClose={() => setModal(null)}
          footer={<><button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save"}</button></>}>
          <Alert type="error" msg={err} />
          <div className="form-group"><label>Service Name</label><input value={form.name ?? ""} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
          <div className="form-group"><label>Description</label><textarea value={form.description ?? ""} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
          <div className="form-group"><label>Duration (minutes)</label><input type="number" value={form.duration_minutes ?? 30} onChange={e => setForm(p => ({ ...p, duration_minutes: Number(e.target.value) }))} /></div>
          <div className="form-group"><label>Status</label>
            <select value={form.is_active ? "active" : "inactive"} onChange={e => setForm(p => ({ ...p, is_active: e.target.value === "active" }))}>
              <option value="active">Active</option><option value="inactive">Inactive</option>
            </select>
          </div>
        </Modal>
      )}
    </>
  );
}
