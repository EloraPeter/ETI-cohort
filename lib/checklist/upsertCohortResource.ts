import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ChecklistItem } from "@/lib/supabase/types";

/**
 * Sets action_url on the cohort-specific override for `itemKey` under
 * `cohortId`, creating that override (copied from the global row) if
 * it doesn't exist yet. Supabase-js's .upsert() can't target the
 * partial unique index that enforces "one row per item_key per
 * cohort" (see migration 006), so this does the select-then-write
 * manually instead.
 *
 * Returns the row's previous action_url too, so callers that own a
 * storage file (the handbook) know whether there's an old object to
 * clean up after a successful replace.
 */
export async function upsertCohortChecklistItem(
  cohortId: string,
  itemKey: string,
  actionUrl: string
): Promise<{ item: ChecklistItem; previousActionUrl: string | null }> {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("checklist_items")
    .select("*")
    .eq("item_key", itemKey)
    .eq("cohort_id", cohortId)
    .maybeSingle();

  if (existing) {
    const { data: updated, error } = await supabase
      .from("checklist_items")
      .update({ action_url: actionUrl })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error || !updated) throw new Error("Could not update the resource.");
    return { item: updated, previousActionUrl: existing.action_url };
  }

  const { data: globalItem } = await supabase.from("checklist_items").select("*").eq("item_key", itemKey).is("cohort_id", null).single();
  if (!globalItem) throw new Error(`No global checklist item found for "${itemKey}" to base a cohort override on.`);

  const { data: inserted, error } = await supabase
    .from("checklist_items")
    .insert({
      item_key: globalItem.item_key,
      parent_id: globalItem.parent_id,
      cohort_id: cohortId,
      title: globalItem.title,
      description: globalItem.description,
      item_type: globalItem.item_type,
      action_url: actionUrl,
      action_label: globalItem.action_label,
      completion_method: globalItem.completion_method,
      sort_order: globalItem.sort_order,
      is_active: true,
    })
    .select("*")
    .single();

  if (error || !inserted) throw new Error("Could not create the cohort-specific resource.");
  return { item: inserted, previousActionUrl: null };
}
