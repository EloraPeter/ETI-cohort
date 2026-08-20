"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Field } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/routes";
import type { Instructor } from "@/lib/supabase/types";
import type { ProfileCompletion } from "@/lib/instructors/profileCompletion";

export const dynamic = "force-dynamic";

const lightInputClass =
  "w-full rounded-lg border border-ink-900/10 bg-white px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-700/40 outline-none focus:border-signal-500";

export default function InstructorProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [instructor, setInstructor] = useState<Instructor | null>(null);
  const [completion, setCompletion] = useState<ProfileCompletion | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
  const [bio, setBio] = useState("");
  const [professionalTitle, setProfessionalTitle] = useState("");
  const [expertise, setExpertise] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace(ROUTES.instructorLogin);
        return;
      }
      setAccessToken(data.session.access_token);
      setCheckingAuth(false);
    });
  }, [router, supabase]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/instructor/profile", { headers: { Authorization: `Bearer ${accessToken}` } });
    if (res.status === 401) {
      router.replace(ROUTES.instructorLogin);
      return;
    }
    if (res.ok) {
      const data = await res.json();
      const inst: Instructor = data.instructor;
      setInstructor(inst);
      setCompletion(data.completion);
      setFullName(inst.full_name ?? "");
      setPhone(inst.phone ?? "");
      setProfilePhotoUrl(inst.profile_photo_url ?? "");
      setBio(inst.bio ?? "");
      setProfessionalTitle(inst.professional_title ?? "");
      setExpertise(inst.expertise ?? "");
      setLinkedinUrl(inst.linkedin_url ?? "");
      setGithubUrl(inst.github_url ?? "");
    }
    setLoading(false);
  }, [accessToken, router]);

  useEffect(() => {
    if (!checkingAuth && accessToken) load();
  }, [checkingAuth, accessToken, load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const res = await fetch("/api/instructor/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        fullName,
        phone: phone || null,
        profilePhotoUrl: profilePhotoUrl || null,
        bio: bio || null,
        professionalTitle: professionalTitle || null,
        expertise: expertise || null,
        linkedinUrl: linkedinUrl || null,
        githubUrl: githubUrl || null,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setInstructor(data.instructor);
      setCompletion(data.completion);
      setSaved(true);
    } else {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Couldn't save your profile.");
    }
    setSaving(false);
  }

  if (checkingAuth || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper-50">
        <Loader2 className="h-6 w-6 animate-spin text-ink-900" aria-hidden="true" />
      </main>
    );
  }

  if (!instructor) return null;

  return (
    <main className="min-h-screen bg-paper-50 py-10 text-ink-900">
      <Container className="max-w-xl">
        <Link href={ROUTES.instructorDashboard} className="inline-flex items-center gap-1.5 text-sm text-ink-700 hover:text-ink-900">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to dashboard
        </Link>

        <h1 className="mt-4 font-display text-2xl font-semibold">Your profile</h1>

        {completion && (
          <div className="mt-4 rounded-xl2 border border-ink-900/10 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-ink-900">Profile completion</p>
              <span className="text-sm font-semibold text-signal-600">
                {completion.completedCount}/{completion.totalCount} completed
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink-900/10">
              <div className="h-full rounded-full bg-signal-500" style={{ width: `${completion.percent}%` }} />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-xl2 border border-ink-900/10 bg-white p-6">
          {error && (
            <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </p>
          )}
          {saved && (
            <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              Profile saved.
            </p>
          )}

          <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/70">Required</p>

          <Field label="Full name" htmlFor="fullName">
            <input id="fullName" required className={lightInputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label="Email" htmlFor="email">
            <input id="email" disabled className={`${lightInputClass} opacity-60`} value={instructor.email} />
          </Field>
          <Field label="Phone number" htmlFor="phone">
            <input id="phone" className={lightInputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Profile photo URL" htmlFor="profilePhotoUrl">
            <input
              id="profilePhotoUrl"
              type="url"
              placeholder="https://..."
              className={lightInputClass}
              value={profilePhotoUrl}
              onChange={(e) => setProfilePhotoUrl(e.target.value)}
            />
          </Field>
          <Field label="Short bio" htmlFor="bio">
            <textarea id="bio" rows={3} className={lightInputClass} value={bio} onChange={(e) => setBio(e.target.value)} />
          </Field>

          <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-ink-700/70">Optional</p>

          <Field label="Professional title" htmlFor="professionalTitle">
            <input
              id="professionalTitle"
              className={lightInputClass}
              value={professionalTitle}
              onChange={(e) => setProfessionalTitle(e.target.value)}
            />
          </Field>
          <Field label="Areas of expertise" htmlFor="expertise">
            <input id="expertise" className={lightInputClass} value={expertise} onChange={(e) => setExpertise(e.target.value)} />
          </Field>
          <Field label="LinkedIn URL" htmlFor="linkedinUrl">
            <input
              id="linkedinUrl"
              type="url"
              placeholder="https://linkedin.com/in/..."
              className={lightInputClass}
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
            />
          </Field>
          <Field label="GitHub URL" htmlFor="githubUrl">
            <input
              id="githubUrl"
              type="url"
              placeholder="https://github.com/..."
              className={lightInputClass}
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
            />
          </Field>

          <button type="submit" disabled={saving} className="w-full rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">
            {saving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" aria-hidden="true" /> : "Save profile"}
          </button>
        </form>
      </Container>
    </main>
  );
}
