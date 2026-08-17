import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAdminRequest } from "@/lib/supabase/verifyAdmin";

const cohortIdSchema = z.object({ cohortId: z.string().uuid("cohortId must be a valid id.") });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminEmail = await verifyAdminRequest(request);
  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id: instructorId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = cohortIdSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request body." }, { status: 400 });
  }
  const { cohortId } = parsed.data;

  const supabase = createAdminClient();

  const { data: instructor } = await supabase.from("instructors").select("id").eq("id", instructorId).single();
  if (!instructor) {
    return NextResponse.json({ error: "Instructor not found." }, { status: 404 });
  }
  const { data: cohort } = await supabase.from("cohorts").select("id").eq("id", cohortId).single();
  if (!cohort) {
    return NextResponse.json({ error: "Cohort not found." }, { status: 404 });
  }

  const { error: upsertError } = await supabase
    .from("instructor_cohorts")
    .upsert(
      { instructor_id: instructorId, cohort_id: cohortId, assigned_by: adminEmail },
      { onConflict: "instructor_id,cohort_id", ignoreDuplicates: true }
    );

  if (upsertError) {
    console.error("Instructor cohort assignment failed:", upsertError);
    return NextResponse.json({ error: "Failed to assign cohort." }, { status: 500 });
  }

  // upsert with ignoreDuplicates doesn't return the row either way (new
  // or pre-existing) — fetch it fresh, same pattern as finalize.ts.
  const { data: assignment } = await supabase
    .from("instructor_cohorts")
    .select("*")
    .eq("instructor_id", instructorId)
    .eq("cohort_id", cohortId)
    .single();

  return NextResponse.json({ success: true, assignment: assignment ?? null });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminEmail = await verifyAdminRequest(request);
  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id: instructorId } = await params;
  const { searchParams } = new URL(request.url);
  const cohortId = searchParams.get("cohortId");
  if (!cohortId) {
    return NextResponse.json({ error: "cohortId query parameter is required." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("instructor_cohorts")
    .delete()
    .eq("instructor_id", instructorId)
    .eq("cohort_id", cohortId);

  if (error) {
    console.error("Instructor cohort unassignment failed:", error);
    return NextResponse.json({ error: "Failed to remove cohort assignment." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
