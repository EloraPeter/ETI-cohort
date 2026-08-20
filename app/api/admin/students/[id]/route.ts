import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAdminRequest } from "@/lib/supabase/verifyAdmin";
import { getStudentChecklist } from "@/lib/checklist/getStudentChecklist";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const email = await verifyAdminRequest(request);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Student id is required." }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select(
      "id, student_code, registration_id, cohort_id, full_name, email, phone, status, enrolled_at, preferred_name, timezone, laptop_ready, profile_completed_at"
    )
    .eq("id", id)
    .single();

  if (studentError || !student) {
    return NextResponse.json({ error: "Student not found." }, { status: 404 });
  }

  const [{ data: cohort }, { data: registration }, { data: payment }, checklist] = await Promise.all([
    supabase
      .from("cohorts")
      .select("id, name, starts_on, duration_weeks, is_open, timezone")
      .eq("id", student.cohort_id)
      .single(),
    supabase
      .from("registrations")
      .select(
        "full_name, email, phone, age, gender, state, city, occupation, education_level, owns_laptop, coding_experience, heard_about_eti, motivation, status, admin_notes, created_at"
      )
      .eq("id", student.registration_id)
      .single(),
    // Deliberately narrow: payment processor identifiers (references,
    // transaction ids, authorization URLs), the storage path to the
    // bank-transfer proof image, and the recovery token fields are all
    // excluded — none of them are needed for an admin's operational
    // "did they pay, how, when, who reviewed it" view, and the token
    // fields specifically are pre-auth secrets that should never leave
    // the server.
    supabase
      .from("payments")
      .select("method, status, amount_expected, amount_paid, currency, payment_date, reviewed_by, reviewed_at")
      .eq("registration_id", student.registration_id)
      .maybeSingle(),
    getStudentChecklist(student.id, student.cohort_id),
  ]);

  return NextResponse.json({
    student,
    cohort: cohort ?? null,
    registration: registration ?? null,
    payment: payment ?? null,
    checklist,
  });
}
