import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendInstructorInvitationEmail } from "@/lib/email/sendInstructorInvitation";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cohort.eloratechinstitute.com";

/**
 * Ensures the instructor has a Supabase Auth account, sends them a
 * secure setup link, and links auth_user_id back onto their
 * instructors row. This is the instructor-side counterpart to
 * provisionStudentAccount() in lib/payments/finalize.ts — same
 * mechanism, reused deliberately rather than reinvented:
 *
 *   - createUser() / listUsers() fallback for re-invites or an
 *     email that already has an unrelated auth user
 *   - generateLink({ type: "recovery" }) rather than Supabase's
 *     invite-email flow, so we can send our own branded email with
 *     the raw token_hash (see the comment on this in finalize.ts —
 *     action_link auto-verifies on GET and gets silently consumed by
 *     email providers' link-safety scanners before the instructor
 *     ever clicks it; token_hash is only verified via an explicit
 *     user action on /instructor/account/setup)
 *
 * Best-effort on the email send (never blocks instructor creation),
 * but NOT best-effort on the auth linkage itself — if we can't
 * create/find the auth user, the instructor row is left with
 * auth_user_id = null and the caller should surface that as an
 * error, since an instructor who can never log in isn't a
 * successfully created instructor.
 */
export async function provisionInstructorAccount(params: {
  instructorId: string;
  fullName: string;
  email: string;
  existingAuthUserId: string | null;
}): Promise<{ ok: boolean; emailSent: boolean }> {
  const supabase = createAdminClient();
  const redirectTo = `${siteUrl}/instructor/account/setup`;

  let authUserId = params.existingAuthUserId;

  if (!authUserId) {
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: params.email,
      email_confirm: true, // we send our own custom email — no need for Supabase's confirmation email
    });

    if (createError || !created.user) {
      // Most likely cause: an auth user with this email already exists.
      // Look it up instead of failing provisioning outright — same
      // fallback provisionStudentAccount() uses.
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const match = existingUsers?.users.find((u) => u.email?.toLowerCase() === params.email.toLowerCase());
      if (!match) {
        console.error("provisionInstructorAccount: could not create or find auth user for", params.email, createError);
        return { ok: false, emailSent: false };
      }
      authUserId = match.id;
    } else {
      authUserId = created.user.id;
    }

    const { error: linkError } = await supabase
      .from("instructors")
      .update({ auth_user_id: authUserId })
      .eq("id", params.instructorId);

    if (linkError) {
      console.error("provisionInstructorAccount: failed to link auth_user_id for", params.instructorId, linkError);
      return { ok: false, emailSent: false };
    }
  }

  const { data: link, error: linkError } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email: params.email,
    options: { redirectTo },
  });

  if (linkError || !link?.properties?.hashed_token) {
    console.error("provisionInstructorAccount: could not generate setup link for", params.email, linkError);
    return { ok: true, emailSent: false }; // account exists/linked; just the email failed
  }

  const setupUrl = `${redirectTo}?token_hash=${encodeURIComponent(link.properties.hashed_token)}&type=recovery`;

  try {
    await sendInstructorInvitationEmail({ to: params.email, fullName: params.fullName, setupUrl });
    return { ok: true, emailSent: true };
  } catch (err) {
    console.error("provisionInstructorAccount: invitation email failed for", params.email, err);
    return { ok: true, emailSent: false };
  }
}
