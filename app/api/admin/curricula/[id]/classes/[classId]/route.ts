import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAdminRequest } from "@/lib/supabase/verifyAdmin";

export async function GET(request: Request, { params }: { params: Promise<{ id: string; classId: string }> }) {
  const email = await verifyAdminRequest(request);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { classId } = await params;
  const supabase = createAdminClient();

  const { data: curriculumClass, error } = await supabase.from("curriculum_classes").select("*").eq("id", classId).single();
  if (error || !curriculumClass) {
    return NextResponse.json({ error: "Class not found." }, { status: 404 });
  }

  const { data: resources } = await supabase
    .from("class_resources")
    .select("*")
    .eq("curriculum_class_id", classId)
    .order("sort_order", { ascending: true });

  return NextResponse.json({ class: curriculumClass, resources: resources ?? [] });
}

const editSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  week_theme: z.string().trim().min(1).max(200).optional(),
  outcome: z.string().trim().min(1).max(1000).optional(),
  teaching_points: z.array(z.string()).optional(),
  demo: z.array(z.string()).optional(),
  practice: z.array(z.string()).optional(),
  questions: z.array(z.string()).optional(),
  assignment: z.string().max(2000).optional(),
  checkpoint: z.string().max(2000).optional(),
});

const reorderSchema = z.object({
  action: z.enum(["move_up", "move_down"]),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; classId: string }> }) {
  const email = await verifyAdminRequest(request);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id: curriculumId, classId } = await params;
  const supabase = createAdminClient();

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Reorder — swaps class_number with the adjacent class. Deliberately
  // simple (no full drag-and-drop reorder infra): this is enough for
  // "admin can reorder classes" without a complicated curriculum
  // builder, and completion records are keyed on curriculum_class_id
  // (a stable uuid), never class_number, so swapping numbers here can
  // never corrupt or orphan a completion record.
  if ("action" in body) {
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request body." }, { status: 400 });
    }

    const { data: current, error: currentError } = await supabase
      .from("curriculum_classes")
      .select("id, class_number")
      .eq("id", classId)
      .single();
    if (currentError || !current) {
      return NextResponse.json({ error: "Class not found." }, { status: 404 });
    }

    const targetNumber = parsed.data.action === "move_up" ? current.class_number - 1 : current.class_number + 1;
    const { data: neighbor } = await supabase
      .from("curriculum_classes")
      .select("id, class_number")
      .eq("curriculum_id", curriculumId)
      .eq("class_number", targetNumber)
      .maybeSingle();

    if (!neighbor) {
      return NextResponse.json({ error: "Already at that end of the list." }, { status: 400 });
    }

    // Swap through a temporary negative number to avoid tripping the
    // (curriculum_id, class_number) unique constraint mid-update.
    const tempNumber = -1;
    const { error: step1 } = await supabase.from("curriculum_classes").update({ class_number: tempNumber }).eq("id", current.id);
    if (step1) {
      return NextResponse.json({ error: "Failed to reorder." }, { status: 500 });
    }
    const { error: step2 } = await supabase
      .from("curriculum_classes")
      .update({ class_number: current.class_number })
      .eq("id", neighbor.id);
    const { error: step3 } = await supabase
      .from("curriculum_classes")
      .update({ class_number: neighbor.class_number })
      .eq("id", current.id);
    if (step2 || step3) {
      console.error("Class reorder swap failed:", step2 ?? step3);
      return NextResponse.json({ error: "Failed to reorder." }, { status: 500 });
    }

    const { data: classes } = await supabase
      .from("curriculum_classes")
      .select("*")
      .eq("curriculum_id", curriculumId)
      .order("class_number", { ascending: true });

    return NextResponse.json({ classes: classes ?? [] });
  }

  // Content edit.
  const parsed = editSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request body." }, { status: 400 });
  }
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  const { data: updated, error } = await supabase
    .from("curriculum_classes")
    .update(parsed.data)
    .eq("id", classId)
    .select("*")
    .single();

  if (error || !updated) {
    console.error("Admin class update failed:", error);
    return NextResponse.json({ error: "Failed to update class." }, { status: 500 });
  }

  return NextResponse.json({ class: updated });
}
