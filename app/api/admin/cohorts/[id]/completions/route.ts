import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAdminRequest } from "@/lib/supabase/verifyAdmin";
import { resolveCompletionChecklist } from "@/lib/curriculum/completionChecklist";
import type { ClassCompletion } from "@/lib/supabase/types";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const email = await verifyAdminRequest(request);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id: cohortId } = await params;
  const supabase = createAdminClient();

  const { data: cohort, error: cohortError } = await supabase.from("cohorts").select("*").eq("id", cohortId).single();
  if (cohortError || !cohort) {
    return NextResponse.json({ error: "Cohort not found." }, { status: 404 });
  }

  if (!cohort.curriculum_id) {
    return NextResponse.json({ cohort, classes: [] });
  }

  const { data: classes, error: classesError } = await supabase
    .from("curriculum_classes")
    .select("id, class_number, week_number, week_theme, title")
    .eq("curriculum_id", cohort.curriculum_id)
    .order("class_number", { ascending: true });

  if (classesError) {
    console.error("Admin cohort completions: failed to load classes:", classesError);
    return NextResponse.json({ error: "Failed to load curriculum." }, { status: 500 });
  }

  const classIds = (classes ?? []).map((c) => c.id);
  const { data: completions } = await supabase
    .from("class_completions")
    .select("*, instructors(full_name)")
    .eq("cohort_id", cohortId)
    .in("curriculum_class_id", classIds.length > 0 ? classIds : ["00000000-0000-0000-0000-000000000000"]);

  type CompletionRow = ClassCompletion & { instructors: { full_name: string } | null };
  const completionRows = (completions ?? []) as unknown as CompletionRow[];
  const completionByClassId = new Map(completionRows.map((c) => [c.curriculum_class_id, c]));

  const rows = (classes ?? []).map((cls) => {
    const completion = completionByClassId.get(cls.id);
    return {
      class: cls,
      status: completion?.status ?? "not_started",
      completed_at: completion?.completed_at ?? null,
      instructor_name: completion?.instructors?.full_name ?? null,
      notes: completion?.notes ?? null,
      carry_over: completion?.carry_over ?? null,
      checklist: resolveCompletionChecklist(completion?.checklist ?? null),
    };
  });

  return NextResponse.json({ cohort, classes: rows });
}
