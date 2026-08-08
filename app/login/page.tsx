"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2 } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Field, inputClass } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/routes";

export const dynamic = "force-dynamic";

export default function StudentLoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Already signed in? Skip the form entirely.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace(ROUTES.dashboard);
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
    router.push(ROUTES.dashboard);
  }

  if (checkingSession) {
    return (
      <main className="section-grid-bg flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-mist" aria-hidden="true" />
      </main>
    );
  }

  return (
    <main className="section-grid-bg flex min-h-screen items-center justify-center py-20">
      <Container className="max-w-sm">
        <div className="glass-panel p-8">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-brand-gradient">
            <Lock className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
          <h1 className="mt-5 text-center text-xl font-semibold text-white">Student sign in</h1>
          <p className="mt-1 text-center text-sm text-mist">Elora Tech Institute dashboard</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {error}
              </p>
            )}
            <Field label="Email" htmlFor="email">
              <input
                id="email"
                type="email"
                required
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Password" htmlFor="password">
              <input
                id="password"
                type="password"
                required
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-mist">
            New to ETI? Check your enrollment confirmation email for your account setup link.
          </p>
        </div>
      </Container>
    </main>
  );
}
