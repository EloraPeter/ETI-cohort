import type { CompletionChecklistEntry } from "@/lib/supabase/types";

/**
 * The completion checklist is a small, fixed list — not an
 * admin-configurable catalog like checklist_items (that system
 * exists for onboarding items, a different domain). This is the
 * template a fresh class_completions row starts from; once an
 * instructor has interacted with it, the actual checked state lives
 * in that row's own `checklist` column, not here.
 */
export const DEFAULT_COMPLETION_CHECKLIST: { key: string; label: string }[] = [
  { key: "reviewed_previous_class", label: "Reviewed previous class" },
  { key: "taught_concepts", label: "Taught concepts" },
  { key: "completed_demo", label: "Completed demo" },
  { key: "students_practiced", label: "Students practiced" },
  { key: "applied_to_project", label: "Applied to project" },
  { key: "checked_understanding", label: "Checked understanding" },
  { key: "assignment_given", label: "Assignment given" },
  { key: "notes_recorded", label: "Notes recorded" },
  { key: "class_completed", label: "Class completed" },
];

/** Returns the stored checklist if present, otherwise the default
 *  template with everything unchecked — so the UI always has a full,
 *  consistent list to render regardless of whether this class has
 *  been touched before. */
export function resolveCompletionChecklist(stored: CompletionChecklistEntry[] | null | undefined): CompletionChecklistEntry[] {
  if (stored && stored.length > 0) return stored;
  return DEFAULT_COMPLETION_CHECKLIST.map((item) => ({ ...item, checked: false }));
}
