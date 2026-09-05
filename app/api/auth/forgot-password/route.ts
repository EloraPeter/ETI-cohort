import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPasswordResetEmail } from "@/lib/email/sendPasswordReset";
import { isRole } from "@/lib/auth/roles";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cohort.eloratechinstitute.com";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ALLOWED_ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// Always the same message, same status, regardless of what actually
// happened — same anti-enumeration contract as /api/recovery/request.
// Every return path in this file must go through this.
function genericResponse() {
  return NextResponse.json({
    message: "If an account exists for that email, we've sent a password reset link.",
  });
}

/**
 * One shared route for all three roles rather than three near-identical
 * copies — the only thing that actually differs between them is which
 * table/allow-list proves the account exists, and which login page the
 * reset link should return to afterward. Both are looked up from `role`
 * below; nothing about the actual security check is shared or weakened
 * by combining them.
 *
 * No custom token storage here (unlike /api/recovery/request's hashed
 * token column) — this uses Supabase's own built-in recovery-OTP
 * mechanism via generateLink(), which already handles single-use and
 * expiry server-side. Same known limitation as the existing recovery
 * route: no IP-based or global rate limiting exists anywhere in this
 * codebase today; flagging rather than silently working around it.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = body && typeof body.email === "string" ? body.email.trim().toLowerCase() : null;
  const role = body && isRole(body.role) ? body.role : null;

  if (!email || !EMAIL_RE.test(email) || !role) {
    return genericResponse();
  }

  const supabase = createAdminClient();

  if (role === "admin") {
    if (!ALLOWED_ADMIN_EMAILS.includes(email)) return genericResponse();
  } else if (role === "student") {
    const { data: student } = await supabase
      .from("students")
      .select("id")
      .ilike("email", email)
      .eq("status", "active")
      .maybeSingle();
    if (!student) return genericResponse();
  } else {
    const { data: instructor } = await supabase
      .from("instructors")
      .select("id")
      .ilike("email", email)
      .eq("status", "active")
      .maybeSingle();
    if (!instructor) return genericResponse();
  }

  const redirectTo = `${siteUrl}/reset-password?role=${role}`;
  const { data: link, error: linkError } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });

  if (linkError || !link?.properties?.hashed_token) {
    console.error("forgot-password: could not generate reset link for", email, linkError);
    return genericResponse();
  }

  const resetUrl = `${redirectTo}&token_hash=${encodeURIComponent(link.properties.hashed_token)}&type=recovery`;

  await sendPasswordResetEmail({ to: email, resetUrl, roleLabel: role });

  return genericResponse();
}
