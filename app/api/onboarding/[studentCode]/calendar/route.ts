import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateCohortIcs } from "@/lib/calendar/generateIcs";

export async function GET(_request: Request, { params }: { params: Promise<{ studentCode: string }> }) {
  const { studentCode } = await params;
  const supabase = createAdminClient();

  const { data: student } = await supabase
    .from("students")
    .select("cohort_id")
    .eq("student_code", studentCode)
    .single();

  if (!student) {
    return NextResponse.json({ error: "Student not found." }, { status: 404 });
  }

  const { data: cohort } = await supabase.from("cohorts").select("*").eq("id", student.cohort_id).single();
  if (!cohort) {
    return NextResponse.json({ error: "Cohort not found." }, { status: 404 });
  }

  const ics = generateCohortIcs(cohort);

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="eti-${cohort.name.toLowerCase().replace(/\s+/g, "-")}.ics"`,
    },
  });
}
