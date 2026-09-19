"use client";
import { useState } from "react";
import { supabase } from "./supabase";

type Role = "Patient" | "Admin" | "Doctor";
type Screen = "splash" | "login" | "login_otp" | "register" | "verify" | "forgot" | "reset";
const ADMIN_EMAIL = "admin@carewell.com";

export default function AuthScreens({ onEnter }: { onEnter: (role: Role, name: string, email: string) => void }) {
  const [screen, setScreen] = useState<Screen>("splash");
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingName, setPendingName] = useState("");
  const [form, setForm] = useState({ name: "", dob: "", gender: "", contact: "", email: "", password: "", confirm: "" });
  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));
  const reset = () => { setErr(""); setNotice(""); };

  async function resolveRole(email: string, fallback?: string) {
    const e = email.trim().toLowerCase();
    if (e === ADMIN_EMAIL) return onEnter("Admin", "Administrator", e);
    const { data: doc } = await supabase.from("doctors").select("name,is_active").eq("email", e).limit(1);
    if (doc?.[0]) {
      if (doc[0].is_active === false) return setErr("This account is inactive. Contact the administrator.");
      return onEnter("Doctor", doc[0].name, e);
    }
    const { data: pat } = await supabase.from("patients").select("name").eq("email", e).limit(1);
    onEnter("Patient", pat?.[0]?.name || fallback || e.split("@")[0], e);
  }

  function validate() {
    if (!form.name.trim() || !form.dob || !form.gender || !form.contact.trim() || !form.email.trim() || !form.password)
      return "Please complete every required field.";
    if (!/^09\d{9}$/.test(form.contact.replace(/[\s-]/g, "")))
      return "Use a valid 11-digit Philippine mobile number (09XXXXXXXXX).";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return "Enter a valid email address.";
    if (form.password.length < 8 || !/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/\d/.test(form.password))
      return "Password needs 8+ characters with uppercase, lowercase, and a number.";
    if (form.password !== form.confirm) return "Passwords do not match.";
    return "";
  }

  async function handleLogin() {
    reset(); setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
    setLoading(false);
    if (error) return setErr(error.message);
    // Send OTP for login verification
    const email = data.user.email ?? form.email;
    const { error: otpErr } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } });
    if (otpErr) {
      // If OTP fails (e.g. admin), skip OTP and go directly
      await resolveRole(email, data.user.user_metadata?.full_name);
      return;
    }
    setPendingEmail(email);
    setPendingName(data.user.user_metadata?.full_name || "");
    setNotice("A verification code has been sent to your email.");
    setScreen("login_otp");
  }

  async function verifyLoginOtp() {
    reset();
    if (!/^\d{6}$/.test(otp)) return setErr("Enter the 6-digit code from your email.");
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email: pendingEmail, token: otp, type: "email" });
    setLoading(false);
    if (error) return setErr("Invalid or expired code. " + error.message);
    await resolveRole(pendingEmail, pendingName);
  }

  async function handleRegister() {
    reset();
    const v = validate();
    if (v) return setErr(v);
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email.trim(), password: form.password,
      options: { data: { full_name: form.name.trim(), dob: form.dob, gender: form.gender, contact: form.contact.trim() } },
    });
    setLoading(false);
    if (error) return setErr(error.message);
    setNotice("A 6-digit verification code was sent to your email. Check your inbox (and spam folder).");
    setScreen("verify");
  }

  async function verifyRegisterOtp() {
    reset();
    if (!/^\d{6}$/.test(otp)) return setErr("Enter the 6-digit code from your email.");
    setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({ email: form.email.trim(), token: otp, type: "email" });
    setLoading(false);
    if (error) return setErr("Invalid or expired code. Try resending. " + error.message);
    await supabase.from("patients").upsert({
      id: "P" + Date.now(), name: form.name.trim(), email: form.email.trim().toLowerCase(),
      contact: form.contact.trim(), dob: form.dob, gender: form.gender, blood: "", address: "",
    }, { onConflict: "email" });
    await resolveRole(data.user?.email ?? form.email, form.name);
  }

  async function resendOtp() {
    reset(); setLoading(true);
    const { error } = await supabase.auth.resend({ type: "signup", email: form.email.trim() });
    setLoading(false);
    if (error) return setErr(error.message);
    setNotice("A new code has been sent. The previous code is now invalid.");
  }

  async function requestReset() {
    reset();
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setErr("Enter a valid email address.");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(form.email.trim());
    setLoading(false);
    if (error) return setErr(error.message);
    setNotice("A password-reset code was sent to your email."); setScreen("reset");
  }

  async function resetPassword() {
    reset();
    if (!/^\d{6}$/.test(otp)) return setErr("Enter the 6-digit reset code.");
    if (form.password.length < 8) return setErr("New password must be at least 8 characters.");
    if (form.password !== form.confirm) return setErr("Passwords do not match.");
    setLoading(true);
    const { error: vErr } = await supabase.auth.verifyOtp({ email: form.email.trim(), token: otp, type: "recovery" });
    if (vErr) { setLoading(false); return setErr("Invalid or expired code. " + vErr.message); }
    const { error } = await supabase.auth.updateUser({ password: form.password });
    setLoading(false);
    if (error) return setErr(error.message);
    setNotice("Password updated successfully! You can now log in."); setScreen("login");
  }

  if (screen === "splash") return (
    <div className="splash">
      <div className="splash-card">
        <div className="splash-logo">
          <img src="/emc-logo.png" alt="CareWell" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "50%" }} />
        </div>
        <h1>CareWell Clinic</h1>
        <p>Your Health, Our Priority</p>
        <button className="btn btn-primary" style={{ width: 200, justifyContent: "center", padding: "14px 0", fontSize: 16, borderRadius: 30 }} onClick={() => setScreen("login")}>
          Get Started
        </button>
      </div>
    </div>
  );

  const titles: Record<Screen, string> = {
    splash: "", login: "Welcome Back!", login_otp: "Verify Your Login",
    register: "Create an Account", verify: "Verify Your Email",
    forgot: "Forgot Password", reset: "Set New Password",
  };
  const subs: Record<Screen, string> = {
    splash: "", login: "Please log in to your account",
    login_otp: "Enter the 6-digit code sent to your email to complete login.",
    register: "Fill in your details to get started",
    verify: "Enter the 6-digit code sent to your email to activate your account.",
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
        {err && <div className="error-msg">{err}</div>}
        {notice && <div className="success-msg">{notice}</div>}

        {screen === "register" && (
          <>
            <F label="Full Name" value={form.name} onChange={v => set("name", v)} />
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

        {(screen === "login" || screen === "register" || screen === "forgot") && (
          <F label="Email Address" type="email" placeholder="Enter your email" value={form.email} onChange={v => set("email", v)} />
        )}

        {(screen === "verify" || screen === "login_otp" || screen === "reset") && (
          <F label="Verification Code" placeholder="6-digit code" value={otp} onChange={v => setOtp(v.replace(/\D/g, "").slice(0, 6))} />
        )}

        {(screen === "login" || screen === "register") && (
          <F label="Password" type="password" placeholder="••••••••" value={form.password} onChange={v => set("password", v)} />
        )}
        {(screen === "register" || screen === "reset") && (
          <F label="Confirm Password" type="password" placeholder="••••••••" value={form.confirm} onChange={v => set("confirm", v)} />
        )}
        {screen === "reset" && (
          <F label="New Password" type="password" placeholder="••••••••" value={form.password} onChange={v => set("password", v)} />
        )}

        {screen === "login" && (
          <button className="forgot-link" onClick={() => { reset(); setScreen("forgot"); }}>Forgot Password?</button>
        )}

        <button className="btn btn-primary auth-submit" disabled={loading} onClick={
          screen === "login" ? handleLogin :
          screen === "login_otp" ? verifyLoginOtp :
          screen === "register" ? handleRegister :
          screen === "verify" ? verifyRegisterOtp :
          screen === "forgot" ? requestReset :
          resetPassword
        }>
          {loading ? "Please wait..." :
            screen === "login" ? "Login" :
            screen === "login_otp" ? "Verify & Continue" :
            screen === "register" ? "Create Account" :
            screen === "verify" ? "Verify Account" :
            screen === "forgot" ? "Send Reset Code" :
            "Update Password"}
        </button>

        {(screen === "verify") && (
          <button className="forgot-link" disabled={loading} onClick={resendOtp}>Resend Code</button>
        )}

        <p className="auth-foot">
          {screen === "login" ? "Don't have an account? " : screen === "register" ? "Already have an account? " : "Back to "}
          <button onClick={() => { reset(); setOtp(""); setScreen(screen === "login" ? "register" : "login"); }}>
            {screen === "login" ? "Sign Up" : "Login"}
          </button>
        </p>

        {screen === "login_otp" && (
          <div className="otp-guide">
            <p>📧 Check your email inbox and spam folder.</p>
            <p>⏱ The code expires in 10 minutes.</p>
            <p>🔄 If expired, go back and log in again to receive a new code.</p>
          </div>
        )}
        {screen === "verify" && (
          <div className="otp-guide">
            <p>📧 Check your email inbox and spam folder.</p>
            <p>⏱ The code expires in 10 minutes.</p>
            <p>🔄 Click &quot;Resend Code&quot; if you did not receive it.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function F({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div className="form-group">
      <label>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={isPassword ? (show ? "text" : "password") : type}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          style={isPassword ? { paddingRight: 40 } : undefined}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            tabIndex={-1}
            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", border: 0, background: "none", cursor: "pointer", color: "#8190a5", padding: 0, display: "flex", alignItems: "center" }}
          >
            {show ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
