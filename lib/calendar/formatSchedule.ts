import type { WeeklyScheduleEntry } from "@/lib/supabase/types";

const DAY_ABBREVIATIONS: Record<string, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
  Sunday: "Sun",
};

/** "18:00" -> "6:00 PM" */
export function formatTime12h(time24: string): string {
  const [hourStr, minuteStr] = time24.split(":");
  const hour = parseInt(hourStr ?? "0", 10);
  const minute = minuteStr ?? "00";
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minute} ${period}`;
}

/**
 * Groups schedule entries that share the same start/end time into one
 * line ("Mon & Wed · 6:00 PM–8:00 PM"), keeps entries with a different
 * time on their own line. Returns one string per distinct time-group,
 * in schedule order.
 */
export function formatWeeklySchedule(entries: WeeklyScheduleEntry[]): string[] {
  const groups = new Map<string, string[]>();
  const order: string[] = [];

  for (const entry of entries) {
    const timeKey = `${entry.start_time}-${entry.end_time}`;
    if (!groups.has(timeKey)) {
      groups.set(timeKey, []);
      order.push(timeKey);
    }
    groups.get(timeKey)!.push(DAY_ABBREVIATIONS[entry.day] ?? entry.day);
  }

  return order.map((timeKey) => {
    const [start, end] = timeKey.split("-");
    const days = groups.get(timeKey)!.join(" & ");
    return `${days} · ${formatTime12h(start ?? "")}–${formatTime12h(end ?? "")}`;
  });
}
