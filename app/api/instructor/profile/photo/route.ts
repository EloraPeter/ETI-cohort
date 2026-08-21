import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyInstructorRequest } from "@/lib/supabase/verifyInstructor";
import { detectFileKind } from "@/lib/validations/fileSignature";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB — generous for a profile photo, same order as payment proofs
const ALLOWED_KINDS = new Set(["image/png", "image/jpeg", "image/webp"]);

/**
 * Uploads a new avatar and returns its public URL — that's all.
 * Deliberately does NOT write to the instructors table itself: the
 * client calls the existing PATCH /api/instructor/profile with the
 * returned URL to actually save it, which is what already carries
 * the profile-completion tracking logic (marking profile_completed_at
 * the first time every required field is set). Splitting it this way
 * means that logic lives in exactly one place, not duplicated here.
 */
export async function POST(request: Request) {
  const instructor = await verifyInstructorRequest(request);
  if (!instructor) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "An image file is required." }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Image is too large — max 5MB." }, { status: 400 });
  }

  // Same magic-byte check used for payment proofs and handbooks —
  // never trust the client-supplied MIME type.
  const detectedKind = await detectFileKind(file);
  if (!detectedKind || !ALLOWED_KINDS.has(detectedKind)) {
    return NextResponse.json({ error: "Please upload a PNG, JPEG, or WebP image." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const extension = detectedKind.split("/")[1];
  const path = `avatars/${instructor.id}/${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("instructor-avatars")
    .upload(path, file, { contentType: detectedKind, upsert: false });

  if (uploadError) {
    console.error("Instructor avatar upload failed:", uploadError);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }

  const { data: publicUrlData } = supabase.storage.from("instructor-avatars").getPublicUrl(path);

  // Clean up the previous avatar so replacing a photo doesn't leave
  // the old file orphaned in storage forever — same pattern as the
  // handbook upload route.
  const previousUrl = instructor.profile_photo_url;
  if (previousUrl) {
    const previousPath = extractStoragePath(previousUrl);
    if (previousPath) {
      await supabase.storage.from("instructor-avatars").remove([previousPath]);
    }
  }

  return NextResponse.json({ url: publicUrlData.publicUrl });
}

/** Pulls the storage-relative path back out of a public bucket URL,
 *  e.g. ".../object/public/instructor-avatars/avatars/<id>/<file>"
 *  -> "avatars/<id>/<file>". Returns null for anything that doesn't
 *  look like one of our own instructor-avatars URLs (e.g. if an
 *  instructor somehow still has an old externally-hosted URL from
 *  before this upload flow existed) — nothing to clean up in that case. */
function extractStoragePath(url: string): string | null {
  const marker = "/instructor-avatars/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}
