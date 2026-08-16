import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashRecoveryToken, isRecoveryTokenExpired } from "@/lib/recovery/token";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = body && typeof body.token === "string" ? body.token : null;

  if (!token) {
    return NextResponse.json({ error: "A recovery token is required." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const tokenHash = hashRecoveryToken(token);

  const { data: payment } = await supabase.from("payments").select("*").eq("recovery_token_hash", tokenHash).maybeSingle();

  if (!payment || isRecoveryTokenExpired(payment.recovery_token_expires_at)) {
    return NextResponse.json({ error: "This recovery link is invalid or has expired." }, { status: 401 });
  }

  // Single-use: consume immediately, before returning anything. This
  // only ever runs from an explicit POST triggered by the student
  // clicking "Continue" on /recovery/[token] — never from a bare GET,
  // so an email-safety scanner visiting the link can't burn it (the
  // exact lesson from the earlier account-setup link-scanner bug).
  await supabase.from("payments").update({ recovery_token_hash: null, recovery_token_expires_at: null }).eq("id", payment.id);

  if (payment.status === "paid") {
    return NextResponse.json({ state: "already_enrolled" });
  }

  if (payment.method === "Paystack") {
    const { data: cohort } = await supabase.from("cohorts").select("is_open").eq("id", payment.cohort_id).maybeSingle();
    if (!cohort?.is_open) {
      return NextResponse.json({ state: "cohort_closed" });
    }
    return NextResponse.json({ state: "paystack_pending", paymentId: payment.id });
  }

  if (payment.method === "Bank Transfer") {
    if (!payment.proof_path) {
      return NextResponse.json({ state: "bank_transfer_pending", paymentId: payment.id });
    }
    if (payment.status === "failed") {
      return NextResponse.json({ state: "bank_transfer_rejected", paymentId: payment.id, adminNotes: payment.admin_notes ?? null });
    }
    // proof submitted, not rejected, not yet paid — awaiting admin review.
    return NextResponse.json({ state: "bank_transfer_awaiting_review" });
  }

  // Unexpected combination (missing/unknown method, or a status that
  // doesn't map to a supported recovery path) — don't guess.
  console.error("Recovery verify hit an ambiguous payment state:", { paymentId: payment.id, method: payment.method, status: payment.status });
  return NextResponse.json({ state: "ambiguous" });
}
