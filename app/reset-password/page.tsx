"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Field } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import { LOGIN_PATH, isRole, type Role } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

type Step = "verifying" | "expired" | "password" | "done";

const lightInputClass =
  "w-full rounded-lg border border-ink-900/10 bg-white px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-700/40 outline-none focus:border-signal-500";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-paper-50">
          <Loader2 className="h-6 w-6 animate-spin text-ink-900" aria-hidden="true" />
        </main>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const supabase = createClient();

  const roleParam = searchParams.get("role");
  const role: Role = isRole(roleParam) ? roleParam : "student";
  const tokenHash = searchParams.get("token_hash");

  const [step, setStep] = useState<Step>("verifying");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Verify the one-time recovery token on load — same verifyOtp
  // mechanism (and same "recovery" type) already used by account
  // setup, just landing on a password-only step instead of the full
  // confirm→password→profile flow, since this is an already-onboarded
  // user who just needs a new password, not first-time setup.
  useEffect(() => {
    if (!tokenHash) {
      setStep("expired");
      return;
    }
    supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" }).then(({ error: verifyError }) => {
      setStep(verifyError ? "expired" : "password");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenHash]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (updateError) {
      setError("Couldn't set your password. Try again.");
      return;
    }
    setStep("done");
  }

  if (step === "verifying") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper-50">
        <Loader2 className="h-6 w-6 animate-spin text-ink-900" aria-hidden="true" />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper-50 px-4 py-16">
      <Container className="max-w-sm">
        <div className="rounded-xl2 border border-ink-900/10 bg-white p-6 sm:p-8">
          {step === "expired" && (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
                <XCircle className="h-6 w-6 text-rose-600" aria-hidden="true" />
              </div>
              <h1 className="mt-5 text-xl font-semibold text-ink-900">Link expired or already used</h1>
              <p className="mt-3 text-sm leading-relaxed text-ink-700">
                Password reset links can only be used once. Request a new one to continue.
              </p>
              <Link
                href={`/forgot-password?role=${role}`}
                className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-medium text-white"
              >
                Request a new link
              </Link>
            </div>
          )}

          {step === "password" && (
            <>
              <h1 className="text-xl font-semibold text-ink-900">Choose a new password</h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                You&apos;re resetting the password for your {role} account.
              </p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {error && (
                  <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    {error}
                  </p>
                )}
                <Field label="New password" htmlFor="password">
                  <input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    className={lightInputClass}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </Field>
                <Field label="Confirm password" htmlFor="confirmPassword">
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    minLength={8}
                    className={lightInputClass}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </Field>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                >
                  {saving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" aria-hidden="true" /> : "Set new password"}
                </button>
              </form>
            </>
          )}

          {step === "done" && (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" aria-hidden="true" />
              </div>
              <h1 className="mt-5 text-xl font-semibold text-ink-900">Password updated</h1>
              <p className="mt-3 text-sm leading-relaxed text-ink-700">
                You can now sign in with your new password.
              </p>
              <Link
                href={LOGIN_PATH[role]}
                className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-medium text-white"
              >
                Sign in
              </Link>
            </div>
          )}
        </div>
      </Container>
    </main>
  );
}
