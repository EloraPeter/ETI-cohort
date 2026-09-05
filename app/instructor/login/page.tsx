"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Loader2 } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Field, inputClass } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/routes";

export const dynamic = "force-dynamic";

export default function InstructorLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-paper-50">
          <Loader2 className="h-6 w-6 animate-spin text-ink-900" aria-hidden="true" />
        </main>
      }
    >
      <InstructorLoginForm />
    </Suspense>
  );
}

function InstructorLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Set once on mount from the redirect reason (if any) — a fresh login
  // attempt should clear it, not keep re-showing a stale reason.
  const [inactiveNotice] = useState(() => searchParams.get("reason") === "inactive");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace(ROUTES.instructorDashboard);
        return;
      }
      setCheckingSession(false);
    });
  }, [router, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (signInError) {
      setError("Invalid email or password.");
      return;
    }
    router.push(ROUTES.instructorDashboard);
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper-50">
        <Loader2 className="h-6 w-6 animate-spin text-ink-900" aria-hidden="true" />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper-50 py-20">
      <Container className="max-w-sm">
        <div className="rounded-2xl border border-ink-900/10 bg-white p-8 shadow-sm">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-ink-900">
            <Lock className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
          <h1 className="mt-5 text-center text-xl font-semibold text-ink-900">Instructor sign in</h1>
          <p className="mt-1 text-center text-sm text-ink-700">Elora Tech Institute</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-ink-900/75">
            {inactiveNotice && !error && (
              <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Your instructor account is currently inactive. Contact an administrator for help.
              </p>
            )}
            {error && (
              <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {error}
              </p>
            )}
            <Field label="Email" htmlFor="email">
              <input
                id="email"
                type="email"
                required
                className={`${inputClass} border-ink-900/10 bg-white text-ink-900 placeholder:text-ink-700/40 focus:border-signal-500`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Password" htmlFor="password">
              <input
                id="password"
                type="password"
                required
                className={`${inputClass} border-ink-900/10 bg-white text-ink-900 placeholder:text-ink-700/40 focus:border-signal-500`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <div className="flex justify-end">
              <Link href="/forgot-password?role=instructor" className="text-xs font-medium text-ink-700 hover:text-ink-900">
                Forgot password?
              </Link>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" aria-hidden="true" /> : "Sign in"}
            </button>
          </form>
        </div>
      </Container>
    </main>
  );
}
