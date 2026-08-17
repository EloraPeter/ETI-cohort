import "server-only";

interface InvitationEmailParams {
  to: string;
  fullName: string;
  setupUrl: string;
}

const NAVY = "#0F172A";
const ROYAL_BLUE = "#1D4ED8";
const GOLD = "#F59E0B";
const SKY_BLUE = "#38BDF8";

/**
 * Sends the instructor invitation email if RESEND_API_KEY is
 * configured. If it isn't (e.g. local dev), logs instead of
 * throwing — same fallback as sendEnrollmentConfirmationEmail, and
 * for the same reason: email delivery should never fail instructor
 * provisioning.
 */
export async function sendInstructorInvitationEmail(params: InvitationEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? "Elora Tech Institute <admissions@eloratechinstitute.com>";
  const replyTo = process.env.RESEND_REPLY_TO_EMAIL ?? "eloratechinstitute@gmail.com";

  const subject = "You've been invited to teach at Elora Tech Institute";
  const firstName = params.fullName.split(" ")[0];

  const html = `
  <div style="background-color:#F1F5F9; padding:32px 16px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <div style="max-width:560px; margin:0 auto; background-color:#FFFFFF; border-radius:16px; overflow:hidden; border:1px solid #E2E8F0;">

      <!-- Brand header -->
      <div style="background-color:${NAVY}; padding:28px 32px; text-align:center;">
        <p style="margin:0; font-size:11px; letter-spacing:2px; text-transform:uppercase; color:${SKY_BLUE}; font-weight:600;">
          Elora Tech Institute
        </p>
        <p style="margin:4px 0 0; font-size:12px; color:#94A3B8;">Instructor Invitation</p>
      </div>

      <!-- Body -->
      <div style="padding:36px 32px 8px; text-align:center;">
        <h1 style="margin:0 0 16px; font-size:22px; color:${NAVY}; font-weight:700;">
          You've been invited to teach 🎓
        </h1>
        <p style="margin:0 0 4px; font-size:15px; line-height:1.6; color:#334155;">
          Hi ${firstName},
        </p>
        <p style="margin:0 0 28px; font-size:15px; line-height:1.6; color:#334155;">
          An ETI administrator has set you up as an instructor. Set your password below
          to activate your account and access your instructor dashboard.
        </p>
      </div>

      <!-- Primary CTA -->
      <div style="padding:0 32px 8px; text-align:center;">
        <a href="${params.setupUrl}" style="display:inline-block; background-color:${ROYAL_BLUE}; color:#FFFFFF; padding:14px 32px; border-radius:10px; text-decoration:none; font-weight:600; font-size:15px;">
          Set Up My Instructor Account
        </a>
      </div>

      <div style="padding:16px 32px 32px; text-align:center;">
        <p style="margin:0; font-size:12px; color:#94A3B8;">
          This link is single-use and expires after a while — if it's stopped working, ask an admin to resend your invitation.
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color:#F8FAFC; padding:20px 32px; text-align:center; border-top:1px solid #E2E8F0;">
        <p style="margin:0; font-size:11px; color:#94A3B8;">
          &copy; ${new Date().getFullYear()} Elora Tech Institute &middot; <span style="color:${GOLD};">Built for real-world digital solutions</span>
        </p>
      </div>

    </div>
  </div>
  `;

  if (!apiKey) {
    console.log(`[email:stub] Would send instructor invitation to ${params.to}: ${subject}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: params.to, reply_to: replyTo, subject, html }),
  });
  if (!res.ok) {
    throw new Error(`Resend email failed: ${await res.text()}`);
  }
}
