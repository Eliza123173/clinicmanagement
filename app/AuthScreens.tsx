"use client";
import { useState, useRef } from "react";
import { supabase } from "./supabase";
import type { Doctor } from "./supabase";

type Role = "Patient" | "Doctor" | "Admin";
type Screen = "splash" | "login" | "register" | "verify" | "forgot" | "reset";
const ADMIN_EMAIL = "elizcayampat@gmail.com";

export default function AuthScreens({ onEnter }: {
  onEnter: (role: Role, name: string, email: string, doctor?: Doctor) => void;
}) {
  const [screen, setScreen] = useState<Screen>("splash");
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [verifyPurpose, setVerifyPurpose] = useState<"login" | "register">("register");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [form, setForm] = useState({ name: "", dob: "", gender: "", contact: "", email: "", password: "", confirm: "" });
  const [resetOtpDigits, setResetOtpDigits] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const resetOtpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));
  const reset = () => { setErr(""); setNotice(""); };
  const otpValue = otpDigits.join("");
  const resetOtpValue = resetOtpDigits.join("");

  function handleOtpInput(digits: string[], setDigits: (d: string[]) => void, refs: React.MutableRefObject<(HTMLInputElement | null)[]>, idx: number, val: string) {
    const cleaned = val.replace(/\D/g, "");
    if (cleaned.length > 1) {
      // Handle paste
      const next = [...digits];
      for (let i = 0; i < 6 && i < cleaned.length; i++) next[i] = cleaned[i];
      setDigits(next);
      refs.current[Math.min(cleaned.length, 5)]?.focus();
      return;
    }
    const next = [...digits];
    next[idx] = cleaned;
    setDigits(next);
    if (cleaned && idx < 5) refs.current[idx + 1]?.focus();
  }

  function handleOtpKey(digits: string[], setDigits: (d: string[]) => void, refs: React.MutableRefObject<(HTMLInputElement | null)[]>, idx: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      const next = [...digits];
      next[idx - 1] = "";
      setDigits(next);
      refs.current[idx - 1]?.focus();
    }
  }

  async function resolveRole(email: string, fallbackName?: string) {
    const e = email.trim().toLowerCase();
    if (e === ADMIN_EMAIL) return onEnter("Admin", "Administrator", e);
    const { data: doc } = await supabase.from("doctors").select("*").eq("email", e).limit(1);
    if (doc?.[0]) {
      if (doc[0].is_active === false) return setErr("This account is inactive. Contact the administrator.");
      return onEnter("Doctor", doc[0].name, e, doc[0] as Doctor);
    }
    const { data: pat } = await supabase.from("patients").select("name").eq("email", e).limit(1);
    onEnter("Patient", pat?.[0]?.name || fallbackName || e.split("@")[0], e);
  }

  function validateRegister() {
    if (!form.name.trim()) return "Full name is required.";
    if (!form.dob) return "Date of birth is required.";
    if (!form.gender) return "Please select a gender.";
    if (!form.contact.trim()) return "Contact number is required.";
    if (!/^09\d{9}$/.test(form.contact.replace(/[\s-]/g, ""))) return "Use a valid 11-digit PH mobile number (09XXXXXXXXX).";
    if (!form.email.trim()) return "Email address is required.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return "Enter a valid email address.";
    if (form.password.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(form.password)) return "Password must contain at least one uppercase letter.";
    if (!/[0-9]/.test(form.password)) return "Password must contain at least one number.";
    if (form.password !== form.confirm) return "Passwords do not match.";
    return "";
  }

  async function sendOtp(email: string): Promise<string | null> {
    const res = await fetch("/api/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    return data.error ?? null;
  }

  async function handleLogin() {
    reset();
    if (!form.email.trim()) return setErr("Email is required.");
    if (!form.password) return setErr("Password is required.");
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
    if (error) {
      setLoading(false);
      if (error.message.toLowerCase().includes("email not confirmed")) {
        const otpErr = await sendOtp(form.email.trim().toLowerCase());
        if (otpErr) return setErr(otpErr);
        setVerifyPurpose("login"); setOtpDigits(["", "", "", "", "", ""]);
        setNotice("A 6-digit verification code was sent to your email.");
        setScreen("verify");
        return;
      }
      if (error.message.toLowerCase().includes("invalid login"))
        return setErr("Invalid email or password. Please check your credentials.");
      return setErr(error.message);
    }
    const email = (data.user.email ?? form.email).trim().toLowerCase();
    const otpErr = await sendOtp(email);
    setLoading(false);
    if (otpErr) return setErr(otpErr);
    setVerifyPurpose("login"); setOtpDigits(["", "", "", "", "", ""]);
    setNotice(`A 6-digit sign-in code was sent to ${email}.`);
    setScreen("verify");
  }

  async function handleRegister() {
    reset();
    const v = validateRegister();
    if (v) return setErr(v);
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: { data: { full_name: form.name.trim(), dob: form.dob, gender: form.gender, contact: form.contact.trim() } },
    });
    if (error) {
      setLoading(false);
      if (error.message.toLowerCase().includes("already registered"))
        return setErr("An account with this email already exists. Please log in.");
      return setErr(error.message);
    }
    if (!data.user) { setLoading(false); return setErr("Registration failed. Please try again."); }
    if (data.session) await supabase.auth.signOut();
    const otpErr = await sendOtp(form.email.trim().toLowerCase());
    setLoading(false);
    if (otpErr) return setErr(otpErr);
    setVerifyPurpose("register"); setOtpDigits(["", "", "", "", "", ""]);
    setNotice(`A 6-digit verification code was sent to ${form.email.trim()}.`);
    setScreen("verify");
  }

  async function verifyOtpCode() {
    reset();
    if (otpValue.length < 6) return setErr("Enter the complete 6-digit code.");
    setLoading(true);
    const res = await fetch("/api/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email.trim(), code: otpValue }),
    });
    const result = await res.json();
    if (!res.ok) { setLoading(false); return setErr(result.error); }
    if (verifyPurpose === "login") {
      // Re-sign in with password to restore session
      await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
      setLoading(false);
      await resolveRole(form.email.trim());
      return;
    }
    const emailLower = form.email.trim().toLowerCase();
    const { data: existing } = await supabase.from("patients").select("id").eq("email", emailLower).limit(1);
    if (!existing?.[0]) {
      await supabase.from("patients").insert({
        id: "P" + Date.now(), name: form.name.trim(), email: emailLower,
        contact: form.contact.trim(), dob: form.dob, gender: form.gender, blood: "", address: "",
      });
    } else {
      await supabase.from("patients").update({ name: form.name.trim(), contact: form.contact.trim(), dob: form.dob, gender: form.gender }).eq("email", emailLower);
    }
    setLoading(false);
    await resolveRole(form.email.trim(), form.name);
  }

  async function resendOtp() {
    reset(); setLoading(true);
    const otpErr = await sendOtp(form.email.trim().toLowerCase());
    setLoading(false);
    if (otpErr) return setErr(otpErr);
    setOtpDigits(["", "", "", "", "", ""]);
    setNotice("A new code has been sent. The previous code is now invalid.");
  }

  async function requestReset() {
    reset();
    if (!form.email.trim()) return setErr("Enter your email address.");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(form.email.trim());
    setLoading(false);
    if (error) return setErr(error.message);
    setResetOtpDigits(["", "", "", "", "", ""]);
    setNotice("A password-reset code was sent to your email.");
    setScreen("reset");
  }

  async function resetPassword() {
    reset();
    if (resetOtpValue.length < 6) return setErr("Enter the complete 6-digit reset code.");
    if (form.password.length < 8) return setErr("New password must be at least 8 characters.");
    if (form.password !== form.confirm) return setErr("Passwords do not match.");
    setLoading(true);
    const { error: vErr } = await supabase.auth.verifyOtp({ email: form.email.trim(), token: resetOtpValue, type: "recovery" });
    if (vErr) { setLoading(false); return setErr("Invalid or expired code. " + vErr.message); }
    const { error } = await supabase.auth.updateUser({ password: form.password });
    setLoading(false);
    if (error) return setErr(error.message);
    setNotice("Password updated! You can now log in.");
    setScreen("login");
  }

  if (screen === "splash") return (
    <div className="splash">
      <div className="splash-card">
        <div className="splash-logo">
          <img src="/emc-logo.png" alt="CareWell" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "50%" }} />
        </div>
        <h1>CareWell Clinic</h1>
        <p>Your Health, Our Priority</p>
        <button className="btn btn-primary" style={{ width: 200, justifyContent: "center", padding: "14px 0", fontSize: 16, borderRadius: 30, marginTop: 8 }} onClick={() => setScreen("login")}>
          Get Started
        </button>
      </div>
    </div>
  );

  const titles: Record<Screen, string> = {
    splash: "", login: "Welcome Back!", register: "Create an Account",
    verify: "Check Your Email", forgot: "Forgot Password", reset: "Set New Password",
  };
  const subs: Record<Screen, string> = {
    splash: "", login: "Please log in to your account",
    register: "Fill in your details to get started",
    verify: `We sent a 6-digit code to ${form.email || "your email"}.`,
    forgot: "Enter your email and we will send a reset code.",
    reset: "Enter the reset code and your new password.",
  };

  return (
    <div className="auth-wrap">
      <div className="auth-box">
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <img src="/emc-logo.png" alt="logo" style={{ width: 36, height: 36, objectFit: "contain", borderRadius: "50%" }} />
          </div>
          <h2>CareWell Clinic</h2>
        </div>
        <h1>{titles[screen]}</h1>
        <p>{subs[screen]}</p>

        {err && <div className="alert alert-error">✕ {err}</div>}
        {notice && <div className="alert alert-success">✓ {notice}</div>}

        {screen === "register" && (
          <>
            <F label="Full Name" value={form.name} onChange={v => set("name", v)} placeholder="Juan Dela Cruz" />
            <F label="Date of Birth" type="date" value={form.dob} onChange={v => set("dob", v)} />
            <div className="form-group">
              <label>Gender</label>
              <select value={form.gender} onChange={e => set("gender", e.target.value)}>
                <option value="">Select gender</option>
                <option>Female</option><option>Male</option><option>Other</option>
              </select>
            </div>
            <F label="Contact Number" placeholder="09XXXXXXXXX" value={form.contact} onChange={v => set("contact", v)} />
          </>
        )}

        {(screen === "login" || screen === "register" || screen === "forgot" || screen === "reset") && (
          <F label="Email Address" type="email" placeholder="you@email.com" value={form.email} onChange={v => set("email", v)} />
        )}

        {/* 6-box OTP input for verify screen */}
        {screen === "verify" && (
          <div className="form-group">
            <label>Verification Code</label>
            <div className="otp-boxes">
              {otpDigits.map((d, i) => (
                <input
                  key={i}
                  ref={el => { otpRefs.current[i] = el; }}
                  className="otp-box"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={d}
                  onChange={e => handleOtpInput(otpDigits, setOtpDigits, otpRefs, i, e.target.value)}
                  onKeyDown={e => handleOtpKey(otpDigits, setOtpDigits, otpRefs, i, e)}
                  onFocus={e => e.target.select()}
                  autoFocus={i === 0}
                />
              ))}
            </div>
          </div>
        )}

        {/* 6-box OTP input for reset screen */}
        {screen === "reset" && (
          <div className="form-group">
            <label>Reset Code</label>
            <div className="otp-boxes">
              {resetOtpDigits.map((d, i) => (
                <input
                  key={i}
                  ref={el => { resetOtpRefs.current[i] = el; }}
                  className="otp-box"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={d}
                  onChange={e => handleOtpInput(resetOtpDigits, setResetOtpDigits, resetOtpRefs, i, e.target.value)}
                  onKeyDown={e => handleOtpKey(resetOtpDigits, setResetOtpDigits, resetOtpRefs, i, e)}
                  onFocus={e => e.target.select()}
                  autoFocus={i === 0}
                />
              ))}
            </div>
          </div>
        )}

        {(screen === "login" || screen === "register" || screen === "reset") && (
          <div className="form-group">
            <label>{screen === "reset" ? "New Password" : "Password"}</label>
            <div style={{ position: "relative" }}>
              <input type={showPw ? "text" : "password"} placeholder="••••••••" value={form.password}
                onChange={e => set("password", e.target.value)} style={{ paddingRight: 40 }} />
              <button type="button" onClick={() => setShowPw(s => !s)}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", border: 0, background: "none", cursor: "pointer", color: "#475569", padding: 0, display: "flex", alignItems: "center" }}>
                {showPw ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </div>
        )}

        {(screen === "register" || screen === "reset") && (
          <div className="form-group">
            <label>Confirm Password</label>
            <div style={{ position: "relative" }}>
              <input type={showConfirm ? "text" : "password"} placeholder="••••••••" value={form.confirm}
                onChange={e => set("confirm", e.target.value)} style={{ paddingRight: 40 }} />
              <button type="button" onClick={() => setShowConfirm(s => !s)}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", border: 0, background: "none", cursor: "pointer", color: "#475569", padding: 0, display: "flex", alignItems: "center" }}>
                {showConfirm ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </div>
        )}

        {screen === "login" && (
          <button className="forgot-link" onClick={() => { reset(); setScreen("forgot"); }}>Forgot Password?</button>
        )}

        <button className="btn btn-primary auth-submit" disabled={loading} onClick={
          screen === "login" ? handleLogin :
          screen === "register" ? handleRegister :
          screen === "verify" ? verifyOtpCode :
          screen === "forgot" ? requestReset :
          resetPassword
        }>
          {loading ? "Please wait..." :
            screen === "login" ? "Login" :
            screen === "register" ? "Create Account" :
            screen === "verify" ? "Verify & Continue" :
            screen === "forgot" ? "Send Reset Code" :
            "Update Password"}
        </button>

        {screen === "verify" && (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <span style={{ fontSize: 13, color: "#475569" }}>Didn't receive it? </span>
            <button className="link-btn" disabled={loading} onClick={resendOtp}>Resend Code</button>
          </div>
        )}

        {(screen === "login" || screen === "register") && (
          <p className="auth-foot">
            {screen === "login" ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => { reset(); setOtpDigits(["", "", "", "", "", ""]); setScreen(screen === "login" ? "register" : "login"); }}>
              {screen === "login" ? "Sign Up" : "Login"}
            </button>
          </p>
        )}

        {(screen === "verify" || screen === "forgot" || screen === "reset") && (
          <p className="auth-foot">
            <button onClick={() => { reset(); setOtpDigits(["", "", "", "", "", ""]); setResetOtpDigits(["", "", "", "", "", ""]); setScreen("login"); }}>← Back to Login</button>
          </p>
        )}

        {screen === "verify" && (
          <div style={{ marginTop: 14, padding: "12px 14px", background: "#EFF9FB", borderRadius: 8, fontSize: 12, color: "#12304A", border: "1px solid #DCEEF2" }}>
            <p>📧 Check your inbox and spam folder.</p>
            <p style={{ marginTop: 4 }}>⏱ The code expires in 10 minutes.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function F({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div className="form-group">
      <label>{label}</label>
      <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}
