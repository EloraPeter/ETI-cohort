"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, CheckCircle2 } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Field, inputClass } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";

// Session comes from the recovery link in the URL — never statically prerendered.
export const dynamic = "force-dynamic";

const TIMEZONES = [
  "Africa/Lagos",
  "Africa/Cairo",
  "Africa/Nairobi",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Other",
];

type Step = "checking" | "expired" | "password" | "profile" | "done";

export default function AccountSetupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>("checking");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [preferredName, setPreferredName] = useState("");
  const [timezone, setTimezone] = useState("Africa/Lagos");
  const [laptopReady, setLaptopReady] = useState(false);

  // The recovery link redirects here with the session encoded in the URL —
  // the Supabase browser client auto-detects and applies it on load.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setStep(data.session ? "password" : "expired");
    });
  }, [supabase]);

  async function handleSetPassword(e: React.FormEvent) {
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
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError("Couldn't set your password. Try again.");
      return;
    }
    setStep("profile");
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!preferredName.trim()) {
      setError("Let us know what to call you.");
      return;
    }
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const res = await fetch("/api/student/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ preferredName, timezone, laptopReady }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Couldn't save your profile. Try again.");
      return;
    }
    setStep("done");
    setTimeout(() => router.push("/dashboard"), 1200);
  }

  return (
    <main className="section-grid-bg flex min-h-screen items-center justify-center py-20">
      <Container className="max-w-sm">
        <div className="glass-panel p-8">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-brand-gradient">
            <KeyRound className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
          <h1 className="mt-5 text-center text-xl font-semibold text-white">
            {step === "profile" ? "Tell us about you" : "Set up your account"}
          </h1>
          <p className="mt-1 text-center text-sm text-mist">Elora Tech Institute student dashboard</p>

          {step === "checking" && (
            <div className="mt-8 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-mist" aria-hidden="true" />
            </div>
          )}

          {step === "expired" && (
            <p className="mt-6 text-center text-sm text-mist">
              This setup link has expired or was already used. Contact us and we'll send you a new one.
            </p>
          )}

          {error && (
            <p role="alert" className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {error}
            </p>
          )}

          {step === "password" && (
            <form onSubmit={handleSetPassword} className="mt-6 space-y-4">
              <Field label="Password" htmlFor="password">
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  className={inputClass}
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
                  className={inputClass}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </Field>
              <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Continue"}
              </button>
            </form>
          )}

          {step === "profile" && (
            <form onSubmit={handleProfileSubmit} className="mt-6 space-y-4">
              <Field label="What should we call you?" htmlFor="preferredName">
                <input
                  id="preferredName"
                  type="text"
                  required
                  maxLength={100}
                  className={inputClass}
                  value={preferredName}
                  onChange={(e) => setPreferredName(e.target.value)}
                />
              </Field>
              <Field label="Timezone" htmlFor="timezone">
                <select
                  id="timezone"
                  className={inputClass}
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </Field>
              <label className="flex items-center gap-2 text-sm text-white/90">
                <input
                  type="checkbox"
                  checked={laptopReady}
                  onChange={(e) => setLaptopReady(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/[0.04]"
                />
                My laptop and dev environment are ready
              </label>
              <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Finish setup"}
              </button>
            </form>
          )}

          {step === "done" && (
            <div className="mt-6 flex flex-col items-center gap-2 text-center">
              <CheckCircle2 className="h-8 w-8 text-signal-400" aria-hidden="true" />
              <p className="text-sm text-white/90">You're all set — taking you to your dashboard.</p>
            </div>
          )}
        </div>
      </Container>
    </main>
  );
}
