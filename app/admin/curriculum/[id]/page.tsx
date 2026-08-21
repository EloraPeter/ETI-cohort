"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Field, inputClass } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import type { CurriculumClass, ClassResource, Curriculum } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const lightInput = `${inputClass} border-ink-900/10 bg-white text-ink-900 placeholder:text-ink-700/40 focus:border-signal-500`;
const lightTextarea = "w-full rounded-lg border border-ink-900/10 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-signal-500";

/** Multi-line textarea in, string[] out — every list field (teaching
 *  points, demo, practice, questions) is edited the same simple way:
 *  one item per line. */
function linesToArray(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export default function AdminCurriculumDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const supabase = createClient();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [classes, setClasses] = useState<CurriculumClass[]>([]);

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
      fetch(url, { ...init, headers: { ...init?.headers, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } }),
    [accessToken]
  );

  const load = useCallback(async () => {
    setLoading(true);
    const res = await authedFetch(`/api/admin/curricula/${params.id}`);
    if (res.status === 401) {
      router.replace("/admin");
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setCurriculum(data.curriculum);
      setClasses(data.classes);
    }
    setLoading(false);
  }, [authedFetch, params.id, router]);

  useEffect(() => {
    if (!checkingAuth && accessToken) load();
  }, [checkingAuth, accessToken, load]);

  const weeks = Array.from(new Set(classes.map((c) => c.week_number))).sort((a, b) => a - b);

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
        <Link href="/admin/curriculum" className="inline-flex items-center gap-1.5 text-sm text-ink-700 hover:text-ink-900">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All curricula
        </Link>

        {curriculum && (
          <div className="mt-4">
            <h1 className="font-display text-2xl font-semibold">{curriculum.name}</h1>
            <p className="mt-1 text-sm text-ink-700">{classes.length} classes across {weeks.length} weeks.</p>
          </div>
        )}

        {message && (
          <p className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
        )}

        <div className="mt-6 space-y-6">
          {weeks.map((weekNumber) => {
            const weekClasses = classes.filter((c) => c.week_number === weekNumber);
            return (
              <div key={weekNumber}>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-700/70">
                  Week {weekNumber} — {weekClasses[0]?.week_theme}
                </h2>
                <div className="mt-2 space-y-2">
                  {weekClasses.map((cls) => (
                    <ClassRow
                      key={cls.id}
                      curriculumId={params.id}
                      classItem={cls}
                      isFirst={cls.class_number === classes[0]?.class_number}
                      isLast={cls.class_number === classes[classes.length - 1]?.class_number}
                      authedFetch={authedFetch}
                      onReordered={(updated) => setClasses(updated)}
                      onMessage={setMessage}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </main>
  );
}

function ClassRow({
  curriculumId,
  classItem,
  isFirst,
  isLast,
  authedFetch,
  onReordered,
  onMessage,
}: {
  curriculumId: string;
  classItem: CurriculumClass;
  isFirst: boolean;
  isLast: boolean;
  authedFetch: (url: string, init?: RequestInit) => Promise<Response>;
  onReordered: (classes: CurriculumClass[]) => void;
  onMessage: (m: string) => void;
}) {
  const [expanded, setExpanded] = useState<"none" | "edit" | "preview">("none");
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState(classItem.title);
  const [weekTheme, setWeekTheme] = useState(classItem.week_theme);
  const [outcome, setOutcome] = useState(classItem.outcome);
  const [teachingPoints, setTeachingPoints] = useState(classItem.teaching_points.join("\n"));
  const [demo, setDemo] = useState(classItem.demo.join("\n"));
  const [practice, setPractice] = useState(classItem.practice.join("\n"));
  const [questions, setQuestions] = useState(classItem.questions.join("\n"));
  const [assignment, setAssignment] = useState(classItem.assignment);
  const [checkpoint, setCheckpoint] = useState(classItem.checkpoint);

  const [resources, setResources] = useState<ClassResource[] | null>(null);
  const [newResourceLabel, setNewResourceLabel] = useState("");
  const [newResourceUrl, setNewResourceUrl] = useState("");

  async function loadResources() {
    const res = await authedFetch(`/api/admin/curricula/${curriculumId}/classes/${classItem.id}`);
    if (res.ok) {
      const data = await res.json();
      setResources(data.resources);
    }
  }

  function toggle(mode: "edit" | "preview") {
    const next = expanded === mode ? "none" : mode;
    setExpanded(next);
    if (next !== "none" && resources === null) loadResources();
  }

  async function handleSave() {
    setSaving(true);
    const res = await authedFetch(`/api/admin/curricula/${curriculumId}/classes/${classItem.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title,
        week_theme: weekTheme,
        outcome,
        teaching_points: linesToArray(teachingPoints),
        demo: linesToArray(demo),
        practice: linesToArray(practice),
        questions: linesToArray(questions),
        assignment,
        checkpoint,
      }),
    });
    setSaving(false);
    if (res.ok) {
      onMessage("Class updated.");
    } else {
      onMessage("Couldn't save changes.");
    }
  }

  async function handleReorder(action: "move_up" | "move_down") {
    setSaving(true);
    const res = await authedFetch(`/api/admin/curricula/${curriculumId}/classes/${classItem.id}`, {
      method: "PATCH",
      body: JSON.stringify({ action }),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      onReordered(data.classes);
      onMessage("Reordered.");
    } else {
      onMessage("Couldn't reorder — already at that end of the list.");
    }
  }

  async function handleAddResource() {
    if (!newResourceLabel || !newResourceUrl) return;
    const res = await authedFetch(`/api/admin/curricula/${curriculumId}/classes/${classItem.id}/resources`, {
      method: "POST",
      body: JSON.stringify({ label: newResourceLabel, url: newResourceUrl }),
    });
    if (res.ok) {
      const data = await res.json();
      setResources((prev) => [...(prev ?? []), data.resource]);
      setNewResourceLabel("");
      setNewResourceUrl("");
    }
  }

  async function handleRemoveResource(resourceId: string) {
    const res = await authedFetch(`/api/admin/curricula/${curriculumId}/classes/${classItem.id}/resources?resourceId=${resourceId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setResources((prev) => (prev ?? []).filter((r) => r.id !== resourceId));
    }
  }

  return (
    <div className="rounded-xl2 border border-ink-900/10 bg-white">
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="flex flex-col">
          <button onClick={() => handleReorder("move_up")} disabled={isFirst || saving} className="text-ink-700/50 hover:text-ink-900 disabled:opacity-30">
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          </button>
          <button onClick={() => handleReorder("move_down")} disabled={isLast || saving} className="text-ink-700/50 hover:text-ink-900 disabled:opacity-30">
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-ink-900">
            Class {classItem.class_number} — {classItem.title}
          </p>
        </div>
        <button
          onClick={() => toggle("preview")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-ink-900/10 px-3 py-1.5 text-xs font-medium text-ink-800 hover:bg-paper-50"
        >
          {expanded === "preview" ? <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5" aria-hidden="true" />}
          Preview
        </button>
        <button
          onClick={() => toggle("edit")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-ink-900/10 px-3 py-1.5 text-xs font-medium text-ink-800 hover:bg-paper-50"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          Edit
        </button>
      </div>

      {expanded === "preview" && (
        <div className="space-y-3 border-t border-ink-900/10 px-4 py-4 text-sm">
          <p>
            <span className="font-semibold">Outcome:</span> {classItem.outcome}
          </p>
          <PreviewList label="What to Teach" items={classItem.teaching_points} />
          <PreviewList label="Live Demo" items={classItem.demo} />
          <PreviewList label="Ask Students" items={classItem.questions} />
          <PreviewList label="Student Practice" items={classItem.practice} />
          {classItem.assignment && (
            <p>
              <span className="font-semibold">Assignment:</span> {classItem.assignment}
            </p>
          )}
          <div>
            <p className="font-semibold">Resources</p>
            {resources === null ? (
              <Loader2 className="mt-1 h-3.5 w-3.5 animate-spin text-ink-700" aria-hidden="true" />
            ) : resources.length === 0 ? (
              <p className="text-ink-700/70">None attached.</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {resources.map((r) => (
                  <li key={r.id}>
                    <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-signal-500 hover:underline">
                      {r.label} <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {expanded === "edit" && (
        <div className="space-y-4 border-t border-ink-900/10 px-4 py-4">
          <Field label="Title" htmlFor={`title-${classItem.id}`}>
            <input id={`title-${classItem.id}`} className={lightInput} value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Weekly theme" htmlFor={`theme-${classItem.id}`}>
            <input id={`theme-${classItem.id}`} className={lightInput} value={weekTheme} onChange={(e) => setWeekTheme(e.target.value)} />
          </Field>
          <Field label="Learning outcome" htmlFor={`outcome-${classItem.id}`}>
            <textarea id={`outcome-${classItem.id}`} rows={2} className={lightTextarea} value={outcome} onChange={(e) => setOutcome(e.target.value)} />
          </Field>
          <Field label="What to teach (one per line)" htmlFor={`points-${classItem.id}`}>
            <textarea id={`points-${classItem.id}`} rows={4} className={lightTextarea} value={teachingPoints} onChange={(e) => setTeachingPoints(e.target.value)} />
          </Field>
          <Field label="Live demo (one per line)" htmlFor={`demo-${classItem.id}`}>
            <textarea id={`demo-${classItem.id}`} rows={3} className={lightTextarea} value={demo} onChange={(e) => setDemo(e.target.value)} />
          </Field>
          <Field label="Student practice (one per line)" htmlFor={`practice-${classItem.id}`}>
            <textarea id={`practice-${classItem.id}`} rows={3} className={lightTextarea} value={practice} onChange={(e) => setPractice(e.target.value)} />
          </Field>
          <Field label="Ask students (one per line)" htmlFor={`questions-${classItem.id}`}>
            <textarea id={`questions-${classItem.id}`} rows={3} className={lightTextarea} value={questions} onChange={(e) => setQuestions(e.target.value)} />
          </Field>
          <Field label="Assignment / next step" htmlFor={`assignment-${classItem.id}`}>
            <textarea id={`assignment-${classItem.id}`} rows={2} className={lightTextarea} value={assignment} onChange={(e) => setAssignment(e.target.value)} />
          </Field>
          <Field label="Checkpoint" htmlFor={`checkpoint-${classItem.id}`}>
            <textarea id={`checkpoint-${classItem.id}`} rows={2} className={lightTextarea} value={checkpoint} onChange={(e) => setCheckpoint(e.target.value)} />
          </Field>

          <button onClick={handleSave} disabled={saving} className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            Save changes
          </button>

          <div className="border-t border-ink-900/10 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/70">Resources</p>
            {resources === null ? (
              <Loader2 className="mt-2 h-4 w-4 animate-spin text-ink-700" aria-hidden="true" />
            ) : (
              <>
                <ul className="mt-2 space-y-1.5">
                  {resources.map((r) => (
                    <li key={r.id} className="flex items-center justify-between rounded-lg border border-ink-900/10 px-3 py-1.5 text-sm">
                      <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-signal-500 hover:underline">
                        {r.label} <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                      <button onClick={() => handleRemoveResource(r.id)} className="text-ink-700/50 hover:text-error">
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    placeholder="Label (e.g. Starter code)"
                    className={`${lightInput} w-48`}
                    value={newResourceLabel}
                    onChange={(e) => setNewResourceLabel(e.target.value)}
                  />
                  <input
                    placeholder="https://..."
                    className={`${lightInput} w-56`}
                    value={newResourceUrl}
                    onChange={(e) => setNewResourceUrl(e.target.value)}
                  />
                  <button
                    onClick={handleAddResource}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-ink-900/10 px-3 py-2 text-xs font-medium text-ink-800 hover:bg-paper-50"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Add
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewList({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="font-semibold">{label}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-ink-800">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
