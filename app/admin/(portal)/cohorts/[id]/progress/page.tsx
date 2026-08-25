"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle2, Circle, AlertTriangle } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAdminAuth } from "@/lib/admin/AdminAuthContext";
import type { Cohort, CompletionChecklistEntry, ClassCompletionStatus } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

interface ProgressRow {
  class: { id: string; class_number: number; week_number: number; week_theme: string; title: string };
  status: ClassCompletionStatus;
  completed_at: string | null;
  instructor_name: string | null;
  notes: string | null;
  carry_over: string | null;
  checklist: CompletionChecklistEntry[];
}

export default function AdminCohortProgressPage() {
  const params = useParams<{ id: string }>();
  const { authedFetch } = useAdminAuth();

  const [loading, setLoading] = useState(true);
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [rows, setRows] = useState<ProgressRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await authedFetch(`/api/admin/cohorts/${params.id}/completions`);
    if (res.ok) {
      const data = await res.json();
      setCohort(data.cohort);
      setRows(data.classes);
    }
    setLoading(false);
  }, [authedFetch, params.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-ink-700" aria-hidden="true" />
      </div>
    );
  }

  const completedCount = rows.filter((r) => r.status === "completed").length;

  return (
    <Container className="max-w-3xl">
      <Link href="/admin/cohorts" className="inline-flex items-center gap-1.5 text-sm text-ink-700 hover:text-ink-900">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to cohorts
      </Link>

      {cohort && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink-900">{cohort.name}</h1>
            <p className="mt-1 text-sm text-ink-700">Class delivery progress</p>
          </div>
          <span className="text-sm font-medium text-ink-700">
            {completedCount} / {rows.length} classes completed
          </span>
        </div>
      )}

      <div className="mt-6">
        {rows.length === 0 ? (
          <EmptyState message="No curriculum assigned to this cohort yet." />
        ) : (
          <div className="space-y-2">
            {rows.map((row) => {
              const hasDetail = row.notes || row.carry_over;
              const isExpanded = expandedId === row.class.id;
              return (
                <div key={row.class.id} className="rounded-xl2 border border-ink-900/10 bg-white">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : row.class.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                    disabled={!hasDetail}
                  >
                    <span className="flex items-center gap-2 text-sm">
                      {row.status === "completed" ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                      ) : (
                        <Circle className="h-4 w-4 shrink-0 text-ink-700/30" aria-hidden="true" />
                      )}
                      <span className="font-medium text-ink-900">
                        Class {row.class.class_number} — {row.class.title}
                      </span>
                      {row.carry_over && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />}
                    </span>
                    <span className="text-xs text-ink-700/70">{row.instructor_name ?? "—"}</span>
                  </button>
                  {isExpanded && hasDetail && (
                    <div className="space-y-2 border-t border-ink-900/10 px-4 py-3 text-sm">
                      {row.notes && (
                        <p>
                          <span className="font-medium text-ink-900">Notes: </span>
                          <span className="text-ink-700">{row.notes}</span>
                        </p>
                      )}
                      {row.carry_over && (
                        <p>
                          <span className="font-medium text-warning">Carry-over: </span>
                          <span className="text-ink-700">{row.carry_over}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Container>
  );
}
