import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/supabase/verifyAdmin";
import { upsertCohortChecklistItem } from "@/lib/checklist/upsertCohortResource";
import { MANAGED_RESOURCE_ITEMS } from "@/lib/checklist/managedResources";

const URL_ITEM_KEYS = MANAGED_RESOURCE_ITEMS.filter((r) => r.kind === "url").map((r) => r.itemKey);

export async function POST(request: Request) {
  const email = await verifyAdminRequest(request);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const cohortId = body && typeof body.cohortId === "string" ? body.cohortId : null;
  const itemKey = body && typeof body.itemKey === "string" ? body.itemKey : null;
  const url = body && typeof body.url === "string" ? body.url.trim() : null;

  if (!cohortId || !itemKey || !url) {
    return NextResponse.json({ error: "cohortId, itemKey, and url are required." }, { status: 400 });
  }
  if (!URL_ITEM_KEYS.includes(itemKey)) {
    return NextResponse.json({ error: "Unknown or unsupported resource." }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "That doesn't look like a valid URL." }, { status: 400 });
  }
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return NextResponse.json({ error: "URL must start with http:// or https://" }, { status: 400 });
  }

  try {
    const { item } = await upsertCohortChecklistItem(cohortId, itemKey, url);
    return NextResponse.json({ item });
  } catch (err) {
    console.error("Failed to set resource URL:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not save the resource." }, { status: 500 });
  }
}
