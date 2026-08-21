import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyInstructorRequest } from "@/lib/supabase/verifyInstructor";
import { getInstructorProfileCompletion } from "@/lib/instructors/profileCompletion";
import { computeClassDates, todayInTimezone } from "@/lib/curriculum/scheduleDates";
import type { Cohort, CurriculumClass } from "@/lib/supabase/types";

export interface InstructorDashboardCohort extends Cohort {
  studentCount: number;
  teaching: TeachingSummary | null;
}

interface ClassSummary {
  id: string;
  class_number: number;
  week_number: number;
  week_theme: string;
  title: string;
  outcome: string;
}

interface TeachingSummary {
  today: ClassSummary | null;
  upcoming: ClassSummary[];
  progress: { completed: number; total: number };
  carryOverAlert: { fromClassNumber: number; fromTitle: string; text: string } | null;
}

function toSummary(c: CurriculumClass): ClassSummary {
  return { id: c.id, class_number: c.class_number, week_number: c.week_number, week_theme: c.week_theme, title: c.title, outcome: c.outcome };
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

    cohorts = await Promise.all(
      (cohortRows ?? []).map(async (cohort): Promise<InstructorDashboardCohort> => {
        const teaching = await buildTeachingSummary(supabase, cohort);
        return { ...cohort, studentCount: countByCohort.get(cohort.id) ?? 0, teaching };
      })
    );
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

/**
 * Builds the "what am I teaching, where am I, what's next" summary
 * for one cohort. Today's class is derived from the cohort's own
 * starts_on/weekly_schedule/timezone (lib/curriculum/scheduleDates) —
 * never hardcoded — so this naturally works for any cohort using any
 * curriculum, not just the one this was built against.
 */
async function buildTeachingSummary(
  supabase: ReturnType<typeof createAdminClient>,
  cohort: Cohort
): Promise<TeachingSummary | null> {
  if (!cohort.curriculum_id) return null;

  const { data: classes } = await supabase
    .from("curriculum_classes")
    .select("*")
    .eq("curriculum_id", cohort.curriculum_id)
    .order("class_number", { ascending: true });

  if (!classes || classes.length === 0) return null;

  const dates = computeClassDates(cohort, classes.length);
  const todayStr = todayInTimezone(cohort.timezone);
  const todayIndex = dates.indexOf(todayStr);

  const firstUpcomingIndex = dates.findIndex((d) => d > todayStr);
  const upcoming =
    firstUpcomingIndex === -1 ? [] : classes.slice(firstUpcomingIndex, firstUpcomingIndex + 2).map(toSummary);

  const { data: completions } = await supabase
    .from("class_completions")
    .select("curriculum_class_id, status, carry_over")
    .eq("cohort_id", cohort.id)
    .in(
      "curriculum_class_id",
      classes.map((c) => c.id)
    );

  const completedCount = (completions ?? []).filter((c) => c.status === "completed").length;

  // Carry-over is surfaced from whichever class comes immediately
  // before "the one to teach next" (today's class if there is one,
  // otherwise the next upcoming one).
  const anchorIndex = todayIndex !== -1 ? todayIndex : firstUpcomingIndex;
  let carryOverAlert: TeachingSummary["carryOverAlert"] = null;
  if (anchorIndex > 0) {
    const previousClass = classes[anchorIndex - 1];
    if (previousClass) {
      const previousCompletion = (completions ?? []).find((c) => c.curriculum_class_id === previousClass.id);
      if (previousCompletion?.carry_over) {
        carryOverAlert = { fromClassNumber: previousClass.class_number, fromTitle: previousClass.title, text: previousCompletion.carry_over };
      }
    }
  }

  const todayClass = todayIndex !== -1 ? classes[todayIndex] : undefined;

  return {
    today: todayClass ? toSummary(todayClass) : null,
    upcoming,
    progress: { completed: completedCount, total: classes.length },
    carryOverAlert,
  };
}
