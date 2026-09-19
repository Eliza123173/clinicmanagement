"use client";
import { useState, useEffect } from "react";
import { St, Loading, Pagination, Modal } from "./ui";
import {
  getPatients, addPatient, updatePatient, deletePatient, Patient,
  getDoctors, addDoctor, updateDoctor, deleteDoctor, Doctor,
  getAppointments, updateAppointment, deleteAppointment, Appointment,
} from "./supabase";

const PER = 5;

// ── Patient Management ─────────────────────────────────
export function PatientManagement() {
  const [list, setList] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Patient | null | "new">(null);
  const [form, setForm] = useState<Partial<Patient>>({});
  const [saving, setSaving] = useState(false);

  const load = () => getPatients().then(r => { setList(r.data ?? []); setLoading(false); });
  useEffect(() => { load(); }, []);

  const filtered = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase()));
  const paged = filtered.slice(page * PER, page * PER + PER);

  function openNew() { setForm({ name: "", email: "", contact: "", dob: "", gender: "Female", blood: "", address: "" }); setModal("new"); }
  function openEdit(p: Patient) { setForm({ ...p }); setModal(p); }

  async function save() {
    setSaving(true);
    if (modal === "new") {
      await addPatient(form as Omit<Patient, "id">);
    } else {
      await updatePatient((modal as Patient).id, form);
    }
    setSaving(false); setModal(null); load();
  }

  async function del(id: string) {
    if (!confirm("Delete this patient?")) return;
    await deletePatient(id); load();
  }

  const F = ({ k, label, type = "text" }: { k: keyof Patient; label: string; type?: string }) => (
    <div className="form-group">
      <label>{label}</label>
      <input type={type} value={(form[k] as string) ?? ""} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} />
    </div>
  );

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <div><h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Patients</h1><p style={{ color: "#8190a5" }}>Manage patient records</p></div>
        <button className="btn btn-primary" onClick={openNew}>+ Add New Patient</button>
      </div>
      <div className="filters"><input placeholder="Search patients..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} /></div>
      {loading ? <Loading /> : (
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>ID</th><th>Name</th><th>Contact</th><th>Email</th><th>Action</th></tr></thead>
            <tbody>
              {paged.map(p => (
                <tr key={p.id}>
                  <td style={{ color: "#8190a5" }}>{p.id}</td>
                  <td><b>{p.name}</b></td>
                  <td>{p.contact}</td>
                  <td>{p.email}</td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <button className="btn-icon btn-edit" onClick={() => openEdit(p)}>✏</button>
                    <button className="btn-icon btn-del" onClick={() => del(p.id)}>🗑</button>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", color: "#8190a5", padding: 24 }}>No patients found.</td></tr>}
            </tbody>
          </table>
          <div className="tbl-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Showing {paged.length} of {filtered.length} entries</span>
            <Pagination total={filtered.length} page={page} setPage={setPage} />
          </div>
        </div>
      )}
      {modal && (
        <Modal title={modal === "new" ? "Add New Patient" : "Edit Patient"} onClose={() => setModal(null)}
          footer={<><button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save"}</button></>}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            <F k="name" label="Full Name" /><F k="email" label="Email" type="email" />
            <F k="contact" label="Contact" /><F k="dob" label="Date of Birth" type="date" />
            <div className="form-group"><label>Gender</label><select value={form.gender ?? ""} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}><option>Female</option><option>Male</option><option>Other</option></select></div>
            <F k="blood" label="Blood Type" /><F k="address" label="Address" />
          </div>
        </Modal>
      )}
    </>
  );
}

// ── Doctor Management ──────────────────────────────────
export function DoctorManagement() {
  const [list, setList] = useState<Doctor[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Doctor | null | "new">(null);
  const [form, setForm] = useState<Partial<Doctor> & { password?: string }>({}); 
  const [saving, setSaving] = useState(false);

  const load = () => getDoctors().then(r => { setList(r.data ?? []); setLoading(false); });
  useEffect(() => { load(); }, []);

  const filtered = list.filter(d => d.name.toLowerCase().includes(search.toLowerCase()) || d.spec.toLowerCase().includes(search.toLowerCase()));
  const paged = filtered.slice(page * PER, page * PER + PER);

  function openNew() { setForm({ name: "", spec: "", email: "", password: "", avail: "Available Today", rating: 4.5, reviews: 0, years: 1, patients: 0, initials: "", is_active: true }); setModal("new"); }
  function openEdit(d: Doctor) { setForm({ ...d, password: "" }); setModal(d); }

  async function save() {
    setSaving(true);
    if (modal === "new") {
      if (form.email && form.password) {
        const res = await fetch("/api/create-doctor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email, password: form.password }),
        });
        const result = await res.json();
        if (result.error) { setSaving(false); alert("Account error: " + result.error); return; }
      }
      const { password: _, ...docData } = form;
      await addDoctor(docData as Omit<Doctor, "id">);
    } else {
      const { password: _, ...docData } = form;
      await updateDoctor((modal as Doctor).id, docData);
    }
    setSaving(false); setModal(null); load();
  }

  async function del(id: string) {
    if (!confirm("Delete this doctor?")) return;
    await deleteDoctor(id); load();
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <div><h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Doctors</h1><p style={{ color: "#8190a5" }}>Manage doctor records</p></div>
        <button className="btn btn-primary" onClick={openNew}>+ Add New Doctor</button>
      </div>
      <div className="filters"><input placeholder="Search doctors..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} /></div>
      {loading ? <Loading /> : (
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>ID</th><th>Name</th><th>Specialization</th><th>Account</th><th>Action</th></tr></thead>
            <tbody>
              {paged.map(d => (
                <tr key={d.id}>
                  <td style={{ color: "#8190a5" }}>{d.id}</td>
                  <td><b>{d.name}</b></td>
                  <td>{d.spec}</td>
                  <td><button className={d.is_active === false ? "btn btn-outline btn-sm" : "btn btn-primary btn-sm"} onClick={async () => { await updateDoctor(d.id, { is_active: d.is_active === false }); load(); }}>{d.is_active === false ? "Activate" : "Active"}</button></td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <button className="btn-icon btn-edit" onClick={() => openEdit(d)}>✏</button>
                    <button className="btn-icon btn-del" onClick={() => del(d.id)}>🗑</button>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", color: "#8190a5", padding: 24 }}>No doctors found.</td></tr>}
            </tbody>
          </table>
          <div className="tbl-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Showing {paged.length} of {filtered.length} entries</span>
            <Pagination total={filtered.length} page={page} setPage={setPage} />
          </div>
        </div>
      )}
      {modal && (
        <Modal title={modal === "new" ? "Add New Doctor" : "Edit Doctor"} onClose={() => setModal(null)}
          footer={<><button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save"}</button></>}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            {[["name","Full Name"],["spec","Specialization"],["initials","Initials (2 letters)"],["avail","Availability"],["years","Years Experience"],["patients","Total Patients"]].map(([k, label]) => (
              <div className="form-group" key={k}>
                <label>{label}</label>
                <input value={(form[k as keyof Doctor] as string | number) ?? ""} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} />
              </div>
            ))}
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" value={form.email ?? ""} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="doctor@carewell.com" />
            </div>
            {modal === "new" && (
              <div className="form-group">
                <label>Password</label>
                <input type="password" value={form.password ?? ""} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Set login password" />
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}

// ── Appointment Management ─────────────────────────────
export function AppointmentManagement() {
  const [list, setList] = useState<Appointment[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = () => getAppointments().then(r => { setList(r.data ?? []); setLoading(false); });
  useEffect(() => { load(); }, []);

  const filtered = list.filter(a => {
    const q = search.toLowerCase();
    const matchQ = a.patient.toLowerCase().includes(q) || a.doctor.toLowerCase().includes(q);
    const matchS = statusFilter === "All Status" || a.status === statusFilter;
    return matchQ && matchS;
  });
  const paged = filtered.slice(page * PER, page * PER + PER);

  async function changeStatus(id: string, status: string) {
    await updateAppointment(id, { status }); load();
  }

  async function del(id: string) {
    if (!confirm("Delete this appointment?")) return;
    await deleteAppointment(id); load();
  }

  return (
    <>
      <div style={{ marginBottom: 22 }}><h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Appointments</h1><p style={{ color: "#8190a5" }}>Manage all appointments</p></div>
      <div className="filters">
        <input placeholder="Search patient or doctor..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}>
          {["All Status", "Pending", "Confirmed", "Completed", "Cancelled"].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      {loading ? <Loading /> : (
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>ID</th><th>Patient</th><th>Doctor</th><th>Date</th><th>Time</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {paged.map(a => (
                <tr key={a.id}>
                  <td style={{ color: "#8190a5" }}>{a.id}</td>
                  <td>{a.patient}</td>
                  <td>{a.doctor}</td>
                  <td>{a.date}</td>
                  <td>{a.time}</td>
                  <td><St x={a.status} /></td>
                  <td style={{ display: "flex", gap: 4 }}>
                    <select style={{ fontSize: 11, padding: "3px 6px", border: "1px solid #dce5ef", borderRadius: 4 }} value={a.status} onChange={e => changeStatus(a.id, e.target.value)}>
                      {["Pending","Confirmed","Completed","Cancelled"].map(s => <option key={s}>{s}</option>)}
                    </select>
                    <button className="btn-icon btn-del" onClick={() => del(a.id)}>🗑</button>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", color: "#8190a5", padding: 24 }}>No appointments found.</td></tr>}
            </tbody>
          </table>
          <div className="tbl-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Showing {paged.length} of {filtered.length} entries</span>
            <Pagination total={filtered.length} page={page} setPage={setPage} />
          </div>
        </div>
      )}
    </>
  );
}
