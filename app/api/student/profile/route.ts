import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyStudentRequest } from "@/lib/supabase/verifyStudent";

export async function PATCH(request: Request) {
  const student = await verifyStudentRequest(request);
  if (!student) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { preferredName, timezone, laptopReady } = body as {
    preferredName?: unknown;
    timezone?: unknown;
    laptopReady?: unknown;
  };

  const update: Record<string, unknown> = {};
  if (preferredName !== undefined) {
    if (typeof preferredName !== "string" || preferredName.trim().length === 0 || preferredName.length > 100) {
      return NextResponse.json({ error: "Preferred name must be 1-100 characters." }, { status: 400 });
    }
    update.preferred_name = preferredName.trim();
  }
  if (timezone !== undefined) {
    if (typeof timezone !== "string" || timezone.length > 100) {
      return NextResponse.json({ error: "Invalid timezone." }, { status: 400 });
    }
    update.timezone = timezone;
  }
  if (laptopReady !== undefined) {
    if (typeof laptopReady !== "boolean") {
      return NextResponse.json({ error: "laptopReady must be a boolean." }, { status: 400 });
    }
    update.laptop_ready = laptopReady;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  // Mark the profile complete the first time preferredName + timezone are both set.
  if (!student.profile_completed_at) {
    const finalPreferredName = (update.preferred_name as string | undefined) ?? student.preferred_name;
    const finalTimezone = (update.timezone as string | undefined) ?? student.timezone;
    if (finalPreferredName && finalTimezone) {
      update.profile_completed_at = new Date().toISOString();
    }
  }

  const supabase = createAdminClient();
  const { data: updated, error } = await supabase
    .from("students")
    .update(update)
    .eq("id", student.id)
    .select("*")
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });
  }

  // If the profile just got marked complete, tick that checklist item too.
  if (typeof update.profile_completed_at === "string") {
    const { data: profileItem } = await supabase
      .from("checklist_items")
      .select("id")
      .eq("item_key", "profile")
      .single();
    if (profileItem) {
      await supabase
        .from("student_checklist_progress")
        .update({ completed_at: update.profile_completed_at, completion_source: "system_verified" })
        .eq("student_id", student.id)
        .eq("checklist_item_id", profileItem.id)
        .is("completed_at", null);
    }
  }

  return NextResponse.json({ student: updated });
}
