/**
 * Time helpers for the resident app.
 *
 * Pickup and handoff times from the API are the building's wall-clock time
 * with no offset ("2026-11-25T14:00:00"). They are shown exactly as written:
 * parsed field by field into a local Date and formatted, never shifted.
 * Only `arrived_at` is a real UTC instant; `formatArrived` (common) handles it.
 */

const WALL_CLOCK = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/;

/** "2026-11-25T14:00[:00]" or "2026-11-25" → a Date showing the same wall-clock fields. */
export function parseWallClock(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = WALL_CLOCK.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour ?? 0), Number(minute ?? 0), Number(second ?? 0));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Milliseconds for comparisons between wall-clock values (0 when unreadable). */
export function wallClockMs(value: string | null | undefined): number {
  return parseWallClock(value)?.getTime() ?? 0;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** A Date's calendar day as "YYYY-MM-DD". */
export function isoDay(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The calendar day `count` days after `day` ("YYYY-MM-DD"). */
export function addDays(day: string, count: number): string {
  const date = parseWallClock(day);
  if (!date) return day;
  date.setDate(date.getDate() + count);
  return isoDay(date);
}

/** Time of day in the viewer's own 12-hour or 24-hour format ("2:00 PM" or "14:00"). */
export function formatTime(value: string | null | undefined): string {
  const date = parseWallClock(value);
  return date ? date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "";
}

/** "2:00 PM – 2:30 PM". */
export function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/** "Thu, Nov 26". */
export function formatDay(value: string | null | undefined): string {
  const date = parseWallClock(value);
  return date ? date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) : "";
}

/** "Thursday, November 26". */
export function formatDayLong(value: string | null | undefined): string {
  const date = parseWallClock(value);
  return date ? date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : "";
}

/** "Today", "Tomorrow" or "Thu, Nov 26", relative to the building's `today`. */
export function formatRelativeDay(value: string, today: string): string {
  const day = value.slice(0, 10);
  if (day === today) return "Today";
  if (day === addDays(today, 1)) return "Tomorrow";
  return formatDay(day);
}

/** "Thu, Nov 26, 2:00 PM". */
export function formatDateTime(value: string | null | undefined): string {
  const date = parseWallClock(value);
  return date ? `${formatDay(value)}, ${formatTime(value)}` : "";
}

/** For sentences: "at 6:30 PM" when it is today, otherwise "on Thu, Nov 26 at 6:30 PM". */
export function formatWhen(value: string, today: string): string {
  return value.slice(0, 10) === today ? `at ${formatTime(value)}` : `on ${formatDay(value)} at ${formatTime(value)}`;
}

export type DayPeriod = "Morning" | "Afternoon" | "Evening";

/** Which part of the day a wall-clock time falls in (for grouping slots). */
export function dayPeriod(value: string): DayPeriod {
  const hour = parseWallClock(value)?.getHours() ?? 0;
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}
