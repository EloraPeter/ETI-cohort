"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Loader2, UserCircle, Users, GraduationCap, CalendarDays, ChevronRight, AlertTriangle, BookOpen } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { StatCard } from "@/components/admin/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/routes";
import { formatWeeklySchedule } from "@/lib/calendar/formatSchedule";
import type { ProfileCompletion } from "@/lib/instructors/profileCompletion";
import type { Instructor } from "@/lib/supabase/types";
import type { InstructorDashboardCohort } from "@/app/api/instructor/dashboard/route";

export const dynamic = "force-dynamic";

const statusBadgeClass: Record<string, string> = {
  invited: "badge-warning",
  active: "badge-success",
  inactive: "badge-error",
};

export default function InstructorDashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [instructor, setInstructor] = useState<Instructor | null>(null);
  const [completion, setCompletion] = useState<ProfileCompletion | null>(null);
  const [cohorts, setCohorts] = useState<InstructorDashboardCohort[]>([]);
  const [stats, setStats] = useState({ cohortCount: 0, studentCount: 0 });

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

  const authedFetch = useCallback(
    (url: string, init?: RequestInit) =>
      fetch(url, { ...init, headers: { ...init?.headers, Authorization: `Bearer ${accessToken}` } }),
    [accessToken]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await authedFetch("/api/instructor/dashboard");
    if (res.status === 401) {
      router.replace(ROUTES.instructorLogin);
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setInstructor(data.instructor);
      setCompletion(data.completion);
      setCohorts(data.cohorts);
      setStats(data.stats);
    } else {
      setError("Couldn't load your dashboard. Try refreshing.");
    }
    setLoading(false);
  }, [authedFetch, router]);

  useEffect(() => {
    if (!checkingAuth && accessToken) load();
  }, [checkingAuth, accessToken, load]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace(ROUTES.instructorLogin);
  }

  if (checkingAuth || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper-50">
        <Loader2 className="h-6 w-6 animate-spin text-ink-900" aria-hidden="true" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper-50 px-4">
        <p className="text-sm text-ink-700">{error}</p>
      </main>
    );
  }

  if (!instructor || !completion) return null;

  const firstName = instructor.full_name.split(" ")[0];

  return (
    <main className="min-h-screen bg-paper-50 py-10 text-ink-900">
      <Container className="max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {instructor.profile_photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={instructor.profile_photo_url}
                alt=""
                className="h-11 w-11 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-ink-900/10">
                <UserCircle className="h-6 w-6 text-ink-700" aria-hidden="true" />
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-700/70">Welcome back</p>
              <h1 className="font-display text-2xl font-semibold">{firstName}</h1>
            </div>
            <span className={`${statusBadgeClass[instructor.status] ?? "badge-warning"} capitalize`}>
              {instructor.status}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href={ROUTES.instructorProfile} className="text-sm font-medium text-signal-500 hover:underline">
              My profile
            </Link>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 rounded-lg border border-ink-900/10 px-4 py-2 text-sm font-medium text-ink-800 hover:bg-white"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>

        {!completion.isComplete && (
          <Link
            href={ROUTES.instructorProfile}
            className="mt-6 block rounded-xl2 border border-signal-500/30 bg-signal-500/[0.06] p-4 hover:bg-signal-500/10"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-ink-900">Complete your instructor profile</p>
              <span className="text-sm font-semibold text-signal-600">
                {completion.completedCount}/{completion.totalCount} completed
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink-900/10">
              <div className="h-full rounded-full bg-signal-500" style={{ width: `${completion.percent}%` }} />
            </div>
            <p className="mt-2 text-xs text-ink-700">
              Missing: {completion.missingFields.join(", ")}
            </p>
          </Link>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-2">
          <StatCard label="Assigned cohorts" value={stats.cohortCount} />
          <StatCard label="Students" value={stats.studentCount} />
        </div>

        {cohorts
          .filter((c) => c.teaching?.today)
          .map((cohort) => {
            const t = cohort.teaching!;
            const today = t.today!;
            const progressPercent = t.progress.total > 0 ? Math.round((t.progress.completed / t.progress.total) * 100) : 0;
            return (
              <div key={cohort.id} className="mt-6 rounded-xl2 border border-signal-500/30 bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-signal-600">{cohort.name} · Today's Class</p>
                <p className="mt-2 text-sm text-ink-700">
                  Week {today.week_number} · Class {today.class_number}
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold text-ink-900">{today.title}</h2>
                <p className="text-sm text-ink-700">{today.week_theme}</p>

                <div className="mt-3 rounded-lg bg-paper-50 p-3">
                  <p className="text-xs font-medium text-ink-700/70">Today's outcome</p>
                  <p className="mt-1 text-sm text-ink-900">{today.outcome}</p>
                </div>

                <Link
                  href={`/instructor/cohorts/${cohort.id}/classes/${today.id}`}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-ink-800"
                >
                  <BookOpen className="h-4 w-4" aria-hidden="true" />
                  Open Teaching Guide
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>

                <div className="mt-5 border-t border-ink-900/10 pt-4">
                  <div className="flex items-center justify-between text-xs text-ink-700/70">
                    <span>Progress</span>
                    <span>
                      {t.progress.completed} / {t.progress.total} classes completed
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-ink-900/10">
                    <div className="h-full rounded-full bg-signal-500" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>

                {t.upcoming.length > 0 && (
                  <div className="mt-5 border-t border-ink-900/10 pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/70">Upcoming</p>
                    <ul className="mt-2 space-y-1">
                      {t.upcoming.map((u, i) => (
                        <li key={u.id}>
                          <Link
                            href={`/instructor/cohorts/${cohort.id}/classes/${u.id}`}
                            className="flex items-center justify-between gap-2 rounded-lg py-1 text-sm text-ink-900 hover:text-signal-600"
                          >
                            <span>
                              {["Tomorrow", "Next", "Then"][i] ?? "Then"} — Class {u.class_number}: {u.title}
                            </span>
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-700/40" aria-hidden="true" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {t.carryOverAlert && (
                  <div className="mt-5 rounded-lg border border-warning/30 bg-warning/10 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-warning">
                      <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                      Carry-over from Class {t.carryOverAlert.fromClassNumber}
                    </p>
                    <p className="mt-1 text-sm text-ink-900">{t.carryOverAlert.text}</p>
                  </div>
                )}
              </div>
            );
          })}

        <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-ink-700/70">Your cohorts</h2>

        {cohorts.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={GraduationCap}
              message="You haven't been assigned to any cohorts yet. An ETI administrator will assign you when you're ready to start."
            />
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {cohorts.map((cohort) => (
              <Link
                key={cohort.id}
                href={`/instructor/cohorts/${cohort.id}`}
                className="rounded-xl2 border border-ink-900/10 bg-white p-5 hover:border-signal-500/40 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-ink-900">{cohort.name}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-700">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                      Starts {new Date(cohort.starts_on).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                      {" · "}
                      {cohort.duration_weeks} weeks
                    </p>
                    {cohort.weekly_schedule && cohort.weekly_schedule.length > 0 && (
                      <p className="mt-1 text-xs text-ink-700">{formatWeeklySchedule(cohort.weekly_schedule).join(" · ")}</p>
                    )}
                    {cohort.teaching && !cohort.teaching.today && cohort.teaching.upcoming[0] && (
                      <p className="mt-1 text-xs text-ink-700">
                        Next class: Class {cohort.teaching.upcoming[0].class_number} — {cohort.teaching.upcoming[0].title}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-ink-700/50" aria-hidden="true" />
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-ink-900/10 pt-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-700">
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    {cohort.studentCount} {cohort.studentCount === 1 ? "student" : "students"}
                  </span>
                  <span className={cohort.is_open ? "badge-success" : "badge-warning"}>
                    {cohort.is_open ? "Open" : "Closed"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-8 flex items-center gap-2 text-xs text-ink-700/60">
          <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
          Elora Tech Institute — Instructor Dashboard
        </div>
      </Container>
    </main>
  );
}
