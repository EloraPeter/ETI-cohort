import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The authorization check every instructor route scoped to a cohort
 * needs: the cohortId came from the client (a URL segment), so it's
 * never trusted on its own — it must appear in *this* instructor's
 * own instructor_cohorts rows. Extracted from the Phase 2 roster
 * route (app/api/instructor/cohorts/[cohortId]/students/route.ts),
 * which now uses this too, so the check has exactly one
 * implementation instead of one per route.
 */
export async function isInstructorAssignedToCohort(
  supabase: SupabaseClient,
  instructorId: string,
  cohortId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("instructor_cohorts")
    .select("id")
    .eq("instructor_id", instructorId)
    .eq("cohort_id", cohortId)
    .maybeSingle();
  return !!data;
}
