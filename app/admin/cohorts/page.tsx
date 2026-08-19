"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Loader2, Plus, CalendarDays, Users } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Field, inputClass } from "@/components/ui/Field";
import { StatCard } from "@/components/admin/StatCard";
import { createClient } from "@/lib/supabase/client";
import type { Cohort } from "@/lib/supabase/types";

// Session-gated and data-driven — never statically prerendered.
export const dynamic = "force-dynamic";

const lightInput = `${inputClass} border-ink-900/10 bg-white text-ink-900 placeholder:text-ink-700/40 focus:border-signal-500`;

const emptyForm = {
  name: "",
  starts_on: "",
  duration_weeks: "7",
  fee_ngn: "",
  slots_total: "",
  timezone: "Africa/Lagos",
};

export default function AdminCohortsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);

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
    const res = await authedFetch("/api/admin/cohorts");
    if (res.status === 401) {
      router.replace("/admin");
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setCohorts(data.cohorts);
    } else {
      setError("Couldn't load cohorts.");
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setMessage(null);

    const res = await authedFetch("/api/admin/cohorts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        starts_on: form.starts_on,
        duration_weeks: Number(form.duration_weeks),
        fee_ngn: Number(form.fee_ngn),
        slots_total: form.slots_total ? Number(form.slots_total) : null,
        timezone: form.timezone,
      }),
    });

    setCreating(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Couldn't create cohort.");
      return;
    }

    setMessage("Cohort created.");
    setForm(emptyForm);
    setShowAddForm(false);
    load();
  }

  const openCount = cohorts.filter((c) => c.is_open).length;

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper-50">
        <Loader2 className="h-6 w-6 animate-spin text-ink-900" aria-hidden="true" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper-50 py-10 text-ink-900">
      <Container className="max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold">Cohorts</h1>
            <p className="text-sm text-ink-700">Create and manage ETI cohorts.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="text-sm font-medium text-signal-500 hover:underline">
              Registrations
            </Link>
            <Link href="/admin/payments" className="text-sm font-medium text-signal-500 hover:underline">
              Payments
            </Link>
            <Link href="/admin/instructors" className="text-sm font-medium text-signal-500 hover:underline">
              Instructors
            </Link>
            <Link href="/admin/resources" className="text-sm font-medium text-signal-500 hover:underline">
              Resources
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

        <div className="mt-6 grid grid-cols-2 gap-4">
          <StatCard label="Total cohorts" value={cohorts.length} />
          <StatCard label="Open for registration" value={openCount} />
        </div>

        {message && (
          <p className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
        )}
        {error && <p className="mt-4 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        <p className="mt-4 text-xs text-ink-700/70">
          Weekly class schedule and onboarding resources are managed on the{" "}
          <Link href="/admin/resources" className="font-medium text-signal-500 hover:underline">
            Resources
          </Link>{" "}
          page.
        </p>

        <div className="mt-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-700/70">All cohorts</h2>
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="inline-flex items-center gap-2 rounded-lg bg-ink-900 px-4 py-2 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add cohort
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleCreate} className="mt-4 space-y-4 rounded-xl2 border border-ink-900/10 bg-white p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Name" htmlFor="name">
                <input id="name" required className={lightInput} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="Start date" htmlFor="starts_on">
                <input
                  id="starts_on"
                  type="date"
                  required
                  className={lightInput}
                  value={form.starts_on}
                  onChange={(e) => setForm({ ...form, starts_on: e.target.value })}
                />
              </Field>
              <Field label="Duration (weeks)" htmlFor="duration_weeks">
                <input
                  id="duration_weeks"
                  type="number"
                  min={1}
                  max={52}
                  required
                  className={lightInput}
                  value={form.duration_weeks}
                  onChange={(e) => setForm({ ...form, duration_weeks: e.target.value })}
                />
              </Field>
              <Field label="Fee (₦)" htmlFor="fee_ngn">
                <input
                  id="fee_ngn"
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  className={lightInput}
                  value={form.fee_ngn}
                  onChange={(e) => setForm({ ...form, fee_ngn: e.target.value })}
                />
              </Field>
              <Field label="Slots (blank = uncapped)" htmlFor="slots_total">
                <input
                  id="slots_total"
                  type="number"
                  min={1}
                  className={lightInput}
                  value={form.slots_total}
                  onChange={(e) => setForm({ ...form, slots_total: e.target.value })}
                />
              </Field>
              <Field label="Timezone" htmlFor="timezone">
                <input
                  id="timezone"
                  required
                  className={lightInput}
                  value={form.timezone}
                  onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                />
              </Field>
            </div>
            <button type="submit" disabled={creating} className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Create cohort"}
            </button>
          </form>
        )}

        <div className="mt-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-ink-700" aria-hidden="true" />
            </div>
          ) : cohorts.length === 0 ? (
            <div className="rounded-xl2 border border-ink-900/10 bg-white px-5 py-16 text-center text-sm text-ink-700">
              No cohorts yet. Add your first cohort above.
            </div>
          ) : (
            <div className="space-y-3">
              {cohorts.map((cohort) => (
                <CohortRow
                  key={cohort.id}
                  cohort={cohort}
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

function CohortRow({
  cohort,
  authedFetch,
  onChanged,
  onMessage,
  onError,
}: {
  cohort: Cohort;
  authedFetch: (url: string, init?: RequestInit) => Promise<Response>;
  onChanged: () => void;
  onMessage: (m: string) => void;
  onError: (e: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(cohort.name);
  const [startsOn, setStartsOn] = useState(cohort.starts_on.slice(0, 10));
  const [durationWeeks, setDurationWeeks] = useState(String(cohort.duration_weeks));
  const [feeNgn, setFeeNgn] = useState(String(cohort.fee_ngn));
  const [slotsTotal, setSlotsTotal] = useState(cohort.slots_total !== null ? String(cohort.slots_total) : "");
  const [timezone, setTimezone] = useState(cohort.timezone);

  async function handleSave() {
    setSaving(true);
    const res = await authedFetch(`/api/admin/cohorts/${cohort.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        starts_on: startsOn,
        duration_weeks: Number(durationWeeks),
        fee_ngn: Number(feeNgn),
        slots_total: slotsTotal ? Number(slotsTotal) : null,
        timezone,
      }),
    });
    setSaving(false);
    if (res.ok) {
      onMessage("Cohort updated.");
      onChanged();
    } else {
      const body = await res.json().catch(() => null);
      onError(body?.error ?? "Couldn't update cohort.");
    }
  }

  async function handleToggleOpen() {
    setSaving(true);
    const res = await authedFetch(`/api/admin/cohorts/${cohort.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_open: !cohort.is_open }),
    });
    setSaving(false);
    if (res.ok) {
      onMessage(cohort.is_open ? "Cohort closed." : "Cohort reopened.");
      onChanged();
    } else {
      const body = await res.json().catch(() => null);
      onError(body?.error ?? "Couldn't update cohort.");
    }
  }

  return (
    <div className="rounded-xl2 border border-ink-900/10 bg-white">
      <button onClick={() => setExpanded((v) => !v)} className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left">
        <div>
          <p className="font-medium text-ink-900">{cohort.name}</p>
          <p className="mt-1 flex items-center gap-3 text-xs text-ink-700">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {new Date(cohort.starts_on).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
              {" · "}
              {cohort.duration_weeks}w
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {cohort.slots_total ?? "Uncapped"} slots
            </span>
            <span>₦{Number(cohort.fee_ngn).toLocaleString()}</span>
          </p>
        </div>
        <span className={cohort.is_open ? "badge-success" : "badge-warning"}>{cohort.is_open ? "Open" : "Closed"}</span>
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-ink-900/10 px-5 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Name" htmlFor={`name-${cohort.id}`}>
              <input id={`name-${cohort.id}`} className={lightInput} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Start date" htmlFor={`starts-${cohort.id}`}>
              <input
                id={`starts-${cohort.id}`}
                type="date"
                className={lightInput}
                value={startsOn}
                onChange={(e) => setStartsOn(e.target.value)}
              />
            </Field>
            <Field label="Duration (weeks)" htmlFor={`weeks-${cohort.id}`}>
              <input
                id={`weeks-${cohort.id}`}
                type="number"
                min={1}
                max={52}
                className={lightInput}
                value={durationWeeks}
                onChange={(e) => setDurationWeeks(e.target.value)}
              />
            </Field>
            <Field label="Fee (₦)" htmlFor={`fee-${cohort.id}`}>
              <input
                id={`fee-${cohort.id}`}
                type="number"
                min={0}
                step="0.01"
                className={lightInput}
                value={feeNgn}
                onChange={(e) => setFeeNgn(e.target.value)}
              />
            </Field>
            <Field label="Slots (blank = uncapped)" htmlFor={`slots-${cohort.id}`}>
              <input
                id={`slots-${cohort.id}`}
                type="number"
                min={1}
                className={lightInput}
                value={slotsTotal}
                onChange={(e) => setSlotsTotal(e.target.value)}
              />
            </Field>
            <Field label="Timezone" htmlFor={`tz-${cohort.id}`}>
              <input id={`tz-${cohort.id}`} className={lightInput} value={timezone} onChange={(e) => setTimezone(e.target.value)} />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              Save changes
            </button>
            <button
              onClick={handleToggleOpen}
              disabled={saving}
              className="rounded-lg border border-ink-900/10 px-4 py-2 text-sm font-medium text-ink-800 hover:bg-paper-50 disabled:opacity-60"
            >
              {cohort.is_open ? "Close registration" : "Reopen registration"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
