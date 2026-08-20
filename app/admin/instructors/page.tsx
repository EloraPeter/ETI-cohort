"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, GraduationCap, Mail, RotateCcw } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Field, inputClass } from "@/components/ui/Field";
import { StatCard } from "@/components/admin/StatCard";
import { AdminNav } from "@/components/admin/AdminNav";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/client";
import type { Instructor, InstructorStatus } from "@/lib/supabase/types";

// Session-gated and data-driven — never statically prerendered.
export const dynamic = "force-dynamic";

interface CohortOption {
  id: string;
  name: string;
  starts_on: string;
  is_open: boolean;
}

const statusBadgeClass: Record<InstructorStatus, string> = {
  invited: "badge-warning",
  active: "badge-success",
  inactive: "badge-error",
};

export default function AdminInstructorsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [cohorts, setCohorts] = useState<CohortOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addFullName, setAddFullName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [adding, setAdding] = useState(false);

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

  const authedFetch = useCallback(
    (url: string, init?: RequestInit) =>
      fetch(url, { ...init, headers: { ...init?.headers, Authorization: `Bearer ${accessToken}` } }),
    [accessToken]
  );

  const load = useCallback(async () => {
    setLoading(true);
    const [instructorsRes, cohortsRes] = await Promise.all([
      authedFetch("/api/admin/instructors"),
      authedFetch("/api/admin/cohorts"),
    ]);
    if (instructorsRes.status === 401 || cohortsRes.status === 401) {
      router.replace("/admin");
      return;
    }
    if (instructorsRes.ok) {
      const data = await instructorsRes.json();
      setInstructors(data.instructors);
    } else {
      setError("Couldn't load instructors.");
    }
    if (cohortsRes.ok) {
      const data = await cohortsRes.json();
      setCohorts(data.cohorts);
    }
    setLoading(false);
  }, [authedFetch, router]);

  useEffect(() => {
    if (!checkingAuth && accessToken) load();
  }, [checkingAuth, accessToken, load]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/admin");
  }

  async function handleAddInstructor(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError(null);
    setMessage(null);

    const res = await authedFetch("/api/admin/instructors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: addFullName, email: addEmail, phone: addPhone || undefined }),
    });

    setAdding(false);

    if (res.status === 207) {
      setMessage("Instructor created, but the invitation email couldn't be sent — use Resend invite below.");
      setAddFullName("");
      setAddEmail("");
      setAddPhone("");
      setShowAddForm(false);
      load();
      return;
    }
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Couldn't create instructor.");
      return;
    }

    setMessage("Instructor created and invitation sent.");
    setAddFullName("");
    setAddEmail("");
    setAddPhone("");
    setShowAddForm(false);
    load();
  }

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper-50">
        <Loader2 className="h-6 w-6 animate-spin text-ink-900" aria-hidden="true" />
      </main>
    );
  }

  const activeCount = instructors.filter((i) => i.status === "active").length;
  const invitedCount = instructors.filter((i) => i.status === "invited").length;

  return (
    <main className="min-h-screen bg-paper-50 py-10 text-ink-900">
      <Container className="max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold">Instructors</h1>
            <p className="text-sm text-ink-700">Manage instructor accounts and cohort assignments.</p>
          </div>
          <div className="flex items-center gap-3">
            <AdminNav current="/admin/instructors" onSignOut={handleSignOut} />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total instructors" value={instructors.length} />
          <StatCard label="Active" value={activeCount} />
          <StatCard label="Invited" value={invitedCount} />
        </div>

        {message && (
          <p className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
        )}
        {error && <p className="mt-4 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-700/70">All instructors</h2>
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="inline-flex items-center gap-2 rounded-lg bg-ink-900 px-4 py-2 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add instructor
          </button>
        </div>

        {showAddForm && (
          <form
            onSubmit={handleAddInstructor}
            className="mt-4 space-y-5 rounded-xl2 border border-ink-900/10 bg-white p-6 shadow-sm"
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <Field label="Full name" htmlFor="addFullName">
                <input
                  id="addFullName"
                  required
                  className={`${inputClass} border-ink-900/10 bg-ink-50/50 text-ink-900 placeholder:text-ink-700/40 hover:border-ink-900/20 hover:bg-ink-50 focus:border-signal-500 focus:bg-white focus:ring-signal-500/10`}
                  value={addFullName}
                  onChange={(e) => setAddFullName(e.target.value)}
                />
              </Field>

              <Field label="Email" htmlFor="addEmail">
                <input
                  id="addEmail"
                  type="email"
                  required
                  className={`${inputClass} border-ink-900/10 bg-ink-50/50 text-ink-900 placeholder:text-ink-700/40 hover:border-ink-900/20 hover:bg-ink-50 focus:border-signal-500 focus:bg-white focus:ring-signal-500/10`}
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                />
              </Field>

              <Field label="Phone (optional)" htmlFor="addPhone">
                <input
                  id="addPhone"
                  className={`${inputClass} border-ink-900/10 bg-ink-50/50 text-ink-900 placeholder:text-ink-700/40 hover:border-ink-900/20 hover:bg-ink-50 focus:border-signal-500 focus:bg-white focus:ring-signal-500/10`}
                  value={addPhone}
                  onChange={(e) => setAddPhone(e.target.value)}
                />
              </Field>
            </div>

            <button type="submit" disabled={adding} className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"> {adding ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Create & send invitation"} </button>
          </form>
        )}

        <div className="mt-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-ink-700" aria-hidden="true" />
            </div>
          ) : instructors.length === 0 ? (
            <EmptyState icon={GraduationCap} message="No instructors yet. Add your first instructor above." />
          ) : (
            <div className="space-y-3">
              {instructors.map((instructor) => (
                <InstructorRow
                  key={instructor.id}
                  instructor={instructor}
                  cohorts={cohorts}
                  authedFetch={authedFetch}
                  onChanged={load}
                  onMessage={(m) => {
                    setMessage(m);
                    setError(null);
                  }}
                  onError={(e) => {
                    setError(e);
                    setMessage(null);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </Container>
    </main>
  );
}

function InstructorRow({
  instructor,
  cohorts,
  authedFetch,
  onChanged,
  onMessage,
  onError,
}: {
  instructor: Instructor;
  cohorts: CohortOption[];
  authedFetch: (url: string, init?: RequestInit) => Promise<Response>;
  onChanged: () => void;
  onMessage: (m: string) => void;
  onError: (e: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState(instructor.full_name);
  const [phone, setPhone] = useState(instructor.phone ?? "");
  const [email, setEmail] = useState(instructor.email);

  const [assignedCohortIds, setAssignedCohortIds] = useState<string[] | null>(null);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  async function loadAssignments() {
    setLoadingAssignments(true);
    const res = await authedFetch(`/api/admin/instructors/${instructor.id}/cohorts`);
    if (res.ok) {
      const data = await res.json();
      setAssignedCohortIds((data.assignments as { cohort_id: string }[]).map((a) => a.cohort_id));
    }
    setLoadingAssignments(false);
  }

  function toggleExpanded() {
    const next = !expanded;
    setExpanded(next);
    if (next && assignedCohortIds === null) loadAssignments();
  }

  async function handleSaveDetails() {
    setSaving(true);
    const res = await authedFetch(`/api/admin/instructors/${instructor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, phone: phone || null, email }),
    });
    setSaving(false);
    if (res.ok) {
      onMessage("Instructor updated.");
      onChanged();
    } else {
      const body = await res.json().catch(() => null);
      onError(body?.error ?? "Couldn't update instructor.");
    }
  }

  async function handleToggleStatus() {
    const nextStatus = instructor.status === "active" ? "inactive" : "active";
    if (!window.confirm(`${nextStatus === "inactive" ? "Deactivate" : "Reactivate"} ${instructor.full_name}?`)) return;
    setSaving(true);
    const res = await authedFetch(`/api/admin/instructors/${instructor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    setSaving(false);
    if (res.ok) {
      onMessage(nextStatus === "inactive" ? "Instructor deactivated." : "Instructor reactivated.");
      onChanged();
    } else {
      const body = await res.json().catch(() => null);
      onError(body?.error ?? "Couldn't update status.");
    }
  }

  async function handleResendInvite() {
    setSaving(true);
    const res = await authedFetch(`/api/admin/instructors/${instructor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resend_invite" }),
    });
    setSaving(false);
    if (res.ok) {
      onMessage("Invitation resent.");
    } else {
      const body = await res.json().catch(() => null);
      onError(body?.error ?? "Couldn't resend invitation.");
    }
  }

  async function handleAssignCohort(cohortId: string) {
    setAssigningId(cohortId);
    const res = await authedFetch(`/api/admin/instructors/${instructor.id}/cohorts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cohortId }),
    });
    setAssigningId(null);
    if (res.ok) {
      setAssignedCohortIds((prev) => (prev ? [...prev, cohortId] : [cohortId]));
      onMessage("Cohort assigned.");
    } else {
      const body = await res.json().catch(() => null);
      onError(body?.error ?? "Couldn't assign cohort.");
    }
  }

  async function handleRemoveCohort(cohortId: string) {
    setAssigningId(cohortId);
    const res = await authedFetch(`/api/admin/instructors/${instructor.id}/cohorts?cohortId=${cohortId}`, {
      method: "DELETE",
    });
    setAssigningId(null);
    if (res.ok) {
      setAssignedCohortIds((prev) => (prev ? prev.filter((id) => id !== cohortId) : prev));
      onMessage("Cohort assignment removed.");
    } else {
      const body = await res.json().catch(() => null);
      onError(body?.error ?? "Couldn't remove cohort assignment.");
    }
  }

  return (
    <div className="rounded-xl2 border border-ink-900/10 bg-white">
      <button onClick={toggleExpanded} className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left">
        <div>
          <p className="font-medium text-ink-900">{instructor.full_name}</p>
          <p className="flex items-center gap-1.5 text-xs text-ink-700">
            <Mail className="h-3.5 w-3.5" aria-hidden="true" />
            {instructor.email}
          </p>
        </div>
        <span className={statusBadgeClass[instructor.status]}>{instructor.status}</span>
      </button>

      {expanded && (
        <div className="space-y-6 border-t border-ink-900/10 px-5 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/70">Details</p>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Full name" htmlFor={`fullName-${instructor.id}`}>
                <input
                  id={`fullName-${instructor.id}`}
                  className={`${inputClass} border-ink-900/10 bg-white text-ink-900 focus:border-signal-500`}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </Field>
              <Field label="Email" htmlFor={`email-${instructor.id}`}>
                <input
                  id={`email-${instructor.id}`}
                  type="email"
                  className={`${inputClass} border-ink-900/10 bg-white text-ink-900 focus:border-signal-500`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field label="Phone" htmlFor={`phone-${instructor.id}`}>
                <input
                  id={`phone-${instructor.id}`}
                  className={`${inputClass} border-ink-900/10 bg-white text-ink-900 focus:border-signal-500`}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </Field>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                onClick={handleSaveDetails}
                disabled={saving}
                className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                Save details
              </button>
              {instructor.status !== "invited" && (
                <button
                  onClick={handleToggleStatus}
                  disabled={saving}
                  className="rounded-lg border border-ink-900/10 px-4 py-2 text-sm font-medium text-ink-800 hover:bg-paper-50 disabled:opacity-60"
                >
                  {instructor.status === "active" ? "Deactivate" : "Reactivate"}
                </button>
              )}
              {instructor.status === "invited" && (
                <button
                  onClick={handleResendInvite}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-ink-900/10 px-4 py-2 text-sm font-medium text-ink-800 hover:bg-paper-50 disabled:opacity-60"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Resend invitation
                </button>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/70">Assigned cohorts</p>
            {loadingAssignments ? (
              <div className="mt-3 flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-ink-700" aria-hidden="true" />
              </div>
            ) : cohorts.length === 0 ? (
              <p className="mt-3 text-sm text-ink-700">No cohorts exist yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {cohorts.map((cohort) => {
                  const isAssigned = assignedCohortIds?.includes(cohort.id) ?? false;
                  const isBusy = assigningId === cohort.id;
                  return (
                    <li key={cohort.id} className="flex items-center justify-between rounded-lg border border-ink-900/10 px-3 py-2">
                      <span className="flex items-center gap-2 text-sm text-ink-900">
                        <GraduationCap className="h-4 w-4 text-ink-700/60" aria-hidden="true" />
                        {cohort.name}
                        <span className={cohort.is_open ? "badge-success" : "badge-warning"}>
                          {cohort.is_open ? "Open" : "Closed"}
                        </span>
                      </span>
                      <button
                        onClick={() => (isAssigned ? handleRemoveCohort(cohort.id) : handleAssignCohort(cohort.id))}
                        disabled={isBusy}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-60 ${isAssigned
                            ? "border border-rose-300 text-rose-700 hover:bg-rose-50"
                            : "bg-ink-900 text-white hover:bg-ink-800"
                          }`}
                      >
                        {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : isAssigned ? "Remove" : "Assign"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
