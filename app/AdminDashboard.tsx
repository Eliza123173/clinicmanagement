"use client";
import { useState, useEffect } from "react";
import { St, Loading } from "./ui";
import { getAppointments, getPatients, getDoctors, Appointment, Patient, Doctor } from "./supabase";

// Normalize any date string to YYYY-MM-DD for comparison
function toISO(dateStr: string): string {
  if (!dateStr) return "";
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.slice(0, 10);
  // Try parsing human-readable formats
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return dateStr;
}

export function AdminDashboard({ go }: { go: (p: string) => void }) {
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAppointments(), getPatients(), getDoctors()]).then(([a, p, d]) => {
      setAppts(a.data ?? []);
      setPatients(p.data ?? []);
      setDoctors(d.data ?? []);
      setLoading(false);
    });
  }, []);

  const todayISO = new Date().toISOString().slice(0, 10);
  const today = appts.filter(a => toISO(a.date) === todayISO);
  const pending = appts.filter(a => a.status === "Pending");
  const completed = appts.filter(a => a.status === "Completed");
  const todayLabel = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  if (loading) return <Loading />;

  return (
    <>
      <div className="welcome-bar">
        <div className="welcome-bar-left">
          <div className="welcome-bar-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              <line x1="12" y1="9" x2="12" y2="15"/>
              <line x1="9" y1="12" x2="15" y2="12"/>
            </svg>
          </div>
          <div>
            <h1>Welcome back, Admin!</h1>
            <p>{todayLabel}</p>
          </div>
        </div>
        <div className="welcome-bar-right">
          <b>CareWell Clinic</b>
          <span>Administration Portal</span>
        </div>
      </div>
      <div className="stats-grid-5">
        {[
          { label: "Total Patients", val: patients.length, pg: "Patients", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0797A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
          { label: "Total Doctors", val: doctors.length, pg: "Doctors", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0797A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> },
          { label: "Today's Appointments", val: today.length, pg: "Appointments", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0797A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
          { label: "Pending", val: pending.length, pg: "Appointments", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
          { label: "Completed", val: completed.length, pg: "Appointments", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> },
        ].map(({ label, val, icon, pg }) => (
          <div key={label} className="stat-card">
            <div className="stat-icon">{icon}</div>
            <p>{label}</p>
            <h2>{val}</h2>
            <button className="view-all" onClick={() => go(pg)}>View all →</button>
          </div>
        ))}
      </div>
      <div className="panel">
        <div className="panel-header">
          <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0797A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Today&apos;s Appointments
          </h2>
          <button className="view-all" onClick={() => go("Appointments")}>View All Appointments →</button>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Patient</th><th>Doctor</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
            <tbody>
              {today.slice(0, 5).map(a => (
                <tr key={a.id}>
                  <td><b>{a.patient}</b></td>
                  <td>{a.doctor}</td>
                  <td>{a.date}</td>
                  <td>{a.time}</td>
                  <td><St x={a.status} /></td>
                </tr>
              ))}
              {today.length === 0 && (
                <tr><td colSpan={5}>
                  <div style={{ textAlign: "center", padding: "32px 20px", color: "#475569" }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#DCEEF2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 10px", display: "block" }}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    No appointments today.
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="panel" style={{ marginTop: 22 }}>
        <div className="panel-header">
          <h2>Recent Appointments</h2>
          <button className="view-all" onClick={() => go("Appointments")}>View All →</button>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Patient</th><th>Doctor</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
            <tbody>
              {appts.slice(0, 8).map(a => (
                <tr key={a.id}>
                  <td><b>{a.patient}</b></td>
                  <td>{a.doctor}</td>
                  <td>{a.date}</td>
                  <td>{a.time}</td>
                  <td><St x={a.status} /></td>
                </tr>
              ))}
              {appts.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", color: "#475569", padding: 24 }}>No appointments yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
