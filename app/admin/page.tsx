"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2 } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { inputClass } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";

// Uses the Supabase browser client at render time — never statically prerendered.
export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    router.push("/admin/dashboard");
  }

  return (
    <main className="section-grid-bg flex min-h-screen items-center justify-center py-20">
      <Container className="max-w-sm">
        <div className="glass-panel p-8">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-signal-violet">
            <Lock className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
          <h1 className="mt-5 text-center text-xl font-semibold">Admin sign in</h1>
          <p className="mt-1 text-center text-sm text-mist">Elora Tech Institute dashboard</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {error}
              </p>
            )}
            <div>
              <label htmlFor="email" className="text-sm text-white/90">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                className={`${inputClass} mt-1.5`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="text-sm text-white/90">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                className={`${inputClass} mt-1.5`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Sign in"}
            </button>
          </form>
        </div>
      </Container>
    </main>
  );
}
