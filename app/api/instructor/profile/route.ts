import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyInstructorRequest } from "@/lib/supabase/verifyInstructor";
import { getInstructorProfileCompletion } from "@/lib/instructors/profileCompletion";
import { INSTRUCTOR_REQUIRED_PROFILE_FIELDS } from "@/lib/supabase/types";

export async function GET(request: Request) {
  const instructor = await verifyInstructorRequest(request);
  if (!instructor) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return NextResponse.json({ instructor, completion: getInstructorProfileCompletion(instructor) });
}

const patchSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  profilePhotoUrl: z.string().trim().url().nullable().optional(),
  bio: z.string().trim().max(2000).nullable().optional(),
  professionalTitle: z.string().trim().max(150).nullable().optional(),
  expertise: z.string().trim().max(500).nullable().optional(),
  linkedinUrl: z.string().trim().url().nullable().optional(),
  githubUrl: z.string().trim().url().nullable().optional(),
});

export async function PATCH(request: Request) {
  const instructor = await verifyInstructorRequest(request);
  if (!instructor) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request body." }, { status: 400 });
  }
  const input = parsed.data;

  // Deliberately no email field here — email changes stay an
  // admin-only action (see PATCH /api/admin/instructors/[id]), which
  // keeps instructors.email and the Supabase Auth login email in
  // sync on a single, deliberate code path rather than two.
  const update: Record<string, unknown> = {};
  if (input.fullName !== undefined) update.full_name = input.fullName;
  if (input.phone !== undefined) update.phone = input.phone;
  if (input.profilePhotoUrl !== undefined) update.profile_photo_url = input.profilePhotoUrl;
  if (input.bio !== undefined) update.bio = input.bio;
  if (input.professionalTitle !== undefined) update.professional_title = input.professionalTitle;
  if (input.expertise !== undefined) update.expertise = input.expertise;
  if (input.linkedinUrl !== undefined) update.linkedin_url = input.linkedinUrl;
  if (input.githubUrl !== undefined) update.github_url = input.githubUrl;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  // Mark the profile complete the first time all required fields are
  // set — same "set once, check merged final values" pattern as
  // PATCH /api/student/profile.
  if (!instructor.profile_completed_at) {
    const merged = { ...instructor, ...update };
    const allRequiredSet = INSTRUCTOR_REQUIRED_PROFILE_FIELDS.every((field) => {
      const value = merged[field];
      return typeof value === "string" && value.trim().length > 0;
    });
    if (allRequiredSet) {
      update.profile_completed_at = new Date().toISOString();
    }
  }

  const supabase = createAdminClient();
  const { data: updated, error } = await supabase
    .from("instructors")
    .update(update)
    .eq("id", instructor.id)
    .select("*")
    .single();

  if (error || !updated) {
    console.error("Instructor profile update failed:", error);
    return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });
  }

  return NextResponse.json({ instructor: updated, completion: getInstructorProfileCompletion(updated) });
}
