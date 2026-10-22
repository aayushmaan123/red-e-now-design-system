/**
 * packagesApi.ts — Package CRUD operations for Red-E Now.
 *
 * Calls the Flask backend endpoints when available.
 * Falls back to in-memory mock data so the frontend is fully
 * functional before Rehman's backend endpoints are live.
 *
 * Toggle: set VITE_USE_MOCK=true (or leave backend offline)
 *         to use mock data automatically.
 */
import { api, ApiError } from "./client";

/* ── Types ── */
export type PackageStatus =
  | "received"
  | "available"
  | "scheduled"
  | "prepared"
  | "picked_up";

export interface PackageRecord {
  id: number;
  carrier_name: string;
  tracking_code: string;
  status: PackageStatus;
  description: string;
  arrived_at: string;          // ISO 8601 or display string
  resident_id: number;
  resident_name: string;
  resident_unit?: string;
  registered_by: number;
}

export interface RegisterPackagePayload {
  carrier_name: string;
  tracking_code: string;
  resident_id: number;
  description?: string;
}

export interface UpdatePackagePayload {
  status?: PackageStatus;
  carrier_name?: string;
  tracking_code?: string;
  description?: string;
}

/* ── Mock data ── */
const isBrowser = typeof window !== "undefined";
const useMock = isBrowser && import.meta.env.VITE_USE_MOCK === "true";

let nextId = 6;
const MOCK_PACKAGES: PackageRecord[] = [
  {
    id: 1,
    carrier_name: "FedEx",
    tracking_code: "1Z999AA10123456784",
    status: "received",
    description: "Small box",
    arrived_at: "Oct 18, 2026",
    resident_id: 1,
    resident_name: "Maya Chen",
    resident_unit: "4B",
    registered_by: 2,
  },
  {
    id: 2,
    carrier_name: "UPS",
    tracking_code: "9400111899223100012",
    status: "available",
    description: "Large envelope",
    arrived_at: "Oct 19, 2026",
    resident_id: 1,
    resident_name: "Maya Chen",
    resident_unit: "4B",
    registered_by: 2,
  },
  {
    id: 3,
    carrier_name: "Amazon",
    tracking_code: "TBA304958392710",
    status: "prepared",
    description: "Medium box",
    arrived_at: "Oct 17, 2026",
    resident_id: 3,
    resident_name: "Jordan Lee",
    resident_unit: "7A",
    registered_by: 2,
  },
  {
    id: 4,
    carrier_name: "USPS",
    tracking_code: "9200190143833100012",
    status: "picked_up",
    description: "Flat mailer",
    arrived_at: "Oct 15, 2026",
    resident_id: 1,
    resident_name: "Maya Chen",
    resident_unit: "4B",
    registered_by: 2,
  },
  {
    id: 5,
    carrier_name: "DHL",
    tracking_code: "JD014600003812345",
    status: "scheduled",
    description: "Small parcel",
    arrived_at: "Oct 20, 2026",
    resident_id: 4,
    resident_name: "Sam Rivera",
    resident_unit: "2C",
    registered_by: 2,
  },
];

/* Deep-copy helper so mutations don't pollute the source array */
const clonePkgs = () => JSON.parse(JSON.stringify(MOCK_PACKAGES)) as PackageRecord[];

/* Simulate network latency */
const delay = (ms = 300) => new Promise<void>((r) => setTimeout(r, ms));

/* ── API wrappers ── */

/**
 * Register a new package (staff only).
 * POST /api/packages
 */
export async function registerPackage(
  payload: RegisterPackagePayload,
): Promise<PackageRecord> {
  if (useMock) {
    await delay();
    const pkg: PackageRecord = {
      id: nextId++,
      carrier_name: payload.carrier_name,
      tracking_code: payload.tracking_code,
      status: "received",
      description: payload.description || "",
      arrived_at: new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date()),
      resident_id: payload.resident_id,
      resident_name: "Maya Chen",  // mock — real name comes from backend join
      resident_unit: "4B",
      registered_by: 2,
    };
    MOCK_PACKAGES.unshift(pkg);
    return pkg;
  }

  const res = await api<{ success: boolean; package: PackageRecord }>(
    "/packages",
    { method: "POST", body: JSON.stringify(payload) },
  );
  return res.package;
}

/**
 * List all packages (staff only).
 * GET /api/packages?status=&search=
 */
export async function getPackages(filters?: {
  status?: PackageStatus;
  search?: string;
}): Promise<PackageRecord[]> {
  if (useMock) {
    await delay();
    let list = clonePkgs();
    if (filters?.status) list = list.filter((p) => p.status === filters.status);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (p) =>
          p.tracking_code.toLowerCase().includes(q) ||
          p.resident_name.toLowerCase().includes(q) ||
          p.carrier_name.toLowerCase().includes(q) ||
          (p.resident_unit || "").toLowerCase().includes(q),
      );
    }
    return list;
  }

  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.search) params.set("search", filters.search);
  const qs = params.toString();
  const res = await api<{ success: boolean; packages: PackageRecord[] }>(
    `/packages${qs ? `?${qs}` : ""}`,
  );
  return res.packages;
}

/**
 * Get a single package by ID (staff only).
 * GET /api/packages/:id
 */
export async function getPackage(id: number): Promise<PackageRecord> {
  if (useMock) {
    await delay(200);
    const pkg = MOCK_PACKAGES.find((p) => p.id === id);
    if (!pkg) throw new ApiError("NOT_FOUND", "Package not found", 404);
    return { ...pkg };
  }

  const res = await api<{ success: boolean; package: PackageRecord }>(
    `/packages/${id}`,
  );
  return res.package;
}

/**
 * Update a package (staff only).
 * PUT /api/packages/:id
 */
export async function updatePackage(
  id: number,
  payload: UpdatePackagePayload,
): Promise<PackageRecord> {
  if (useMock) {
    await delay();
    const pkg = MOCK_PACKAGES.find((p) => p.id === id);
    if (!pkg) throw new ApiError("NOT_FOUND", "Package not found", 404);
    Object.assign(pkg, payload);
    return { ...pkg };
  }

  const res = await api<{ success: boolean; package: PackageRecord }>(
    `/packages/${id}`,
    { method: "PUT", body: JSON.stringify(payload) },
  );
  return res.package;
}

/**
 * Get the current resident's packages.
 * GET /api/my-packages
 */
export async function getMyPackages(): Promise<PackageRecord[]> {
  if (useMock) {
    await delay();
    // Mock: return only Maya Chen's packages (resident_id 1)
    return clonePkgs().filter((p) => p.resident_id === 1);
  }

  const res = await api<{ success: boolean; packages: PackageRecord[] }>(
    "/my-packages",
  );
  return res.packages;
}
