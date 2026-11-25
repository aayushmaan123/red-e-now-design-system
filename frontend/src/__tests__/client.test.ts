/**
 * client.test.ts
 *
 * Tests the shared API client: header injection, JWT auth, and error handling.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We need to mock fetch before importing client
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Also stub localStorage
const storage: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, val: string) => { storage[key] = val; },
  removeItem: (key: string) => { delete storage[key]; },
});

// Now import the module under test
import { api, setToken, getToken, ApiError } from "../api/client";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  mockFetch.mockReset();
  setToken(null);
});

describe("api() client", () => {
  it("makes a GET request to BASE + path", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ success: true, data: 42 }));

    const result = await api<{ success: boolean; data: number }>("/test");

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url] = mockFetch.mock.calls[0]!;
    expect(url).toContain("/test");
    expect(result.data).toBe(42);
  });

  it("includes Authorization header when token is set", async () => {
    setToken("test-jwt-token");
    mockFetch.mockResolvedValue(jsonResponse({ success: true }));

    await api("/protected");

    const [, opts] = mockFetch.mock.calls[0]!;
    const headers = new Headers(opts.headers);
    expect(headers.get("Authorization")).toBe("Bearer test-jwt-token");
  });

  it("sets Content-Type to application/json when body is present", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ success: true }));

    await api("/create", {
      method: "POST",
      body: JSON.stringify({ name: "test" }),
    });

    const [, opts] = mockFetch.mock.calls[0]!;
    const headers = new Headers(opts.headers);
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("throws ApiError with NETWORK_ERROR on fetch failure", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    try {
      await api("/offline");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).code).toBe("NETWORK_ERROR");
      expect((err as ApiError).status).toBe(0);
    }
  });

  it("throws ApiError on non-ok response with error details", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(
        {
          success: false,
          error: { code: "HANDOFF_REQUIRED", message: "Use handoff workflow" },
        },
        400,
      ),
    );

    await expect(api("/packages/1")).rejects.toMatchObject({
      code: "HANDOFF_REQUIRED",
      status: 400,
    });
  });

  it("throws INVALID_RESPONSE for non-object JSON", async () => {
    mockFetch.mockResolvedValue(
      new Response('"just a string"', {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(api("/weird")).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });
});

describe("setToken / getToken", () => {
  it("stores and retrieves the token", () => {
    setToken("abc123");
    expect(getToken()).toBe("abc123");
  });

  it("clears the token when set to null", () => {
    setToken("abc123");
    setToken(null);
    expect(getToken()).toBeNull();
  });
});
