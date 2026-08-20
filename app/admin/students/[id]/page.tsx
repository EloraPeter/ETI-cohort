"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, IdCard, GraduationCap, CreditCard, ListChecks, CheckCircle2, Circle } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/client";
import type { ChecklistItemWithProgress } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

interface StudentDetail {
  id: string;
  student_code: string;
  full_name: string;
  email: string;
  phone: string;
  status: "active" | "inactive" | "withdrawn";
  enrolled_at: string;
  preferred_name: string | null;
  timezone: string | null;
  laptop_ready: boolean;
  profile_completed_at: string | null;
}

interface CohortSummary {
  id: string;
  name: string;
  starts_on: string;
  duration_weeks: number;
  is_open: boolean;
  timezone: string;
}

interface RegistrationSummary {
  full_name: string;
  email: string;
  phone: string;
  age: number;
  gender: string;
  state: string;
  city: string;
  occupation: string;
  education_level: string;
  owns_laptop: boolean;
  coding_experience: string;
  heard_about_eti: string;
  motivation: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

interface PaymentSummary {
  method: string;
  status: string;
  amount_expected: number;
  amount_paid: number | null;
  currency: string;
  payment_date: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

const studentStatusBadge: Record<string, string> = {
  active: "badge-success",
  inactive: "badge-warning",
  withdrawn: "badge-error",
};

function countChecklist(items: ChecklistItemWithProgress[]): { total: number; done: number } {
  let total = 0;
  let done = 0;
  for (const item of items) {
    if (item.item_type !== "composite") {
      total += 1;
      if (item.completed_at) done += 1;
    }
    if (item.children.length > 0) {
      const child = countChecklist(item.children);
      total += child.total;
      done += child.done;
    }
  }
  return { total, done };
}

export default function AdminStudentDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const supabase = createClient();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [cohort, setCohort] = useState<CohortSummary | null>(null);
  const [registration, setRegistration] = useState<RegistrationSummary | null>(null);
  const [payment, setPayment] = useState<PaymentSummary | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItemWithProgress[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/admin");
        return;
      }
      setAccessToken(data.session.access_token);
      setCheckingAuth(false);
    });
  }, [router, supabase]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    const res = await fetch(`/api/admin/students/${params.id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status === 401) {
      router.replace("/admin");
      return;
    }
    if (res.status === 404) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setStudent(data.student);
      setCohort(data.cohort);
      setRegistration(data.registration);
      setPayment(data.payment);
      setChecklist(data.checklist);
    } else {
      setError("Couldn't load this student. Try refreshing.");
    }
    setLoading(false);
  }, [accessToken, params.id, router]);

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

  const checklistCount = countChecklist(checklist);

  return (
    <main className="min-h-screen bg-paper-50 py-10 text-ink-900">
      <Container className="max-w-3xl">
        <Link href="/admin/dashboard" className="inline-flex items-center gap-1.5 text-sm text-ink-700 hover:text-ink-900">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to registrations
        </Link>

        {notFound ? (
          <div className="mt-6">
            <EmptyState message="Student not found." />
          </div>
        ) : error ? (
          <div className="mt-6">
            <EmptyState message={error} />
          </div>
        ) : student ? (
          <>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl font-semibold">{student.full_name}</h1>
                <p className="mt-1 flex items-center gap-1.5 text-xs font-mono text-ink-700">
                  <IdCard className="h-3.5 w-3.5" aria-hidden="true" />
                  {student.student_code}
                </p>
              </div>
              <span className={studentStatusBadge[student.status] ?? "badge-warning"}>{student.status}</span>
            </div>

            {/* Identity / contact */}
            <section className="mt-6 rounded-xl2 border border-ink-900/10 bg-white p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink-700/70">
                <IdCard className="h-4 w-4" aria-hidden="true" />
                Student
              </h2>
              <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <Row label="Email" value={student.email} />
                <Row label="Phone" value={student.phone} />
                <Row label="Preferred name" value={student.preferred_name ?? "—"} />
                <Row label="Timezone" value={student.timezone ?? "—"} />
                <Row label="Laptop ready" value={student.laptop_ready ? "Yes" : "No"} />
                <Row label="Enrolled" value={new Date(student.enrolled_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })} />
                <Row
                  label="Profile completed"
                  value={student.profile_completed_at ? new Date(student.profile_completed_at).toLocaleDateString("en-NG") : "Not yet"}
                />
              </dl>
            </section>

            {/* Cohort */}
            {cohort && (
              <section className="mt-4 rounded-xl2 border border-ink-900/10 bg-white p-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink-700/70">
                  <GraduationCap className="h-4 w-4" aria-hidden="true" />
                  Cohort
                </h2>
                <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  <Row label="Name" value={cohort.name} />
                  <Row label="Status" value={cohort.is_open ? "Open" : "Closed"} />
                  <Row label="Starts" value={new Date(cohort.starts_on).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })} />
                  <Row label="Duration" value={`${cohort.duration_weeks} weeks`} />
                </dl>
              </section>
            )}

            {/* Payment */}
            <section className="mt-4 rounded-xl2 border border-ink-900/10 bg-white p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink-700/70">
                <CreditCard className="h-4 w-4" aria-hidden="true" />
                Payment
              </h2>
              {payment ? (
                <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  <Row label="Method" value={payment.method} />
                  <Row label="Status" value={payment.status.replace("_", " ")} />
                  <Row label="Expected" value={`${payment.currency} ${Number(payment.amount_expected).toLocaleString()}`} />
                  <Row label="Paid" value={payment.amount_paid !== null ? `${payment.currency} ${Number(payment.amount_paid).toLocaleString()}` : "—"} />
                  <Row label="Payment date" value={payment.payment_date ? new Date(payment.payment_date).toLocaleDateString("en-NG") : "—"} />
                  <Row label="Reviewed by" value={payment.reviewed_by ?? "—"} />
                </dl>
              ) : (
                <p className="mt-3 text-sm text-ink-700">No payment record found.</p>
              )}
            </section>

            {/* Registration */}
            {registration && (
              <section className="mt-4 rounded-xl2 border border-ink-900/10 bg-white p-5">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-700/70">Registration</h2>
                <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  <Row label="Age" value={String(registration.age)} />
                  <Row label="Gender" value={registration.gender} />
                  <Row label="Location" value={`${registration.city}, ${registration.state}`} />
                  <Row label="Occupation" value={registration.occupation} />
                  <Row label="Education" value={registration.education_level} />
                  <Row label="Coding experience" value={registration.coding_experience} />
                  <Row label="Heard about ETI via" value={registration.heard_about_eti} />
                  <Row label="Owns laptop" value={registration.owns_laptop ? "Yes" : "No"} />
                </dl>
                {registration.motivation && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-ink-700/70">Motivation</p>
                    <p className="mt-1 text-sm text-ink-800">{registration.motivation}</p>
                  </div>
                )}
                {registration.admin_notes && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-ink-700/70">Admin notes</p>
                    <p className="mt-1 text-sm text-ink-800">{registration.admin_notes}</p>
                  </div>
                )}
              </section>
            )}

            {/* Checklist */}
            <section className="mt-4 rounded-xl2 border border-ink-900/10 bg-white p-5">
              <h2 className="flex items-center justify-between text-sm font-semibold uppercase tracking-wide text-ink-700/70">
                <span className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4" aria-hidden="true" />
                  Onboarding checklist
                </span>
                <span className="text-ink-900">
                  {checklistCount.done}/{checklistCount.total}
                </span>
              </h2>
              {checklist.length === 0 ? (
                <p className="mt-3 text-sm text-ink-700">No checklist items for this cohort.</p>
              ) : (
                <ChecklistTree items={checklist} />
              )}
            </section>
          </>
        ) : null}
      </Container>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-ink-900/5 py-1.5 sm:justify-start sm:gap-2">
      <dt className="text-ink-700/70">{label}</dt>
      <dd className="font-medium text-ink-900">{value}</dd>
    </div>
  );
}

function ChecklistTree({ items, depth = 0 }: { items: ChecklistItemWithProgress[]; depth?: number }) {
  return (
    <ul className={depth > 0 ? "mt-2 space-y-1.5 border-l border-ink-900/10 pl-4" : "mt-3 space-y-1.5"}>
      {items.map((item) => (
        <li key={item.id}>
          <div className="flex items-center gap-2 text-sm">
            {item.completed_at ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-ink-700/30" aria-hidden="true" />
            )}
            <span className={item.completed_at ? "text-ink-900" : "text-ink-700"}>{item.title}</span>
          </div>
          {item.children.length > 0 && <ChecklistTree items={item.children} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  );
}
