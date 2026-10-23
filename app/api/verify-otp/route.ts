import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { email, code } = await req.json();
  if (!email || !code) return NextResponse.json({ error: "Email and code are required." }, { status: 400 });

  const { data } = await supabase
    .from("otp_codes")
    .select("*")
    .eq("email", email.toLowerCase())
    .eq("code", code)
    .eq("used", false)
    .single();

  if (!data) return NextResponse.json({ error: "Invalid code. Please try again." }, { status: 400 });
  if (new Date(data.expires_at) < new Date())
    return NextResponse.json({ error: "Code has expired. Please request a new one." }, { status: 400 });

  await supabase.from("otp_codes").update({ used: true }).eq("id", data.id);

  return NextResponse.json({ success: true });
}
