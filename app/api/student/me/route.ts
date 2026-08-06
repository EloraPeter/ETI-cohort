import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyStudentRequest } from "@/lib/supabase/verifyStudent";

export async function GET(request: Request) {
  const student = await verifyStudentRequest(request);
  if (!student) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createAdminClient();

  const [{ data: cohort }, { data: checklist }] = await Promise.all([
    supabase.from("cohorts").select("*").eq("id", student.cohort_id).single(),
    supabase
      .from("student_checklist_items")
      .select("*")
      .eq("student_id", student.id)
      .order("created_at", { ascending: true }),
  ]);

  return NextResponse.json({ student, cohort: cohort ?? null, checklist: checklist ?? [] });
}
