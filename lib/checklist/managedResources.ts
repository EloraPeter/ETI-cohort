export interface ManagedResourceConfig {
  itemKey: string;
  label: string;
  kind: "file" | "url";
  /** "global" resources (e.g. the ETI Telegram community) are shown
   *  read-only here regardless of selected cohort — they are never
   *  edited from this surface. "cohort" resources are edited for
   *  whichever cohort is currently selected. */
  scope: "global" | "cohort";
}

/** The only checklist items the admin resources page manages.
 *  Intentionally small — this is not a general checklist editor. */
export const MANAGED_RESOURCE_ITEMS: ManagedResourceConfig[] = [
  { itemKey: "orientation-handbook", label: "Student Handbook", kind: "file", scope: "cohort" },
  { itemKey: "orientation-video", label: "Orientation Video", kind: "url", scope: "cohort" },
  { itemKey: "cohort-whatsapp", label: "Cohort WhatsApp Group", kind: "url", scope: "cohort" },
  { itemKey: "community", label: "ETI Telegram Community", kind: "url", scope: "global" },
];
