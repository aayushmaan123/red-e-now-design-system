import { describe, expect, it } from "vitest";
import type { PackageAuditEntry } from "@/api/packagesApi";
import type { PickupAppointment } from "@/api/appointmentsApi";
import { describeAudit } from "@/components/dashboard/staff/audit";

const entry = (
  partial: Partial<PackageAuditEntry> & Pick<PackageAuditEntry, "id" | "action">,
): PackageAuditEntry => ({
  package_id: 1,
  changed_at: "2026-11-25T19:00:00+00:00",
  changed_by: 1,
  changed_by_name: "Front Desk",
  old_values: null,
  new_values: {},
  ...partial,
});

describe("describeAudit", () => {
  it("never surfaces internal id fields in titles or details", () => {
    const lines = describeAudit([
      entry({
        id: 1,
        action: "status_changed",
        new_values: { status: "scheduled", appointment_id: 42 },
      }),
    ], [{
      id: 42,
      pickup_start: "2026-11-26T10:00:00",
      pickup_end: "2026-11-26T10:30:00",
    } as PickupAppointment]);

    expect(lines[0]?.title).toMatch(/Booked for/);
    expect(JSON.stringify(lines[0])).not.toMatch(/appointment_id/);
  });

  it("describes registration with shelf location", () => {
    const lines = describeAudit([
      entry({ id: 1, action: "created", new_values: { location_code: "A-12" } }),
    ]);
    expect(lines[0]?.title).toBe("Registered");
    expect(lines[0]?.detail).toBe("Stored at A-12");
  });

  it("marks pickup complete with success tone", () => {
    const lines = describeAudit([
      entry({ id: 1, action: "status_changed", new_values: { status: "picked_up" } }),
    ]);
    expect(lines[0]?.title).toBe("Picked up");
    expect(lines[0]?.tone).toBe("success");
  });
});