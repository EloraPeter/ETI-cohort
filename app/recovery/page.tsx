"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MailCheck, Loader2 } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Field, inputClass } from "@/components/ui/Field";

export default function RecoveryRequestPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/recovery/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => {
      // Even a network hiccup doesn't get a different message — no
      // signal about success/failure should distinguish outcomes.
    });
    setLoading(false);
    setSubmitted(true);
  }

  return (
    <main className="section-grid-bg min-h-screen py-20 sm:py-28">
      <Container className="max-w-md">
        <Link href="/register" className="inline-flex items-center gap-2 text-sm text-mist hover:text-white">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to registration
        </Link>

        <div className="glass-panel mt-8 p-6 sm:p-10">
          {submitted ? (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-gradient">
                <MailCheck className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <h1 className="mt-5 text-xl font-semibold text-white">Check your email</h1>
              <p className="mt-3 text-sm leading-relaxed text-mist">
                If you have an active enrollment in progress, we've sent a continuation link to your email. The
                link expires in 30 minutes.
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-white">Continue Your Enrollment</h1>
              <p className="mt-2 text-sm leading-relaxed text-mist">
                Already started your registration? Enter the email address you used and we'll send you a secure
                link to continue.
              </p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <Field label="Email address" htmlFor="email">
                  <input
                    id="email"
                    type="email"
                    required
                    className={inputClass}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
                <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Continue Enrollment"}
                </button>
              </form>
            </>
          )}
        </div>
      </Container>
    </main>
  );
}
