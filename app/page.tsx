"use client";
import { useState, useEffect } from "react";
import AuthScreens from "./AuthScreens";
import { Av } from "./ui";
import { PatientDashboard, FindDoctor, PatientServicesList } from "./PatientDashboard";
import { MyAppointments, PatientMedicalRecords, PatientProfile } from "./PatientViews";
import { BookAppointment } from "./BookAppointment";
import { AdminDashboard } from "./AdminDashboard";
import { PatientManagement, DoctorManagement, AppointmentManagement, ServiceManagement } from "./AdminCRUD";
import { ScheduleManagement, MedicalRecordsManagement, Reports, AdminSettings } from "./AdminViews";
import { ActivityLog } from "./ActivityLog";
import { DoctorPortal } from "./DoctorPortal";
import { getNotifications, markAllRead, Notification, Doctor } from "./supabase";

type Role = "Patient" | "Doctor" | "Admin";

const PATIENT_NAV = [
  { label: "Dashboard", icon: "🏠" },
  { label: "Find a Doctor", icon: "🔍" },
  { label: "Services", icon: "🏥" },
  { label: "Book Appointment", icon: "📅" },
  { label: "My Appointments", icon: "📋" },
  { label: "Medical Records", icon: "📁" },
  { label: "My Profile", icon: "👤" },
];

const ADMIN_NAV = [
  { label: "Dashboard", icon: "🏠" },
  { label: "Patients", icon: "👥" },
  { label: "Doctors", icon: "🩺" },
  { label: "Appointments", icon: "📋" },
  { label: "Services", icon: "🏥" },
  { label: "Schedules", icon: "🗓" },
  { label: "Medical Records", icon: "📁" },
  { label: "Reports", icon: "📊" },
  { label: "Activity History", icon: "📜" },
  { label: "Settings", icon: "⚙️" },
];

const DOCTOR_NAV = [
  { label: "Dashboard", icon: "🏠" },
];

