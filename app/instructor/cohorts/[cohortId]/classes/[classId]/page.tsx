"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Circle,
  AlertTriangle,
  ExternalLink,
  Lightbulb,
  MonitorPlay,
  MessageCircleQuestion,
  Dumbbell,
  ClipboardList,
  Library,
  StickyNote,
  Forward,
  type LucideIcon,
} from "lucide-react";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/routes";
import type { CurriculumClass, ClassResource, CompletionChecklistEntry, ClassCompletionStatus } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

interface CarryOverFromPrevious {
  fromClassNumber: number;
  fromTitle: string;
  text: string;
}

const textareaClass =
  "w-full rounded-lg border border-ink-900/10 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-signal-500";

export default function InstructorTeachingGuidePage() {
  const router = useRouter();
  const params = useParams<{ cohortId: string; classId: string }>();
  const supabase = createClient();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [classData, setClassData] = useState<CurriculumClass | null>(null);
  const [resources, setResources] = useState<ClassResource[]>([]);
  const [status, setStatus] = useState<ClassCompletionStatus>("not_started");
  const [checklist, setChecklist] = useState<CompletionChecklistEntry[]>([]);
  const [notes, setNotes] = useState("");
  const [carryOver, setCarryOver] = useState("");
  const [carryOverFromPrevious, setCarryOverFromPrevious] = useState<CarryOverFromPrevious | null>(null);

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
      fetch(url, { ...init, headers: { ...init?.headers, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } }),
    [accessToken]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await authedFetch(`/api/instructor/cohorts/${params.cohortId}/classes/${params.classId}`);
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
      setError("Class not found.");
      setLoading(false);
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setClassData(data.class);
      setResources(data.resources);
      setStatus(data.completion.status);
      setChecklist(data.completion.checklist);
      setNotes(data.completion.notes ?? "");
      setCarryOver(data.completion.carry_over ?? "");
      setCarryOverFromPrevious(data.carryOverFromPreviousClass);
    } else {
      setError("Couldn't load this class. Try refreshing.");
    }
    setLoading(false);
  }, [authedFetch, params.cohortId, params.classId, router]);

  useEffect(() => {
    if (!checkingAuth && accessToken) load();
  }, [checkingAuth, accessToken, load]);

  async function patchCompletion(body: Record<string, unknown>) {
    const res = await authedFetch(`/api/instructor/cohorts/${params.cohortId}/classes/${params.classId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return res;
  }

  async function handleToggleChecklistItem(key: string) {
    const updated = checklist.map((item) => (item.key === key ? { ...item, checked: !item.checked } : item));
    setChecklist(updated); // optimistic — refreshing must not lose this, so we persist immediately
    const res = await patchCompletion({ checklist: updated });
    if (!res.ok) {
      setChecklist(checklist); // revert on failure
      setSaveMessage("Couldn't save checklist change.");
    }
  }

  async function handleSaveNotes() {
    setSaving(true);
    setSaveMessage(null);
    const res = await patchCompletion({ notes, carry_over: carryOver });
    setSaving(false);
    setSaveMessage(res.ok ? "Saved." : "Couldn't save. Try again.");
  }

  async function handleMarkComplete() {
    if (!window.confirm("Mark this class complete? You can still edit notes and carry-over afterward.")) return;
    setSaving(true);
    const res = await patchCompletion({ notes, carry_over: carryOver, markComplete: true });
    setSaving(false);
    if (res.ok) {
      setStatus("completed");
      setSaveMessage("Class marked complete.");
    } else {
      setSaveMessage("Couldn't mark class complete. Try again.");
    }
  }

  if (checkingAuth || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper-50">
        <Loader2 className="h-6 w-6 animate-spin text-ink-900" aria-hidden="true" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper-50 py-10 text-ink-900">
      <Container className="max-w-3xl">
        <Link href={`/instructor/cohorts/${params.cohortId}`} className="inline-flex items-center gap-1.5 text-sm text-ink-700 hover:text-ink-900">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to cohort
        </Link>

        {error ? (
          <div className="mt-6">
            <EmptyState message={error} />
          </div>
        ) : classData ? (
          <>
            {/* Header */}
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-signal-600">
                Week {classData.week_number} · Class {classData.class_number}
              </p>
              <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">{classData.title}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="text-sm text-ink-700">{classData.week_theme}</p>
                <span className={status === "completed" ? "badge-success" : "badge-warning"}>
                  {status === "completed" ? "Completed" : "Not started"}
                </span>
              </div>
            </div>

            {carryOverFromPrevious && (
              <div className="mt-5 rounded-lg border border-warning/30 bg-warning/10 p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-warning">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                  Carry-over from Class {carryOverFromPrevious.fromClassNumber} — {carryOverFromPrevious.fromTitle}
                </p>
                <p className="mt-1 text-sm text-ink-900">{carryOverFromPrevious.text}</p>
              </div>
            )}

            {/* Learning outcome */}
            <section className="mt-6 rounded-xl2 border border-ink-900/10 bg-white p-5">
              <SectionHeading icon={Lightbulb}>Today&apos;s Outcome</SectionHeading>
              <p className="mt-2 text-sm text-ink-900">{classData.outcome}</p>
            </section>

            {/* What to teach */}
            {classData.teaching_points.length > 0 && (
              <ListSection icon={ClipboardList} title="What to Teach" items={classData.teaching_points} />
            )}

            {/* Live demo */}
            {classData.demo.length > 0 && <ListSection icon={MonitorPlay} title="Live Demo" items={classData.demo} />}

            {/* Ask students */}
            {classData.questions.length > 0 && (
              <ListSection icon={MessageCircleQuestion} title="Ask Students" items={classData.questions} />
            )}

            {/* Student practice */}
            {classData.practice.length > 0 && <ListSection icon={Dumbbell} title="Student Practice" items={classData.practice} />}

            {/* Assignment */}
            {classData.assignment && (
              <section className="mt-4 rounded-xl2 border border-ink-900/10 bg-white p-5">
                <SectionHeading icon={Forward}>Assignment</SectionHeading>
                <p className="mt-2 text-sm text-ink-900">{classData.assignment}</p>
              </section>
            )}

            {/* Resources */}
            {resources.length > 0 && (
              <section className="mt-4 rounded-xl2 border border-ink-900/10 bg-white p-5">
                <SectionHeading icon={Library}>Resources</SectionHeading>
                <ul className="mt-2 space-y-1.5">
                  {resources.map((r) => (
                    <li key={r.id}>
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-signal-500 hover:underline"
                      >
                        {r.label}
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Completion checklist */}
            <section className="mt-4 rounded-xl2 border border-ink-900/10 bg-white p-5">
              <SectionHeading icon={CheckCircle2}>Completion Checklist</SectionHeading>
              <ul className="mt-3 space-y-2">
                {checklist.map((item) => (
                  <li key={item.key}>
                    <button
                      onClick={() => handleToggleChecklistItem(item.key)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-paper-50"
                    >
                      {item.checked ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" aria-hidden="true" />
                      ) : (
                        <Circle className="h-5 w-5 shrink-0 text-ink-700/30" aria-hidden="true" />
                      )}
                      <span className={item.checked ? "text-ink-900" : "text-ink-700"}>{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {/* Instructor notes + carry-over */}
            <section className="mt-4 rounded-xl2 border border-ink-900/10 bg-white p-5">
              <SectionHeading icon={StickyNote}>Instructor Notes</SectionHeading>
              <p className="mt-1 text-xs text-ink-700">What did students struggle with? What should the next instructor know?</p>
              <textarea
                rows={4}
                className={`${textareaClass} mt-2`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Several students mixed up parameters and arguments — worth revisiting."
              />

              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-700/70">Carry-over for next class</p>
              <textarea
                rows={3}
                className={`${textareaClass} mt-2`}
                value={carryOver}
                onChange={(e) => setCarryOver(e.target.value)}
                placeholder="e.g. Students struggled with return values. Spend 15 minutes reviewing this before the next class."
              />

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  onClick={handleSaveNotes}
                  disabled={saving}
                  className="rounded-lg border border-ink-900/10 px-4 py-2 text-sm font-medium text-ink-800 hover:bg-paper-50 disabled:opacity-60"
                >
                  Save notes
                </button>
                {saveMessage && <span className="text-xs text-ink-700">{saveMessage}</span>}
              </div>
            </section>

            {/* Mark complete */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleMarkComplete}
                disabled={saving || status === "completed"}
                className="rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-ink-800 disabled:opacity-60"
              >
                {status === "completed" ? "Class Complete" : "Mark Class Complete"}
              </button>
            </div>
          </>
        ) : null}
      </Container>
    </main>
  );
}

function SectionHeading({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink-700/70">
      <Icon className="h-4 w-4" aria-hidden="true" />
      {children}
    </h2>
  );
}

function ListSection({ icon, title, items }: { icon: LucideIcon; title: string; items: string[] }) {
  return (
    <section className="mt-4 rounded-xl2 border border-ink-900/10 bg-white p-5">
      <SectionHeading icon={icon}>{title}</SectionHeading>
      <ul className="mt-2 space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-ink-900">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-700/40" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
