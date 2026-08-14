import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/supabase/verifyAdmin";
import { getScopedChecklistItem } from "@/lib/checklist/getStudentChecklist";
import { MANAGED_RESOURCE_ITEMS } from "@/lib/checklist/managedResources";

export async function GET(request: Request) {
  const email = await verifyAdminRequest(request);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const cohortId = searchParams.get("cohortId");
  if (!cohortId) {
    return NextResponse.json({ error: "cohortId is required." }, { status: 400 });
  }

  const resources = await Promise.all(
    MANAGED_RESOURCE_ITEMS.map(async (config) => {
      const item = await getScopedChecklistItem(cohortId, config.itemKey);
      return {
        itemKey: config.itemKey,
        label: config.label,
        kind: config.kind,
        scope: config.scope,
        // For "file" items action_url is a private storage path, not
        // something to show directly — just report whether it's set.
        configured: Boolean(item?.action_url),
        url: config.kind === "url" ? (item?.action_url ?? null) : null,
        isOverride: config.scope === "cohort" && item?.cohort_id === cohortId,
      };
    })
  );

  return NextResponse.json({ resources });
}
