
/**
 * residentsApi.ts
 *
 * Staff use this to load real residents from MySQL.
 * We don't need to hardcode names or IDs in the dashboard.
 */

import { api } from "./client";

// These are the resident details our dropdown needs.
export interface ResidentOption {
  id: number;
  name: string;
  email?: string;
  unit: string | null;
}

// Ask Flask for the list of residents.
// Our shared api() helper automatically includes the staff JWT.
export async function getResidents(): Promise<ResidentOption[]> {
  const response = await api<{
    success: boolean;
    residents: ResidentOption[];
  }>("/residents");

  return response.residents;
}

export interface PasswordResetResult {
  resident: ResidentOption;
  /** Returned once by the API; only the hash is stored. */
  temporary_password: string;
}

// Staff only: POST /api/residents/:id/reset-password.
// Sets a temporary password for a resident who is locked out.
export async function resetResidentPassword(
  residentId: number,
): Promise<PasswordResetResult> {
  const response = await api<{ success: boolean } & PasswordResetResult>(
    `/residents/${residentId}/reset-password`,
    { method: "POST" },
  );

  return {
    resident: response.resident,
    temporary_password: response.temporary_password,
  };
}
