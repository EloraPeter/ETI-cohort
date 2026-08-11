import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAdminRequest } from "@/lib/supabase/verifyAdmin";
import type { WeeklyScheduleEntry } from "@/lib/supabase/types";

const VALID_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function validateWeeklySchedule(value: unknown): WeeklyScheduleEntry[] | string {
  if (!Array.isArray(value)) return "weekly_schedule must be an array.";
  if (value.length > 14) return "weekly_schedule has too many entries.";

  const entries: WeeklyScheduleEntry[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return "Each schedule entry must be an object.";
    const { day, start_time, end_time } = raw as Record<string, unknown>;

    if (typeof day !== "string" || !VALID_DAYS.includes(day)) {
      return `Invalid day: ${String(day)}. Must be one of ${VALID_DAYS.join(", ")}.`;
    }
    if (typeof start_time !== "string" || !TIME_RE.test(start_time)) {
      return `Invalid start_time "${String(start_time)}" — expected HH:MM (24-hour).`;
    }
    if (typeof end_time !== "string" || !TIME_RE.test(end_time)) {
      return `Invalid end_time "${String(end_time)}" — expected HH:MM (24-hour).`;
    }
    if (end_time <= start_time) {
      return `On ${day}, end_time must be after start_time.`;
    }
    entries.push({ day, start_time, end_time });
  }
  return entries;
}

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
    if (typeof body.name !== "string" || body.name.trim().length === 0 || body.name.length > 200) {
      return NextResponse.json({ error: "name must be a non-empty string." }, { status: 400 });
    }
    update.name = body.name.trim();
  }

  if (body.starts_on !== undefined) {
    if (typeof body.starts_on !== "string" || Number.isNaN(new Date(body.starts_on).getTime())) {
      return NextResponse.json({ error: "starts_on must be a valid date." }, { status: 400 });
    }
    update.starts_on = body.starts_on;
  }

  if (body.duration_weeks !== undefined) {
    const weeks = Number(body.duration_weeks);
    if (!Number.isInteger(weeks) || weeks < 1 || weeks > 52) {
      return NextResponse.json({ error: "duration_weeks must be an integer between 1 and 52." }, { status: 400 });
    }
    update.duration_weeks = weeks;
  }

  if (body.timezone !== undefined) {
    if (typeof body.timezone !== "string" || !isValidTimezone(body.timezone)) {
      return NextResponse.json({ error: "timezone must be a valid IANA timezone identifier." }, { status: 400 });
    }
    update.timezone = body.timezone;
  }

  if (body.weekly_schedule !== undefined) {
    const result = validateWeeklySchedule(body.weekly_schedule);
    if (typeof result === "string") {
      return NextResponse.json({ error: result }, { status: 400 });
    }
    update.weekly_schedule = result;
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
