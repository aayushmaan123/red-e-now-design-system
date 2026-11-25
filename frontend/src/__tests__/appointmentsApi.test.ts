/**
 * appointmentsApi.test.ts
 *
 * Unit tests for the appointments API layer.
 * Verifies the PickupAppointment interface includes all Sprint 4 handoff fields
 * and that CRUD functions call the correct endpoints.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../api/client", () => ({
  api: vi.fn(),
}));

import { api } from "../api/client";
import {
  getAppointments,
  createAppointment,
  cancelAppointment,
  rescheduleAppointment,
  type PickupAppointment,
} from "../api/appointmentsApi";

const mockApi = vi.mocked(api);

// A complete appointment object with ALL Sprint 4 handoff fields
const fullAppointment: PickupAppointment = {
  id: 1,
  package_id: 10,
  resident_id: 100,
  pickup_start: "2026-11-22T14:00:00Z",
  pickup_end: "2026-11-22T14:30:00Z",
  status: "scheduled",
  created_at: "2026-11-22T12:00:00Z",
  tracking_code: "TRK-ABC123",
  carrier_name: "UPS",
  resident_name: "Jane Doe",
  resident_unit: "4B",
  location_code: "SHELF-A3",
  package_status: "prepared",
  // Sprint 4 handoff fields:
  checked_in_at: "2026-11-22T14:01:00Z",
  identity_verified_at: "2026-11-22T14:02:00Z",
  identity_verified_by: 5,
  recipient_name: "Jane Doe",
  acknowledged_at: "2026-11-22T14:03:00Z",
  handed_off_at: "2026-11-22T14:04:00Z",
  signed_off_by: 5,
  signoff_note: "ID matched",
  handoff_status: "Completed",
  has_exception: false,
};

beforeEach(() => {
  mockApi.mockReset();
});

describe("appointmentsApi", () => {
  describe("PickupAppointment type", () => {
    it("includes all Sprint 4 handoff timestamp fields", () => {
      // TypeScript compile-time check — if these don't exist on the type, tsc fails
      const apt: PickupAppointment = fullAppointment;
      expect(apt.checked_in_at).toBeDefined();
      expect(apt.identity_verified_at).toBeDefined();
      expect(apt.identity_verified_by).toBeDefined();
      expect(apt.recipient_name).toBeDefined();
      expect(apt.acknowledged_at).toBeDefined();
      expect(apt.handed_off_at).toBeDefined();
      expect(apt.signed_off_by).toBeDefined();
      expect(apt.signoff_note).toBeDefined();
      expect(apt.handoff_status).toBeDefined();
      expect(apt.has_exception).toBeDefined();
    });

    it("accepts has_exception as boolean or number", () => {
      const withBool: PickupAppointment = { ...fullAppointment, has_exception: true };
      const withNum: PickupAppointment = { ...fullAppointment, has_exception: 1 };
      expect(withBool.has_exception).toBe(true);
      expect(withNum.has_exception).toBe(1);
    });
  });

  describe("getAppointments", () => {
    it("calls GET /appointments and returns the appointments array", async () => {
      mockApi.mockResolvedValue({
        success: true,
        appointments: [fullAppointment],
      });

      const result = await getAppointments();

      expect(mockApi).toHaveBeenCalledWith("/appointments");
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(1);
    });
  });

  describe("createAppointment", () => {
    it("POSTs package_id and pickup_start", async () => {
      mockApi.mockResolvedValue({
        success: true,
        appointment: fullAppointment,
      });

      await createAppointment(10, "2026-11-22T14:00:00Z");

      expect(mockApi).toHaveBeenCalledWith("/appointments", {
        method: "POST",
        body: JSON.stringify({
          package_id: 10,
          pickup_start: "2026-11-22T14:00:00Z",
        }),
      });
    });
  });

  describe("cancelAppointment", () => {
    it("POSTs to /appointments/:id/cancel", async () => {
      mockApi.mockResolvedValue({ success: true, message: "Cancelled" });

      await cancelAppointment(1);

      expect(mockApi).toHaveBeenCalledWith("/appointments/1/cancel", {
        method: "POST",
      });
    });
  });

  describe("rescheduleAppointment", () => {
    it("POSTs new pickup_start to /appointments/:id/reschedule", async () => {
      mockApi.mockResolvedValue({
        success: true,
        appointment: fullAppointment,
      });

      await rescheduleAppointment(1, "2026-11-23T10:00:00Z");

      expect(mockApi).toHaveBeenCalledWith("/appointments/1/reschedule", {
        method: "POST",
        body: JSON.stringify({ pickup_start: "2026-11-23T10:00:00Z" }),
      });
    });
  });
});
