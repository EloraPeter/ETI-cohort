import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const paymentId = formData.get("paymentId");
  const file = formData.get("file");

  if (typeof paymentId !== "string" || !paymentId) {
    return NextResponse.json({ error: "paymentId is required." }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A proof file is required." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Upload a PNG, JPG, WEBP, or PDF file." }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File is too large — max 5MB." }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select("id, method, status")
    .eq("id", paymentId)
    .single();

  if (paymentError || !payment) {
    return NextResponse.json({ error: "Payment record not found." }, { status: 404 });
  }
  if (payment.method !== "Bank Transfer") {
    return NextResponse.json({ error: "This payment isn't set up for bank transfer." }, { status: 400 });
  }
  if (payment.status === "paid") {
    return NextResponse.json({ error: "This registration has already been paid for." }, { status: 409 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${paymentId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("payment-proofs")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("Proof upload failed:", uploadError);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("payments")
    .update({
      proof_path: path,
      proof_uploaded_at: new Date().toISOString(),
      status: "payment_processing",
    })
    .eq("id", paymentId);

  if (updateError) {
    console.error("Payment update after upload failed:", updateError);
    return NextResponse.json({ error: "Upload saved, but we couldn't update the payment. Contact support." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
