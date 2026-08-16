import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendRecoveryLinkEmail } from "@/lib/email/sendRecoveryLink";
import { generateRecoveryToken, hashRecoveryToken, isRecoveryTokenExpired, recoveryTokenExpiryTimestamp } from "@/lib/recovery/token";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cohort.eloratechinstitute.com";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Always the same message, same status, regardless of what actually
// happened — this is the anti-enumeration contract for this route.
// Every return path in this file must go through this. A function,
// not a shared singleton — a module-level Response instance would be
// reused (and potentially already-consumed) across concurrent requests.
function genericResponse() {
  return NextResponse.json({
    message: "If you have an active enrollment in progress, we've sent a continuation link to your email.",
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = body && typeof body.email === "string" ? body.email.trim().toLowerCase() : null;

  if (!email || !EMAIL_RE.test(email)) {
    // Even a malformed email gets the generic response — no signal
    // about validation vs. non-existence should leak either.
    return genericResponse();
  }

  const supabase = createAdminClient();

  // Most recent registration for this email, across any cohort —
  // deliberately not scoped to "the currently open cohort" here,
  // since a closed-cohort edge case is handled later, at the
  // Paystack-specific decision point in /api/recovery/verify.
  const { data: registration } = await supabase
    .from("registrations")
    .select("id, full_name, email")
    .ilike("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!registration) {
    return genericResponse();
  }

  const { data: payment } = await supabase
    .from("payments")
    .select("id, recovery_token_expires_at")
    .eq("registration_id", registration.id)
    .single();

  if (!payment) {
    return genericResponse();
  }

  // Smallest practical abuse guard available without new
  // infrastructure: if this payment already has a live (unexpired)
  // recovery token, don't mint and email another one. This throttles
  // repeated requests against the *same* registration to effectively
  // one live link per 30-minute window. It does not protect against
  // someone probing many different email addresses in sequence —
  // there's no IP-based or global rate limiting anywhere in this
  // codebase today, and adding one is out of scope for this feature.
  // Flagging this as a known limitation, not silently working around it.
  if (!isRecoveryTokenExpired(payment.recovery_token_expires_at)) {
    return genericResponse();
  }

  const rawToken = generateRecoveryToken();
  const tokenHash = hashRecoveryToken(rawToken);
  const expiresAt = recoveryTokenExpiryTimestamp();

  const { error: updateError } = await supabase
    .from("payments")
    .update({ recovery_token_hash: tokenHash, recovery_token_expires_at: expiresAt })
    .eq("id", payment.id);

  if (updateError) {
    console.error("Failed to store recovery token:", updateError);
    return genericResponse();
  }

  await sendRecoveryLinkEmail({
    to: registration.email,
    fullName: registration.full_name,
    recoveryUrl: `${siteUrl}/recovery/${rawToken}`,
  });

  return genericResponse();
}
