import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyInstructorRequest } from "@/lib/supabase/verifyInstructor";
import { isInstructorAssignedToCohort } from "@/lib/instructors/cohortAccess";
import { resolveCompletionChecklist } from "@/lib/curriculum/completionChecklist";

export async function GET(request: Request, { params }: { params: Promise<{ cohortId: string; classId: string }> }) {
  const instructor = await verifyInstructorRequest(request);
  if (!instructor) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { cohortId, classId } = await params;
  const supabase = createAdminClient();

  if (!(await isInstructorAssignedToCohort(supabase, instructor.id, cohortId))) {
    return NextResponse.json({ error: "You are not assigned to this cohort." }, { status: 403 });
  }

  const { data: curriculumClass, error: classError } = await supabase
    .from("curriculum_classes")
    .select("*")
    .eq("id", classId)
    .single();

  if (classError || !curriculumClass) {
    return NextResponse.json({ error: "Class not found." }, { status: 404 });
  }

  const [{ data: resources }, { data: completion }, { data: previousClass }] = await Promise.all([
    supabase
      .from("class_resources")
      .select("*")
      .eq("curriculum_class_id", classId)
      .order("sort_order", { ascending: true }),
    supabase.from("class_completions").select("*").eq("cohort_id", cohortId).eq("curriculum_class_id", classId).maybeSingle(),
    supabase
      .from("curriculum_classes")
      .select("id, class_number, title")
      .eq("curriculum_id", curriculumClass.curriculum_id)
      .eq("class_number", curriculumClass.class_number - 1)
      .maybeSingle(),
  ]);

  // Carry-over left for whoever teaches this class, from whichever
  // class immediately precedes it in the same curriculum.
  let carryOver: { fromClassNumber: number; fromTitle: string; text: string } | null = null;
  if (previousClass) {
    const { data: previousCompletion } = await supabase
      .from("class_completions")
      .select("carry_over")
      .eq("cohort_id", cohortId)
      .eq("curriculum_class_id", previousClass.id)
      .maybeSingle();
    if (previousCompletion?.carry_over) {
      carryOver = { fromClassNumber: previousClass.class_number, fromTitle: previousClass.title, text: previousCompletion.carry_over };
    }
  }

  return NextResponse.json({
    class: curriculumClass,
    resources: resources ?? [],
    completion: completion
      ? { ...completion, checklist: resolveCompletionChecklist(completion.checklist) }
      : {
          id: null,
          status: "not_started",
          completed_at: null,
          checklist: resolveCompletionChecklist(null),
          notes: null,
          carry_over: null,
        },
    carryOverFromPreviousClass: carryOver,
  });
}

const checklistEntrySchema = z.object({
  key: z.string(),
  label: z.string(),
  checked: z.boolean(),
});

const patchSchema = z.object({
  checklist: z.array(checklistEntrySchema).optional(),
  notes: z.string().max(5000).nullable().optional(),
  carry_over: z.string().max(2000).nullable().optional(),
  markComplete: z.boolean().optional(),
});

/**
 * Upserts the completion record for this cohort+class. Partial by
 * design — an instructor can save a checklist toggle, notes, or
 * carry-over independently, and "Mark Class Complete" is its own
 * explicit action (markComplete: true), never an implicit side
 * effect of saving other fields. Only the fields actually present in
 * the request body are written; Postgres upsert leaves every other
 * column on an existing row untouched.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ cohortId: string; classId: string }> }) {
  const instructor = await verifyInstructorRequest(request);
  if (!instructor) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { cohortId, classId } = await params;
  const supabase = createAdminClient();

  if (!(await isInstructorAssignedToCohort(supabase, instructor.id, cohortId))) {
    return NextResponse.json({ error: "You are not assigned to this cohort." }, { status: 403 });
  }

  const { data: curriculumClass } = await supabase.from("curriculum_classes").select("id").eq("id", classId).maybeSingle();
  if (!curriculumClass) {
    return NextResponse.json({ error: "Class not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request body." }, { status: 400 });
  }
  const input = parsed.data;

  if (Object.keys(input).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  const payload: Record<string, unknown> = {
    cohort_id: cohortId,
    curriculum_class_id: classId,
    instructor_id: instructor.id,
  };
  if (input.checklist !== undefined) payload.checklist = input.checklist;
  if (input.notes !== undefined) payload.notes = input.notes;
  if (input.carry_over !== undefined) payload.carry_over = input.carry_over;
  if (input.markComplete) {
    payload.status = "completed";
    payload.completed_at = new Date().toISOString();
  }

  const { data: completion, error } = await supabase
    .from("class_completions")
    .upsert(payload, { onConflict: "cohort_id,curriculum_class_id" })
    .select("*")
    .single();

  if (error || !completion) {
    console.error("Class completion upsert failed:", error);
    return NextResponse.json({ error: "Failed to save." }, { status: 500 });
  }

  return NextResponse.json({ completion: { ...completion, checklist: resolveCompletionChecklist(completion.checklist) } });
}
