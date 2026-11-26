/**
 * Pure rules for the resident app: where a booking stands, what the resident
 * should do next, and which receipts to show. No React, no API calls.
 */
import type { PickupAppointment } from "@/api/appointmentsApi";
import type { PackageRecord } from "@/api/packagesApi";
import { wallClockMs } from "./time";

/**
 * Where an upcoming booking stands for the resident.
 *   booked       package not prepared yet; can still be moved or cancelled
 *   ready_early  prepared, check-in has not opened
 *   ready_open   prepared, check-in is open now
 *   ready_missed prepared, the pickup window has ended
 *   checked_in   resident checked in; the desk is completing the handoff
 */
export type BookingPhase = "booked" | "ready_early" | "ready_open" | "ready_missed" | "checked_in";

/** `now` is the building's wall-clock time in ms (see useResidentData). */
export function bookingPhase(appointment: PickupAppointment, now: number): BookingPhase {
  if (appointment.package_status !== "prepared") return "booked";
  if (appointment.checked_in_at) return "checked_in";
  // Check-in opens a little before the window (the API decides when).
  const opens = wallClockMs(appointment.check_in_opens_at ?? appointment.pickup_start);
  const end = wallClockMs(appointment.pickup_end);
  if (now < opens) return "ready_early";
  if (now <= end) return "ready_open";
  return "ready_missed";
}

/** The one thing Home leads with. Ordered from most to least urgent. */
export type NextStep =
  | { kind: "check_in"; appointment: PickupAppointment }
  | { kind: "checked_in"; appointment: PickupAppointment }
  | { kind: "book"; packages: PackageRecord[] }
  | { kind: "ready_early"; appointment: PickupAppointment }
  | { kind: "ready_missed"; appointment: PickupAppointment }
  | { kind: "booked"; appointment: PickupAppointment }
  | { kind: "received"; packages: PackageRecord[] }
  | { kind: "none" };

export function nextStep(packages: PackageRecord[], upcoming: PickupAppointment[], now: number): NextStep {
  const byStart = [...upcoming].sort((a, b) => wallClockMs(a.pickup_start) - wallClockMs(b.pickup_start));
  const inPhase = (phase: BookingPhase) => byStart.find((a) => bookingPhase(a, now) === phase);

  const open = inPhase("ready_open");
  if (open) return { kind: "check_in", appointment: open };
  const checkedIn = inPhase("checked_in");
  if (checkedIn) return { kind: "checked_in", appointment: checkedIn };
  const available = packages.filter((p) => p.status === "available");
  if (available.length > 0) return { kind: "book", packages: available };
  const early = inPhase("ready_early");
  if (early) return { kind: "ready_early", appointment: early };
  const missed = inPhase("ready_missed");
  if (missed) return { kind: "ready_missed", appointment: missed };
  const booked = inPhase("booked");
  if (booked) return { kind: "booked", appointment: booked };
  const received = packages.filter((p) => p.status === "received");
  if (received.length > 0) return { kind: "received", packages: received };
  return { kind: "none" };
}

/** A completed pickup shown as a receipt on the Pickups tab. */
export interface PickupReceipt {
  key: string;
  carrierName: string;
  trackingCode: string;
  description: string;
  /** Building wall-clock time the desk completed the handoff; null when it was not recorded. */
  pickedUpAt: string | null;
  checkedInAt: string | null;
  recipientName: string | null;
  /** UTC instant the package arrived (only set when there is no pickup time to show). */
  arrivedAt: string | null;
}

/**
 * Receipts, newest first: one per completed appointment (using `handed_off_at`),
 * plus any picked-up package that has no completed appointment on record.
 */
export function buildReceipts(packages: PackageRecord[], appointments: PickupAppointment[]): PickupReceipt[] {
  const byPackage = new Map(packages.map((p) => [p.id, p]));
  const fromAppointments = appointments
    .filter((a) => a.status === "completed")
    .map((a) => {
      // The moment staff completed the handoff; the booked slot is the fallback.
      const pickedUpAt = a.handed_off_at ?? a.pickup_start;
      return {
        packageId: a.package_id,
        sortKey: wallClockMs(pickedUpAt),
        receipt: {
          key: `appt-${a.id}`,
          carrierName: a.carrier_name || byPackage.get(a.package_id)?.carrier_name || "Package",
          trackingCode: a.tracking_code || byPackage.get(a.package_id)?.tracking_code || "—",
          description: byPackage.get(a.package_id)?.description || "",
          pickedUpAt,
          checkedInAt: a.checked_in_at ?? null,
          recipientName: a.recipient_name ?? null,
          arrivedAt: null,
        } satisfies PickupReceipt,
      };
    });
  const covered = new Set(fromAppointments.map((r) => r.packageId));
  const fromPackages = packages
    .filter((p) => p.status === "picked_up" && !covered.has(p.id))
    .map((p) => ({
      packageId: p.id,
      sortKey: p.arrived_at ? new Date(p.arrived_at).getTime() || 0 : 0,
      receipt: {
        key: `pkg-${p.id}`,
        carrierName: p.carrier_name,
        trackingCode: p.tracking_code,
        description: p.description || "",
        pickedUpAt: null,
        checkedInAt: null,
        recipientName: null,
        arrivedAt: p.arrived_at || null,
      } satisfies PickupReceipt,
    }));
  return [...fromAppointments, ...fromPackages].sort((a, b) => b.sortKey - a.sortKey).map((r) => r.receipt);
}