export default function Home() {
  const [authed, setAuthed] = useState(false);
  const [role, setRole] = useState<Role>("Patient");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [page, setPage] = useState("Dashboard");
  const [pageData, setPageData] = useState<unknown>(null);
  const [checking, setChecking] = useState(true);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [doctorRecord, setDoctorRecord] = useState<Doctor | null>(null);

  // Restore session
  useEffect(() => {
    import("./supabase").then(({ supabase }) => {
      supabase.auth.getSession().then(async ({ data }) => {
        if (data.session) {
          const email = data.session.user.email ?? "";
          const { data: doc } = await supabase.from("doctors").select("*").eq("email", email).limit(1);
          const restoredRole: Role = email === "admin@carewell.com" ? "Admin"
            : doc?.[0] ? "Doctor" : "Patient";
          const { data: pat } = restoredRole === "Patient"
            ? await supabase.from("patients").select("name").eq("email", email).limit(1)
            : { data: null };
          const meta = data.session.user.user_metadata;
          const restoredName = restoredRole === "Admin" ? "Administrator"
            : doc?.[0]?.name || pat?.[0]?.name || (meta?.full_name as string | undefined) || email.split("@")[0];
          setRole(restoredRole);
          setUserName(restoredName);
          setUserEmail(email);
          if (restoredRole === "Doctor" && doc?.[0]) setDoctorRecord(doc[0]);
          setAuthed(true);
        }
        setChecking(false);
      });
    });
  }, []);

  // Load notifications
  useEffect(() => {
    if (authed && userEmail) {
      getNotifications(userEmail).then(r => setNotifs(r.data ?? []));
    }
  }, [authed, userEmail, page]);

  function handleEnter(r: Role, name: string, email: string, doctor?: Doctor) {
    setRole(r); setUserName(name); setUserEmail(email);
    if (doctor) setDoctorRecord(doctor);
    setPage("Dashboard"); setPageData(null); setAuthed(true);
  }

  function go(p: string, data?: unknown) { setPage(p); setPageData(data ?? null); }

  function logout() {
    import("./supabase").then(({ supabase }) => supabase.auth.signOut());
    setAuthed(false); setRole("Patient"); setUserName(""); setUserEmail("");
    setPage("Dashboard"); setPageData(null); setDoctorRecord(null);
  }

  if (checking) return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div className="spinner" style={{ width: 36, height: 36, margin: "0 auto 12px" }} />
        <p style={{ color: "#8190a5" }}>Loading...</p>
      </div>
    </div>
  );

  if (!authed) return <AuthScreens onEnter={handleEnter} />;

  const nav = role === "Patient" ? PATIENT_NAV : role === "Doctor" ? DOCTOR_NAV : ADMIN_NAV;
  const words = userName.trim().split(" ").filter(Boolean);
  const initials = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : userName.slice(0, 2).toUpperCase();
  const unreadCount = notifs.filter(n => !n.is_read).length;

  // Active nav label (handle sub-pages)
  const subPageMap: Record<string, string> = {
    "Doctor Profile": "Find a Doctor",
    "Book Appointment": "Book Appointment",
  };
  const activeNav = subPageMap[page] ?? page;

  function renderPage() {
    if (role === "Doctor") {
      if (!doctorRecord) return (
        <div style={{ padding: 40, textAlign: "center", color: "#8190a5" }}>
          <p>Doctor profile not found. Please contact the administrator.</p>
        </div>
      );
      return <DoctorPortal doctorName={doctorRecord.name} doctorSpec={doctorRecord.spec} doctorInitials={doctorRecord.initials} />;
    }

    if (role === "Patient") {
      if (page === "Dashboard") return <PatientDashboard name={userName} email={userEmail} go={go} />;
      if (page === "Find a Doctor") return <FindDoctor go={go} />;
      if (page === "Services") return <PatientServicesList go={go} />;
      if (page === "Doctor Profile") return (
        <DoctorProfilePage doctor={pageData as Doctor} go={go} />
      );
      if (page === "Book Appointment") return (
        <BookAppointment
          preDoctor={pageData as Doctor | undefined}
          patientName={userName}
          patientEmail={userEmail}
          onBooked={() => go("My Appointments")}
        />
      );
      if (page === "My Appointments") return <MyAppointments patientName={userName} email={userEmail} />;
      if (page === "Medical Records") return <PatientMedicalRecords email={userEmail} />;
      if (page === "My Profile") return <PatientProfile email={userEmail} />;
    }

    if (role === "Admin") {
      if (page === "Dashboard") return <AdminDashboard go={go} />;
      if (page === "Patients") return <PatientManagement />;
      if (page === "Doctors") return <DoctorManagement />;
      if (page === "Appointments") return <AppointmentManagement />;
      if (page === "Services") return <ServiceManagement />;
      if (page === "Schedules") return <ScheduleManagement />;
      if (page === "Medical Records") return <MedicalRecordsManagement />;
      if (page === "Reports") return <Reports />;
      if (page === "Activity History") return <ActivityLog />;
      if (page === "Settings") return <AdminSettings />;
    }

    return null;
  }

  return (
    <main>
      <aside>
        <div className="brand">
          <div className="brand-icon">
            <img src="/emc-logo.png" alt="logo" style={{ width: 28, height: 28, objectFit: "contain", borderRadius: "50%" }} />
          </div>
          <span>CareWell Clinic</span>
        </div>
        <nav>
          {nav.map(({ label, icon }) => (
            <button
              key={label}
              className={activeNav === label ? "nav-active" : ""}
              onClick={() => go(label)}
            >
              <span style={{ fontSize: 16, width: 20, flexShrink: 0 }}>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div style={{ padding: "8px 12px", fontSize: 12, color: "#c5dcff", marginBottom: 4 }}>
            <div style={{ fontWeight: 700, color: "#fff" }}>{userName}</div>
            <div style={{ opacity: 0.7 }}>{role}</div>
          </div>
          <button className="logout-btn" onClick={logout}>
            <span style={{ fontSize: 16, width: 20 }}>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="work">
        <header>
          <div className="header-left">
            CareWell Clinic <span>/ {page}</span>
          </div>
          <div className="header-right">
            {role !== "Doctor" && (
              <div style={{ position: "relative" }}>
                <button className="notif-btn" onClick={() => setShowNotifs(v => !v)}>
                  🔔
                  {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
                </button>
                {showNotifs && (
                  <NotifPanel
                    notifs={notifs}
                    onClose={() => setShowNotifs(false)}
                    onMarkAll={() => {
                      markAllRead(userEmail);
                      setNotifs(p => p.map(n => ({ ...n, is_read: true })));
                    }}
                  />
                )}
              </div>
            )}
            <Av x={initials} />
          </div>
        </header>
        <article>{renderPage()}</article>
      </div>
    </main>
  );
}

// ── Doctor Profile Page ────────────────────────────────
function DoctorProfilePage({ doctor, go }: { doctor: Doctor; go: (p: string, d?: unknown) => void }) {
  if (!doctor) return <div style={{ padding: 40, color: "#8190a5" }}>Doctor not found.</div>;
  return (
    <div className="panel">
      <button className="btn btn-outline btn-sm" style={{ marginBottom: 18 }} onClick={() => go("Find a Doctor")}>← Back to Doctors</button>
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        <Av x={doctor.initials} size="av-xl" />
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{doctor.name}</h2>
          <p style={{ color: "#8190a5", marginBottom: 8 }}>{doctor.spec}</p>
          <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
            <span style={{ fontSize: 13 }}>⭐ {doctor.rating} ({doctor.reviews} reviews)</span>
            <span style={{ fontSize: 13 }}>🏥 {doctor.years}+ years</span>
            <span style={{ fontSize: 13 }}>👥 {doctor.patients}+ patients</span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-primary" onClick={() => go("Book Appointment", doctor)}>Book Appointment</button>
            <button className="btn btn-outline" onClick={() => go("Find a Doctor")}>Back</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Notification Panel ─────────────────────────────────
function NotifPanel({ notifs, onClose, onMarkAll }: { notifs: Notification[]; onClose: () => void; onMarkAll: () => void }) {
  return (
    <div className="notif-panel">
      <div className="notif-panel-header">
        <span>Notifications</span>
        <button className="link-btn" onClick={onMarkAll}>Mark all read</button>
      </div>
      <div style={{ maxHeight: 320, overflowY: "auto" }}>
        {notifs.length === 0 && <div className="notif-empty">No notifications yet.</div>}
        {notifs.slice(0, 10).map(n => (
          <div key={n.id} className={`notif-item ${!n.is_read ? "unread" : ""}`}>
            <b>{n.title}</b>
            <p>{n.message}</p>
            <time>{new Date(n.created_at).toLocaleString()}</time>
          </div>
        ))}
      </div>
      <div style={{ padding: "10px 16px", borderTop: "1px solid #f0f4f9" }}>
        <button className="link-btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
