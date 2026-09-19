"use client";
import { useState, useEffect } from "react";
import { Av, St, Loading } from "./ui";
import { getAppointments, getSchedules, updateAppointment, addActivityLog, Appointment, Schedule } from "./supabase";

export function DoctorPortal({ doctorName, doctorSpec, doctorInitials }: { doctorName: string; doctorSpec: string; doctorInitials: string }) {
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [tab, setTab] = useState("All");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [remarks, setRemarks] = useState("");
  const [status, setStatus] = useState("Confirmed");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getAppointments(), getSchedules()]).then(([a, s]) => {
      setAppts((a.data ?? []).filter((x: Appointment) => x.doctor === doctorName));
      setSchedules((s.data ?? []).filter((x: Schedule) => x.doctor === doctorName));
      setLoading(false);
    });
  }, [doctorName]);

  const tabMap: Record<string, string[]> = {
    All: ["Pending", "Confirmed", "Completed", "Cancelled"],
    Upcoming: ["Pending", "Confirmed"],
    Completed: ["Completed"],
    Cancelled: ["Cancelled"],
  };
  const filtered = appts.filter(a => tabMap[tab].includes(a.status));
  const todayISO = new Date().toISOString().slice(0, 10);
  const today = appts.filter(a => a.date === todayISO && (a.status === "Confirmed" || a.status === "Pending"));

  function openProcess(appointment: Appointment) {
    setEditing(appointment.id); setStatus(appointment.status); setRemarks(appointment.notes ?? "");
  }
  async function processAppointment(appointment: Appointment) {
    setSaving(true);
    const { error } = await updateAppointment(appointment.id, { status, notes: remarks.trim() || null });
    if (!error) {
      await addActivityLog({ actor_name: doctorName, actor_role: "Doctor", action: "Processed appointment", details: "Status set to " + status + (remarks.trim() ? "; remarks added" : ""), target_name: appointment.patient });
      setAppts(current => current.map(item => item.id === appointment.id ? { ...item, status, notes: remarks.trim() || null } : item));
      setEditing(null);
    }
    setSaving(false);
  }

  if (loading) return <Loading />;

  return (
    <>
      <div className="welcome-bar">
        <div>
          <h1>Welcome, {doctorName}! 👋</h1>
          <p>{doctorSpec}</p>
        </div>
        <Av x={doctorInitials} size="av-lg" />
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {[
          ["Total Appointments", appts.length],
          ["Upcoming", appts.filter(a => a.status === "Confirmed" || a.status === "Pending").length],
          ["Completed", appts.filter(a => a.status === "Completed").length],
          ["Cancelled", appts.filter(a => a.status === "Cancelled").length],
        ].map(([label, val]) => (
          <div key={label as string} className="stat-card">
            <p>{label as string}</p>
            <h2>{val as number}</h2>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 22 }}>
        {/* Appointments table */}
        <div className="panel">
          <div className="panel-header"><h2>My Appointments</h2></div>
          <div className="tabs" style={{ marginBottom: 16 }}>
            {["All", "Upcoming", "Completed", "Cancelled"].map(t => (
              <button key={t} className={`tab ${tab === t ? "tab-active" : ""}`} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr><th>Patient</th><th>Date</th><th>Time</th><th>Reason</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {filtered.length ? filtered.map(a => (
                  <>
                  <tr key={a.id}>
                    <td><b>{a.patient}</b></td>
                    <td>{a.date}</td>
                    <td>{a.time}</td>
                    <td style={{ color: "#8190a5" }}>{a.reason}</td>
                    <td><St x={a.status} /></td>
                    <td><button className="btn btn-outline btn-sm" onClick={() => openProcess(a)}>Process</button></td>
                  </tr>
                  {editing === a.id && <tr><td colSpan={6}><div style={{ display: "grid", gridTemplateColumns: "150px 1fr auto", gap: 10, alignItems: "end", padding: "8px 0" }}><div className="form-group" style={{ margin: 0 }}><label>Update status</label><select value={status} onChange={event => setStatus(event.target.value)}>{["Pending", "Confirmed", "Completed", "Cancelled"].map(option => <option key={option}>{option}</option>)}</select></div><div className="form-group" style={{ margin: 0 }}><label>Remarks</label><input value={remarks} maxLength={500} placeholder="Add clinical or processing remarks" onChange={event => setRemarks(event.target.value)} /></div><div style={{ display: "flex", gap: 6 }}><button className="btn btn-primary btn-sm" disabled={saving} onClick={() => processAppointment(a)}>{saving ? "Saving..." : "Save"}</button><button className="btn btn-outline btn-sm" onClick={() => setEditing(null)}>Cancel</button></div></div></td></tr>}
                  </>
                )) : (
                  <tr><td colSpan={6} style={{ textAlign: "center", color: "#8190a5", padding: 30 }}>No appointments found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Schedule sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="panel">
            <div className="panel-header"><h2>My Schedule</h2></div>
            {schedules.length ? schedules.map(s => (
              <div key={s.id} className="schedule-row">
                <span>{s.day}</span>
                <span style={{ fontWeight: 600 }}>{s.start_time} – {s.end_time}</span>
              </div>
            )) : <p style={{ color: "#8190a5", fontSize: 13 }}>No schedule set. Contact admin.</p>}
          </div>

          <div className="panel">
            <div className="panel-header"><h2>Today&apos;s Patients</h2></div>
            {today.length ? today.slice(0, 5).map(a => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #f0f4f9" }}>
                <Av x={a.patient.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()} />
                <div>
                  <b style={{ fontSize: 13 }}>{a.patient}</b>
                  <p style={{ fontSize: 12, color: "#8190a5" }}>{a.time} — {a.reason}</p>
                </div>
                <St x={a.status} />
              </div>
            )) : <p style={{ color: "#8190a5", fontSize: 13 }}>No patients today.</p>}
          </div>
        </div>
      </div>
    </>
  );
}
