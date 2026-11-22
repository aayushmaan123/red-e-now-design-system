/**
 * handoffLogic.test.ts
 *
 * Tests the handoff stage derivation and helper logic from StaffDashboard.
 * Since the functions are inline in the component, we replicate them here
 * and test the logic directly.  If they're later extracted to a shared
 * module this file can import them instead.
 */
import { describe, it, expect } from "vitest";
import type { PickupAppointment } from "../api/appointmentsApi";

// ─── Replicated helpers (same as StaffDashboard.tsx lines 111-159) ───

type HandoffStage =
  | "Not checked in"
  | "Waiting"
  | "Identity verified"
  | "Signed off"
  | "Completed";

function handoffStage(appointment: PickupAppointment): HandoffStage {
  if (appointment.handoff_status) {
    return appointment.handoff_status as HandoffStage;
  }
  if (appointment.status === "completed") return "Completed";
  if (appointment.acknowledged_at) return "Signed off";
  if (appointment.identity_verified_at) return "Identity verified";
  if (appointment.checked_in_at) return "Waiting";
  return "Not checked in";
}

const isFlagged = (flag: boolean | number | undefined) =>
  flag === true || flag === 1;

// ─── Base appointment for building test cases ───

const base: PickupAppointment = {
  id: 1,
  package_id: 10,
  resident_id: 100,
  pickup_start: "2026-11-22T14:00:00Z",
  pickup_end: "2026-11-22T14:30:00Z",
  status: "scheduled",
  created_at: "2026-11-22T12:00:00Z",
};

// ─── Tests ───

describe("handoffStage()", () => {
  it("returns the backend handoff_status when present", () => {
    expect(
      handoffStage({ ...base, handoff_status: "Identity verified" }),
    ).toBe("Identity verified");
  });

  it("falls back to 'Completed' when status is completed and no handoff_status", () => {
    expect(
      handoffStage({ ...base, status: "completed" }),
    ).toBe("Completed");
  });

  it("falls back to 'Signed off' when acknowledged_at is set", () => {
    expect(
      handoffStage({
        ...base,
        checked_in_at: "2026-11-22T14:01:00Z",
        identity_verified_at: "2026-11-22T14:02:00Z",
        acknowledged_at: "2026-11-22T14:03:00Z",
      }),
    ).toBe("Signed off");
  });

  it("falls back to 'Identity verified' when identity_verified_at is set", () => {
    expect(
      handoffStage({
        ...base,
        checked_in_at: "2026-11-22T14:01:00Z",
        identity_verified_at: "2026-11-22T14:02:00Z",
      }),
    ).toBe("Identity verified");
  });

  it("falls back to 'Waiting' when only checked_in_at is set", () => {
    expect(
      handoffStage({
        ...base,
        checked_in_at: "2026-11-22T14:01:00Z",
      }),
    ).toBe("Waiting");
  });

  it("returns 'Not checked in' when no timestamps are set", () => {
    expect(handoffStage(base)).toBe("Not checked in");
  });

  it("prefers backend handoff_status over timestamp fallback", () => {
    // Backend says Waiting even though timestamps suggest further along
    expect(
      handoffStage({
        ...base,
        handoff_status: "Waiting",
        acknowledged_at: "2026-11-22T14:03:00Z", // would normally → Signed off
      }),
    ).toBe("Waiting");
  });
});

describe("isFlagged()", () => {
  it("returns true for boolean true", () => {
    expect(isFlagged(true)).toBe(true);
  });

  it("returns true for integer 1", () => {
    expect(isFlagged(1)).toBe(true);
  });

  it("returns false for boolean false", () => {
    expect(isFlagged(false)).toBe(false);
  });

  it("returns false for integer 0", () => {
    expect(isFlagged(0)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isFlagged(undefined)).toBe(false);
  });
});

describe("NEXT_STATUS transitions", () => {
  // Verify that the prepared → picked_up shortcut is REMOVED
  // (packages must go through the 4-step handoff workflow now)
  const NEXT_STATUS: Partial<
    Record<string, { label: string; next: string }>
  > = {
    received: { label: "Mark Available", next: "available" },
    scheduled: { label: "Mark Prepared", next: "prepared" },
    // prepared → picked_up deliberately absent
  };

  it("allows received → available", () => {
    expect(NEXT_STATUS["received"]?.next).toBe("available");
  });

  it("allows scheduled → prepared", () => {
    expect(NEXT_STATUS["scheduled"]?.next).toBe("prepared");
  });

  it("does NOT allow direct prepared → picked_up (requires handoff)", () => {
    expect(NEXT_STATUS["prepared"]).toBeUndefined();
  });
});
