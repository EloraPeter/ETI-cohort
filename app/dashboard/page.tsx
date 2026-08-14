"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Hourglass,
  IdCard,
  LogOut,
  Loader2,
  CheckCircle2,
  Circle,
  UserCircle,
  ExternalLink,
  PartyPopper,
} from "lucide-react";
import { Container } from "@/components/ui/Container";
import { createClient } from "@/lib/supabase/client";
import type { Cohort, ChecklistItemWithProgress, Student } from "@/lib/supabase/types";
import { ROUTES } from "@/lib/routes";
import { formatWeeklySchedule } from "@/lib/calendar/formatSchedule";

export const dynamic = "force-dynamic";

export default function StudentDashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItemWithProgress[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace(ROUTES.login);
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
      router.replace(ROUTES.login);
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

  async function toggleItem(item: ChecklistItemWithProgress) {
    setBusyKey(item.item_key);
    const res = await authedFetch("/api/student/checklist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemKey: item.item_key, completed: !item.completed_at }),
    });
    if (res.ok) await load();
    setBusyKey(null);
  }

  async function handleAction(item: ChecklistItemWithProgress) {
    // "calendar" and "orientation-handbook" both resolve their URL
    // dynamically rather than opening a stored action_url directly —
    // calendar needs cohort data embedded, and the handbook lives in a
    // private bucket so it needs a short-lived signed URL each time.
    let url: string | null;
    if (item.item_key === "calendar" && student) {
      url = `/api/onboarding/${student.student_code}/calendar`;
    } else if (item.item_key === "orientation-handbook") {
      const res = await authedFetch("/api/student/resources/handbook-url");
      url = res.ok ? (await res.json()).url : null;
    } else {
      url = item.action_url;
    }
    if (!url) return;

    if (!item.completed_at) {
      setBusyKey(item.item_key);
      await authedFetch("/api/student/checklist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemKey: item.item_key, completed: true }),
      });
      await load();
      setBusyKey(null);
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace(ROUTES.login);
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
  const daysUntilStart = cohort
    ? Math.ceil((new Date(cohort.starts_on).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const displayName = (student.preferred_name ?? student.full_name).split(" ")[0];

  const allReady = checklist.length > 0 && checklist.every((item) => item.completed_at);

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
              <a href={ROUTES.accountSetup} className="font-medium text-signal-400 underline">
                Finish it
              </a>{" "}
              so we can prepare your cohort experience.
            </p>
          </div>
        )}

        <div className="glass-panel mt-6 p-6 text-left sm:p-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                {daysUntilStart !== null && daysUntilStart >= 0 && (
                  <p className="mt-0.5 text-xs text-mist">{daysUntilStart === 0 ? "Today!" : `${daysUntilStart} days to go`}</p>
                )}
              </div>
              <div>
                <Hourglass className="h-5 w-5 text-sky-400" aria-hidden="true" />
                <p className="mt-2 text-xs uppercase tracking-wide text-mist">Duration</p>
                <p className="mt-1 text-sm font-semibold text-white">{cohort.duration_weeks} weeks</p>
              </div>
            </>
          )}
          </div>

          {cohort?.weekly_schedule && cohort.weekly_schedule.length > 0 && (
            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="text-xs uppercase tracking-wide text-mist">Class Schedule</p>
              <div className="mt-1.5 space-y-0.5">
                {formatWeeklySchedule(cohort.weekly_schedule).map((line) => (
                  <p key={line} className="text-sm font-semibold text-white">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {allReady ? (
          <div className="glass-panel mt-6 p-6 text-center sm:p-8">
            <PartyPopper className="mx-auto h-9 w-9 text-amber-400" aria-hidden="true" />
            <h2 className="mt-3 text-xl font-semibold text-white">You're Ready for ETI Cohort!</h2>
            <p className="mt-1 text-sm text-white/70">Your preparation is complete.</p>
            <ul className="mx-auto mt-5 flex max-w-xs flex-col gap-2 text-left text-sm text-white/90">
              {checklist.map((item) => (
                <li key={item.id} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-signal-400" aria-hidden="true" />
                  {item.title}
                </li>
              ))}
            </ul>
            {daysUntilStart !== null && daysUntilStart >= 0 && (
              <p className="mt-5 text-sm text-white/70">
                We can't wait to start with you {daysUntilStart === 0 ? "today" : `in ${daysUntilStart} days`} 🚀
              </p>
            )}
          </div>
        ) : (
          <div className="glass-panel mt-6 p-6 sm:p-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-sky-400">Cohort prep checklist</h2>
            <div className="mt-4 space-y-5">
              {checklist.map((item) => (
                <ChecklistSection key={item.id} item={item} busyKey={busyKey} onToggle={toggleItem} onAction={handleAction} />
              ))}
            </div>
          </div>
        )}
      </Container>
    </main>
  );
}

function ChecklistSection({
  item,
  busyKey,
  onToggle,
  onAction,
}: {
  item: ChecklistItemWithProgress;
  busyKey: string | null;
  onToggle: (item: ChecklistItemWithProgress) => void;
  onAction: (item: ChecklistItemWithProgress) => void;
}) {
  const isDone = Boolean(item.completed_at);

  if (item.item_type === "composite") {
    const doneCount = item.children.filter((c) => c.completed_at).length;
    return (
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isDone ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-signal-400" aria-hidden="true" />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-mist" aria-hidden="true" />
            )}
            <span className={`text-sm font-medium ${isDone ? "text-white/60" : "text-white"}`}>
              {isDone ? `✅ ${item.title.replace(/^Prepare /, "").replace(/^Complete /, "")} Ready` : item.title}
            </span>
          </div>
          <span className="text-xs text-mist">
            {doneCount}/{item.children.length} completed
          </span>
        </div>
        <ul className="mt-2 space-y-1 border-l border-white/10 pl-4">
          {item.children.map((child) => (
            <ChecklistLeaf key={child.id} item={child} busy={busyKey === child.item_key} onToggle={onToggle} onAction={onAction} />
          ))}
        </ul>
      </div>
    );
  }

  return (
    <ul>
      <ChecklistLeaf item={item} busy={busyKey === item.item_key} onToggle={onToggle} onAction={onAction} />
    </ul>
  );
}

function ChecklistLeaf({
  item,
  busy,
  onToggle,
  onAction,
}: {
  item: ChecklistItemWithProgress;
  busy: boolean;
  onToggle: (item: ChecklistItemWithProgress) => void;
  onAction: (item: ChecklistItemWithProgress) => void;
}) {
  const isDone = Boolean(item.completed_at);
  // "calendar" resolves its real URL dynamically at click time (see
  // handleAction) rather than from a stored action_url, so its
  // permanently-null action_url doesn't mean "not ready". Every other
  // redirect/video/download item's null action_url does mean
  // not-configured-yet — including orientation-handbook (still gated
  // on its action_url, now a storage path once uploaded) and the new
  // cohort-whatsapp item, which ships with a null action_url by
  // design until an admin sets it.
  const hasDynamicResolution = item.item_key === "calendar";
  const isComingSoon =
    !hasDynamicResolution &&
    (item.item_type === "video" || item.item_type === "download" || item.item_type === "redirect") &&
    !item.action_url;

  const icon = busy ? (
    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-mist" aria-hidden="true" />
  ) : isDone ? (
    <CheckCircle2 className="h-4 w-4 shrink-0 text-signal-400" aria-hidden="true" />
  ) : (
    <Circle className="h-4 w-4 shrink-0 text-mist" aria-hidden="true" />
  );

  if (item.item_type === "task") {
    if (item.completion_method === "system_verified") {
      return (
        <li className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm">
          {icon}
          <span className={isDone ? "text-white/50" : "text-white/70"}>{item.title}</span>
        </li>
      );
    }
    return (
      <li>
        <button
          onClick={() => onToggle(item)}
          disabled={busy}
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-white/[0.04] disabled:opacity-60"
        >
          {icon}
          <span className={isDone ? "text-white/50 line-through" : "text-white/90"}>{item.title}</span>
        </button>
      </li>
    );
  }

  // video / download / redirect — action button, opens link + marks complete
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.04]">
      <span className="flex items-center gap-3 text-sm">
        {icon}
        <span className={isDone ? "text-white/50" : "text-white/90"}>{item.title}</span>
      </span>
      <button
        onClick={() => onAction(item)}
        disabled={busy || isComingSoon}
        className="flex shrink-0 items-center gap-1 rounded-md border border-white/10 px-2.5 py-1 text-xs font-medium text-white/80 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isComingSoon ? "Coming soon" : item.action_label ?? "Open"}
        {!isComingSoon && <ExternalLink className="h-3 w-3" aria-hidden="true" />}
      </button>
    </li>
  );
}
