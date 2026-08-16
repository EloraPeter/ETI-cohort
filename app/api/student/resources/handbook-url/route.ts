import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyStudentRequest } from "@/lib/supabase/verifyStudent";
import { getScopedChecklistItem } from "@/lib/checklist/getStudentChecklist";

export async function GET(request: Request) {
  const student = await verifyStudentRequest(request);
  if (!student) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const item = await getScopedChecklistItem(student.cohort_id, "orientation-handbook");
  if (!item?.action_url) {
    return NextResponse.json({ error: "The handbook isn't available yet." }, { status: 404 });
  }

  // action_url holds the private storage object path, not a public URL —
  // the bucket is private, so every read goes through a short-lived
  // signed URL generated server-side, same pattern as payment-proofs.
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from("onboarding-resources").createSignedUrl(item.action_url, 300);

  if (error || !data) {
    return NextResponse.json({ error: "Could not generate a link for the handbook." }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
