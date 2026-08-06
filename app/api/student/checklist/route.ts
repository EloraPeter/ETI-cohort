import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyStudentRequest } from "@/lib/supabase/verifyStudent";

export async function PATCH(request: Request) {
  const student = await verifyStudentRequest(request);
  if (!student) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const itemKey = body && typeof body.itemKey === "string" ? body.itemKey : null;
  const completed = body && typeof body.completed === "boolean" ? body.completed : null;

  if (!itemKey || completed === null) {
    return NextResponse.json({ error: "itemKey (string) and completed (boolean) are required." }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Scoped to this student's own id — a student can never toggle another
  // student's checklist item, regardless of what itemKey they send.
  const { data: updated, error } = await supabase
    .from("student_checklist_items")
    .update({ completed_at: completed ? new Date().toISOString() : null })
    .eq("student_id", student.id)
    .eq("item_key", itemKey)
    .select("*")
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: "Checklist item not found." }, { status: 404 });
  }

  return NextResponse.json({ item: updated });
}
