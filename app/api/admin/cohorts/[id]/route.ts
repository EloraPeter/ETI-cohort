import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAdminRequest } from "@/lib/supabase/verifyAdmin";
import {
  validateCohortName,
  validateStartsOn,
  validateDurationWeeks,
  validateTimezone,
  validateWeeklySchedule,
  validateFeeNgn,
  validateSlotsTotal,
  validateIsOpen,
} from "@/lib/validations/cohort";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const email = await verifyAdminRequest(request);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Cohort id is required." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const result = validateCohortName(body.name);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    update.name = result.value;
  }

  if (body.starts_on !== undefined) {
    const result = validateStartsOn(body.starts_on);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    update.starts_on = result.value;
  }

  if (body.duration_weeks !== undefined) {
    const result = validateDurationWeeks(body.duration_weeks);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    update.duration_weeks = result.value;
  }

  if (body.timezone !== undefined) {
    const result = validateTimezone(body.timezone);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    update.timezone = result.value;
  }

  if (body.weekly_schedule !== undefined) {
    const result = validateWeeklySchedule(body.weekly_schedule);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    update.weekly_schedule = result.value;
  }

  // Extended per the Milestone 4 architecture plan — these columns
  // already exist on `cohorts` (migration 001) but were never
  // reachable through this validator until now.
  if (body.fee_ngn !== undefined) {
    const result = validateFeeNgn(body.fee_ngn);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    update.fee_ngn = result.value;
  }

  if (body.slots_total !== undefined) {
    const result = validateSlotsTotal(body.slots_total);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    update.slots_total = result.value;
  }

  if (body.is_open !== undefined) {
    const result = validateIsOpen(body.is_open);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    update.is_open = result.value;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: updated, error } = await supabase.from("cohorts").update(update).eq("id", id).select("*").single();

  if (error || !updated) {
    return NextResponse.json({ error: "Could not update cohort." }, { status: 500 });
  }

  return NextResponse.json({ cohort: updated });
}
