/**
 * StaffTypes — shared types, constants and helpers for the staff dashboard.
 */
import type { PickupAppointment } from "@/api/appointmentsApi";
import type { LucideIcon } from "lucide-react";
import {
  House, PackagePlus, Package, ClipboardList, Handshake, Clock3,
  CalendarDays, UsersRound, History, UserRound,
} from "lucide-react";
import type { PackageRecord, PackageStatus } from "@/api/packagesApi";

/* ── Handoff workflow ── */

export type HandoffStage =
  | "Not checked in"
  | "Waiting"
  | "Identity verified"
  | "Signed off"
  | "Completed";

export function handoffStage(appointment: PickupAppointment): HandoffStage {
  if (appointment.status === "completed") return "Completed";
  if (appointment.recipient_name) return "Signed off";
  if (appointment.identity_verified_at) return "Identity verified";
  if (appointment.checked_in_at) return "Waiting";
  return "Not checked in";
}

export const HANDOFF_TONES: Record<HandoffStage, string> = {
  "Not checked in": "bg-muted/60 text-muted-foreground",
  Waiting: "bg-warning/15 text-warning border border-warning/20",
  "Identity verified": "bg-info/15 text-info border border-info/20",
  "Signed off": "bg-prepared/15 text-prepared border border-prepared/20",
  Completed: "bg-success/15 text-success border border-success/20",
};

export const isFlagged = (flag: boolean | number | undefined) =>
  flag === true || flag === 1;

/* ── Badge components (re-exported from StaffBadges.tsx) ── */
// These are defined in StaffBadges.tsx for JSX, but re-exported here
// for convenience. Import from StaffTypes for the types and helpers,
// import HandoffBadge/ExceptionBadge from StaffBadges for JSX.

/* ── Time formatting ── */

export const formatTime = (iso: string | null | undefined) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

export const formatDuration = (ms: number) => {
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  return `${h}h ${mins % 60}m`;
};

/* ── Pickup urgency ── */

export function pickupUrgency(
  appointment: PickupAppointment,
  now: number,
): { label: string; tone: string } {
  const start = new Date(appointment.pickup_start).getTime();
  const end = new Date(appointment.pickup_end).getTime();
  const diff = start - now;

  if (now > end) return { label: "Overdue", tone: "bg-destructive/15 text-destructive" };
  if (now >= start) return { label: "Now", tone: "bg-primary/15 text-primary" };
  if (diff <= 30 * 60_000) return { label: `In ${formatDuration(diff)}`, tone: "bg-warning/15 text-warning" };
  if (diff <= 2 * 60 * 60_000) return { label: `In ${formatDuration(diff)}`, tone: "bg-info/15 text-info" };
  return { label: formatTime(appointment.pickup_start), tone: "bg-muted/60 text-muted-foreground" };
}

/* ── Receipt ── */

export interface HandoffReceipt {
  residentName: string;
  unit: string;
  carrier: string;
  tracking: string;
  location: string;
  recipientName: string;
  completedAt: string;
  completedBy: string;
}

export function toReceipt(
  appointment: PickupAppointment,
  completedAt: string | null,
  completedBy: string | null,
): HandoffReceipt {
  return {
    residentName: appointment.resident_name || "Unknown",
    unit: appointment.resident_unit || "—",
    carrier: appointment.carrier_name || "—",
    tracking: appointment.tracking_code || "—",
    location: appointment.location_code || "—",
    recipientName: appointment.recipient_name || appointment.resident_name || "—",
    completedAt: completedAt || "—",
    completedBy: completedBy || "Staff",
  };
}

/* ── Sidebar nav items ── */

export interface NavItem {
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: House },
  { label: "Register Package", icon: PackagePlus },
  { label: "Packages", icon: Package },
  { label: "Today's Pickups", icon: ClipboardList },
  { label: "Preparation Queue", icon: Clock3 },
  { label: "Handoff", icon: Handshake },
  { label: "Pickup Settings", icon: Clock3 },
  { label: "Upcoming", icon: CalendarDays },
  { label: "Residents", icon: UsersRound },
  { label: "History", icon: History },
  { label: "Account", icon: UserRound },
];

/* ── Stat card definitions ── */

export interface StatDef {
  label: string;
  icon: LucideIcon;
  filter: (p: PackageRecord) => boolean;
}

export const STAT_DEFS: StatDef[] = [
  { label: "Waiting Packages", icon: Package, filter: (p) => p.status === "received" || p.status === "available" },
  { label: "Today's Pickups", icon: ClipboardList, filter: () => false },
  { label: "Prepared", icon: Clock3, filter: (p) => p.status === "prepared" },
  { label: "Completed Today", icon: History, filter: () => false },
];

/* ── Package table columns ── */

export const PKG_COLUMNS = [
  { key: "carrier_name", header: "Carrier" },
  { key: "tracking_code", header: "Tracking" },
  { key: "resident_name", header: "Resident" },
  { key: "status", header: "Status", render: "status" as const },
  { key: "arrived_at", header: "Arrived" },
];
