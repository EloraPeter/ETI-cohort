import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyStudentRequest } from "@/lib/supabase/verifyStudent";
import { getStudentChecklist } from "@/lib/checklist/getStudentChecklist";

export async function GET(request: Request) {
  const student = await verifyStudentRequest(request);
  if (!student) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createAdminClient();

  const [{ data: cohort }, checklist] = await Promise.all([
    supabase.from("cohorts").select("*").eq("id", student.cohort_id).single(),
    getStudentChecklist(student.id),
  ]);

  return NextResponse.json({ student, cohort: cohort ?? null, checklist });
}
