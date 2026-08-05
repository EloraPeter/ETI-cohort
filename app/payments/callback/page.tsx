import { redirect } from "next/navigation";
import Link from "next/link";
import { XCircle } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPaystackTransaction } from "@/lib/payments/paystack";
import { finalizeEnrollment } from "@/lib/payments/finalize";

export const dynamic = "force-dynamic";

function FailureScreen({ heading, body }: { heading: string; body: string }) {
  return (
    <main className="section-grid-bg flex min-h-screen items-center justify-center bg-ink-900 py-20">
      <Container className="max-w-lg text-center">
        <div className="glass-panel p-10 sm:p-14">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-error/15">
            <XCircle className="h-7 w-7 text-error" aria-hidden="true" />
          </div>
          <h1 className="mt-6 text-2xl font-semibold text-white sm:text-3xl">{heading}</h1>
          <p className="mt-4 text-base leading-relaxed text-mist">{body}</p>
          <Link href="/register" className="btn-secondary mt-8 inline-flex">
            Back to registration
          </Link>
        </div>
      </Container>
    </main>
  );
}

export default async function PaystackCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; trxref?: string }>;
}) {
  const params = await searchParams;
  const reference = params.reference ?? params.trxref;

  if (!reference) {
    return (
      <FailureScreen
        heading="Missing payment reference"
        body="We couldn't find a payment reference in the URL. If you just paid, check your email for confirmation, or contact support."
      />
    );
  }

  const supabase = createAdminClient();
  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("paystack_reference", reference)
    .single();

  if (!payment) {
    return (
      <FailureScreen
        heading="Payment not found"
        body="We couldn't match this payment to a registration. Please contact support with your reference number."
      />
    );
  }

  // Already processed (e.g. webhook beat us here) — go straight to onboarding.
  if (payment.status === "paid") {
    const { data: student } = await supabase
      .from("students")
      .select("student_code")
      .eq("registration_id", payment.registration_id)
      .single();
    if (student) redirect(`/onboarding/${student.student_code}`);
  }

  try {
    const verified = await verifyPaystackTransaction(reference);
    const expectedKobo = Math.round(Number(payment.amount_expected) * 100);

    if (verified.status !== "success") {
      await supabase.from("payments").update({ status: "failed" }).eq("id", payment.id);
      return (
        <FailureScreen
          heading="Payment wasn't completed"
          body="Your Paystack transaction wasn't successful, so no charge was confirmed. You can go back and try again."
        />
      );
    }

    if (verified.amountKobo !== expectedKobo) {
      await supabase
        .from("payments")
        .update({
          status: "failed",
          admin_notes: `Amount mismatch: expected ₦${payment.amount_expected}, received ₦${verified.amountKobo / 100}.`,
        })
        .eq("id", payment.id);
      return (
        <FailureScreen
          heading="Payment amount didn't match"
          body="The amount received didn't match the cohort fee, so we couldn't confirm this automatically. Please contact support — do not pay again yet."
        />
      );
    }

    const { studentCode } = await finalizeEnrollment({
      paymentId: payment.id,
      amountPaidNgn: verified.amountKobo / 100,
      source: "paystack",
      paystack: { reference: verified.reference, transactionId: verified.transactionId },
    });

    redirect(`/onboarding/${studentCode}`);
  } catch (err) {
    // Next.js's redirect() throws internally — let it propagate, only catch real errors.
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    console.error("Paystack callback verification failed:", err);
    return (
      <FailureScreen
        heading="Couldn't confirm your payment yet"
        body="We had trouble verifying this transaction just now. If you were charged, it will be confirmed automatically shortly — check your email, or contact support with your reference number."
      />
    );
  }
}
