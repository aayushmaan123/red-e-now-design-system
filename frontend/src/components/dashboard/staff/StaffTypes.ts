/**
 * StaffTypes — shared types, constants and helpers for the staff console.
 */
import type { PickupAppointment } from "@/api/appointmentsApi";
import type { LucideIcon } from "lucide-react";
import {
  House, PackagePlus, Package, ClipboardList, Handshake, PackageCheck,
  CalendarDays, UsersRound, History, UserRound, SlidersHorizontal,
} from "lucide-react";
import type { BadgeTone } from "@/components/common";
import { formatDuration, formatTime } from "./format";

export { formatDuration, formatTime };

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

/** Badge tone per handoff stage (tones pair a tint with text that passes contrast in every theme). */
export const HANDOFF_TONES: Record<HandoffStage, BadgeTone> = {
  "Not checked in": "neutral",
  Waiting: "warning",
  "Identity verified": "info",
  "Signed off": "prepared",
  Completed: "success",
};

export const isFlagged = (flag: boolean | number | undefined) =>
  flag === true || flag === 1;

/* ── Pickup urgency ── */

export function pickupUrgency(
  appointment: PickupAppointment,
  now: number,
): { label: string; tone: BadgeTone } {
  const start = new Date(appointment.pickup_start).getTime();
  const end = new Date(appointment.pickup_end).getTime();
  const diff = start - now;

  if (now > end) return { label: "Overdue", tone: "alert" };
  if (now >= start) return { label: "Now", tone: "prepared" };
  if (diff <= 30 * 60_000) return { label: `In ${formatDuration(diff)}`, tone: "warning" };
  if (diff <= 2 * 60 * 60_000) return { label: `In ${formatDuration(diff)}`, tone: "info" };
  return { label: formatTime(appointment.pickup_start), tone: "neutral" };
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

/* ── Sections ── */

/**
 * Section names double as navigation button names and as the `section` state.
 * The end-to-end test finds the buttons by these exact names; do not reword them.
 */
export type SectionName =
  | "Dashboard"
  | "Register Package"
  | "Packages"
  | "Today's Pickups"
  | "Preparation Queue"
  | "Handoff"
  | "Pickup Settings"
  | "Upcoming"
  | "Residents"
  | "History"
  | "Account";

export interface NavItem {
  label: SectionName;
  /** Sentence-case page heading and breadcrumb for the section. */
  title: string;
  icon: LucideIcon;
  /** Extra words the command menu matches on. */
  keywords: string;
}

export interface NavGroup {
  heading: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    heading: "Front desk",
    items: [
      { label: "Dashboard", title: "Dashboard", icon: House, keywords: "home overview" },
      { label: "Register Package", title: "Register package", icon: PackagePlus, keywords: "add new log arrival delivery" },
      { label: "Packages", title: "Packages", icon: Package, keywords: "parcels list search tracking" },
    ],
  },
  {
    heading: "Pickups",
    items: [
      { label: "Today's Pickups", title: "Today's pickups", icon: ClipboardList, keywords: "schedule appointments queue" },
      { label: "Preparation Queue", title: "Preparation queue", icon: PackageCheck, keywords: "prep pull prepare" },
      { label: "Handoff", title: "Handoff", icon: Handshake, keywords: "desk check in verify sign complete" },
      { label: "Upcoming", title: "Upcoming", icon: CalendarDays, keywords: "future scheduled tomorrow" },
      { label: "History", title: "History", icon: History, keywords: "completed receipts past" },
    ],
  },
  {
    heading: "Building",
    items: [
      { label: "Residents", title: "Residents", icon: UsersRound, keywords: "people units directory reset password" },
      { label: "Pickup Settings", title: "Pickup settings", icon: SlidersHorizontal, keywords: "hours capacity slots scheduling" },
      { label: "Account", title: "Account", icon: UserRound, keywords: "profile theme appearance log out sign out" },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

/** Sentence-case title for a section name ("Today's Pickups" → "Today's pickups"). */
export const sectionTitle = (section: string) =>
  NAV_ITEMS.find((item) => item.label === section)?.title ?? section;
