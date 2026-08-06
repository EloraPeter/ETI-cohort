"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Hourglass, IdCard, LogOut, Loader2, CheckCircle2, Circle, UserCircle } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { createClient } from "@/lib/supabase/client";
import type { Cohort, ChecklistItem, Student } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default function StudentDashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/login");
        return;
      }
      setAccessToken(data.session.access_token);
      setCheckingAuth(false);
    });
  }, [router, supabase]);

  const authedFetch = useCallback(
    (url: string, init?: RequestInit) =>
      fetch(url, { ...init, headers: { ...init?.headers, Authorization: `Bearer ${accessToken}` } }),
    [accessToken]
  );

  const load = useCallback(async () => {
    setLoading(true);
    const res = await authedFetch("/api/student/me");
    if (res.status === 401) {
      router.replace("/login");
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setStudent(data.student);
      setCohort(data.cohort);
      setChecklist(data.checklist);
    }
    setLoading(false);
  }, [authedFetch, router]);

  useEffect(() => {
    if (!checkingAuth && accessToken) load();
  }, [checkingAuth, accessToken, load]);

  async function toggleChecklistItem(item: ChecklistItem) {
    setTogglingKey(item.item_key);
    const res = await authedFetch("/api/student/checklist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemKey: item.item_key, completed: !item.completed_at }),
    });
    if (res.ok) {
      const { item: updated } = await res.json();
      setChecklist((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    }
    setTogglingKey(null);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (checkingAuth || loading) {
    return (
      <main className="section-grid-bg flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-mist" aria-hidden="true" />
      </main>
    );
  }

  if (!student) return null;

  const startsOnFormatted = cohort
    ? new Date(cohort.starts_on).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })
    : null;
  const completedCount = checklist.filter((i) => i.completed_at).length;
  const displayName = (student.preferred_name ?? student.full_name).split(" ")[0];

  return (
    <main className="section-grid-bg min-h-screen py-16">
      <Container className="max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-mist">Welcome back</p>
            <h1 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">Hi, {displayName}</h1>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/80 hover:bg-white/[0.06]"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            Sign out
          </button>
        </div>

        {!student.profile_completed_at && (
          <div className="glass-panel mt-6 flex items-center gap-3 border-signal-400/30 p-4">
            <UserCircle className="h-5 w-5 shrink-0 text-signal-400" aria-hidden="true" />
            <p className="text-sm text-white/90">
              Your profile isn't complete yet.{" "}
              <a href="/account/setup" className="font-medium text-signal-400 underline">
                Finish it
              </a>{" "}
              so we can prepare your cohort experience.
            </p>
          </div>
        )}

        <div className="glass-panel mt-6 grid grid-cols-1 gap-4 p-6 text-left sm:grid-cols-3 sm:p-8">
          <div>
            <IdCard className="h-5 w-5 text-sky-400" aria-hidden="true" />
            <p className="mt-2 text-xs uppercase tracking-wide text-mist">Student ID</p>
            <p className="mt-1 font-mono text-sm font-semibold text-white">{student.student_code}</p>
          </div>
          {cohort && (
            <>
              <div>
                <CalendarDays className="h-5 w-5 text-sky-400" aria-hidden="true" />
                <p className="mt-2 text-xs uppercase tracking-wide text-mist">Starts</p>
                <p className="mt-1 text-sm font-semibold text-white">{startsOnFormatted}</p>
              </div>
              <div>
                <Hourglass className="h-5 w-5 text-sky-400" aria-hidden="true" />
                <p className="mt-2 text-xs uppercase tracking-wide text-mist">Duration</p>
                <p className="mt-1 text-sm font-semibold text-white">{cohort.duration_weeks} weeks</p>
              </div>
            </>
          )}
        </div>

        <div className="glass-panel mt-6 p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-sky-400">Cohort prep checklist</h2>
            <span className="text-xs text-mist">
              {completedCount}/{checklist.length} done
            </span>
          </div>
          <ul className="mt-4 space-y-1">
            {checklist.map((item) => {
              const isDone = Boolean(item.completed_at);
              const isToggling = togglingKey === item.item_key;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => toggleChecklistItem(item)}
                    disabled={isToggling}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm hover:bg-white/[0.04] disabled:opacity-60"
                  >
                    {isToggling ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-mist" aria-hidden="true" />
                    ) : isDone ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-signal-400" aria-hidden="true" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-mist" aria-hidden="true" />
                    )}
                    <span className={isDone ? "text-white/50 line-through" : "text-white/90"}>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </Container>
    </main>
  );
}
