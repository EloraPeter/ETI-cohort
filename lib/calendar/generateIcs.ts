import "server-only";
import type { Cohort, WeeklyScheduleEntry } from "@/lib/supabase/types";
import { formatWeeklySchedule } from "./formatSchedule";

interface IcsEvent {
  uid: string;
  summary: string;
  description?: string;
  /** "YYYY-MM-DD" for an all-day event, or a full ISO datetime for a timed one. */
  start: string;
  /** Only used for timed events. */
  end?: string;
  allDay?: boolean;
  /** RFC 5545 RRULE value (without the "RRULE:" prefix), for recurring events. */
  recurrenceRule?: string;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const BYDAY_CODE: Record<string, string> = {
  Sunday: "SU",
  Monday: "MO",
  Tuesday: "TU",
  Wednesday: "WE",
  Thursday: "TH",
  Friday: "FR",
  Saturday: "SA",
};

function formatDate(dateStr: string): string {
  return dateStr.replace(/-/g, "");
}

function formatDateTime(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/**
 * Cohort.timezone exists in the database (migration 007) but isn't
 * declared on the shared Cohort interface — Cohort's catch-all
 * `[key: string]: unknown` index signature means `cohort.timezone`
 * already typechecks, just as `unknown`. Reading it here, locally,
 * avoids touching the shared type (and therefore every other file
 * that imports it) for a field only this module actually needs.
 */
function getCohortTimezone(cohort: Cohort): string {
  const raw = (cohort as { timezone?: unknown }).timezone;
  return typeof raw === "string" && raw.length > 0 ? raw : "Africa/Lagos";
}

/**
 * Offset (in minutes) of `timeZone` from UTC at the given instant.
 * Uses only the built-in Intl API — no date-fns-tz/luxon dependency
 * needed, since Node ships full IANA timezone data already. Correctly
 * accounts for DST because it asks Intl what the wall-clock time in
 * that zone actually is at this exact instant, rather than applying a
 * fixed offset.
 */
function getUtcOffsetMinutes(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(instant).reduce<Record<string, string>>((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  const year = parts.year ?? "1970";
  const month = parts.month ?? "01";
  const day = parts.day ?? "01";
  const hour = parts.hour ?? "00";
  const minute = parts.minute ?? "00";
  const second = parts.second ?? "00";
  const asIfUtc = Date.UTC(+year, +month - 1, +day, +hour, +minute, +second);
  return (asIfUtc - instant.getTime()) / 60000;
}

/** Converts a local wall-clock date+time in `timeZone` to the equivalent UTC instant. */
function zonedTimeToUtc(year: number, month: number, day: number, hour: number, minute: number, timeZone: string): Date {
  const guessUtcMs = Date.UTC(year, month - 1, day, hour, minute);
  const offsetMinutes = getUtcOffsetMinutes(new Date(guessUtcMs), timeZone);
  return new Date(guessUtcMs - offsetMinutes * 60000);
}

function eventToIcs(event: IcsEvent): string {
  const lines = ["BEGIN:VEVENT", `UID:${event.uid}`, `DTSTAMP:${formatDateTime(new Date().toISOString())}`];

  if (event.allDay || !event.end) {
    lines.push(`DTSTART;VALUE=DATE:${formatDate(event.start)}`);
  } else {
    lines.push(`DTSTART:${formatDateTime(event.start)}`, `DTEND:${formatDateTime(event.end)}`);
  }

  if (event.recurrenceRule) lines.push(`RRULE:${event.recurrenceRule}`);

  lines.push(`SUMMARY:${escapeIcsText(event.summary)}`);
  if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

/** First date >= startsOn (a "YYYY-MM-DD" string) that falls on `dayName`. */
function firstOccurrenceOnOrAfter(startsOn: string, dayName: string): { year: number; month: number; day: number } | null {
  const targetWeekday = WEEKDAY_INDEX[dayName];
  if (targetWeekday === undefined) return null;
  const start = new Date(`${startsOn}T00:00:00Z`);
  const startWeekday = start.getUTCDay();
  const daysToAdd = (targetWeekday - startWeekday + 7) % 7;
  const result = new Date(start);
  result.setUTCDate(result.getUTCDate() + daysToAdd);
  return { year: result.getUTCFullYear(), month: result.getUTCMonth() + 1, day: result.getUTCDate() };
}

function buildRecurringEvent(cohort: Cohort, entry: WeeklyScheduleEntry, untilUtc: Date, timezone: string): IcsEvent | null {
  const byday = BYDAY_CODE[entry.day];
  if (!byday) return null; // unrecognized day value — skip rather than emit a broken event

  const [startHourStr, startMinuteStr] = entry.start_time.split(":");
  const [endHourStr, endMinuteStr] = entry.end_time.split(":");
  const startHour = Number(startHourStr);
  const startMinute = Number(startMinuteStr);
  const endHour = Number(endHourStr);
  const endMinute = Number(endMinuteStr);
  if ([startHour, startMinute, endHour, endMinute].some((n) => Number.isNaN(n))) return null;

  const first = firstOccurrenceOnOrAfter(cohort.starts_on, entry.day);
  if (!first) return null;
  const startUtc = zonedTimeToUtc(first.year, first.month, first.day, startHour, startMinute, timezone);
  const endUtc = zonedTimeToUtc(first.year, first.month, first.day, endHour, endMinute, timezone);

  return {
    uid: `cohort-${cohort.id}-${entry.day.toLowerCase()}-${entry.start_time}@eloratechinstitute.com`,
    summary: `${cohort.name} — Class`,
    description: `Weekly class session. Cohort duration: ${cohort.duration_weeks} weeks.`,
    start: startUtc.toISOString(),
    end: endUtc.toISOString(),
    recurrenceRule: `FREQ=WEEKLY;BYDAY=${byday};UNTIL=${formatDateTime(untilUtc.toISOString())}`,
  };
}

/**
 * Builds an ICS calendar for a cohort.
 *
 * If `weekly_schedule` is populated: one recurring VEVENT per schedule
 * entry (a cohort with different times on different days — e.g.
 * Mon/Wed evenings + a Saturday morning slot — can't be expressed as a
 * single VEVENT with multiple BYDAY values, since RRULE applies one
 * time to every listed day). Each event starts at that entry's first
 * occurrence on/after starts_on, recurs weekly, and stops via UNTIL
 * once the cohort's duration_weeks has elapsed. Times are converted
 * from the cohort's local timezone to UTC.
 *
 * If `weekly_schedule` is empty/null: falls back to the original
 * all-day start-date event — unchanged behavior for any cohort that
 * hasn't had its schedule configured yet.
 */
export function generateCohortIcs(cohort: Cohort): string {
  const hasSchedule = Boolean(cohort.weekly_schedule && cohort.weekly_schedule.length > 0);
  const timezone = getCohortTimezone(cohort);

  let events: IcsEvent[];

  if (hasSchedule) {
    const startDate = new Date(`${cohort.starts_on}T00:00:00Z`);
    const untilDate = new Date(startDate);
    untilDate.setUTCDate(untilDate.getUTCDate() + cohort.duration_weeks * 7);
    untilDate.setUTCHours(23, 59, 59, 0);

    events = cohort
      .weekly_schedule!.map((entry) => buildRecurringEvent(cohort, entry, untilDate, timezone))
      .filter((e): e is IcsEvent => e !== null);

    // Every entry was malformed (shouldn't happen given server-side
    // validation on save, but never silently produce an empty/invalid
    // calendar) — fall back to the all-day event instead.
    if (events.length === 0) {
      events = [buildFallbackEvent(cohort)];
    }
  } else {
    events = [buildFallbackEvent(cohort)];
  }

  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Elora Tech Institute//Cohort Platform//EN",
    "CALSCALE:GREGORIAN",
    ...events.map(eventToIcs),
    "END:VCALENDAR",
  ].join("\r\n");

  return body;
}

function buildFallbackEvent(cohort: Cohort): IcsEvent {
  return {
    uid: `cohort-${cohort.id}-start@eloratechinstitute.com`,
    summary: `${cohort.name} Begins — Elora Tech Institute`,
    description:
      cohort.weekly_schedule && cohort.weekly_schedule.length > 0
        ? "Weekly schedule: " + formatWeeklySchedule(cohort.weekly_schedule).join(", ")
        : "Weekly class days and times will be shared soon — keep an eye on your email.",
    start: cohort.starts_on,
    allDay: true,
  };
}
