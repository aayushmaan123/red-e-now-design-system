
/**
 * packagesApi.ts — Package CRUD operations for RED-E-NOW.
 *
 * Uses the Flask backend when VITE_USE_MOCK=false.
 * Uses in-memory development data when VITE_USE_MOCK=true.
 */

import { api, ApiError } from "./client";

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
  location_code: string | null;
  arrived_at: string;
  resident_id: number;
  resident_name: string;
  resident_unit?: string;
  registered_by: number;
  has_exception?: boolean | number;
}

export interface RegisterPackagePayload {
  carrier_name: string;
  tracking_code: string;
  resident_id: number;
  description?: string;
  location_code: string;
}

export interface UpdatePackagePayload {
  status?: PackageStatus;
  carrier_name?: string;
  tracking_code?: string;
  description?: string;
  location_code?: string;
}

export interface PackageAuditEntry {
  id: number;
  package_id: number;
  changed_by: number;
  changed_by_name: string;
  action: "created" | "updated" | "status_changed";
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  changed_at: string;
}

const useMock =
  typeof window !== "undefined" &&
  import.meta.env["VITE_USE_MOCK"] === "true";

let nextId = 6;

const MOCK_PACKAGES: PackageRecord[] = [
  {
    id: 1,
    carrier_name: "FedEx",
    tracking_code: "1Z999AA10123456784",
    status: "received",
    description: "Small box",
    location_code: "SHELF-A1",
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
    location_code: "SHELF-A2",
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
    location_code: "BIN-B1",
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
    location_code: "SHELF-C1",
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
    location_code: "BIN-B2",
    arrived_at: "Oct 20, 2026",
    resident_id: 4,
    resident_name: "Sam Rivera",
    resident_unit: "2C",
    registered_by: 2,
  },
];

const MOCK_AUDIT: PackageAuditEntry[] = [];

const clonePkgs = (): PackageRecord[] =>
  JSON.parse(JSON.stringify(MOCK_PACKAGES)) as PackageRecord[];

const delay = (ms = 300) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

function addMockAudit(
  pkg: PackageRecord,
  action: PackageAuditEntry["action"],
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null,
): void {
  MOCK_AUDIT.push({
    id: MOCK_AUDIT.length + 1,
    package_id: pkg.id,
    changed_by: 2,
    changed_by_name: "Mock Front Desk Staff",
    action,
    old_values: oldValues,
    new_values: newValues,
    changed_at: new Date().toISOString(),
  });
}

/**
 * POST /api/packages — Staff only.
 */
export async function registerPackage(
  payload: RegisterPackagePayload,
): Promise<PackageRecord> {
  if (useMock) {
    await delay();

    if (!payload.location_code.trim()) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "Storage location is required.",
        400,
      );
    }

    const pkg: PackageRecord = {
      id: nextId++,
      carrier_name: payload.carrier_name,
      tracking_code: payload.tracking_code,
      status: "received",
      description: payload.description || "",
      location_code: payload.location_code.trim(),
      arrived_at: new Date().toISOString(),
      resident_id: payload.resident_id,
      resident_name: "Maya Chen",
      resident_unit: "4B",
      registered_by: 2,
    };

    MOCK_PACKAGES.unshift(pkg);
    addMockAudit(pkg, "created", null, { ...pkg });

    return { ...pkg };
  }

  const res = await api<{
    success: boolean;
    package: PackageRecord;
  }>("/packages", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return res.package;
}

/**
 * GET /api/packages — Staff only.
 * Supports status and text search, including location codes.
 */
export async function getPackages(filters?: {
  status?: PackageStatus;
  search?: string;
}): Promise<PackageRecord[]> {
  if (useMock) {
    await delay();

    let list = clonePkgs();

    if (filters?.status) {
      list = list.filter((pkg) => pkg.status === filters.status);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();

      list = list.filter(
        (pkg) =>
          pkg.tracking_code.toLowerCase().includes(q) ||
          pkg.resident_name.toLowerCase().includes(q) ||
          pkg.carrier_name.toLowerCase().includes(q) ||
          (pkg.resident_unit || "").toLowerCase().includes(q) ||
          (pkg.location_code || "").toLowerCase().includes(q),
      );
    }

    return list;
  }

  const params = new URLSearchParams();

  if (filters?.status) {
    params.set("status", filters.status);
  }

  if (filters?.search) {
    params.set("search", filters.search);
  }

  const query = params.toString();

  const res = await api<{
    success: boolean;
    packages: PackageRecord[];
  }>(`/packages${query ? `?${query}` : ""}`);

  return res.packages;
}

/**
 * GET /api/packages/:id — Staff only.
 */
export async function getPackage(
  id: number,
): Promise<PackageRecord> {
  if (useMock) {
    await delay(200);

    const pkg = MOCK_PACKAGES.find((item) => item.id === id);

    if (!pkg) {
      throw new ApiError("NOT_FOUND", "Package not found", 404);
    }

    return { ...pkg };
  }

  const res = await api<{
    success: boolean;
    package: PackageRecord;
  }>(`/packages/${id}`);

  return res.package;
}

/**
 * PUT /api/packages/:id — Staff only.
 */
export async function updatePackage(
  id: number,
  payload: UpdatePackagePayload,
): Promise<PackageRecord> {
  if (useMock) {
    await delay();

    const pkg = MOCK_PACKAGES.find((item) => item.id === id);

    if (!pkg) {
      throw new ApiError("NOT_FOUND", "Package not found", 404);
    }

    const oldValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(payload)) {
      const field = key as keyof UpdatePackagePayload;

      if (value !== undefined && pkg[field] !== value) {
        oldValues[key] = pkg[field];
        newValues[key] = value;
      }
    }

    if (Object.keys(newValues).length > 0) {
      Object.assign(pkg, newValues);

      addMockAudit(
        pkg,
        "status" in newValues ? "status_changed" : "updated",
        oldValues,
        newValues,
      );
    }

    return { ...pkg };
  }

  const res = await api<{
    success: boolean;
    package: PackageRecord;
  }>(`/packages/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  return res.package;
}

/**
 * GET /api/packages/:id/audit — Staff only.
 */
export async function getPackageAudit(
  id: number,
): Promise<PackageAuditEntry[]> {
  if (useMock) {
    await delay(200);

    if (!MOCK_PACKAGES.some((pkg) => pkg.id === id)) {
      throw new ApiError("NOT_FOUND", "Package not found", 404);
    }

    return MOCK_AUDIT
      .filter((entry) => entry.package_id === id)
      .reverse()
      .map((entry) => ({ ...entry }));
  }

  const res = await api<{
    success: boolean;
    audit: PackageAuditEntry[];
  }>(`/packages/${id}/audit`);

  return res.audit;
}

/**
 * GET /api/my-packages — Resident only.
 */
export async function getMyPackages(): Promise<PackageRecord[]> {
  if (useMock) {
    await delay();
    return clonePkgs().filter((pkg) => pkg.resident_id === 1);
  }

  const res = await api<{
    success: boolean;
    packages: PackageRecord[];
  }>("/my-packages");

  return res.packages;
}
