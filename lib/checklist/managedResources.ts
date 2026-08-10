export interface ManagedResourceConfig {
  itemKey: string;
  label: string;
  kind: "file" | "url";
}

/** The only checklist items the admin resources page manages.
 *  Intentionally small — this is not a general checklist editor. */
export const MANAGED_RESOURCE_ITEMS: ManagedResourceConfig[] = [
  { itemKey: "orientation-handbook", label: "Student Handbook", kind: "file" },
  { itemKey: "orientation-video", label: "Orientation Video", kind: "url" },
  { itemKey: "community", label: "Community Channel", kind: "url" },
];
