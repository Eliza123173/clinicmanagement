"use client";
import React, { useState, useEffect } from "react";
import { Av, St, Loading, Alert, PageHeader } from "./ui";
import { getDoctors, getServices, getSchedulesByDoctor, isSlotAvailable, addAppointment, sendNotification, logActivity, Doctor, Service } from "./supabase";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DAYS_FULL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function genSlots(start: string, end: string, duration: number): string[] {
  const slots: string[] = [];
  const toMins = (t: string) => {
    const [time, period] = t.split(" ");
    let [h, m] = time.split(":").map(Number);
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return h * 60 + m;
  };
  const toStr = (mins: number) => {
    let h = Math.floor(mins / 60), m = mins % 60;
    const p = h >= 12 ? "PM" : "AM";
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${h}:${m.toString().padStart(2, "0")} ${p}`;
  };
  let cur = toMins(start);
  const endM = toMins(end);
  while (cur + duration <= endM) { slots.push(toStr(cur)); cur += duration; }
  return slots;
}

function Calendar({ selected, onSelect, availableDays }: { selected: string; onSelect: (d: string) => void; availableDays: string[] }) {
  const today = new Date();
  const [yr, setYr] = useState(today.getFullYear());
  const [mo, setMo] = useState(today.getMonth());
  const first = new Date(yr, mo, 1).getDay();
  const daysInMonth = new Date(yr, mo + 1, 0).getDate();
  const fmt = (d: number) => `${MONTHS[mo]} ${d}, ${yr}`;
  const prev = () => { if (mo === 0) { setMo(11); setYr(y => y - 1); } else setMo(m => m - 1); };
  const next = () => { if (mo === 11) { setMo(0); setYr(y => y + 1); } else setMo(m => m + 1); };
  return (
    <div className="calendar">
      <div className="cal-header">
        <button className="cal-nav" onClick={prev}>‹</button>
        <h3>{MONTHS[mo]} {yr}</h3>
        <button className="cal-nav" onClick={next}>›</button>
      </div>
      <div className="cal-grid">
        {DAYS_SHORT.map(d => <div key={d} className="cal-day-name">{d}</div>)}
        {Array.from({ length: first }, (_, i) => <div key={"e" + i} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const d = i + 1;
          const label = fmt(d);
          const date = new Date(yr, mo, d);
          const dayName = DAYS_FULL[date.getDay()];
          const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const isAvail = availableDays.length === 0 || availableDays.includes(dayName);
          const isToday = d === today.getDate() && mo === today.getMonth() && yr === today.getFullYear();
          return (
            <button key={d} disabled={isPast || !isAvail}
              className={`cal-day ${selected === label ? "cal-day-selected" : ""} ${isToday && selected !== label ? "cal-day-today" : ""}`}
              onClick={() => onSelect(label)}>{d}</button>
          );
        })}
      </div>
    </div>
  );
}

export function BookAppointment({ preDoctor, patientName, patientEmail, onBooked }: {
  preDoctor?: Doctor; patientName: string; patientEmail: string; onBooked: () => void;
}) {
  const [step, setStep] = useState(preDoctor ? 1 : 0);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selDoc, setSelDoc] = useState<Doctor | null>(preDoctor ?? null);
  const [selService, setSelService] = useState("");
  const [selDate, setSelDate] = useState("");
  const [selSlot, setSelSlot] = useState("");
  const [reason, setReason] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [takenSlots, setTakenSlots] = useState<string[]>([]);
  const [availDays, setAvailDays] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    Promise.all([getDoctors(), getServices()]).then(([d, s]) => {
      setDoctors(d.data ?? []);
      setServices(s.data ?? []);
    });
  }, []);

  useEffect(() => {
    if (!selDoc) return;
    getSchedulesByDoctor(selDoc.name).then(r => {
      const scheds = r.data ?? [];
      setAvailDays(scheds.filter((s: { is_available: boolean }) => s.is_available).map((s: { day: string }) => s.day));
      if (scheds.length > 0) {
        const s = scheds[0];
        setSlots(genSlots(s.start_time, s.end_time, s.slot_duration || 30));
      }
    });
  }, [selDoc]);

  useEffect(() => {
    if (!selDoc || !selDate) return;
    setLoading(true);
    import("./supabase").then(({ supabase }) => {
      supabase.from("appointments").select("time").eq("doctor", selDoc.name).eq("date", selDate)
        .not("status", "in", '("Cancelled","Rejected")')
        .then(r => { setTakenSlots((r.data ?? []).map((a: { time: string }) => a.time)); setLoading(false); });
    });
  }, [selDoc, selDate]);

  async function submit() {
    if (!selDoc || !selDate || !selSlot || !selService || !reason) return setErr("Please complete all fields.");
    setErr("");
    const avail = await isSlotAvailable(selDoc.name, selDate, selSlot);
    if (!avail) return setErr("This slot was just taken. Please choose another.");
    setSubmitting(true);
    const { data: apptData, error: apptErr } = await addAppointment({ patient: patientName, patient_email: patientEmail.trim().toLowerCase(), doctor: selDoc.name, doctor_id: selDoc.id, date: selDate, time: selSlot, status: "Pending", reason, service: selService, notes: null, cancelled_by: null });
    if (apptErr) {
      setSubmitting(false);
      return setErr("Failed to save appointment: " + apptErr.message);
    }
    await sendNotification(patientEmail, "Appointment Submitted", `Your appointment with ${selDoc.name} on ${selDate} at ${selSlot} is pending approval.`, "info");
    await sendNotification("admin@carewell.com", "New Appointment", `${patientName} booked with ${selDoc.name} on ${selDate}.`, "info");
    await logActivity("Book Appointment", patientName, "Patient", `Booked with ${selDoc.name} on ${selDate} at ${selSlot}`, selDoc.name);
    setSubmitting(false);
    setDone(true);
  }

  const steps = ["Select Doctor", "Select Service", "Select Date", "Select Time", "Confirm"];

  if (done) return (
    <div className="confirm-wrap">
      <div className="confirm-icon">✓</div>
      <h1>Appointment Request Sent!</h1>
      <p>Your appointment has been submitted and is pending approval.</p>
      <div className="confirm-details">
        <h3>Appointment Details</h3>
        {[["Doctor", selDoc?.name], ["Service", selService], ["Date", selDate], ["Time", selSlot], ["Reason", reason], ["Status", "Pending"]].map(([k, v]) => (
          <div key={k} className="confirm-row"><span>{k}</span>{k === "Status" ? <St x="Pending" /> : <strong>{v}</strong>}</div>
        ))}
      </div>
      <div className="confirm-actions">
        <button className="btn btn-primary" onClick={onBooked}>View My Appointments</button>
        <button className="btn btn-outline" onClick={() => { setDone(false); setStep(0); setSelDoc(null); setSelDate(""); setSelSlot(""); setSelService(""); setReason(""); }}>Book Another</button>
      </div>
    </div>
  );

  return (
    <>
      <PageHeader title="Book Appointment" sub="Schedule your visit with a doctor" />
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
      <Alert type="error" msg={err} />

      {step === 0 && (
        <div className="panel">
          <h2 style={{ marginBottom: 16, fontSize: 15, fontWeight: 700 }}>Select a Doctor</h2>
          <div className="doctor-list">
            {doctors.map(d => (
              <div key={d.id} className="doctor-card" style={{ cursor: "pointer", border: selDoc?.id === d.id ? "2px solid #0867d3" : undefined }} onClick={() => setSelDoc(d)}>
                <Av x={d.initials} size="av-lg" />
                <div className="info"><b>{d.name}</b><p>{d.spec}</p></div>
                {selDoc?.id === d.id && <span style={{ color: "#0867d3", fontWeight: 700, fontSize: 13 }}>✓ Selected</span>}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
            <button className="btn btn-primary" disabled={!selDoc} onClick={() => setStep(1)}>Next</button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="panel">
          <h2 style={{ marginBottom: 4, fontSize: 15, fontWeight: 700 }}>Select a Service</h2>
          <p style={{ fontSize: 12, color: "#8190a5", marginBottom: 16 }}>Click on a service card to select it.</p>
          {services.length === 0 ? (
            <div className="form-group">
              <label>Service</label>
              <input value={selService} onChange={e => setSelService(e.target.value)} placeholder="Type the service name (e.g. General Consultation)" />
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
              {services.map(s => (
                <button key={s.id} onClick={() => setSelService(s.name)}
                  style={{ padding: 16, border: `2px solid ${selService === s.name ? "#0867d3" : "#e5edf6"}`, borderRadius: 8, background: selService === s.name ? "#f0f6ff" : "#fff", textAlign: "left", cursor: "pointer", transition: "all .15s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <b style={{ fontSize: 13, color: selService === s.name ? "#0867d3" : "#102447" }}>{s.name}</b>
                    {selService === s.name && <span style={{ color: "#0867d3", fontWeight: 700, fontSize: 13 }}>✓</span>}
                  </div>
                  <p style={{ fontSize: 12, color: "#8190a5", marginTop: 6 }}>{s.description}</p>
                  <p style={{ fontSize: 11, color: "#0867d3", marginTop: 6, fontWeight: 600 }}>{s.duration_minutes} mins</p>
                </button>
              ))}
            </div>
          )}
          <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between" }}>
            <button className="btn btn-outline" onClick={() => setStep(0)}>Back</button>
            <button className="btn btn-primary" disabled={!selService} onClick={() => setStep(2)}>Next</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div className="panel">
            <b style={{ fontSize: 13 }}>Selected Doctor</b>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
              <Av x={selDoc!.initials} />
              <div><b style={{ fontSize: 13 }}>{selDoc!.name}</b><p style={{ fontSize: 12, color: "#8190a5" }}>{selDoc!.spec}</p></div>
            </div>
            <div style={{ marginTop: 12, fontSize: 13 }}><b>Service:</b> {selService}</div>
            {availDays.length > 0 && <p style={{ fontSize: 12, color: "#8190a5", marginTop: 10 }}>Available: {availDays.join(", ")}</p>}
          </div>
          <Calendar selected={selDate} onSelect={setSelDate} availableDays={availDays} />
          <div style={{ gridColumn: "1/-1", display: "flex", justifyContent: "space-between" }}>
            <button className="btn btn-outline" onClick={() => setStep(1)}>Back</button>
            <button className="btn btn-primary" disabled={!selDate} onClick={() => setStep(3)}>Next</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="panel">
          <h2 style={{ marginBottom: 16, fontSize: 15, fontWeight: 700 }}>Select Time Slot — {selDate}</h2>
          {loading ? <Loading text="Checking availability..." /> : (
            <div className="slots-grid">
              {slots.length ? slots.map(s => (
                <button key={s} disabled={takenSlots.includes(s)}
                  className={`slot ${selSlot === s ? "slot-selected" : ""}`}
                  onClick={() => setSelSlot(s)}>{s}{takenSlots.includes(s) && <span style={{ display: "block", fontSize: 10, color: "#ccc" }}>Taken</span>}</button>
              )) : <p style={{ color: "#8190a5", fontSize: 13 }}>No slots available for this doctor.</p>}
            </div>
          )}
          <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between" }}>
            <button className="btn btn-outline" onClick={() => setStep(2)}>Back</button>
            <button className="btn btn-primary" disabled={!selSlot} onClick={() => setStep(4)}>Next</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="panel">
          <h2 style={{ marginBottom: 16, fontSize: 15, fontWeight: 700 }}>Confirm Appointment</h2>
          {[["Doctor", selDoc?.name], ["Service", selService], ["Date", selDate], ["Time", selSlot]].map(([k, v]) => (
            <div key={k} className="confirm-row"><span style={{ color: "#8190a5" }}>{k}</span><strong>{v}</strong></div>
          ))}
          <div className="form-group" style={{ marginTop: 16 }}>
            <label>Reason for Visit</label>
            <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Briefly describe your concern" />
          </div>
          <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between" }}>
            <button className="btn btn-outline" onClick={() => setStep(3)}>Back</button>
            <button className="btn btn-primary" disabled={submitting || !reason} onClick={submit}>{submitting ? "Submitting..." : "Confirm Appointment"}</button>
          </div>
        </div>
      )}
    </>
  );
}


