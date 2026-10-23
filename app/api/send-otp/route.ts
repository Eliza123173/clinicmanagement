import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });

  const gmailUser = process.env.GMAIL_USER?.trim();
  // Google displays app passwords in groups separated by spaces; SMTP expects the
  // same 16 characters without those display spaces.
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");
  if (!gmailUser || !gmailAppPassword) {
    return NextResponse.json({ error: "Email delivery is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env.local, then restart the app." }, { status: 500 });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // Delete old codes for this email then insert new one
  await supabase.from("otp_codes").delete().eq("email", email.toLowerCase());
  const { error: dbErr } = await supabase.from("otp_codes").insert({
    email: email.toLowerCase(), code, expires_at, used: false,
  });
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  // Send via Gmail
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  });

  try {
    await transporter.sendMail({
      from: `"CareWell Clinic" <${gmailUser}>`,
      to: email,
      subject: "Your CareWell Verification Code",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #DCEEF2;border-radius:12px;background:#fff">
          <div style="text-align:center;margin-bottom:24px">
            <h2 style="color:#07516B;margin:0">CareWell Clinic</h2>
            <p style="color:#475569;font-size:13px;margin-top:4px">Healthcare for a Better Tomorrow</p>
          </div>
          <p style="color:#12304A;font-size:15px">Your verification code is:</p>
          <div style="text-align:center;margin:24px 0">
            <span style="font-size:42px;font-weight:800;letter-spacing:12px;color:#0797A8">${code}</span>
          </div>
          <p style="color:#475569;font-size:13px">This code expires in <b>10 minutes</b>.</p>
          <p style="color:#475569;font-size:13px">If you did not request this, please ignore this email.</p>
          <hr style="border:none;border-top:1px solid #DCEEF2;margin:24px 0"/>
          <p style="color:#94a3b8;font-size:11px;text-align:center">CareWell Clinic — Do not reply to this email.</p>
        </div>
      `,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to send email.";
    if (/535|badcredentials|username and password not accepted/i.test(msg)) {
      return NextResponse.json({ error: "Gmail rejected the SMTP credentials. Use a current 16-character Google App Password in GMAIL_APP_PASSWORD (not your regular Gmail password), and make sure GMAIL_USER is that same Gmail account." }, { status: 502 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
