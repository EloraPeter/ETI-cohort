import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyInstructorRequest } from "@/lib/supabase/verifyInstructor";
import { isInstructorAssignedToCohort } from "@/lib/instructors/cohortAccess";

export async function GET(request: Request, { params }: { params: Promise<{ cohortId: string }> }) {
  const instructor = await verifyInstructorRequest(request);
  if (!instructor) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { cohortId } = await params;
  const supabase = createAdminClient();

  // The critical authorization check: the cohortId came from the
  // client (a URL segment), so it is never trusted on its own — it
  // must appear in *this* instructor's own instructor_cohorts rows.
  // A cohort that exists but isn't assigned to this instructor
  // returns an explicit 403, not a quietly empty roster.
  if (!(await isInstructorAssignedToCohort(supabase, instructor.id, cohortId))) {
    return NextResponse.json({ error: "You are not assigned to this cohort." }, { status: 403 });
  }

  const { data: cohort, error: cohortError } = await supabase
    .from("cohorts")
    .select("*")
    .eq("id", cohortId)
    .single();

  if (cohortError || !cohort) {
    return NextResponse.json({ error: "Cohort not found." }, { status: 404 });
  }

  // Deliberately narrow select — no payment/financial data, no
  // registration-level PII (gender/education/experience/etc. live on
  // `registrations`, not `students`, and are not queried here), no
  // admin notes. Just what an instructor operationally needs.
  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id, student_code, full_name, email, phone, status, enrolled_at, profile_completed_at")
    .eq("cohort_id", cohortId)
    .order("full_name", { ascending: true });

  if (studentsError) {
    console.error("Instructor cohort roster: failed to load students:", studentsError);
    return NextResponse.json({ error: "Failed to load students." }, { status: 500 });
  }

  return NextResponse.json({ cohort, students: students ?? [] });
}
