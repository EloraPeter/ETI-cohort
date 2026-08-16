import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAdminRequest } from "@/lib/supabase/verifyAdmin";
import { detectFileKind } from "@/lib/validations/fileSignature";
import { upsertCohortChecklistItem } from "@/lib/checklist/upsertCohortResource";

const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15MB — a handbook PDF can carry images, unlike a payment proof

export async function POST(request: Request) {
  const email = await verifyAdminRequest(request);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const cohortId = formData.get("cohortId");
  const file = formData.get("file");

  if (typeof cohortId !== "string" || !cohortId) {
    return NextResponse.json({ error: "cohortId is required." }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A PDF file is required." }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File is too large — max 15MB." }, { status: 400 });
  }

  // Same magic-byte check used for payment proofs — never trust the
  // client-supplied MIME type.
  const detectedKind = await detectFileKind(file);
  if (detectedKind !== "application/pdf") {
    return NextResponse.json({ error: "The handbook must be a PDF file." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `handbook/${cohortId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("onboarding-resources")
    .upload(path, file, { contentType: "application/pdf", upsert: false });

  if (uploadError) {
    console.error("Handbook upload failed:", uploadError);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }

  let previousActionUrl: string | null;
  try {
    const result = await upsertCohortChecklistItem(cohortId, "orientation-handbook", path);
    previousActionUrl = result.previousActionUrl;
  } catch (err) {
    console.error("Handbook checklist item update failed:", err);
    // Clean up the file we just uploaded since the DB write failed —
    // otherwise it's an orphan nothing ever points to.
    await supabase.storage.from("onboarding-resources").remove([path]);
    return NextResponse.json({ error: "Upload saved but the checklist item couldn't be updated. Try again." }, { status: 500 });
  }

  // Replacing an existing handbook — remove the old file so it doesn't
  // sit orphaned in storage forever.
  if (previousActionUrl && previousActionUrl !== path) {
    await supabase.storage.from("onboarding-resources").remove([previousActionUrl]);
  }

  return NextResponse.json({ success: true, path });
}
