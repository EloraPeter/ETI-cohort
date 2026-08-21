import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAdminRequest } from "@/lib/supabase/verifyAdmin";

const createSchema = z.object({
  label: z.string().trim().min(1).max(150),
  url: z.string().trim().url(),
});

export async function POST(request: Request, { params }: { params: Promise<{ classId: string }> }) {
  const email = await verifyAdminRequest(request);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { classId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request body." }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("class_resources")
    .select("sort_order")
    .eq("curriculum_class_id", classId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSortOrder = (existing?.sort_order ?? -1) + 1;

  const { data: resource, error } = await supabase
    .from("class_resources")
    .insert({ curriculum_class_id: classId, label: parsed.data.label, url: parsed.data.url, sort_order: nextSortOrder })
    .select("*")
    .single();

  if (error || !resource) {
    console.error("Admin class resource create failed:", error);
    return NextResponse.json({ error: "Failed to add resource." }, { status: 500 });
  }

  return NextResponse.json({ resource }, { status: 201 });
}

export async function DELETE(request: Request) {
  const email = await verifyAdminRequest(request);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const resourceId = searchParams.get("resourceId");
  if (!resourceId) {
    return NextResponse.json({ error: "resourceId query parameter is required." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("class_resources").delete().eq("id", resourceId);

  if (error) {
    console.error("Admin class resource delete failed:", error);
    return NextResponse.json({ error: "Failed to remove resource." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
