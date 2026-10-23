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
import { getNotifications, markAllRead, Notification, Doctor, supabase } from "./supabase";

type Role = "Patient" | "Doctor" | "Admin";
type GlobalSearchResult = { id: string; title: string; detail: string; category: string; page: string; data?: unknown };

const PATIENT_NAV = [
  { label: "Dashboard", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
  { label: "Find a Doctor", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
  { label: "Services", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> },
  { label: "Book Appointment", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  { label: "My Appointments", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> },
  { label: "Medical Records", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> },
];

const ADMIN_NAV = [
  { label: "Dashboard", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
  { label: "Patients", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { label: "Doctors", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> },
  { label: "Appointments", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  { label: "Services", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> },
  { label: "Schedules", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
  { label: "Medical Records", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> },
  { label: "Reports", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  { label: "Activity History", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
  { label: "Settings", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
];

const DOCTOR_NAV = [
  { label: "Dashboard", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
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
  const [showProfile, setShowProfile] = useState(false);
  const [doctorRecord, setDoctorRecord] = useState<Doctor | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GlobalSearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Restore session
  useEffect(() => {
    import("./supabase").then(({ supabase }) => {
      supabase.auth.getSession().then(async ({ data }) => {
        if (data.session) {
          const email = data.session.user.email ?? "";
          const { data: doc } = await supabase.from("doctors").select("*").eq("email", email).limit(1);
          const restoredRole: Role = email === "elizcayampat@gmail.com" ? "Admin"
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

  useEffect(() => {
    const query = searchQuery.trim();
    if (!authed || query.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    const timer = window.setTimeout(async () => {
      const pattern = `%${query}%`;
      const [doctorRes, serviceRes, appointmentRes] = await Promise.all([
        supabase.from("doctors").select("id,name,spec,is_active").eq("is_active", true).or(`name.ilike.${pattern},spec.ilike.${pattern}`).limit(5),
        supabase.from("services").select("id,name,description,is_active").eq("is_active", true).or(`name.ilike.${pattern},description.ilike.${pattern}`).limit(5),
        role === "Admin"
          ? supabase.from("appointments").select("id,patient,doctor,service,date,time,status").or(`patient.ilike.${pattern},doctor.ilike.${pattern},service.ilike.${pattern}`).limit(5)
          : role === "Patient"
            ? supabase.from("appointments").select("id,patient,doctor,service,date,time,status").eq("patient_email", userEmail.trim().toLowerCase()).or(`doctor.ilike.${pattern},service.ilike.${pattern},date.ilike.${pattern}`).limit(5)
            : supabase.from("appointments").select("id,patient,doctor,service,date,time,status").eq("doctor", doctorRecord?.name ?? "").or(`patient.ilike.${pattern},service.ilike.${pattern},date.ilike.${pattern}`).limit(5),
      ]);
      let patientRows: { id: string; name: string; email: string }[] = [];
      if (role === "Admin") {
        const { data } = await supabase.from("patients").select("id,name,email").or(`name.ilike.${pattern},email.ilike.${pattern}`).limit(5);
        patientRows = data ?? [];
      }
      if (cancelled) return;
      const results: GlobalSearchResult[] = [
        ...(patientRows.map(p => ({ id: p.id, title: p.name, detail: p.email, category: "Patient", page: "Patients" }))),
        ...((doctorRes.data ?? []).map(d => ({ id: d.id, title: d.name, detail: d.spec, category: "Doctor", page: role === "Patient" ? "Find a Doctor" : "Doctors" }))),
        ...((appointmentRes.data ?? []).map(a => ({ id: a.id, title: `${a.patient} · ${a.doctor}`, detail: `${a.date} at ${a.time} · ${a.status}`, category: "Appointment", page: role === "Patient" ? "My Appointments" : "Appointments", data: role === "Admin" ? a.id : undefined }))),
        ...((serviceRes.data ?? []).map(s => ({ id: s.id, title: s.name, detail: s.description ?? "Clinic service", category: "Service", page: role === "Patient" ? "Services" : "Services" }))),
      ];
      setSearchResults(results.slice(0, 12));
      setSearchLoading(false);
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [searchQuery, authed, role, userEmail, doctorRecord]);

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    function handle(e: MouseEvent | KeyboardEvent) {
      if (e instanceof KeyboardEvent && e.key === "Escape") {
        setShowNotifs(false); setShowProfile(false); setSearchOpen(false); return;
      }
      const t = e.target as HTMLElement;
      if (!t.closest(".notif-btn") && !t.closest(".notif-panel")) setShowNotifs(false);
      if (!t.closest(".header-profile") && !t.closest(".profile-dropdown")) setShowProfile(false);
      if (!t.closest(".global-search")) setSearchOpen(false);
    }
    document.addEventListener("mousedown", handle);
    document.addEventListener("keydown", handle);
    return () => { document.removeEventListener("mousedown", handle); document.removeEventListener("keydown", handle); };
  }, []);

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
        <p style={{ color: "#64748b" }}>Loading...</p>
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
      if (page === "Account Settings") return <PatientProfile email={userEmail} defaultTab="settings" />;
    }

    if (role === "Admin") {
      if (page === "Dashboard") return <AdminDashboard go={go} />;
      if (page === "Patients") return <PatientManagement />;
      if (page === "Doctors") return <DoctorManagement onManageSchedules={() => go("Schedules")} />;
      if (page === "Appointments") return <AppointmentManagement focusAppointmentId={pageData as string | null} />;
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
          <div className="brand-text">
            <span>CareWell Clinic</span>
            <span>Healthcare System</span>
          </div>
        </div>
        <nav>
          {nav.map(({ label, icon }) => (
            <button
              key={label}
              className={activeNav === label ? "nav-active" : ""}
              onClick={() => go(label)}
            >
              <span style={{ width: 20, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <Av x={initials} />
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{userName}</div>
              <div className="sidebar-user-role">{role}</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="work">
        <header>
          <div className="header-left">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0797A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            CareWell Clinic <span>/ {page}</span>
          </div>
          <div className="header-search global-search">
            <span className="header-search-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <input
              value={searchQuery ?? ""}
              onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={e => {
                if (e.key === "Enter" && searchResults[0]) {
                  go(searchResults[0].page, searchResults[0].data);
                  setSearchQuery(""); setSearchOpen(false);
                }
              }}
              placeholder={role === "Patient" ? "Search doctors, appointments, or services..." : "Search patients, appointments, or services..."}
            />
            {searchOpen && searchQuery.trim().length >= 2 && (
              <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, zIndex: 30, background: "#fff", border: "1px solid #dceef2", borderRadius: 12, boxShadow: "0 12px 30px rgba(18,48,74,.16)", overflow: "hidden", maxHeight: 360, overflowY: "auto" }}>
                {searchLoading ? (
                  <div style={{ padding: 14, fontSize: 13, color: "#64748b" }}>Searching...</div>
                ) : searchResults.length ? searchResults.map(result => (
                  <button key={result.category + result.id} onMouseDown={e => e.preventDefault()} onClick={() => {
                    go(result.page, result.data);
                    setSearchQuery(""); setSearchOpen(false);
                  }} style={{ display: "block", width: "100%", padding: "11px 14px", border: 0, borderBottom: "1px solid #edf3f7", background: "#fff", textAlign: "left", cursor: "pointer" }}>
                    <span style={{ display: "block", fontSize: 10, color: "#07899a", fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>{result.category}</span>
                    <b style={{ display: "block", color: "#12304A", fontSize: 13 }}>{result.title}</b>
                    <span style={{ display: "block", color: "#64748b", fontSize: 11, marginTop: 2 }}>{result.detail}</span>
                  </button>
                )) : (
                  <div style={{ padding: 14, fontSize: 13, color: "#64748b" }}>No matching results.</div>
                )}
              </div>
            )}
          </div>
          <div className="header-right">
            {role !== "Doctor" && (
              <div style={{ position: "relative" }}>
                <button className="notif-btn" onClick={() => setShowNotifs(v => !v)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
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
                    onNotifClick={(n) => {
                      import("./supabase").then(({ markNotificationRead }) => markNotificationRead(n.id));
                      setNotifs(p => p.map(x => x.id === n.id ? { ...x, is_read: true } : x));
                      const isAppointment = n.type === "appointment" || n.type.startsWith("appointment:");
                      const appointmentId = n.type.startsWith("appointment:") ? n.type.slice("appointment:".length) : null;
                      const dest = isAppointment ? (role === "Admin" ? "Appointments" : "My Appointments")
                        : n.type === "record" ? "Medical Records"
                        : null;
                      if (dest) { go(dest, role === "Admin" && isAppointment ? appointmentId : null); setShowNotifs(false); }
                    }}
                  />
                )}
              </div>
            )}
            <div className="header-divider" />
            <div style={{ position: "relative" }}>
              <button className="header-profile" onClick={() => setShowProfile(v => !v)}>
                <Av x={initials} />
                <div className="header-profile-info">
                  <span className="header-profile-name">{userName}</span>
                  <span className="header-profile-role">{role}</span>
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 2 }}><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {showProfile && (
                <ProfileDropdown
                  userName={userName}
                  role={role}
                  initials={initials}
                  onMyProfile={() => { go("My Profile"); setShowProfile(false); }}
                  onSettings={() => { go(role === "Patient" ? "Account Settings" : "Settings"); setShowProfile(false); }}
                  onLogout={() => { setShowProfile(false); logout(); }}
                />
              )}
            </div>
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
            <span style={{ fontSize: 13, color: "#64748b" }}>★ {doctor.rating} ({doctor.reviews} reviews)</span>
            <span style={{ fontSize: 13, color: "#64748b" }}>{doctor.years}+ years exp.</span>
            <span style={{ fontSize: 13, color: "#64748b" }}>{doctor.patients}+ patients</span>
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
function NotifPanel({ notifs, onClose, onMarkAll, onNotifClick }: {
  notifs: Notification[]; onClose: () => void; onMarkAll: () => void;
  onNotifClick: (n: Notification) => void;
}) {
  return (
    <div className="notif-panel">
      <div className="notif-panel-header">
        <span>Notifications</span>
        <button className="link-btn" onClick={onMarkAll}>Mark all read</button>
      </div>
      <div style={{ maxHeight: 320, overflowY: "auto" }}>
        {notifs.length === 0 && <div className="notif-empty">No notifications yet.</div>}
        {notifs.slice(0, 10).map(n => (
          <div key={n.id} className={`notif-item ${!n.is_read ? "unread" : ""}`} onClick={() => onNotifClick(n)}>
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

// ── Profile Dropdown ───────────────────────────────────
function ProfileDropdown({ userName, role, initials, onMyProfile, onSettings, onLogout }: {
  userName: string; role: string; initials: string;
  onMyProfile: () => void; onSettings: () => void; onLogout: () => void;
}) {
  return (
    <div className="profile-dropdown">
      <div className="profile-dropdown-header">
        <Av x={initials} />
        <div>
          <div className="profile-dropdown-name">{userName}</div>
          <div className="profile-dropdown-role">{role}</div>
        </div>
      </div>
      {role === "Patient" && (
        <button className="profile-dropdown-item" onClick={onMyProfile}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          My Profile
        </button>
      )}
      <button className="profile-dropdown-item" onClick={onSettings}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        Account Settings
      </button>
      <div className="profile-dropdown-divider" />
      <button className="profile-dropdown-item profile-dropdown-danger" onClick={onLogout}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Logout
      </button>
    </div>
  );
}
