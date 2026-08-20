import "server-only";
import type { WeeklyScheduleEntry } from "@/lib/supabase/types";

export type FieldResult<T> = { value: T } | { error: string };

const VALID_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function validateCohortName(value: unknown): FieldResult<string> {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > 200) {
    return { error: "name must be a non-empty string." };
  }
  return { value: value.trim() };
}

export function validateStartsOn(value: unknown): FieldResult<string> {
  if (typeof value !== "string" || Number.isNaN(new Date(value).getTime())) {
    return { error: "starts_on must be a valid date." };
  }
  return { value };
}

export function validateDurationWeeks(value: unknown): FieldResult<number> {
  const weeks = Number(value);
  if (!Number.isInteger(weeks) || weeks < 1 || weeks > 52) {
    return { error: "duration_weeks must be an integer between 1 and 52." };
  }
  return { value: weeks };
}

export function validateTimezone(value: unknown): FieldResult<string> {
  if (typeof value !== "string" || !isValidTimezone(value)) {
    return { error: "timezone must be a valid IANA timezone identifier." };
  }
  return { value };
}

export function validateWeeklySchedule(value: unknown): FieldResult<WeeklyScheduleEntry[]> {
  if (!Array.isArray(value)) return { error: "weekly_schedule must be an array." };
  if (value.length > 14) return { error: "weekly_schedule has too many entries." };

  const entries: WeeklyScheduleEntry[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return { error: "Each schedule entry must be an object." };
    const { day, start_time, end_time } = raw as Record<string, unknown>;

    if (typeof day !== "string" || !VALID_DAYS.includes(day)) {
      return { error: `Invalid day: ${String(day)}. Must be one of ${VALID_DAYS.join(", ")}.` };
    }
    if (typeof start_time !== "string" || !TIME_RE.test(start_time)) {
      return { error: `Invalid start_time "${String(start_time)}" — expected HH:MM (24-hour).` };
    }
    if (typeof end_time !== "string" || !TIME_RE.test(end_time)) {
      return { error: `Invalid end_time "${String(end_time)}" — expected HH:MM (24-hour).` };
    }
    if (end_time <= start_time) {
      return { error: `On ${day}, end_time must be after start_time.` };
    }
    entries.push({ day, start_time, end_time });
  }
  return { value: entries };
}

/** fee_ngn — non-negative, up to 2 decimal places (matches the
 *  existing column: numeric(12,2), so kobo precision is valid). */
export function validateFeeNgn(value: unknown): FieldResult<number> {
  const fee = Number(value);
  if (!Number.isFinite(fee) || fee < 0) {
    return { error: "fee_ngn must be a non-negative number." };
  }
  // Reject more than 2 decimal places rather than silently rounding.
  if (Math.round(fee * 100) !== fee * 100) {
    return { error: "fee_ngn can have at most 2 decimal places." };
  }
  return { value: fee };
}

/** slots_total — nullable (null means uncapped, matches the existing column). */
export function validateSlotsTotal(value: unknown): FieldResult<number | null> {
  if (value === null) return { value: null };
  const slots = Number(value);
  if (!Number.isInteger(slots) || slots < 1) {
    return { error: "slots_total must be a positive whole number, or null for uncapped." };
  }
  return { value: slots };
}

export function validateIsOpen(value: unknown): FieldResult<boolean> {
  if (typeof value !== "boolean") {
    return { error: "is_open must be true or false." };
  }
  return { value };
}
