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

export async function GET(request: Request) {
  const email = await verifyAdminRequest(request);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: cohorts, error } = await supabase
    .from("cohorts")
    .select("*")
    .order("starts_on", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Could not load cohorts." }, { status: 500 });
  }

  return NextResponse.json({ cohorts: cohorts ?? [] });
}

export async function POST(request: Request) {
  const email = await verifyAdminRequest(request);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Required — no database default for these three columns
  // (`cohorts.name`, `cohorts.starts_on`, `cohorts.fee_ngn` are all
  // `not null` with no default; see migration 001).
  const nameResult = validateCohortName(body.name);
  if ("error" in nameResult) return NextResponse.json({ error: nameResult.error }, { status: 400 });

  const startsOnResult = validateStartsOn(body.starts_on);
  if ("error" in startsOnResult) return NextResponse.json({ error: startsOnResult.error }, { status: 400 });

  const feeResult = validateFeeNgn(body.fee_ngn);
  if ("error" in feeResult) return NextResponse.json({ error: feeResult.error }, { status: 400 });

  const insert: Record<string, unknown> = {
    name: nameResult.value,
    starts_on: startsOnResult.value,
    fee_ngn: feeResult.value,
  };

  // Optional — the database supplies a default when omitted
  // (duration_weeks: 7, is_open: true, timezone: 'Africa/Lagos') or
  // the column is nullable (slots_total, weekly_schedule).
  if (body.duration_weeks !== undefined) {
    const result = validateDurationWeeks(body.duration_weeks);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    insert.duration_weeks = result.value;
  }

  if (body.timezone !== undefined) {
    const result = validateTimezone(body.timezone);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    insert.timezone = result.value;
  }

  if (body.slots_total !== undefined) {
    const result = validateSlotsTotal(body.slots_total);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    insert.slots_total = result.value;
  }

  if (body.is_open !== undefined) {
    const result = validateIsOpen(body.is_open);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    insert.is_open = result.value;
  }

  if (body.weekly_schedule !== undefined) {
    const result = validateWeeklySchedule(body.weekly_schedule);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    insert.weekly_schedule = result.value;
  }

  const supabase = createAdminClient();
  const { data: cohort, error } = await supabase.from("cohorts").insert(insert).select("*").single();

  if (error || !cohort) {
    console.error("Admin cohort create failed:", error);
    return NextResponse.json({ error: "Could not create cohort." }, { status: 500 });
  }

  return NextResponse.json({ cohort }, { status: 201 });
}
