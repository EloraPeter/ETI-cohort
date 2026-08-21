import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAdminRequest } from "@/lib/supabase/verifyAdmin";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const email = await verifyAdminRequest(request);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: curriculum, error: curriculumError } = await supabase.from("curricula").select("*").eq("id", id).single();
  if (curriculumError || !curriculum) {
    return NextResponse.json({ error: "Curriculum not found." }, { status: 404 });
  }

  const { data: classes, error: classesError } = await supabase
    .from("curriculum_classes")
    .select("*")
    .eq("curriculum_id", id)
    .order("class_number", { ascending: true });

  if (classesError) {
    console.error("Admin curriculum classes fetch failed:", classesError);
    return NextResponse.json({ error: "Failed to load classes." }, { status: 500 });
  }

  return NextResponse.json({ curriculum, classes: classes ?? [] });
}
