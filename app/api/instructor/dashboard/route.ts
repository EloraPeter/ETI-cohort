import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyInstructorRequest } from "@/lib/supabase/verifyInstructor";
import { getInstructorProfileCompletion } from "@/lib/instructors/profileCompletion";
import type { Cohort } from "@/lib/supabase/types";

export interface InstructorDashboardCohort extends Cohort {
  studentCount: number;
}

export async function GET(request: Request) {
  const instructor = await verifyInstructorRequest(request);
  if (!instructor) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Scoping starts here: the instructor's cohort set is resolved
  // server-side from instructor_cohorts, keyed on the *verified*
  // instructor.id — never anything supplied by the client.
  const { data: assignments, error: assignmentsError } = await supabase
    .from("instructor_cohorts")
    .select("cohort_id")
    .eq("instructor_id", instructor.id);

  if (assignmentsError) {
    console.error("Instructor dashboard: failed to load assignments:", assignmentsError);
    return NextResponse.json({ error: "Failed to load your cohorts." }, { status: 500 });
  }

  const cohortIds = (assignments ?? []).map((a) => a.cohort_id);

  let cohorts: InstructorDashboardCohort[] = [];
  let totalStudents = 0;

  if (cohortIds.length > 0) {
    const { data: cohortRows, error: cohortsError } = await supabase
      .from("cohorts")
      .select("*")
      .in("id", cohortIds)
      .order("starts_on", { ascending: false });

    if (cohortsError) {
      console.error("Instructor dashboard: failed to load cohorts:", cohortsError);
      return NextResponse.json({ error: "Failed to load your cohorts." }, { status: 500 });
    }

    const counts = await Promise.all(
      cohortIds.map((id) =>
        supabase
          .from("students")
          .select("id", { count: "exact", head: true })
          .eq("cohort_id", id)
          .then((res) => ({ cohortId: id, count: res.count ?? 0 }))
      )
    );
    const countByCohort = new Map(counts.map((c) => [c.cohortId, c.count]));

    cohorts = (cohortRows ?? []).map((cohort) => ({
      ...cohort,
      studentCount: countByCohort.get(cohort.id) ?? 0,
    }));
    totalStudents = cohorts.reduce((sum, c) => sum + c.studentCount, 0);
  }

  return NextResponse.json({
    instructor,
    completion: getInstructorProfileCompletion(instructor),
    cohorts,
    stats: {
      cohortCount: cohorts.length,
      studentCount: totalStudents,
    },
  });
}
