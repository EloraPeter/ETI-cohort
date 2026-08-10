import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ChecklistItem, ChecklistItemWithProgress, StudentChecklistProgress } from "@/lib/supabase/types";

/**
 * Fetches every active checklist item visible to a cohort — global
 * (cohort_id IS NULL) items plus any items scoped specifically to
 * that cohort — and dedupes by item_key so a cohort-specific override
 * always wins over the global default with the same key, never both.
 * Shared by the student dashboard API and the admin resources API,
 * so both agree on which row is "the" row for a given item_key.
 */
export async function getScopedChecklistItems(cohortId: string): Promise<ChecklistItem[]> {
  const supabase = createAdminClient();

  const { data: items } = await supabase
    .from("checklist_items")
    .select("*")
    .eq("is_active", true)
    .or(`cohort_id.is.null,cohort_id.eq.${cohortId}`)
    .order("sort_order", { ascending: true });

  return dedupeByItemKey(items ?? [], cohortId);
}

function dedupeByItemKey(items: ChecklistItem[], cohortId: string): ChecklistItem[] {
  const byKey = new Map<string, ChecklistItem>();
  for (const item of items) {
    const existing = byKey.get(item.item_key);
    if (!existing || (item.cohort_id === cohortId && existing.cohort_id === null)) {
      byKey.set(item.item_key, item);
    }
  }
  return Array.from(byKey.values()).sort((a, b) => a.sort_order - b.sort_order);
}

/**
 * Fetches a single checklist item scoped to a cohort by item_key —
 * the cohort-specific row if one exists, otherwise the global default.
 * Used wherever a specific item needs resolving (checklist toggling,
 * the handbook signed-URL route, admin resource status/updates).
 */
export async function getScopedChecklistItem(cohortId: string, itemKey: string): Promise<ChecklistItem | null> {
  const items = await getScopedChecklistItems(cohortId);
  return items.find((item) => item.item_key === itemKey) ?? null;
}

/**
 * Fetches every active checklist item joined with a student's progress,
 * cohort-scoped and deduped via getScopedChecklistItems, then nests
 * children under their parent (by parent_id). A composite (parent)
 * item is treated as complete if either it has its own completed_at
 * (e.g. set by a parent_auto update) or — computed defensively here
 * too, in case that write ever lags — all of its active children are
 * complete.
 */
export async function getStudentChecklist(studentId: string, cohortId: string): Promise<ChecklistItemWithProgress[]> {
  const supabase = createAdminClient();

  const [items, { data: progress }] = await Promise.all([
    getScopedChecklistItems(cohortId),
    supabase.from("student_checklist_progress").select("*").eq("student_id", studentId),
  ]);

  return buildTree(items, progress ?? []);
}

export function buildTree(items: ChecklistItem[], progress: StudentChecklistProgress[]): ChecklistItemWithProgress[] {
  const progressByItemId = new Map(progress.map((p) => [p.checklist_item_id, p]));

  const withProgress: ChecklistItemWithProgress[] = items.map((item) => {
    const p = progressByItemId.get(item.id);
    return { ...item, completed_at: p?.completed_at ?? null, completion_source: p?.completion_source ?? null, children: [] };
  });

  const byId = new Map(withProgress.map((item) => [item.id, item]));
  const roots: ChecklistItemWithProgress[] = [];

  for (const item of withProgress) {
    if (item.parent_id) {
      const parent = byId.get(item.parent_id);
      if (parent) {
        parent.children.push(item);
        continue;
      }
    }
    roots.push(item);
  }

  // Defensive: a composite parent counts as complete if all its active
  // children are complete, even if the parent's own row hasn't caught up.
  for (const item of roots) {
    if (item.item_type === "composite" && item.children.length > 0 && !item.completed_at) {
      const allChildrenDone = item.children.every((c) => c.completed_at);
      if (allChildrenDone) {
        const completedTimestamps = item.children.map((c) => c.completed_at).filter((t): t is string => Boolean(t));
        item.completed_at = completedTimestamps.reduce((latest, t) => (t > latest ? t : latest), completedTimestamps[0] ?? new Date().toISOString());
        item.completion_source = "parent_auto";
      }
    }
  }

  return roots;
}
