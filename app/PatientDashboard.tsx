"use client";
import { useState, useEffect } from "react";
import { Av, St, Loading, EmptyState, PageHeader } from "./ui";
import { getAppointmentsByPatient, getDoctors, getServices, getNotifications, markAllRead, Appointment, Doctor, Service, Notification } from "./supabase";

export function PatientDashboard({ name, email, go }: { name: string; email: string; go: (p: string, d?: unknown) => void }) {
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getAppointmentsByPatient(email),
      getNotifications(email),
    ]).then(([a, n]) => {
      setAppts(a.data ?? []);
      setNotifs(n.data ?? []);
      setLoading(false);
    });
  }, [email]);

  const upcoming = appts.filter(a => ["Pending", "Approved"].includes(a.status)).slice(0, 3);
  const unread = notifs.filter(n => !n.is_read);
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = name.split(" ")[0];

  if (loading) return <Loading />;

  return (
    <>
      <div className="welcome-bar">
        <div>
          <h1>{greet}, {firstName}! 👋</h1>
          <p>How can we help with your health today?</p>
        </div>
        <Av x={firstName.slice(0, 2).toUpperCase()} size="av-lg" />
      </div>

      {unread.length > 0 && (
        <div className="panel" style={{ marginBottom: 18, background: "#f0f6ff", border: "1px solid #b8d8f8" }}>
          <div className="panel-header">
            <h2>🔔 Notifications ({unread.length} unread)</h2>
            <button className="link-btn" onClick={() => { markAllRead(email); setNotifs(p => p.map(n => ({ ...n, is_read: true }))); }}>Mark all read</button>
          </div>
          {unread.slice(0, 3).map(n => (
            <div key={n.id} style={{ padding: "8px 0", borderBottom: "1px solid #e0eefa", fontSize: 13 }}>
              <b>{n.title}</b> — {n.message}
            </div>
          ))}
        </div>
      )}

      <div className="action-cards">
        {[["📅", "Book Appointment", "Schedule your visit", "Book Appointment"],
          ["🔍", "Find a Doctor", "View our doctors", "Find a Doctor"],
          ["📋", "My Appointments", "View your appointments", "My Appointments"],
          ["📁", "Medical Records", "View your health records", "Medical Records"]
        ].map(([icon, title, sub, page]) => (
          <button key={title} className="action-card" onClick={() => go(page)}>
            <div className="action-card-icon">{icon}</div>
            <b>{title}</b><span>{sub}</span>
          </button>
        ))}
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Upcoming Appointments</h2>
          <button className="link-btn" onClick={() => go("My Appointments")}>View All</button>
        </div>
        {upcoming.length ? upcoming.map(a => (
          <div key={a.id} className="upcoming-appt">
            <Av x={a.doctor.split(" ").filter((_, i) => i > 0).map(w => w[0]).join("").slice(0, 2).toUpperCase()} />
            <div className="info"><b>{a.doctor}</b><p>{a.service} — {a.reason}</p></div>
            <div className="time">{a.date}<small>{a.time}</small></div>
            <St x={a.status} />
          </div>
        )) : <EmptyState msg="No upcoming appointments. Book one now!" />}
      </div>
    </>
  );
}

export function FindDoctor({ go }: { go: (p: string, d?: unknown) => void }) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [search, setSearch] = useState("");
  const [spec, setSpec] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => { getDoctors().then(r => { setDoctors(r.data ?? []); setLoading(false); }); }, []);

  const specs = ["All", ...Array.from(new Set(doctors.map(d => d.spec)))];
  const filtered = doctors.filter(d => {
    const q = search.toLowerCase();
    return (d.name.toLowerCase().includes(q) || d.spec.toLowerCase().includes(q))
      && (spec === "All" || d.spec === spec);
  });

  return (
    <>
      <PageHeader title="Find a Doctor" sub="Browse our available doctors" />
      <div className="filters">
        <input placeholder="Search doctor or specialization..." value={search} onChange={e => setSearch(e.target.value)} />
        <select value={spec} onChange={e => setSpec(e.target.value)}>
          {specs.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      {loading ? <Loading /> : filtered.length ? (
        <div className="doctor-list">
          {filtered.map(d => (
            <div key={d.id} className="doctor-card">
              <Av x={d.initials} size="av-lg" />
              <div className="info">
                <b>{d.name}</b>
                <p>{d.spec}</p>
                <div className="rating">★ {d.rating} <span style={{ color: "#8190a5", fontWeight: 400 }}>({d.reviews} reviews)</span></div>
                <div className={d.avail.includes("Tomorrow") ? "avail-tomorrow" : "avail-today"}>● {d.avail}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <button className="btn btn-outline btn-sm" onClick={() => go("Doctor Profile", d)}>View Profile</button>
                <button className="btn btn-primary btn-sm" onClick={() => go("Book Appointment", d)}>Book</button>
              </div>
            </div>
          ))}
        </div>
      ) : <EmptyState msg="No doctors found." />}
    </>
  );
}

export function PatientServicesList({ go }: { go: (p: string) => void }) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getServices().then(r => { setServices(r.data ?? []); setLoading(false); }); }, []);
  return (
    <>
      <PageHeader title="Clinic Services" sub="Services we offer" />
      {loading ? <Loading /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {services.map(s => (
            <div key={s.id} className="panel" style={{ cursor: "pointer" }} onClick={() => go("Book Appointment")}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>🏥</div>
              <b style={{ fontSize: 14, fontWeight: 700 }}>{s.name}</b>
              <p style={{ color: "#8190a5", fontSize: 12, marginTop: 6 }}>{s.description}</p>
              <p style={{ color: "#0867d3", fontSize: 12, marginTop: 8, fontWeight: 600 }}>⏱ {s.duration_minutes} mins</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
