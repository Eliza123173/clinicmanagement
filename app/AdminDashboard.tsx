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
        <div>
          <h1>Welcome back, Admin! 👋</h1>
          <p>{todayLabel}</p>
        </div>
      </div>
      <div className="stats-grid-5">
        {[
          ["Total Patients", patients.length, "View all", "Patients"],
          ["Total Doctors", doctors.length, "View all", "Doctors"],
          ["Today's Appointments", today.length, "View all", "Appointments"],
          ["Pending Appointments", pending.length, "View all", "Appointments"],
          ["Completed Appointments", completed.length, "View all", "Appointments"],
        ].map(([label, val, link, page]) => (
          <div key={label as string} className="stat-card">
            <p>{label as string}</p>
            <h2>{val as number}</h2>
            <button className="view-all" onClick={() => go(page as string)}>{link as string}</button>
          </div>
        ))}
      </div>
      <div className="panel">
        <div className="panel-header">
          <h2>Today&apos;s Appointments</h2>
          <button className="view-all" onClick={() => go("Appointments")}>View All Appointments</button>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Patient</th><th>Doctor</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
            <tbody>
              {today.slice(0, 5).map(a => (
                <tr key={a.id}>
                  <td>{a.patient}</td>
                  <td>{a.doctor}</td>
                  <td>{a.date}</td>
                  <td>{a.time}</td>
                  <td><St x={a.status} /></td>
                </tr>
              ))}
              {today.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", color: "#8190a5", padding: 24 }}>No appointments today.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div className="panel" style={{ marginTop: 22 }}>
        <div className="panel-header">
          <h2>Recent Appointments</h2>
          <button className="view-all" onClick={() => go("Appointments")}>View All</button>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Patient</th><th>Doctor</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
            <tbody>
              {appts.slice(0, 8).map(a => (
                <tr key={a.id}>
                  <td>{a.patient}</td>
                  <td>{a.doctor}</td>
                  <td>{a.date}</td>
                  <td>{a.time}</td>
                  <td><St x={a.status} /></td>
                </tr>
              ))}
              {appts.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", color: "#8190a5", padding: 24 }}>No appointments yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
