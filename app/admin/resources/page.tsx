"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LogOut,
  Loader2,
  FileText,
  Video,
  Users,
  MessageCircle,
  CheckCircle2,
  Upload,
  Link as LinkIcon,
  Lock,
  Plus,
  Trash2,
} from "lucide-react";
import { Container } from "@/components/ui/Container";
import { createClient } from "@/lib/supabase/client";
import { MANAGED_RESOURCE_ITEMS } from "@/lib/checklist/managedResources";
import type { WeeklyScheduleEntry } from "@/lib/supabase/types";

// Session-gated and data-driven — never statically prerendered.
export const dynamic = "force-dynamic";

interface CohortOption {
  id: string;
  name: string;
  starts_on: string;
  duration_weeks: number;
  is_open: boolean;
  weekly_schedule: WeeklyScheduleEntry[] | null;
  timezone: string;
}

interface ResourceStatus {
  itemKey: string;
  label: string;
  kind: "file" | "url";
  scope: "global" | "cohort";
  configured: boolean;
  url: string | null;
  isOverride: boolean;
}

const ICONS: Record<string, typeof FileText> = {
  "orientation-handbook": FileText,
  "orientation-video": Video,
  "cohort-whatsapp": MessageCircle,
  community: Users,
};

const DAY_OPTIONS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIMEZONE_OPTIONS = ["Africa/Lagos", "Africa/Cairo", "Africa/Nairobi", "Europe/London", "America/New_York", "America/Los_Angeles", "Asia/Dubai"];

