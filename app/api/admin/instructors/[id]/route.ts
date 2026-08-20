import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAdminRequest } from "@/lib/supabase/verifyAdmin";
import { provisionInstructorAccount } from "@/lib/instructors/provision";

const patchSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  profilePhotoUrl: z.string().trim().url().nullable().optional(),
  bio: z.string().trim().max(2000).nullable().optional(),
  professionalTitle: z.string().trim().max(150).nullable().optional(),
  expertise: z.string().trim().max(500).nullable().optional(),
  linkedinUrl: z.string().trim().url().nullable().optional(),
  githubUrl: z.string().trim().url().nullable().optional(),
  action: z.enum(["resend_invite"]).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminEmail = await verifyAdminRequest(request);
  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Instructor id is required." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request body." }, { status: 400 });
  }
  const input = parsed.data;

  const supabase = createAdminClient();

  const { data: instructor, error: fetchError } = await supabase
    .from("instructors")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !instructor) {
    return NextResponse.json({ error: "Instructor not found." }, { status: 404 });
  }

  // ------------------------------------------------------------
  // Resend invitation — regenerates the setup link. Does not touch
  // any other field on this request.
  // ------------------------------------------------------------
  if (input.action === "resend_invite") {
    if (instructor.status === "active") {
      return NextResponse.json({ error: "This instructor has already completed account setup." }, { status: 400 });
    }
    const result = await provisionInstructorAccount({
      instructorId: instructor.id,
      fullName: instructor.full_name,
      email: instructor.email,
      existingAuthUserId: instructor.auth_user_id,
    });
    if (!result.ok) {
      return NextResponse.json({ error: "Could not resend the invitation." }, { status: 500 });
    }
    return NextResponse.json({ success: true, emailSent: result.emailSent });
  }

  const update: Record<string, unknown> = {};
  if (input.fullName !== undefined) update.full_name = input.fullName;
  if (input.phone !== undefined) update.phone = input.phone;
  if (input.status !== undefined) update.status = input.status;
  if (input.profilePhotoUrl !== undefined) update.profile_photo_url = input.profilePhotoUrl;
  if (input.bio !== undefined) update.bio = input.bio;
  if (input.professionalTitle !== undefined) update.professional_title = input.professionalTitle;
  if (input.expertise !== undefined) update.expertise = input.expertise;
  if (input.linkedinUrl !== undefined) update.linkedin_url = input.linkedinUrl;
  if (input.githubUrl !== undefined) update.github_url = input.githubUrl;

  // ------------------------------------------------------------
  // Email change — keep instructors.email and the linked Supabase
  // Auth login email synchronized by default, rather than silently
  // letting them diverge. If there's no linked auth user yet
  // (still 'invited'), there's nothing to sync — just update the
  // institutional record.
  // ------------------------------------------------------------
  if (input.email !== undefined && input.email !== instructor.email.toLowerCase()) {
    if (instructor.auth_user_id) {
      const { error: authUpdateError } = await supabase.auth.admin.updateUserById(instructor.auth_user_id, {
        email: input.email,
      });
      if (authUpdateError) {
        console.error("Admin instructor email sync failed:", authUpdateError);
        return NextResponse.json(
          { error: "Could not update the instructor's login email. The institutional email was not changed either, to avoid the two going out of sync." },
          { status: 500 }
        );
      }
    }
    update.email = input.email;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  const { data: updated, error: updateError } = await supabase
    .from("instructors")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (updateError || !updated) {
    if (updateError?.code === "23505") {
      return NextResponse.json({ error: "An instructor with this email already exists." }, { status: 409 });
    }
    console.error("Admin instructor update failed:", updateError);
    return NextResponse.json({ error: "Failed to update instructor." }, { status: 500 });
  }

  return NextResponse.json({ instructor: updated });
}
