import "server-only";
import type { Cohort } from "@/lib/supabase/types";

interface IcsEvent {
  uid: string;
  summary: string;
  description?: string;
  /** "YYYY-MM-DD" for an all-day event, or a full ISO datetime for a timed one. */
  start: string;
  /** Only used for timed events. */
  end?: string;
  allDay?: boolean;
}

function formatDate(dateStr: string): string {
  return dateStr.replace(/-/g, "");
}

function formatDateTime(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function eventToIcs(event: IcsEvent): string {
  const lines = ["BEGIN:VEVENT", `UID:${event.uid}`, `DTSTAMP:${formatDateTime(new Date().toISOString())}`];

  if (event.allDay || !event.end) {
    lines.push(`DTSTART;VALUE=DATE:${formatDate(event.start)}`);
  } else {
    lines.push(`DTSTART:${formatDateTime(event.start)}`, `DTEND:${formatDateTime(event.end)}`);
  }

  lines.push(`SUMMARY:${escapeIcsText(event.summary)}`);
  if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

/**
 * Builds an ICS calendar for a cohort. Currently just the start-date
 * event (all-day, since exact weekly class times aren't set yet).
 * Once `cohort.weekly_schedule` is populated, or assignment deadlines
 * / graduation dates exist, add more IcsEvent entries here — the
 * output format already supports timed, recurring-adjacent events.
 */
export function generateCohortIcs(cohort: Cohort): string {
  const events: IcsEvent[] = [
    {
      uid: `cohort-${cohort.id}-start@eloratechinstitute.com`,
      summary: `${cohort.name} Begins — Elora Tech Institute`,
      description: cohort.weekly_schedule?.length
        ? "Weekly schedule: " + cohort.weekly_schedule.map((s) => `${s.day} ${s.start_time}-${s.end_time}`).join(", ")
        : "Weekly class days and times will be shared soon — keep an eye on your email.",
      start: cohort.starts_on,
      allDay: true,
    },
  ];

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
