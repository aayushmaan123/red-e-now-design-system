
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
