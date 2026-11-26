/**
 * Turns raw package audit entries into a readable timeline.
 *
 * The API stores each change as an action plus `old_values` / `new_values` objects.
 * Staff should read "Booked for Thu, Nov 26, 10:00 AM", not "appointment id: 12", so the
 * wording is derived here and internal ids and flags are never shown.
 */
import type { PackageAuditEntry } from "@/api/packagesApi";
import type { PickupAppointment } from "@/api/appointmentsApi";
import { formatDayTime } from "./format";

export type AuditTone = "default" | "success" | "alert";

export interface AuditLine {
  id: number;
  /** What happened, e.g. "Released for pickup". */
  title: string;
  /** Optional second line with the human details of the change. */
  detail?: string;
  /** Who did it. */
  who: string;
  /** When it was recorded (UTC instant from the API). */
  at: string;
  tone: AuditTone;
}

type Values = Record<string, unknown>;

const text = (value: unknown): string =>
  typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";

const truthy = (value: unknown) => value === true || value === 1 || value === "1";

/** Package fields staff can edit, with the label shown in the timeline. */
const EDITABLE_FIELDS: [key: string, label: string][] = [
  ["carrier_name", "Carrier"],
  ["tracking_code", "Tracking code"],
  ["location_code", "Storage location"],
  ["description", "Description"],
];

/** Free-text fields an exception entry may carry. */
const NOTE_FIELDS = ["exception_reason", "reason", "exception_type", "exception_note", "resolution_note", "resolution", "note"];

function notes(values: Values): string | undefined {
  const found = NOTE_FIELDS.map((key) => text(values[key])).filter(Boolean);
  return found.length ? [...new Set(found)].join(" · ") : undefined;
}

function editSummary(old: Values, next: Values): string | undefined {
  const parts: string[] = [];
  for (const [key, label] of EDITABLE_FIELDS) {
    if (!(key in next)) continue;
    const before = text(old[key]);
    const after = text(next[key]);
    if (before === after) continue;
    if (before && after) parts.push(`${label}: ${before} → ${after}`);
    else if (after) parts.push(`${label}: ${after}`);
    else parts.push(`${label} removed`);
  }
  return parts.length ? parts.join(" · ") : undefined;
}

/**
 * The time a booking entry was made for. A later reschedule of the same appointment
 * records the time it moved away from; otherwise the appointment still holds it.
 */
function bookedFor(
  entry: PackageAuditEntry,
  entries: PackageAuditEntry[],
  appointments: PickupAppointment[],
): string | undefined {
  const appointmentId = entry.new_values?.["appointment_id"];
  if (appointmentId == null) return undefined;
  const firstMove = entries
    .filter((e) =>
      e.id > entry.id &&
      e.new_values?.["appointment_id"] === appointmentId &&
      text(e.old_values?.["pickup_start"]) &&
      text(e.new_values?.["pickup_start"]))
    .sort((a, b) => a.id - b.id)[0];
  if (firstMove) return text(firstMove.old_values?.["pickup_start"]);
  return appointments.find((a) => a.id === appointmentId)?.pickup_start;
}

function describe(
  entry: PackageAuditEntry,
  entries: PackageAuditEntry[],
  appointments: PickupAppointment[],
): Pick<AuditLine, "title" | "detail" | "tone"> {
  const old: Values = entry.old_values ?? {};
  const next: Values = entry.new_values ?? {};
  const line = (title: string, detail?: string, tone: AuditTone = "default") =>
    ({ title, tone, ...(detail ? { detail } : {}) });

  if (entry.action === "created") {
    const where = text(next["location_code"]);
    return line("Registered", where ? `Stored at ${where}` : undefined);
  }

  if (entry.action === "signed_off") {
    const recipient = text(next["recipient_name"]);
    const note = text(next["signoff_note"]) || text(next["note"]);
    return line(recipient ? `Signed for by ${recipient}` : "Signed for", note || undefined);
  }

  if (entry.action === "exception_flagged") return line("Exception flagged", notes(next), "alert");
  if (entry.action === "exception_resolved") return line("Exception resolved", notes(next));

  // "status_changed" and "updated" are told apart by what actually changed.
  const status = text(next["status"]);
  const previous = text(old["status"]);

  const movedFrom = text(old["pickup_start"]);
  const movedTo = text(next["pickup_start"]);
  if (movedTo && movedFrom && movedTo !== movedFrom) {
    return line(`Pickup moved to ${formatDayTime(movedTo)}`, `Was ${formatDayTime(movedFrom)}`);
  }

  if (status === "picked_up") return line("Picked up", undefined, "success");

  if (status === "scheduled" && previous !== "prepared") {
    const when = bookedFor(entry, entries, appointments);
    return line(when ? `Booked for ${formatDayTime(when)}` : "Pickup booked");
  }

  if (status === "available") {
    if ("cancelled_appointment_id" in next || previous === "scheduled" || previous === "prepared") {
      const cancelled = appointments.find((a) => a.id === next["cancelled_appointment_id"]);
      return line(
        "Pickup cancelled",
        cancelled ? `Was ${formatDayTime(cancelled.pickup_start)}` : undefined,
      );
    }
    return line("Released for pickup");
  }

  if (status === "prepared") return line("Prepared");
  if (status === "scheduled") return line("Returned to the preparation queue");
  if (status === "received") return line("Marked as received");

  if (text(next["checked_in_at"])) return line("Resident checked in");
  if (text(next["identity_verified_at"])) return line("Identity verified");

  if ("has_exception" in next && truthy(next["has_exception"]) !== truthy(old["has_exception"])) {
    return truthy(next["has_exception"])
      ? line("Exception flagged", notes(next), "alert")
      : line("Exception resolved", notes(next));
  }

  const edits = editSummary(old, next);
  if (edits) return line("Details updated", edits);

  return line("Updated");
}

export function describeAudit(
  entries: PackageAuditEntry[],
  appointments: PickupAppointment[] = [],
): AuditLine[] {
  return entries.map((entry) => ({
    id: entry.id,
    who: entry.changed_by_name?.trim() || "Staff",
    at: entry.changed_at,
    ...describe(entry, entries, appointments),
  }));
}
