import "server-only";

interface RecoveryEmailParams {
  to: string;
  fullName: string;
  recoveryUrl: string;
}

const NAVY = "#0F172A";
const ROYAL_BLUE = "#1D4ED8";
const SKY_BLUE = "#38BDF8";

/**
 * Sends the "Continue Your Enrollment" recovery link. Deliberately
 * minimal — no cohort name, payment method, amount, or status, since
 * this email's only job is to get the student back to a page that
 * itself re-verifies everything server-side. Same never-throws
 * convention as sendConfirmation.ts: email delivery must never be
 * what breaks the request endpoint's uniform response.
 */
export async function sendRecoveryLinkEmail(params: RecoveryEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? "Elora Tech Institute <onboarding@eloratechinstitute.com>";
  const replyTo = process.env.RESEND_REPLY_TO_EMAIL ?? "eloratechinstitute@gmail.com";

  const subject = "Continue Your Enrollment — Elora Tech Institute";
  const firstName = params.fullName.split(" ")[0];

  const html = `
  <div style="background-color:#F1F5F9; padding:32px 16px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <div style="max-width:480px; margin:0 auto; background-color:#FFFFFF; border-radius:16px; overflow:hidden; border:1px solid #E2E8F0;">
      <div style="background-color:${NAVY}; padding:24px 32px; text-align:center;">
        <p style="margin:0; font-size:11px; letter-spacing:2px; text-transform:uppercase; color:${SKY_BLUE}; font-weight:600;">
          Elora Tech Institute
        </p>
      </div>
      <div style="padding:32px; text-align:center;">
        <h1 style="margin:0 0 16px; font-size:20px; color:${NAVY}; font-weight:700;">Continue Your Enrollment</h1>
        <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#334155;">
          Hi ${firstName}, looks like you started an enrollment with us. Click below to pick up right where you left off.
        </p>
        <a href="${params.recoveryUrl}" style="display:inline-block; background-color:${ROYAL_BLUE}; color:#FFFFFF; padding:14px 32px; border-radius:10px; text-decoration:none; font-weight:600; font-size:15px;">
          Continue Your Enrollment
        </a>
        <p style="margin:24px 0 0; font-size:12px; color:#94A3B8;">
          This link expires in 30 minutes and can only be used once. If you didn't request this, you can safely ignore this email.
        </p>
      </div>
      <div style="background-color:#F8FAFC; padding:16px 32px; text-align:center; border-top:1px solid #E2E8F0;">
        <p style="margin:0; font-size:11px; color:#94A3B8;">&copy; ${new Date().getFullYear()} Elora Tech Institute</p>
      </div>
    </div>
  </div>
  `;

  if (!apiKey) {
    console.log(`[email:stub] Would send recovery link to ${params.to}`);
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: params.to, reply_to: replyTo, subject, html }),
    });
    if (!res.ok) {
      console.error("Resend recovery email failed:", await res.text());
    }
  } catch (err) {
    console.error("Resend recovery email request failed:", err);
  }
}
