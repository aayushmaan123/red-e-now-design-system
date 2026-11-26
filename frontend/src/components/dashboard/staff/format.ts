/**
 * Time and name formatting for the staff console.
 *
 * The API sends two kinds of timestamps:
 *   - wall-clock values on the building's clock with no offset ("2026-11-25T14:00:00"):
 *     pickup_start, pickup_end, checked_in_at, identity_verified_at, acknowledged_at,
 *     handed_off_at, check_in_opens_at. They are shown exactly as written.
 *   - instants with an offset ("2026-11-25T19:54:19+00:00"): arrived_at, created_at and
 *     audit changed_at. They are shown in the viewer's own time zone.
 * Nothing here adds or subtracts hours; the kind is read from the string itself.
 */

const HAS_OFFSET = /T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/i;
const WALL_CLOCK = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/;

type Parsed = { date: Date; asWritten: boolean };

function parse(value: string | null | undefined): Parsed | null {
  if (!value) return null;
  if (HAS_OFFSET.test(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : { date, asWritten: false };
  }
  const m = WALL_CLOCK.exec(value);
  if (!m) return null;
  // Hold the written digits in UTC and print them in UTC, so no zone or DST rule can move them.
  const date = new Date(Date.UTC(
    Number(m[1]), Number(m[2]) - 1, Number(m[3]),
    Number(m[4] ?? 0), Number(m[5] ?? 0), Number(m[6] ?? 0),
  ));
  return Number.isNaN(date.getTime()) ? null : { date, asWritten: true };
}

function format(value: string | null | undefined, options: Intl.DateTimeFormatOptions): string {
  const parsed = parse(value);
  if (!parsed) return "—";
  return parsed.date.toLocaleString(undefined, {
    ...options,
    ...(parsed.asWritten ? { timeZone: "UTC" } : {}),
  });
}

/** "2:00 PM" */
export const formatTime = (value: string | null | undefined) =>
  format(value, { hour: "numeric", minute: "2-digit" });

/** "Wed, Nov 25" */
export const formatDay = (value: string | null | undefined) =>
  format(value, { weekday: "short", month: "short", day: "numeric" });

/** "Nov 25, 2:00 PM" */
export const formatDateTime = (value: string | null | undefined) =>
  format(value, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/** "Wed, Nov 25, 2:00 PM" */
export const formatDayTime = (value: string | null | undefined) =>
  format(value, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/** "2:00 PM – 2:30 PM" */
export const formatTimeRange = (start: string | null | undefined, end: string | null | undefined) =>
  end ? `${formatTime(start)} – ${formatTime(end)}` : formatTime(start);

/** "YYYY-MM-DD" for the day a timestamp falls on (as written, or in the viewer's zone for instants). */
export function dayKey(value: string | null | undefined): string {
  const parsed = parse(value);
  if (!parsed) return "";
  if (parsed.asWritten) return parsed.date.toISOString().slice(0, 10);
  return parsed.date.toLocaleDateString("en-CA");
}

/** The day key that follows `key` on the calendar. */
export function nextDayKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

/** "Today", "Tomorrow", or "Thu, Nov 26" for a day key, relative to the staff view's today. */
export function dayLabel(key: string, todayKey: string): string {
  if (key === todayKey) return "Today";
  if (key === nextDayKey(todayKey)) return "Tomorrow";
  return formatDay(key);
}

export const formatDuration = (ms: number) => {
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  return `${h}h ${mins % 60}m`;
};

export const plural = (count: number, one: string, many = `${one}s`) =>
  `${count} ${count === 1 ? one : many}`;

/* ── Greeting ── */

/** Words that name a desk or a role, not a person ("Front Desk", "Staff", "Building Manager"). */
const ROLE_WORDS = new Set([
  "front", "desk", "staff", "admin", "administrator", "building", "property", "manager",
  "management", "concierge", "reception", "receptionist", "office", "team", "security",
  "lobby", "leasing", "main", "the", "night", "day", "evening", "morning", "mail", "mailroom",
  "package", "packages", "support", "service", "services", "operations", "ops", "user",
  "test", "demo", "account",
]);
const HONORIFIC = /^(mr|mrs|ms|mx|dr|prof)\.?$/i;

/**
 * The name to greet a staff member by, or null when no part of it reads well.
 * "Maria Alvarez" → "Maria"; "Dr. Maria Alvarez" → "Dr. Alvarez";
 * "Front Desk" → "Front Desk" (a title is used whole, never cut to "Front");
 * "Staff", "staff@redenow.com", "" → null.
 */
export function greetingName(name: string | null | undefined): string | null {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const first = words[0];
  if (!first) return null;
  if (/[@\d]/.test(first)) return null;
  if (HONORIFIC.test(first)) {
    const last = words[words.length - 1];
    return words.length > 1 && last ? `${first} ${last}` : null;
  }
  if (ROLE_WORDS.has(first.toLowerCase().replace(/[^a-z]/g, ""))) {
    return words.length >= 2 && words.length <= 3 ? words.join(" ") : null;
  }
  return first;
}

export function greeting(name: string | null | undefined): string {
  const who = greetingName(name);
  return who ? `Welcome back, ${who}` : "Welcome back";
}
