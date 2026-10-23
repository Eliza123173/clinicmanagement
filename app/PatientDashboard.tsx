"use client";
import { useState, useEffect } from "react";
import { Av, St, Loading, EmptyState, PageHeader } from "./ui";
import { getAppointments, getAppointmentsByPatient, getDoctors, getSchedules, getServices, Appointment, Doctor, Schedule, Service } from "./supabase";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const normalizeDoctorName = (name: string) => name.trim().toLowerCase().replace(/^dr\.?\s*/, "").replace(/\s+/g, " ");
function slotsForSchedule(schedule: Schedule): string[] {
  const toMinutes = (value: string) => {
    const [clock, period] = value.split(" ");
    let [hour, minute] = clock.split(":").map(Number);
    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;
    return hour * 60 + minute;
  };
  const toTime = (minutes: number) => {
    let hour = Math.floor(minutes / 60);
    const period = hour >= 12 ? "PM" : "AM";
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;
    return `${hour}:${String(minutes % 60).padStart(2, "0")} ${period}`;
  };
  const duration = schedule.slot_duration || 30;
  const slots: string[] = [];
  for (let start = toMinutes(schedule.start_time), end = toMinutes(schedule.end_time); start + duration <= end; start += duration) slots.push(toTime(start));
  return slots;
}

export function PatientDashboard({ name, email, go }: { name: string; email: string; go: (p: string, d?: unknown) => void }) {
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAppointmentsByPatient(email).then(a => {
      setAppts(a.data ?? []);
      setLoading(false);
    });
  }, [email]);

  const upcoming = appts.filter(a => ["Pending", "Approved"].includes(a.status)).slice(0, 3);
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = name.split(" ")[0];

  if (loading) return <Loading />;

  return (
    <>
      <div className="welcome-bar">
        <div className="welcome-bar-left">
          <div className="welcome-bar-icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              <line x1="12" y1="9" x2="12" y2="15"/>
              <line x1="9" y1="12" x2="15" y2="12"/>
            </svg>
          </div>
          <div>
            <h1>{greet}, {firstName}!</h1>
            <p>How can we help with your health today?</p>
          </div>
        </div>
        <div className="welcome-bar-right">
          <b>CareWell Clinic</b>
          <span>Patient Portal</span>
        </div>
      </div>

      <div className="action-cards">
        {[
          [<svg key="a" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>, "Book Appointment", "Schedule your visit", "Book Appointment"],
          [<svg key="b" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>, "Find a Doctor", "View our doctors", "Find a Doctor"],
          [<svg key="c" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>, "My Appointments", "View your appointments", "My Appointments"],
          [<svg key="d" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>, "Medical Records", "View your health records", "Medical Records"],
        ].map(([icon, title, sub, pg]) => (
          <button key={title as string} className="action-card" onClick={() => go(pg as string)}>
            <div className="action-card-icon">{icon}</div>
            <b>{title as string}</b><span>{sub as string}</span>
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
  const [todayAvailability, setTodayAvailability] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [spec, setSpec] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDoctors(), getSchedules(), getAppointments()]).then(([doctorResult, scheduleResult, appointmentResult]) => {
      const doctorList = doctorResult.data ?? [];
      const schedules = (scheduleResult.data ?? []) as Schedule[];
      const appointments = (appointmentResult.data ?? []) as Appointment[];
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const availability: Record<string, string> = {};

      for (const doctor of doctorList) {
        let nextAvailability = "No open slots in the next 30 days";
        for (let offset = 0; offset < 30; offset++) {
          const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
          const dayName = WEEKDAYS[date.getDay()];
          const schedule = schedules.find(s => normalizeDoctorName(s.doctor) === normalizeDoctorName(doctor.name) && s.day === dayName && s.is_available);
          if (!schedule) continue;

          const dateLabel = date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
          const booked = appointments.filter(a => a.doctor === doctor.name && a.date === dateLabel && !["Cancelled", "Rejected"].includes(a.status)).map(a => a.time);
          const openSlots = slotsForSchedule(schedule).filter(slot => {
            const [clock, period] = slot.split(" ");
            let [hour, minute] = clock.split(":").map(Number);
            if (period === "PM" && hour !== 12) hour += 12;
            if (period === "AM" && hour === 12) hour = 0;
            return (offset > 0 || hour * 60 + minute > nowMinutes) && !booked.includes(slot);
          });
          if (openSlots.length) {
            const dateText = offset === 0 ? "Today" : date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
            nextAvailability = `${offset === 0 ? "Available today" : `Next available: ${dateText}`} · ${openSlots.length} slots`;
            break;
          }
        }
        availability[doctor.id] = nextAvailability;
      }

      setDoctors(doctorList);
      setTodayAvailability(availability);
      setLoading(false);
    });
  }, []);

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
                <div className="rating">★ {d.rating} <span style={{ color: "#475569", fontWeight: 400 }}>({d.reviews} reviews)</span></div>
                <div className={todayAvailability[d.id]?.startsWith("No open") ? "avail-tomorrow" : "avail-today"}>● {todayAvailability[d.id] ?? "Checking availability..."}</div>
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
              <div style={{ marginBottom: 10 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0797A8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              </div>
              <b style={{ fontSize: 14, fontWeight: 700 }}>{s.name}</b>
              <p style={{ color: "#475569", fontSize: 12, marginTop: 6 }}>{s.description}</p>
              <p style={{ color: "#087F8C", fontSize: 12, marginTop: 8, fontWeight: 600 }}>{s.duration_minutes} mins</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
