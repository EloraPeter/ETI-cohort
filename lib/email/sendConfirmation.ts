import "server-only";

interface ConfirmationEmailParams {
  to: string;
  fullName: string;
  studentCode: string;
  onboardingUrl: string;
  cohortName: string;
  startsOn: string;
  durationWeeks: number;
}

/**
 * Sends the enrollment confirmation email if RESEND_API_KEY is
 * configured. If it isn't (e.g. local dev), logs instead of
 * throwing — email delivery should never fail the payment/enrollment
 * flow that triggered it.
 */
export async function sendEnrollmentConfirmationEmail(params: ConfirmationEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? "Elora Tech Institute <admissions@eloratechinstitute.com>";

  const subject = `You're enrolled — welcome to ${params.cohortName}`;
  const startsOnFormatted = new Date(params.startsOn).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color:#0F172A;">Congratulations, ${params.fullName.split(" ")[0]}!</h1>
      <p style="color:#334155; line-height:1.6;">
        Your payment has been confirmed and your seat in the <strong>${params.cohortName}</strong>
        is secured.
      </p>
      <p style="color:#334155; line-height:1.6;">
        <strong>Student ID:</strong> ${params.studentCode}<br/>
        <strong>Starts:</strong> ${startsOnFormatted}<br/>
        <strong>Duration:</strong> ${params.durationWeeks} weeks
      </p>
      <p style="margin: 24px 0;">
        <a href="${params.onboardingUrl}" style="background:#1D4ED8;color:white;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;">
          View your onboarding details
        </a>
      </p>
      <p style="color:#94A3B8; font-size:13px;">— Elora Tech Institute</p>
    </div>
  `;

  if (!apiKey) {
    console.log(`[email:stub] Would send enrollment confirmation to ${params.to}: ${subject}`);
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: params.to, subject, html }),
    });
    if (!res.ok) {
      console.error("Resend email failed:", await res.text());
    }
  } catch (err) {
    console.error("Resend email request failed:", err);
  }
}
