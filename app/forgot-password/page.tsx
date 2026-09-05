"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MailCheck, Loader2, KeyRound } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Field } from "@/components/ui/Field";
import { LOGIN_PATH, isRole, type Role } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<Role, string> = {
  student: "student",
  instructor: "instructor",
  admin: "admin",
};

const lightInputClass =
  "w-full rounded-lg border border-ink-900/10 bg-white px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-700/40 outline-none focus:border-signal-500";

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-paper-50">
          <Loader2 className="h-6 w-6 animate-spin text-ink-900" aria-hidden="true" />
        </main>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");
  const role: Role = isRole(roleParam) ? roleParam : "student";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    }).catch(() => {
      // Even a network hiccup doesn't get a different message — no
      // signal about success/failure should distinguish outcomes,
      // same anti-enumeration contract as the API route itself.
    });
    setLoading(false);
    setSubmitted(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper-50 px-4 py-16">
      <Container className="max-w-sm">
        <Link href={LOGIN_PATH[role]} className="inline-flex items-center gap-1.5 text-sm text-ink-700 hover:text-ink-900">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to sign in
        </Link>

        <div className="mt-6 rounded-xl2 border border-ink-900/10 bg-white p-6 sm:p-8">
          {submitted ? (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ink-900">
                <MailCheck className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <h1 className="mt-5 text-xl font-semibold text-ink-900">Check your email</h1>
              <p className="mt-3 text-sm leading-relaxed text-ink-700">
                If an account exists for that email, we&apos;ve sent a password reset link.
              </p>
            </div>
          ) : (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ink-900/5">
                <KeyRound className="h-6 w-6 text-ink-900" aria-hidden="true" />
              </div>
              <h1 className="mt-5 text-xl font-semibold text-ink-900">Reset your password</h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                Enter the email on your {ROLE_LABEL[role]} account and we&apos;ll send you a link to choose a new
                password.
              </p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <Field label="Email address" htmlFor="email">
                  <input
                    id="email"
                    type="email"
                    required
                    className={lightInputClass}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                >
                  {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" aria-hidden="true" /> : "Send reset link"}
                </button>
              </form>
            </>
          )}
        </div>
      </Container>
    </main>
  );
}
