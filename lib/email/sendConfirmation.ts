import "server-only";
import { ROUTES } from "@/lib/routes";

interface ConfirmationEmailParams {
  to: string;
  fullName: string;
  studentCode: string;
  onboardingUrl: string;
  accountSetupUrl: string | null;
  calendarUrl: string;
  cohortName: string;
  startsOn: string;
  durationWeeks: number;
}

const NAVY = "#0F172A";
const ROYAL_BLUE = "#1D4ED8";
const GOLD = "#F59E0B";
const SKY_BLUE = "#38BDF8";

/**
 * Sends the enrollment confirmation email if RESEND_API_KEY is
 * configured. If it isn't (e.g. local dev), logs instead of
 * throwing — email delivery should never fail the payment/enrollment
 * flow that triggered it.
 */
export async function sendEnrollmentConfirmationEmail(params: ConfirmationEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? "Elora Tech Institute <onboarding@eloratechinstitute.com>";
  const replyTo = process.env.RESEND_REPLY_TO_EMAIL ?? "eloratechinstitute@gmail.com";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cohort.eloratechinstitute.com";
  const loginUrl = `${siteUrl}${ROUTES.login}`;
  const dashboardUrl = `${siteUrl}${ROUTES.dashboard}`;

  const subject = `You're officially enrolled — ${params.cohortName}`;
  const firstName = params.fullName.split(" ")[0];
  const startsOnFormatted = new Date(params.startsOn).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const isNewStudent = Boolean(params.accountSetupUrl);
  const primaryCtaLabel = isNewStudent ? "Set Up My Student Account" : "Go to My Student Dashboard";
  const primaryCtaUrl = isNewStudent ? params.accountSetupUrl! : dashboardUrl;

  const html = `
  <div style="background-color:#F1F5F9; padding:32px 16px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <div style="max-width:560px; margin:0 auto; background-color:#FFFFFF; border-radius:16px; overflow:hidden; border:1px solid #E2E8F0;">

      <!-- Brand header -->
      <div style="background-color:${NAVY}; padding:28px 32px; text-align:center;">
        <p style="margin:0; font-size:11px; letter-spacing:2px; text-transform:uppercase; color:${SKY_BLUE}; font-weight:600;">
          Elora Tech Institute
        </p>
        <p style="margin:4px 0 0; font-size:12px; color:#94A3B8;">Student Enrollment Confirmation</p>
      </div>

      <!-- Body -->
      <div style="padding:36px 32px 8px; text-align:center;">
        <h1 style="margin:0 0 16px; font-size:22px; color:${NAVY}; font-weight:700;">
          You're officially enrolled 🎉
        </h1>
        <p style="margin:0 0 4px; font-size:15px; line-height:1.6; color:#334155;">
          Hi ${firstName},
        </p>
        <p style="margin:0 0 28px; font-size:15px; line-height:1.6; color:#334155;">
          We've received and confirmed your payment, and your place in the <strong>${params.cohortName}</strong>
          is officially secured. We're excited to have you learning with Elora Tech Institute.
        </p>
      </div>

      <!-- Student info card -->
      <div style="margin:0 32px 32px; border:1px solid #E2E8F0; border-radius:12px; overflow:hidden;">
        <div style="display:table; width:100%; border-collapse:collapse;">
          ${infoRow("Student ID", params.studentCode, true)}
          ${infoRow("Cohort", params.cohortName)}
          ${infoRow("Classes begin", startsOnFormatted)}
          ${infoRow("Duration", `${params.durationWeeks} weeks`)}
        </div>
      </div>

      <!-- Primary CTA -->
      <div style="padding:0 32px 8px; text-align:center;">
        <a href="${primaryCtaUrl}" style="display:inline-block; background-color:${ROYAL_BLUE}; color:#FFFFFF; padding:14px 32px; border-radius:10px; text-decoration:none; font-weight:600; font-size:15px;">
          ${primaryCtaLabel}
        </a>
      </div>

      <!-- Secondary CTA -->
      <div style="padding:12px 32px 32px; text-align:center;">
        ${
          isNewStudent
            ? `<a href="${loginUrl}" style="font-size:13px; color:${ROYAL_BLUE}; text-decoration:underline;">Already have an account? Sign in to your Student Portal</a>`
            : `<a href="${loginUrl}" style="font-size:13px; color:#64748B; text-decoration:underline;">Not signed in automatically? Go to the Student Portal</a>`
        }
      </div>

      <div style="border-top:1px solid #E2E8F0; margin:0 32px;"></div>

      <!-- Tertiary links -->
      <div style="padding:20px 32px; text-align:center;">
        <a href="${params.calendarUrl}" style="font-size:12px; color:#94A3B8; text-decoration:none; margin:0 10px;">Add schedule to calendar</a>
        <span style="color:#CBD5E1;">&middot;</span>
        <a href="${params.onboardingUrl}" style="font-size:12px; color:#94A3B8; text-decoration:none; margin:0 10px;">View enrollment details</a>
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
      body: JSON.stringify({ from, to: params.to, reply_to: replyTo, subject, html }),
    });
    if (!res.ok) {
      console.error("Resend email failed:", await res.text());
    }
  } catch (err) {
    console.error("Resend email request failed:", err);
  }
}

function infoRow(label: string, value: string, first = false): string {
  return `
    <div style="display:table-row;">
      <div style="display:table-cell; padding:14px 20px; ${first ? "" : "border-top:1px solid #E2E8F0;"} font-size:13px; color:#64748B; width:40%;">
        ${label}
      </div>
      <div style="display:table-cell; padding:14px 20px; ${first ? "" : "border-top:1px solid #E2E8F0;"} font-size:14px; color:${NAVY}; font-weight:600; text-align:right;">
        ${value}
      </div>
    </div>
  `;
}
