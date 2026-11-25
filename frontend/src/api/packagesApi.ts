/**
 * packagesApi.ts — Package operations for RED-E-NOW.
 *
 * Every function talks to the Flask backend. There is no mock mode:
 * the app only ever shows real data from the API.
 */

import { api } from "./client";

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
  action:
    | "created"
    | "updated"
    | "status_changed"
    | "exception_flagged"
    | "exception_resolved"
    | "signed_off";
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  changed_at: string;
}

/**
 * POST /api/packages — Staff only.
 */
export async function registerPackage(
  payload: RegisterPackagePayload,
): Promise<PackageRecord> {
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
  const res = await api<{
    success: boolean;
    packages: PackageRecord[];
  }>("/my-packages");

  return res.packages;
}
