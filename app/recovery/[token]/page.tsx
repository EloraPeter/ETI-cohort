"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, MailCheck, CheckCircle2, AlertTriangle, Clock, XCircle } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/routes";

export const dynamic = "force-dynamic";

type Step =
  | "confirm"
  | "verifying"
  | "resuming"
  | "token_error"
  | "paystack_error"
  | "already_enrolled"
  | "cohort_closed"
  | "awaiting_review"
  | "rejected"
  | "ambiguous";

export default function RecoveryTokenPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();

  const [step, setStep] = useState<Step>("confirm");
  const [tokenErrorMessage, setTokenErrorMessage] = useState<string | null>(null);
  const [paystackErrorMessage, setPaystackErrorMessage] = useState<string | null>(null);
  const [rejectionNote, setRejectionNote] = useState<string | null>(null);
  const [bankTransferPaymentId, setBankTransferPaymentId] = useState<string | null>(null);

  async function handleContinue() {
    setStep("verifying");

    const res = await fetch("/api/recovery/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: params.token }),
    });

    if (!res.ok) {
      setTokenErrorMessage("This recovery link is invalid or has expired.");
      setStep("token_error");
      return;
    }

    const data = await res.json();

    switch (data.state) {
      case "already_enrolled":
        setStep("already_enrolled");
        return;

      case "cohort_closed":
        setStep("cohort_closed");
        return;

      case "paystack_pending": {
        setStep("resuming");
        const initRes = await fetch("/api/payments/paystack/initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId: data.paymentId }),
        });
        const initData = await initRes.json().catch(() => ({}));
        if (initRes.ok && initData.authorizationUrl) {
          window.location.href = initData.authorizationUrl;
          return;
        }
        setPaystackErrorMessage("Couldn't resume your payment. Please try again or contact support.");
        setStep("paystack_error");
        return;
      }

      case "bank_transfer_pending":
        router.push(`/pay/bank-transfer/${data.paymentId}`);
        return;

      case "bank_transfer_rejected":
        setRejectionNote(data.adminNotes ?? null);
        setBankTransferPaymentId(data.paymentId);
        setStep("rejected");
        return;

      case "bank_transfer_awaiting_review":
        setStep("awaiting_review");
        return;

      default:
        setStep("ambiguous");
        return;
    }
  }

  return (
    <main className="section-grid-bg flex min-h-screen items-center justify-center py-20">
      <Container className="max-w-md">
        <div className="glass-panel p-6 text-center sm:p-10">
          {step === "confirm" && (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-gradient">
                <MailCheck className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <h1 className="mt-5 text-xl font-semibold text-white">Continue Your Enrollment</h1>
              <p className="mt-3 text-sm leading-relaxed text-mist">Click below to verify it's you and pick up where you left off.</p>
              <button onClick={handleContinue} className="btn-primary mt-6 w-full">
                Continue
              </button>
            </>
          )}

          {(step === "verifying" || step === "resuming") && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-6 w-6 animate-spin text-mist" aria-hidden="true" />
              <p className="text-sm text-mist">{step === "resuming" ? "Resuming your payment..." : "Verifying..."}</p>
            </div>
          )}

          {step === "token_error" && (
            <>
              <XCircle className="mx-auto h-10 w-10 text-rose-400" aria-hidden="true" />
              <h1 className="mt-4 text-xl font-semibold text-white">Recovery link expired</h1>
              <p className="mt-3 text-sm leading-relaxed text-mist">{tokenErrorMessage}</p>
              <Link href="/recovery" className="btn-primary mt-6 inline-flex w-full justify-center">
                Request a new link
              </Link>
            </>
          )}

          {step === "paystack_error" && (
            <>
              <XCircle className="mx-auto h-10 w-10 text-rose-400" aria-hidden="true" />
              <h1 className="mt-4 text-xl font-semibold text-white">Couldn't resume your payment</h1>
              <p className="mt-3 text-sm leading-relaxed text-mist">{paystackErrorMessage}</p>
              <Link href="/recovery" className="btn-primary mt-6 inline-flex w-full justify-center">
                Request a new link
              </Link>
            </>
          )}

          {step === "already_enrolled" && (
            <>
              <CheckCircle2 className="mx-auto h-10 w-10 text-signal-400" aria-hidden="true" />
              <h1 className="mt-4 text-xl font-semibold text-white">You're already enrolled</h1>
              <p className="mt-3 text-sm leading-relaxed text-mist">Your payment was already confirmed — no need to pay again.</p>
              <Link href={ROUTES.login} className="btn-primary mt-6 inline-flex w-full justify-center">
                Go to Student Portal
              </Link>
            </>
          )}

          {step === "cohort_closed" && (
            <>
              <AlertTriangle className="mx-auto h-10 w-10 text-amber-400" aria-hidden="true" />
              <h1 className="mt-4 text-xl font-semibold text-white">This cohort is no longer open</h1>
              <p className="mt-3 text-sm leading-relaxed text-mist">
                The cohort you registered for is no longer accepting enrollments. Please contact ETI support for help.
              </p>
            </>
          )}

          {step === "awaiting_review" && (
            <>
              <Clock className="mx-auto h-10 w-10 text-sky-400" aria-hidden="true" />
              <h1 className="mt-4 text-xl font-semibold text-white">Payment proof submitted</h1>
              <p className="mt-3 text-sm leading-relaxed text-mist">Your payment proof is currently awaiting verification. We'll email you once it's confirmed.</p>
            </>
          )}

          {step === "rejected" && (
            <>
              <XCircle className="mx-auto h-10 w-10 text-rose-400" aria-hidden="true" />
              <h1 className="mt-4 text-xl font-semibold text-white">Payment proof was rejected</h1>
              <p className="mt-3 text-sm leading-relaxed text-mist">
                {rejectionNote ? rejectionNote : "Please review the instructions and submit a new proof."}
              </p>
              {bankTransferPaymentId && (
                <Link
                  href={`/pay/bank-transfer/${bankTransferPaymentId}`}
                  className="btn-primary mt-6 inline-flex w-full justify-center"
                >
                  Submit new proof
                </Link>
              )}
            </>
          )}

          {step === "ambiguous" && (
            <>
              <AlertTriangle className="mx-auto h-10 w-10 text-amber-400" aria-hidden="true" />
              <h1 className="mt-4 text-xl font-semibold text-white">Something's not right</h1>
              <p className="mt-3 text-sm leading-relaxed text-mist">
                We couldn't determine the current status of your enrollment. Please contact ETI support.
              </p>
            </>
          )}
        </div>
      </Container>
    </main>
  );
}
