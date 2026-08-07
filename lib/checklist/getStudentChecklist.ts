import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ChecklistItem, ChecklistItemWithProgress, StudentChecklistProgress } from "@/lib/supabase/types";

/**
 * Fetches every active checklist item joined with a student's progress,
 * and nests children under their parent. A composite (parent) item is
 * treated as complete if either it has its own completed_at (e.g. set
 * by a parent_auto update) or — computed defensively here too, in case
 * that write ever lags — all of its active children are complete.
 */
export async function getStudentChecklist(studentId: string): Promise<ChecklistItemWithProgress[]> {
  const supabase = createAdminClient();

  const [{ data: items }, { data: progress }] = await Promise.all([
    supabase.from("checklist_items").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
    supabase.from("student_checklist_progress").select("*").eq("student_id", studentId),
  ]);

  return buildTree(items ?? [], progress ?? []);
}

export function buildTree(items: ChecklistItem[], progress: StudentChecklistProgress[]): ChecklistItemWithProgress[] {
  const progressByItemId = new Map(progress.map((p) => [p.checklist_item_id, p]));

  const withProgress: ChecklistItemWithProgress[] = items.map((item) => {
    const p = progressByItemId.get(item.id);
    return { ...item, completed_at: p?.completed_at ?? null, completion_source: p?.completion_source ?? null, children: [] };
  });

  const byKey = new Map(withProgress.map((item) => [item.item_key, item]));
  const roots: ChecklistItemWithProgress[] = [];

  for (const item of withProgress) {
    if (item.parent_key) {
      const parent = byKey.get(item.parent_key);
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
