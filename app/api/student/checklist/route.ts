import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyStudentRequest } from "@/lib/supabase/verifyStudent";
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

  const supabase = createAdminClient();

  const { data: item, error: itemError } = await supabase
    .from("checklist_items")
    .select("*")
    .eq("item_key", itemKey)
    .eq("is_active", true)
    .single();

  if (itemError || !item) {
    return NextResponse.json({ error: "Checklist item not found." }, { status: 404 });
  }
  if (item.completion_method === "parent_auto" || item.completion_method === "system_verified") {
    return NextResponse.json({ error: "This item completes automatically and cannot be toggled directly." }, { status: 400 });
  }

  const source: CompletionSource = requestedSource ?? (item.completion_method as CompletionSource) ?? "manual";
  const completedAt = completed ? new Date().toISOString() : null;

  const { data: updated, error: updateError } = await supabase
    .from("student_checklist_progress")
    .update({ completed_at: completedAt, completion_source: completed ? source : null })
    .eq("student_id", student.id)
    .eq("checklist_item_id", item.id)
    .select("*")
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: "Could not update checklist progress." }, { status: 500 });
  }

  // If this item has a parent, check whether all siblings are now done
  // and auto-complete (or un-complete) the parent to match.
  if (item.parent_key) {
    await syncParentCompletion(supabase, student.id, item.parent_key);
  }

  return NextResponse.json({ item: updated });
}

async function syncParentCompletion(
  supabase: ReturnType<typeof createAdminClient>,
  studentId: string,
  parentKey: string
) {
  const { data: parent } = await supabase.from("checklist_items").select("*").eq("item_key", parentKey).single();
  if (!parent) return;

  const { data: children } = await supabase
    .from("checklist_items")
    .select("id")
    .eq("parent_key", parentKey)
    .eq("is_active", true);
  if (!children || children.length === 0) return;

  const childIds = children.map((c) => c.id);
  const { data: childProgress } = await supabase
    .from("student_checklist_progress")
    .select("completed_at")
    .eq("student_id", studentId)
    .in("checklist_item_id", childIds);

  const allDone = (childProgress ?? []).length === childIds.length && (childProgress ?? []).every((p) => p.completed_at);

  await supabase
    .from("student_checklist_progress")
    .update({ completed_at: allDone ? new Date().toISOString() : null, completion_source: allDone ? "parent_auto" : null })
    .eq("student_id", studentId)
    .eq("checklist_item_id", parent.id);
}
