"use client";
import React, { useState, useEffect } from "react";
import { Av, St, Loading, Pagination } from "./ui";
import { getDoctors, getAppointments, getRecords, addAppointment, updateAppointment, addActivityLog, Doctor, Appointment, Record_ } from "./supabase";

const SLOTS = ["8:00 AM","8:30 AM","9:00 AM","9:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM","2:00 PM","2:30 PM","3:00 PM","3:30 PM"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function fmtDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function Calendar({ selected, onSelect }: { selected: string; onSelect: (d: string) => void }) {
  const today = new Date();
  const [yr, setYr] = useState(today.getFullYear());
  const [mo, setMo] = useState(today.getMonth());
  const first = new Date(yr, mo, 1).getDay();
  const daysInMonth = new Date(yr, mo + 1, 0).getDate();
  const prev = () => { if (mo === 0) { setMo(11); setYr(y => y - 1); } else setMo(m => m - 1); };
  const next = () => { if (mo === 11) { setMo(0); setYr(y => y + 1); } else setMo(m => m + 1); };
  const toISO = (d: number) => `${yr}-${String(mo + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return (
    <div className="calendar">
      <div className="cal-header">
        <button className="cal-nav" onClick={prev}>‹</button>
        <h3>{MONTHS[mo]} {yr}</h3>
        <button className="cal-nav" onClick={next}>›</button>
      </div>
      <div className="cal-grid">
        {DAYS.map(d => <div key={d} className="cal-day-name">{d}</div>)}
        {Array.from({ length: first }, (_, i) => <div key={"e" + i} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const d = i + 1;
          const iso = toISO(d);
          const isPast = iso < todayISO;
          return (
            <button key={d} disabled={isPast}
              className={`cal-day ${selected === iso ? "cal-day-selected" : ""} ${iso === todayISO && selected !== iso ? "cal-day-today" : ""} ${isPast ? "cal-day-past" : ""}`}
              onClick={() => onSelect(iso)}>{d}</button>
          );
        })}
      </div>
    </div>
  );
}

export function PatientDashboard({ name, go }: { name: string; go: (p: string) => void }) {
  const [appts, setAppts] = useState<Appointment[]>([]);
  useEffect(() => {
    getAppointments().then(r =>
      setAppts((r.data ?? []).filter((a: Appointment) => a.patient === name && a.status !== "Cancelled"))
    );
  }, [name]);
  const upcoming = appts.find(a => a.status === "Confirmed" || a.status === "Pending");
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = name.split(" ")[0];
  const todayLabel = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  return (
    <>
      <div className="welcome-bar">
        <div>
          <p style={{ color: "#8190a5", fontSize: 13 }}>{todayLabel}</p>
          <h1>{greet}, {firstName}! 👋</h1>
          <p>How can we help with your health today?</p>
        </div>
        <Av x={firstName.slice(0, 2).toUpperCase()} size="av-lg" />
      </div>
      <div className="action-cards">
        {[["📅","Book Appointment","Schedule your visit","Book Appointment"],["🔍","Find a Doctor","View our doctors","Find a Doctor"],["📋","My Appointments","View your appointments","My Appointments"],["📁","Medical Records","View your health records","Medical Records"]].map(([icon, title, sub, page]) => (
          <button key={title} className="action-card" onClick={() => go(page)}>
            <div className="action-card-icon">{icon}</div>
            <b>{title}</b><span>{sub}</span>
          </button>
        ))}
      </div>
      <div className="panel">
        <div className="panel-header"><h2>Upcoming Appointment</h2><button className="view-all" onClick={() => go("My Appointments")}>View All</button></div>
        {upcoming ? (
          <div className="upcoming-appt">
            <Av x={upcoming.doctor.split(" ").map((w: string) => w[0]).filter((_: string, i: number) => i > 0).join("").slice(0, 2)} size="av-lg" />
            <div className="info"><b>{upcoming.doctor}</b><p>{upcoming.reason}</p></div>
            <div className="time">{fmtDate(upcoming.date)}<small>{upcoming.time}</small></div>
            <St x={upcoming.status} />
          </div>
        ) : <p style={{ color: "#8190a5", fontSize: 13 }}>No upcoming appointments. <button className="link-btn" onClick={() => go("Book Appointment")}>Book one now →</button></p>}
      </div>
    </>
  );
}

export function FindDoctor({ go }: { go: (p: string, data?: unknown) => void }) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [search, setSearch] = useState("");
  const [spec, setSpec] = useState("All Specializations");
  const [loading, setLoading] = useState(true);
  useEffect(() => { getDoctors().then(r => { setDoctors(r.data ?? []); setLoading(false); }); }, []);
  const specs = ["All Specializations", ...Array.from(new Set(doctors.map(d => d.spec)))];
  const filtered = doctors.filter(d => {
    const q = search.toLowerCase();
    return (d.name.toLowerCase().includes(q) || d.spec.toLowerCase().includes(q)) && (spec === "All Specializations" || d.spec === spec);
  });
  return (
    <>
      <div style={{ marginBottom: 22 }}><h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Find a Doctor</h1><p style={{ color: "#8190a5" }}>Browse our available doctors</p></div>
      <div className="filters">
        <input placeholder="Search doctor or specialization..." value={search} onChange={e => setSearch(e.target.value)} />
        <select value={spec} onChange={e => setSpec(e.target.value)}>{specs.map(s => <option key={s}>{s}</option>)}</select>
      </div>
      {loading ? <Loading /> : filtered.length ? (
        <div className="doctor-list">
          {filtered.map(d => (
            <div key={d.id} className="doctor-card">
              <Av x={d.initials} size="av-lg" />
              <div className="info">
                <b>{d.name}</b><p>{d.spec}</p>
                <div className="rating">★ {d.rating} <span style={{ color: "#8190a5", fontWeight: 400 }}>({d.reviews} reviews)</span></div>
                <div className={d.avail.includes("Tomorrow") ? "avail-tomorrow" : "avail-today"}>● {d.avail}</div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => go("Doctor Profile", d)}>View Profile</button>
            </div>
          ))}
        </div>
      ) : <p style={{ color: "#8190a5", textAlign: "center", padding: 40 }}>No doctors found.</p>}
    </>
  );
}

export function DoctorProfile({ doctor, go }: { doctor: Doctor; go: (p: string, data?: unknown) => void }) {
  const [schedules, setSchedules] = useState<{ day: string; start_time: string; end_time: string }[]>([]);
  useEffect(() => {
    import("./supabase").then(({ getSchedules }) => getSchedules().then(r =>
      setSchedules((r.data ?? []).filter((s: { doctor: string }) => s.doctor === doctor.name))
    ));
  }, [doctor.name]);
  return (
    <>
      <div style={{ marginBottom: 20 }}><button className="btn btn-outline btn-sm" onClick={() => go("Find a Doctor")}>← Back to Doctors</button></div>
      <div className="doc-profile">
        <div className="doc-profile-left">
          <div style={{ margin: "0 auto 14px", display: "flex", justifyContent: "center" }}><Av x={doctor.initials} size="av-xl" /></div>
          <h2>{doctor.name}</h2><p>{doctor.spec}</p>
          <div style={{ fontSize: 13, color: "#c17b00", margin: "6px 0" }}>★ {doctor.rating} ({doctor.reviews} reviews)</div>
          <div className="doc-stats">
            <div className="doc-stat"><b>{doctor.years}+</b><span>Years</span></div>
            <div className="doc-stat"><b>{doctor.patients}+</b><span>Patients</span></div>
          </div>
          <div style={{ textAlign: "left" }}>
            <p style={{ fontWeight: 700, marginBottom: 8 }}>Clinic Schedule</p>
            {schedules.length ? schedules.map(s => (
              <div key={s.day} className="schedule-row"><span>{s.day}</span><span>{s.start_time} – {s.end_time}</span></div>
            )) : <p style={{ color: "#8190a5", fontSize: 12 }}>No schedule available.</p>}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="panel">
            <div className="panel-header"><h2>About Doctor</h2></div>
            <p style={{ fontSize: 13, color: "#5a6a80", lineHeight: 1.7 }}>{doctor.name} is a trusted {doctor.spec} specialist with over {doctor.years} years of experience providing quality healthcare to patients of all ages.</p>
          </div>
          <div className="panel">
            <div className="panel-header"><h2>Available Slots</h2></div>
            <div className="slots-grid">
              {SLOTS.map(s => <button key={s} className="slot" onClick={() => go("Book Appointment", doctor)}>{s}</button>)}
            </div>
            <button className="btn btn-primary" style={{ marginTop: 16, width: "100%", justifyContent: "center" }} onClick={() => go("Book Appointment", doctor)}>Book Appointment</button>
          </div>
        </div>
      </div>
    </>
  );
}

export function BookAppointment({ doctor: preDoctor, allDoctors, patientName, onBooked }: { doctor?: Doctor; allDoctors: Doctor[]; patientName: string; onBooked: () => void }) {
  const [step, setStep] = useState(preDoctor ? 1 : 0);
  const [selDoc, setSelDoc] = useState<Doctor | null>(preDoctor ?? null);
  const [selDate, setSelDate] = useState("");
  const [selSlot, setSelSlot] = useState("");
  const [reason, setReason] = useState("General consultation");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  const steps = ["Select Doctor", "Select Date", "Select Time", "Details", "Confirm"];

  async function submit() {
    if (!selDoc || !selDate || !selSlot) return;
    setLoading(true); setErr("");
    const { error } = await addAppointment({ patient: patientName, doctor: selDoc.name, date: selDate, time: selSlot, status: "Pending", reason, notes: null });
    if (error) { setErr("Failed to book: " + error.message); setLoading(false); return; }
    await addActivityLog({ actor_name: patientName, actor_role: "Patient", action: "Booked appointment", details: fmtDate(selDate) + " at " + selSlot, target_name: selDoc.name });
    setLoading(false); setDone(true);
  }

  if (done) return (
    <div className="confirm-wrap">
      <div className="confirm-icon">✓</div>
      <h1>Appointment Request Sent!</h1>
      <p>Your appointment has been submitted and is pending approval.</p>
      <div className="confirm-details">
        <h3>Appointment Details</h3>
        {[["Doctor", selDoc?.name], ["Date", fmtDate(selDate)], ["Time", selSlot], ["Reason", reason], ["Status", "Pending"]].map(([k, v]) => (
          <div key={k} className="confirm-row"><span>{k}</span><span>{k === "Status" ? <St x="Pending" /> : <strong>{v}</strong>}</span></div>
        ))}
      </div>
      <div className="confirm-actions">
        <button className="btn btn-primary" onClick={onBooked}>View My Appointments</button>
        <button className="btn btn-outline" onClick={() => { setDone(false); setStep(0); setSelDoc(null); setSelDate(""); setSelSlot(""); }}>Book Another</button>
      </div>
    </div>
  );

  return (
    <>
      <div style={{ marginBottom: 22 }}><h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Book Appointment</h1><p style={{ color: "#8190a5" }}>CareWell Clinic</p></div>
      <div className="stepper">
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <div className={`step ${i < step ? "step-done" : i === step ? "step-active" : "step-inactive"}`}>
              <div className="step-num">{i < step ? "✓" : i + 1}</div>
              <div className="step-label">{s}</div>
            </div>
            {i < steps.length - 1 && <div className={`step-line ${i < step ? "step-line-done" : ""}`} />}
          </React.Fragment>
        ))}
      </div>
      {err && <div className="error-msg">{err}</div>}

      {step === 0 && (
        <div className="panel">
          <h2 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700 }}>Select a Doctor</h2>
          <div className="doctor-list">
            {allDoctors.map(d => (
              <div key={d.id} className="doctor-card" style={{ cursor: "pointer", border: selDoc?.id === d.id ? "2px solid #0867d3" : undefined }} onClick={() => setSelDoc(d)}>
                <Av x={d.initials} size="av-lg" />
                <div className="info"><b>{d.name}</b><p>{d.spec}</p></div>
                {selDoc?.id === d.id && <span style={{ color: "#0867d3", fontWeight: 700 }}>✓ Selected</span>}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
            <button className="btn btn-primary" disabled={!selDoc} onClick={() => setStep(1)}>Next</button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
          <div>
            {selDoc && <div className="panel" style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: "#8190a5", marginBottom: 8 }}>Selected Doctor</p>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}><Av x={selDoc.initials} /><div><b>{selDoc.name}</b><p style={{ fontSize: 12, color: "#8190a5" }}>{selDoc.spec}</p></div></div>
            </div>}
          </div>
          <Calendar selected={selDate} onSelect={setSelDate} />
          <div style={{ gridColumn: "1/-1", display: "flex", justifyContent: "space-between" }}>
            <button className="btn btn-outline" onClick={() => setStep(0)}>Back</button>
            <button className="btn btn-primary" disabled={!selDate} onClick={() => setStep(2)}>Next</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="panel">
          <h2 style={{ marginBottom: 4, fontSize: 16, fontWeight: 700 }}>Select Time Slot</h2>
          <p style={{ color: "#8190a5", fontSize: 12, marginBottom: 16 }}>Selected date: {fmtDate(selDate)}</p>
          <div className="slots-grid">
            {SLOTS.map(s => <button key={s} className={`slot ${selSlot === s ? "slot-selected" : ""}`} onClick={() => setSelSlot(s)}>{s}</button>)}
          </div>
          <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between" }}>
            <button className="btn btn-outline" onClick={() => setStep(1)}>Back</button>
            <button className="btn btn-primary" disabled={!selSlot} onClick={() => setStep(3)}>Next</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="panel">
          <h2 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700 }}>Appointment Details</h2>
          <div className="form-group"><label>Reason for Visit</label><input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. General consultation, Follow-up" /></div>
          <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between" }}>
            <button className="btn btn-outline" onClick={() => setStep(2)}>Back</button>
            <button className="btn btn-primary" disabled={!reason.trim()} onClick={() => setStep(4)}>Next</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="panel">
          <h2 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700 }}>Confirm Appointment</h2>
          {[["Doctor", selDoc?.name], ["Date", fmtDate(selDate)], ["Time", selSlot], ["Reason", reason]].map(([k, v]) => (
            <div key={k} className="confirm-row"><span style={{ color: "#8190a5" }}>{k}</span><strong>{v}</strong></div>
          ))}
          <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between" }}>
            <button className="btn btn-outline" onClick={() => setStep(3)}>Back</button>
            <button className="btn btn-primary" disabled={loading} onClick={submit}>{loading ? "Submitting..." : "Confirm Appointment"}</button>
          </div>
        </div>
      )}
    </>
  );
}

export function MyAppointments({ patientName }: { patientName: string }) {
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [tab, setTab] = useState("Upcoming");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const PER = 5;

  const load = () => getAppointments().then(r => {
    setAppts((r.data ?? []).filter((a: Appointment) => a.patient === patientName));
    setLoading(false);
  });
  useEffect(() => { load(); }, [patientName]);

  const tabMap: Record<string, string[]> = { Upcoming: ["Pending", "Confirmed"], Completed: ["Completed"], Cancelled: ["Cancelled"], All: ["Pending", "Confirmed", "Completed", "Cancelled"] };
  const filtered = appts.filter(a => tabMap[tab].includes(a.status));
  const paged = filtered.slice(page * PER, page * PER + PER);

  async function cancel(a: Appointment) {
    if (!confirm("Cancel this appointment?")) return;
    await updateAppointment(a.id, { status: "Cancelled" });
    await addActivityLog({ actor_name: patientName, actor_role: "Patient", action: "Cancelled appointment", details: fmtDate(a.date) + " at " + a.time, target_name: a.doctor });
    load();
  }

  return (
    <>
      <div style={{ marginBottom: 22 }}><h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>My Appointments</h1><p style={{ color: "#8190a5" }}>Track your appointment history and status</p></div>
      <div className="tabs">
        {["Upcoming", "Completed", "Cancelled", "All"].map(t => (
          <button key={t} className={`tab ${tab === t ? "tab-active" : ""}`} onClick={() => { setTab(t); setPage(0); }}>{t}</button>
        ))}
      </div>
      {loading ? <Loading /> : (
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Doctor</th><th>Date</th><th>Time</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {paged.length ? paged.map(a => (
                <tr key={a.id}>
                  <td><b>{a.doctor}</b></td>
                  <td>{fmtDate(a.date)}</td>
                  <td>{a.time}</td>
                  <td style={{ color: "#8190a5" }}>{a.reason}</td>
                  <td><St x={a.status} /></td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <button className="link-btn" onClick={() => setSelected(a)}>View</button>
                    {(a.status === "Pending") && <button className="btn-icon btn-del" style={{ fontSize: 11, width: "auto", padding: "0 8px" }} onClick={() => cancel(a)}>Cancel</button>}
                  </td>
                </tr>
              )) : <tr><td colSpan={6} style={{ textAlign: "center", color: "#8190a5", padding: 30 }}>No appointments found.</td></tr>}
            </tbody>
          </table>
          <div className="tbl-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Showing {paged.length} of {filtered.length} entries</span>
            <Pagination total={filtered.length} page={page} setPage={setPage} />
          </div>
        </div>
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title"><h2>Appointment Details</h2><button className="modal-close" onClick={() => setSelected(null)}>×</button></div>
            {[["Doctor", selected.doctor], ["Date", fmtDate(selected.date)], ["Time", selected.time], ["Reason", selected.reason], ["Status", selected.status]].map(([k, v]) => (
              <div key={k} className="confirm-row"><span style={{ color: "#8190a5" }}>{k}</span><span>{k === "Status" ? <St x={v} /> : <strong>{v}</strong>}</span></div>
            ))}
            {selected.notes && (
              <div style={{ marginTop: 14, padding: "12px 14px", background: "#f7fbff", borderRadius: 8, border: "1px solid #e0eefa" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#5a6a80", marginBottom: 4 }}>DOCTOR&apos;S REMARKS</p>
                <p style={{ fontSize: 13 }}>{selected.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export function MedicalRecords({ patientName }: { patientName: string }) {
  const [records, setRecords] = useState<Record_[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getRecords().then(r => {
      setRecords((r.data ?? []).filter((rec: Record_) => rec.patient === patientName));
      setLoading(false);
    });
  }, [patientName]);
  return (
    <>
      <div style={{ marginBottom: 22 }}><h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Medical Records</h1><p style={{ color: "#8190a5" }}>Your health history</p></div>
      {loading ? <Loading /> : records.length ? records.map(r => (
        <div key={r.id} className="record-card">
          <div><b>{r.date}</b></div>
          <div><b>{r.doctor}</b><p>Diagnosis: {r.diagnosis}</p></div>
          <div><b>Prescription</b><p>{r.prescription}</p></div>
          <div><b>Notes</b><p>{r.notes}</p></div>
          <button className="btn btn-outline btn-sm">View Details</button>
        </div>
      )) : <p style={{ color: "#8190a5", textAlign: "center", padding: 40 }}>No medical records found.</p>}
    </>
  );
}

export function PatientProfile({ patientName, patientEmail }: { patientName: string; patientEmail: string }) {
  const [patient, setPatient] = useState<Record<string, string>>({ name: patientName, email: patientEmail, dob: "", address: "", gender: "", blood: "", contact: "", id: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    import("./supabase").then(({ getPatients }) => getPatients().then(r => {
      const found = (r.data ?? []).find((p: { email: string }) => p.email === patientEmail);
      if (found) setPatient(found);
    }));
  }, [patientEmail]);
  async function save() {
    if (!patient.name.trim()) return setMsg("❌ Name is required.");
    setSaving(true);
    const { updatePatient } = await import("./supabase");
    await updatePatient(patient.id, patient);
    setSaving(false); setMsg("✅ Changes saved!");
    setTimeout(() => setMsg(""), 2500);
  }
  const initials = patientName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <>
      <div style={{ marginBottom: 22 }}><h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>My Profile</h1><p style={{ color: "#8190a5" }}>Manage your personal information</p></div>
      <div className="profile-wrap">
        <div className="profile-header">
          <Av x={initials} size="av-xl" />
          <div><b style={{ fontSize: 18, fontWeight: 700 }}>{patient.name}</b><p style={{ color: "#8190a5", marginTop: 4 }}>Patient</p></div>
        </div>
        <div className="profile-fields">
          {[["Full Name","name","text"],["Email Address","email","email"],["Date of Birth","dob","date"],["Address","address","text"],["Gender","gender","text"],["Blood Type","blood","text"],["Contact Number","contact","text"]].map(([label, key, type]) => (
            <div className="form-group" key={key}>
              <label>{label}</label>
              <input type={type} value={(patient as Record<string, string>)[key] ?? ""} onChange={e => setPatient(p => ({ ...p, [key]: e.target.value }))} />
            </div>
          ))}
        </div>
        {msg && <p style={{ color: msg.startsWith("❌") ? "#c0392b" : "#148449", fontSize: 13, marginTop: 8 }}>{msg}</p>}
        <div className="profile-actions"><button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save Changes"}</button></div>
      </div>
    </>
  );
}
