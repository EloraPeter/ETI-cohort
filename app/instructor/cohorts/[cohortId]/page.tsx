"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Users, CalendarDays, IdCard } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/routes";
import { formatWeeklySchedule } from "@/lib/calendar/formatSchedule";
import type { Cohort } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

interface RosterStudent {
  id: string;
  student_code: string;
  full_name: string;
  email: string;
  phone: string;
  status: "active" | "inactive" | "withdrawn";
  enrolled_at: string;
  profile_completed_at: string | null;
}

const studentStatusBadge: Record<string, string> = {
  active: "badge-success",
  inactive: "badge-warning",
  withdrawn: "badge-error",
};

export default function InstructorCohortRosterPage() {
  const router = useRouter();
  const params = useParams<{ cohortId: string }>();
  const supabase = createClient();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [students, setStudents] = useState<RosterStudent[]>([]);

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
    setError(null);
    const res = await fetch(`/api/instructor/cohorts/${params.cohortId}/students`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status === 401) {
      router.replace(ROUTES.instructorLogin);
      return;
    }
    if (res.status === 403) {
      setError("You're not assigned to this cohort.");
      setLoading(false);
      return;
    }
    if (res.status === 404) {
      setError("Cohort not found.");
      setLoading(false);
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setCohort(data.cohort);
      setStudents(data.students);
    } else {
      setError("Couldn't load this cohort. Try refreshing.");
    }
    setLoading(false);
  }, [accessToken, params.cohortId, router]);

  useEffect(() => {
    if (!checkingAuth && accessToken) load();
  }, [checkingAuth, accessToken, load]);

  if (checkingAuth || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper-50">
        <Loader2 className="h-6 w-6 animate-spin text-ink-900" aria-hidden="true" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper-50 py-10 text-ink-900">
      <Container className="max-w-4xl">
        <Link href={ROUTES.instructorDashboard} className="inline-flex items-center gap-1.5 text-sm text-ink-700 hover:text-ink-900">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to dashboard
        </Link>

        {error ? (
          <div className="mt-6">
            <EmptyState message={error} />
          </div>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl font-semibold">{cohort?.name}</h1>
                {cohort && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-700">
                    <CalendarDays className="h-4 w-4" aria-hidden="true" />
                    Starts {new Date(cohort.starts_on).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}
                    {" · "}
                    {cohort.duration_weeks} weeks
                    {cohort.weekly_schedule && cohort.weekly_schedule.length > 0 && (
                      <> · {formatWeeklySchedule(cohort.weekly_schedule).join(" · ")}</>
                    )}
                  </p>
                )}
              </div>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-700">
                <Users className="h-4 w-4" aria-hidden="true" />
                {students.length} {students.length === 1 ? "student" : "students"}
              </span>
            </div>

            <div className="mt-6 overflow-hidden rounded-xl2 border border-ink-900/10 bg-white">
              <div className="hidden grid-cols-[1.3fr_1fr_1.3fr_1fr_0.9fr] gap-4 border-b border-ink-900/10 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-700/70 sm:grid">
                <span>Name</span>
                <span>Student ID</span>
                <span>Email</span>
                <span>Phone</span>
                <span>Status</span>
              </div>

              {students.length === 0 ? (
                <EmptyState message="No students enrolled in this cohort yet." bare />
              ) : (
                <ul className="divide-y divide-ink-900/10">
                  {students.map((student) => (
                    <li key={student.id} className="px-5 py-4 text-sm">
                      {/* Mobile: labeled stacked card */}
                      <div className="flex flex-col gap-1 sm:hidden">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium text-ink-900">{student.full_name}</span>
                          <span className={studentStatusBadge[student.status] ?? "badge-warning"}>{student.status}</span>
                        </div>
                        <p className="truncate text-ink-700">{student.email}</p>
                        <div className="flex items-center justify-between text-xs text-ink-700/70">
                          <span className="flex items-center gap-1.5 font-mono">
                            <IdCard className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            {student.student_code}
                          </span>
                          <span>{student.phone}</span>
                        </div>
                      </div>

                      {/* Desktop/tablet: column-aligned row, matches the header above */}
                      <div className="hidden sm:grid sm:grid-cols-[1.3fr_1fr_1.3fr_1fr_0.9fr] sm:items-center sm:gap-4">
                        <span className="font-medium text-ink-900">{student.full_name}</span>
                        <span className="flex items-center gap-1.5 font-mono text-xs text-ink-700">
                          <IdCard className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          {student.student_code}
                        </span>
                        <span className="truncate text-ink-700">{student.email}</span>
                        <span className="text-ink-700">{student.phone}</span>
                        <span>
                          <span className={studentStatusBadge[student.status] ?? "badge-warning"}>{student.status}</span>
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </Container>
    </main>
  );
}
