"use client";
import { useState, useEffect } from "react";
import AuthScreens from "./AuthScreens";
import { Av } from "./ui";
import { PatientDashboard, FindDoctor, DoctorProfile, BookAppointment, MyAppointments, MedicalRecords, PatientProfile } from "./PatientViews";
import { AdminDashboard } from "./AdminDashboard";
import { PatientManagement, DoctorManagement, AppointmentManagement } from "./AdminCRUD";
import { ScheduleManagement, MedicalRecordsManagement, Reports, AdminSettings } from "./AdminViews";
import { DoctorPortal } from "./DoctorPortal";
import { getDoctors, Doctor } from "./supabase";
import { MessageBoard } from "./MessageBoard";
import { ActivityLog } from "./ActivityLog";

type Role = "Patient" | "Admin" | "Doctor";

const PATIENT_NAV = [
  { label: "Dashboard", icon: "🏠" },
  { label: "Find a Doctor", icon: "🔍" },
  { label: "My Appointments", icon: "📋" },
  { label: "Medical Records", icon: "📁" },
  { label: "Message Board", icon: "💬" },
  { label: "My Profile", icon: "👤" },
];

const ADMIN_NAV = [
  { label: "Dashboard", icon: "🏠" },
  { label: "Patients", icon: "👥" },
  { label: "Doctors", icon: "🩺" },
  { label: "Appointments", icon: "📋" },
  { label: "Schedules", icon: "🗓" },
  { label: "Medical Records", icon: "📁" },
  { label: "Reports", icon: "📊" },
  { label: "Message Board", icon: "💬" },
  { label: "Activity History", icon: "📜" },
  { label: "Settings", icon: "⚙️" },
];

const DOCTOR_NAV = [
  { label: "Dashboard", icon: "🏠" },
  { label: "My Appointments", icon: "📋" },
  { label: "My Schedule", icon: "🗓" },
  { label: "Message Board", icon: "💬" },
];

export default function Home() {
  const [authed, setAuthed] = useState(false);
  const [role, setRole] = useState<Role>("Patient");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [page, setPage] = useState("Dashboard");
  const [pageData, setPageData] = useState<unknown>(null);
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  const [doctorRecord, setDoctorRecord] = useState<Doctor | null>(null);
  const [checking, setChecking] = useState(true);

  // Restore session on page refresh
  useEffect(() => {
    import("./supabase").then(({ supabase }) => {
      supabase.auth.getSession().then(async ({ data }) => {
        if (data.session) {
          const email = data.session.user.email ?? "";
          const { data: doctor } = await supabase.from("doctors").select("name").eq("email", email).limit(1);
          const restoredRole: Role = email === "admin@carewell.com" ? "Admin" : doctor?.[0] ? "Doctor" : "Patient";
          const { data: patient } = restoredRole === "Patient" ? await supabase.from("patients").select("name").eq("email", email).limit(1) : { data: null };
          const restoredName = restoredRole === "Admin" ? "Administrator" : doctor?.[0]?.name || patient?.[0]?.name || data.session.user.user_metadata.full_name || email.split("@")[0];
          setRole(restoredRole);
          setUserName(restoredName);
          setUserEmail(email);
          setAuthed(true);
        }
        setChecking(false);
      });
    });
  }, []);

  useEffect(() => {
    if (authed) getDoctors().then(r => setAllDoctors(r.data ?? []));
  }, [authed]);

  useEffect(() => {
    if (role === "Doctor" && userEmail && allDoctors.length) {
      const match = allDoctors.find(d => (d as Doctor & { email?: string }).email === userEmail);
      if (match) setDoctorRecord(match);
    }
  }, [role, userEmail, allDoctors]);

  function handleEnter(r: Role, name: string, email: string) {
    localStorage.setItem("cwRole", r);
    localStorage.setItem("cwName", name);
    setRole(r); setUserName(name); setUserEmail(email);
    setPage("Dashboard"); setPageData(null); setDoctorRecord(null); setAuthed(true);
  }

  function go(p: string, data?: unknown) {
    setPage(p); setPageData(data ?? null);
  }

  function logout() {
    localStorage.removeItem("cwRole");
    localStorage.removeItem("cwName");
    import("./supabase").then(({ supabase }) => supabase.auth.signOut());
    setAuthed(false); setPage("Dashboard"); setPageData(null);
  }

  if (checking) return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}><div className="spinner" /></div>;

  if (!authed) return <AuthScreens onEnter={handleEnter} />;

  const nav = role === "Patient" ? PATIENT_NAV : role === "Doctor" ? DOCTOR_NAV : ADMIN_NAV;
  const initials = userName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "U";

  function renderPage() {
    if (role === "Doctor") {
      if (page === "Message Board") return <MessageBoard email={userEmail} name={userName} role={role} />;
      if (!doctorRecord) return (
        <>
          <div style={{ marginBottom: 22 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Select Your Profile</h1>
            <p style={{ color: "#8190a5" }}>Which doctor are you?</p>
          </div>
          <div className="doctor-list">
            {allDoctors.map(d => (
              <div key={d.id} className="doctor-card" style={{ cursor: "pointer" }} onClick={() => setDoctorRecord(d)}>
                <Av x={d.initials} size="av-lg" />
                <div className="info"><b>{d.name}</b><p>{d.spec}</p></div>
                <button className="btn btn-primary btn-sm">Select</button>
              </div>
            ))}
          </div>
        </>
      );
      return <DoctorPortal doctorName={doctorRecord.name} doctorSpec={doctorRecord.spec} doctorInitials={doctorRecord.initials} />;
    }

    if (role === "Patient") {
      if (page === "Dashboard") return <PatientDashboard name={userName} go={go} />;
      if (page === "Find a Doctor") return <FindDoctor go={go} />;
      if (page === "Doctor Profile") return <DoctorProfile doctor={pageData as Doctor} go={go} />;
      if (page === "Book Appointment") return <BookAppointment doctor={pageData as Doctor | undefined} allDoctors={allDoctors} patientName={userName} onBooked={() => go("My Appointments")} />;
      if (page === "My Appointments") return <MyAppointments patientName={userName} />;
      if (page === "Medical Records") return <MedicalRecords patientName={userName} />;
      if (page === "Message Board") return <MessageBoard email={userEmail} name={userName} role={role} />;
      if (page === "My Profile") return <PatientProfile patientName={userName} patientEmail={userEmail} />;
    }

    if (role === "Admin") {
      if (page === "Dashboard") return <AdminDashboard go={go} />;
      if (page === "Patients") return <PatientManagement />;
      if (page === "Doctors") return <DoctorManagement />;
      if (page === "Appointments") return <AppointmentManagement />;
      if (page === "Schedules") return <ScheduleManagement />;
      if (page === "Medical Records") return <MedicalRecordsManagement />;
      if (page === "Reports") return <Reports />;
      if (page === "Message Board") return <MessageBoard email={userEmail} name={userName} role={role} />;
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
              className={page === label || (page === "Doctor Profile" && label === "Find a Doctor") || (page === "Book Appointment" && label === "Find a Doctor") ? "nav-active" : ""}
              onClick={() => go(label)}
            >
              <span style={{ fontSize: 17, width: 22, flexShrink: 0 }}>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={logout}>
            <span style={{ fontSize: 17, width: 22 }}>🚪</span>
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
            <button className="notif-btn">🔔</button>
            <Av x={initials} />
          </div>
        </header>
        <article>
          {renderPage()}
        </article>
      </div>
    </main>
  );
}