export default function AdminResourcesPage() {
  const router = useRouter();
  const supabase = createClient();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [cohorts, setCohorts] = useState<CohortOption[]>([]);
  const [cohortId, setCohortId] = useState<string>("");
  const [resources, setResources] = useState<ResourceStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Schedule editor draft state — separate from `cohorts` so edits don't
  // vanish mid-typing if something else triggers a re-fetch.
  const [scheduleDraft, setScheduleDraft] = useState<WeeklyScheduleEntry[]>([]);
  const [timezoneDraft, setTimezoneDraft] = useState("Africa/Lagos");
  const [savingSchedule, setSavingSchedule] = useState(false);

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

  const loadCohorts = useCallback(async () => {
    const res = await authedFetch("/api/admin/cohorts");
    if (res.status === 401) {
      router.replace("/admin");
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setCohorts(data.cohorts);
      if (data.cohorts.length > 0) setCohortId((prev) => prev || data.cohorts[0].id);
    }
  }, [authedFetch, router]);

  const loadResources = useCallback(
    async (id: string) => {
      if (!id) return;
      setLoading(true);
      const res = await authedFetch(`/api/admin/resources?cohortId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setResources(data.resources);
      }
      setLoading(false);
    },
    [authedFetch]
  );

  useEffect(() => {
    if (!checkingAuth && accessToken) loadCohorts();
  }, [checkingAuth, accessToken, loadCohorts]);

  useEffect(() => {
    if (cohortId) loadResources(cohortId);
    const selected = cohorts.find((c) => c.id === cohortId);
    setScheduleDraft(selected?.weekly_schedule ?? []);
    setTimezoneDraft(selected?.timezone ?? "Africa/Lagos");
  }, [cohortId, loadResources, cohorts]);

  async function handleSetUrl(itemKey: string, url: string) {
    if (!url.trim()) return;
    setSavingKey(itemKey);
    setMessage(null);
    const res = await authedFetch("/api/admin/resources/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cohortId, itemKey, url: url.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setMessage(res.ok ? "Saved." : data.error ?? "Something went wrong.");
    if (res.ok) await loadResources(cohortId);
    setSavingKey(null);
  }

  async function handleUploadHandbook(file: File) {
    setSavingKey("orientation-handbook");
    setMessage(null);
    const formData = new FormData();
    formData.append("cohortId", cohortId);
    formData.append("file", file);
    const res = await authedFetch("/api/admin/resources/handbook", { method: "POST", body: formData });
    const data = await res.json().catch(() => ({}));
    setMessage(res.ok ? "Handbook uploaded." : data.error ?? "Upload failed.");
    if (res.ok) await loadResources(cohortId);
    setSavingKey(null);
  }

  function addScheduleRow() {
    setScheduleDraft((prev) => [...prev, { day: "Monday", start_time: "18:00", end_time: "20:00" }]);
  }

  function removeScheduleRow(index: number) {
    setScheduleDraft((prev) => prev.filter((_, i) => i !== index));
  }

  function updateScheduleRow(index: number, patch: Partial<WeeklyScheduleEntry>) {
    setScheduleDraft((prev) => prev.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  }

  async function handleSaveSchedule() {
    setSavingSchedule(true);
    setMessage(null);
    const res = await authedFetch(`/api/admin/cohorts/${cohortId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekly_schedule: scheduleDraft, timezone: timezoneDraft }),
    });
    const data = await res.json().catch(() => ({}));
    setMessage(res.ok ? "Schedule saved." : data.error ?? "Could not save the schedule.");
    if (res.ok) await loadCohorts();
    setSavingSchedule(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/admin");
  }

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper-50">
        <Loader2 className="h-6 w-6 animate-spin text-ink-700" aria-hidden="true" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper-50 py-10 text-ink-900">
      <Container className="max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold">Onboarding & Cohort Operations</h1>
            <p className="text-sm text-ink-700">Manage the class schedule and onboarding resources per cohort</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="text-sm font-medium text-signal-500 hover:underline">
              Registrations
            </Link>
            <Link href="/admin/payments" className="text-sm font-medium text-signal-500 hover:underline">
              Payments
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

        <div className="mt-6 flex items-center gap-3">
          <label htmlFor="cohort-select" className="text-sm font-medium text-ink-700">
            Cohort:
          </label>
          <select
            id="cohort-select"
            value={cohortId}
            onChange={(e) => setCohortId(e.target.value)}
            className="rounded-lg border border-ink-900/10 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-signal-500"
          >
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {new Date(c.starts_on).toLocaleDateString("en-NG", { month: "long", year: "numeric" })}
              </option>
            ))}
          </select>
        </div>

        {message && <p className="mt-4 rounded-lg border border-ink-900/10 bg-white px-4 py-2 text-sm text-ink-800">{message}</p>}

        {/* Class schedule editor */}
        <div className="mt-6 rounded-2xl border border-ink-900/10 bg-white p-6">
          <h2 className="font-display text-lg font-semibold">Class Schedule</h2>
          <div className="mt-4 space-y-3">
            {scheduleDraft.length === 0 && <p className="text-sm text-ink-700">No classes added yet.</p>}
            {scheduleDraft.map((entry, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <select
                  value={entry.day}
                  onChange={(e) => updateScheduleRow(i, { day: e.target.value })}
                  className="rounded-lg border border-ink-900/10 bg-white px-3 py-1.5 text-sm text-ink-900 outline-none focus:border-signal-500"
                >
                  {DAY_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  value={entry.start_time}
                  onChange={(e) => updateScheduleRow(i, { start_time: e.target.value })}
                  className="rounded-lg border border-ink-900/10 bg-white px-3 py-1.5 text-sm text-ink-900 outline-none focus:border-signal-500"
                />
                <span className="text-ink-700">—</span>
                <input
                  type="time"
                  value={entry.end_time}
                  onChange={(e) => updateScheduleRow(i, { end_time: e.target.value })}
                  className="rounded-lg border border-ink-900/10 bg-white px-3 py-1.5 text-sm text-ink-900 outline-none focus:border-signal-500"
                />
                <button
                  onClick={() => removeScheduleRow(i)}
                  className="inline-flex items-center gap-1 rounded-lg border border-ink-900/10 px-2.5 py-1.5 text-xs text-ink-700 hover:bg-paper-50"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={addScheduleRow}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-ink-900/20 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-paper-50"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add class
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-ink-900/10 pt-4">
            <label htmlFor="timezone-select" className="text-sm font-medium text-ink-700">
              Timezone
            </label>
            <select
              id="timezone-select"
              value={timezoneDraft}
              onChange={(e) => setTimezoneDraft(e.target.value)}
              className="rounded-lg border border-ink-900/10 bg-white px-3 py-1.5 text-sm text-ink-900 outline-none focus:border-signal-500"
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
            <button
              onClick={handleSaveSchedule}
              disabled={savingSchedule}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-ink-900 px-4 py-2 text-sm font-medium text-white hover:bg-ink-800 disabled:opacity-50"
            >
              {savingSchedule && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              Save Schedule
            </button>
          </div>
        </div>

        {/* Resources table */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-ink-900/10 bg-white">
          {loading ? (
            <div className="flex justify-center p-10">
              <Loader2 className="h-5 w-5 animate-spin text-ink-700" aria-hidden="true" />
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-900/10 bg-paper-50 text-xs uppercase tracking-wide text-ink-700">
                <tr>
                  <th className="px-5 py-3">Resource</th>
                  <th className="px-5 py-3">Scope</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-900/5">
                {MANAGED_RESOURCE_ITEMS.map((config) => {
                  const status = resources.find((r) => r.itemKey === config.itemKey);
                  const Icon = ICONS[config.itemKey] ?? FileText;
                  return (
                    <ResourceRow
                      key={config.itemKey}
                      icon={Icon}
                      config={config}
                      status={status}
                      saving={savingKey === config.itemKey}
                      onSetUrl={(url) => handleSetUrl(config.itemKey, url)}
                      onUploadFile={config.itemKey === "orientation-handbook" ? handleUploadHandbook : undefined}
                    />
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Container>
    </main>
  );
}

function ResourceRow({
  icon: Icon,
  config,
  status,
  saving,
  onSetUrl,
  onUploadFile,
}: {
  icon: typeof FileText;
  config: { itemKey: string; label: string; kind: "file" | "url"; scope: "global" | "cohort" };
  status?: ResourceStatus;
  saving: boolean;
  onSetUrl: (url: string) => void;
  onUploadFile?: (file: File) => void;
}) {
  const [urlDraft, setUrlDraft] = useState(status?.url ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUrlDraft(status?.url ?? "");
  }, [status?.url]);

  const configured = status?.configured ?? false;
  const isGlobal = config.scope === "global";

  return (
    <tr>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2 font-medium">
          <Icon className="h-4 w-4 text-signal-500" aria-hidden="true" />
          {config.label}
        </div>
        {status?.isOverride && <p className="mt-0.5 text-xs text-ink-700">Cohort-specific override</p>}
      </td>
      <td className="px-5 py-4">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
            isGlobal ? "bg-sky-100 text-sky-700" : "bg-ink-900/5 text-ink-700"
          }`}
        >
          {isGlobal && <Lock className="h-3 w-3" aria-hidden="true" />}
          {isGlobal ? "Global" : "Cohort-specific"}
        </span>
      </td>
      <td className="px-5 py-4">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
            configured ? "bg-emerald-100 text-emerald-700" : "bg-ink-900/5 text-ink-700"
          }`}
        >
          {configured && <CheckCircle2 className="h-3 w-3" aria-hidden="true" />}
          {configured ? (config.kind === "file" ? "Uploaded" : "Configured") : "Not configured"}
        </span>
      </td>
      <td className="px-5 py-4">
        {isGlobal ? (
          <p className="max-w-xs truncate text-xs text-ink-700" title={status?.url ?? undefined}>
            {status?.url ?? "—"} <span className="text-ink-400">(read-only — shared by every cohort)</span>
          </p>
        ) : config.kind === "url" ? (
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              placeholder="https://..."
              className="w-56 rounded-lg border border-ink-900/10 bg-white px-3 py-1.5 text-sm text-ink-900 outline-none focus:border-signal-500"
            />
            <button
              onClick={() => onSetUrl(urlDraft)}
              disabled={saving || !urlDraft.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-ink-800 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <LinkIcon className="h-3.5 w-3.5" aria-hidden="true" />}
              {configured ? "Update URL" : "Set URL"}
            </button>
          </div>
        ) : (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && onUploadFile) onUploadFile(file);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-ink-800 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Upload className="h-3.5 w-3.5" aria-hidden="true" />}
              {configured ? "Replace" : "Upload"}
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
