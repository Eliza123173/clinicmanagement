import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const results: Record<string, string> = {};

  // Test appointments insert
  const { error: e1 } = await supabase.from("appointments").insert({
    id: "TEST_" + Date.now(),
    patient: "Test", patient_email: "test@test.com", doctor: "Test Doctor",
    doctor_id: "D001", date: "January 1, 2026", time: "9:00 AM",
    status: "Pending", reason: "Test", service: "General", notes: null, cancelled_by: null,
  });
  results["appointments_insert"] = e1 ? "FAILED: " + e1.message : "OK";
  if (!e1) await supabase.from("appointments").delete().like("id", "TEST_%");

  // Test schedules insert
  const { error: e2 } = await supabase.from("schedules").insert({
    id: "TEST_" + Date.now(),
    doctor: "Test Doctor", day: "Monday",
    start_time: "8:00 AM", end_time: "5:00 PM",
    is_available: true, slot_duration: 30,
  });
  results["schedules_insert"] = e2 ? "FAILED: " + e2.message : "OK";
  if (!e2) await supabase.from("schedules").delete().like("id", "TEST_%");

  // Test doctors insert
  const { error: e3 } = await supabase.from("doctors").insert({
    id: "TEST_" + Date.now(),
    name: "Test Doctor", spec: "General", avail: "Available Today",
    rating: 4.5, reviews: 0, years: 1, patients: 0,
    initials: "TD", email: "testdoc@test.com", is_active: true,
  });
  results["doctors_insert"] = e3 ? "FAILED: " + e3.message : "OK";
  if (!e3) await supabase.from("doctors").delete().like("id", "TEST_%");

  // Test patients insert
  const { error: e4 } = await supabase.from("patients").insert({
    id: "TEST_" + Date.now(),
    name: "Test Patient", email: "testpat@test.com",
    contact: "09000000000", dob: "2000-01-01",
    gender: "Female", blood: "", address: "",
  });
  results["patients_insert"] = e4 ? "FAILED: " + e4.message : "OK";
  if (!e4) await supabase.from("patients").delete().like("id", "TEST_%");

  return NextResponse.json(results);
}
