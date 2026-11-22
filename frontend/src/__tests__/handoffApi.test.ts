/**
 * handoffApi.test.ts
 *
 * Unit tests for the 4-step handoff API layer.
 * These mock the fetch layer and verify each function sends the correct
 * HTTP method, path, and body to the Flask backend.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the api() helper so we don't need a running backend
vi.mock("../api/client", () => ({
  api: vi.fn(),
  ApiError: class ApiError extends Error {
    code: string;
    status: number;
    constructor(code: string, message: string, status: number) {
      super(message);
      this.code = code;
      this.status = status;
    }
  },
}));

import { api } from "../api/client";
import {
  checkIn,
  verifyIdentity,
  signoff,
  completeHandoff,
} from "../api/handoffApi";

const mockApi = vi.mocked(api);

const fakeResponse = {
  success: true,
  appointment_id: 42,
  package_id: 7,
  operation: "check_in",
  message: "OK",
  timestamp: "2026-11-22T13:00:00Z",
};

beforeEach(() => {
  mockApi.mockReset();
  mockApi.mockResolvedValue(fakeResponse);
});

describe("handoffApi", () => {
  describe("checkIn", () => {
    it("POSTs to /appointments/:id/check-in", async () => {
      const result = await checkIn(42);

      expect(mockApi).toHaveBeenCalledWith("/appointments/42/check-in", {
        method: "POST",
      });
      expect(result).toEqual(fakeResponse);
    });
  });

  describe("verifyIdentity", () => {
    it("POSTs to /appointments/:id/verify-identity with identity_confirmed", async () => {
      await verifyIdentity(42);

      expect(mockApi).toHaveBeenCalledWith(
        "/appointments/42/verify-identity",
        {
          method: "POST",
          body: JSON.stringify({ identity_confirmed: true }),
        },
      );
    });
  });

  describe("signoff", () => {
    it("POSTs recipient name, acknowledged flag, and optional note", async () => {
      await signoff(42, "Jane Doe", "Left at door");

      expect(mockApi).toHaveBeenCalledWith("/appointments/42/signoff", {
        method: "POST",
        body: JSON.stringify({
          recipient_name: "Jane Doe",
          acknowledged: true,
          note: "Left at door",
        }),
      });
    });

    it("sends undefined note when not provided", async () => {
      await signoff(42, "John Smith");

      const call = mockApi.mock.calls[0];
      const body = JSON.parse(call[1]!.body as string);
      expect(body.recipient_name).toBe("John Smith");
      expect(body.acknowledged).toBe(true);
      expect(body.note).toBeUndefined();
    });
  });

  describe("completeHandoff", () => {
    it("POSTs to /appointments/:id/complete", async () => {
      await completeHandoff(42);

      expect(mockApi).toHaveBeenCalledWith("/appointments/42/complete", {
        method: "POST",
      });
    });
  });
});
