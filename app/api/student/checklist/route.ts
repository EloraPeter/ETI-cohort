import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyStudentRequest } from "@/lib/supabase/verifyStudent";
import { getScopedChecklistItem, getScopedChecklistItems } from "@/lib/checklist/getStudentChecklist";
import type { CompletionSource } from "@/lib/supabase/types";

const VALID_SOURCES: CompletionSource[] = ["manual", "button_click", "video_complete", "system_verified", "parent_auto"];

export async function PATCH(request: Request) {
  const student = await verifyStudentRequest(request);
  if (!student) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const itemKey = body && typeof body.itemKey === "string" ? body.itemKey : null;
  const completed = body && typeof body.completed === "boolean" ? body.completed : null;
  const requestedSource: CompletionSource | null =
    body && typeof body.source === "string" && VALID_SOURCES.includes(body.source) ? body.source : null;

  if (!itemKey || completed === null) {
    return NextResponse.json({ error: "itemKey (string) and completed (boolean) are required." }, { status: 400 });
  }

  // Resolves to the cohort-specific override if one exists for this
  // student's cohort, otherwise the global default — same precedence
  // the dashboard's tree is built with, so we're never toggling a row
  // the student can't actually see.
  const item = await getScopedChecklistItem(student.cohort_id, itemKey);
  if (!item) {
    return NextResponse.json({ error: "Checklist item not found." }, { status: 404 });
  }
  if (item.completion_method === "parent_auto" || item.completion_method === "system_verified") {
    return NextResponse.json({ error: "This item completes automatically and cannot be toggled directly." }, { status: 400 });
  }

  const source: CompletionSource = requestedSource ?? (item.completion_method as CompletionSource) ?? "manual";
  const completedAt = completed ? new Date().toISOString() : null;

  const supabase = createAdminClient();

  // Upsert rather than update: a cohort-specific override created after
  // a student already exists won't have a pre-seeded progress row yet.
  const { data: updated, error: updateError } = await supabase
    .from("student_checklist_progress")
    .upsert(
      { student_id: student.id, checklist_item_id: item.id, completed_at: completedAt, completion_source: completed ? source : null },
      { onConflict: "student_id,checklist_item_id" }
    )
    .select("*")
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: "Could not update checklist progress." }, { status: 500 });
  }

  // If this item has a parent, check whether all siblings are now done
  // and auto-complete (or un-complete) the parent to match.
  if (item.parent_id) {
    await syncParentCompletion(supabase, student.id, student.cohort_id, item.parent_id);
  }

  return NextResponse.json({ item: updated });
}

async function syncParentCompletion(
  supabase: ReturnType<typeof createAdminClient>,
  studentId: string,
  cohortId: string,
  parentId: string
) {
  const scopedItems = await getScopedChecklistItems(cohortId);
  const children = scopedItems.filter((i) => i.parent_id === parentId);
  if (children.length === 0) return;

  const childIds = children.map((c) => c.id);
  const { data: childProgress } = await supabase
    .from("student_checklist_progress")
    .select("completed_at")
    .eq("student_id", studentId)
    .in("checklist_item_id", childIds);

  const allDone = (childProgress ?? []).length === childIds.length && (childProgress ?? []).every((p) => p.completed_at);

  await supabase.from("student_checklist_progress").upsert(
    {
      student_id: studentId,
      checklist_item_id: parentId,
      completed_at: allDone ? new Date().toISOString() : null,
      completion_source: allDone ? "parent_auto" : null,
    },
    { onConflict: "student_id,checklist_item_id" }
  );
}
