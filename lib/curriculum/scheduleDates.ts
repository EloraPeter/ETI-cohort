import "server-only";
import type { Cohort } from "@/lib/supabase/types";

const WEEKDAY_INDEX: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

/** "Today" as YYYY-MM-DD in the given IANA timezone. Date-only, so
 *  DST doesn't matter here — we only need the calendar date. */
export function todayInTimezone(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function weekdayOf(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

/**
 * Computes the calendar date for each sequential class (1..totalClasses)
 * by walking forward day-by-day from the cohort's starts_on date,
 * counting only weekdays present in the cohort's own weekly_schedule
 * (the same field the admin Resources page and the ICS calendar export
 * already use — this is not a second scheduling system, just a
 * different read of the same data).
 *
 * No class dates are stored anywhere; this is recomputed on every
 * request from the cohort's current starts_on/weekly_schedule, so it
 * is always consistent with whatever the admin has configured. This
 * also means editing a cohort's schedule after it starts shifts
 * future class dates going forward — expected given no per-class
 * override/rescheduling store exists yet (intentionally out of scope
 * for Phase 4C; see completion report).
 */
export function computeClassDates(cohort: Cohort, totalClasses: number): string[] {
  const schedule = cohort.weekly_schedule ?? [];
  if (schedule.length === 0 || totalClasses <= 0) return [];

  const matchWeekdays = new Set(schedule.map((entry) => WEEKDAY_INDEX[entry.day]).filter((n) => n !== undefined));
  if (matchWeekdays.size === 0) return [];

  const dates: string[] = [];
  let cursor = addDays(cohort.starts_on.slice(0, 10), -1);

  // Simple day-by-day walk rather than a closed-form calculation —
  // easy to reason about and cheap for realistic curriculum sizes
  // (tens of classes), with a hard cap so a pathological schedule
  // can never loop unboundedly.
  let safety = totalClasses * 30;
  while (dates.length < totalClasses && safety > 0) {
    cursor = addDays(cursor, 1);
    if (matchWeekdays.has(weekdayOf(cursor))) {
      dates.push(cursor);
    }
    safety -= 1;
  }
  return dates;
}

/**
 * Resolves which class_number (1-indexed, matching
 * curriculum_classes.class_number) falls on "today" for this cohort,
 * or null if today isn't a scheduled class day for it.
 */
export function findTodaysClassNumber(cohort: Cohort, totalClasses: number): number | null {
  const today = todayInTimezone(cohort.timezone);
  const dates = computeClassDates(cohort, totalClasses);
  const idx = dates.indexOf(today);
  return idx === -1 ? null : idx + 1;
}
