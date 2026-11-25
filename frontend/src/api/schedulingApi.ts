import { api } from "./client";

export interface SchedulingSettings {
  building_id: number;
  /** Building name from the `buildings` table (read-only here). */
  building_name: string;
  open_time: string;
  close_time: string;
  slot_minutes: number;
  default_capacity: number;
  cancellation_cutoff_minutes: number;
}

export interface PickupSlot {
  pickup_start: string;
  pickup_end: string;
  capacity: number;
  booked: number;
  remaining: number;
  available: boolean;
}

export async function getSchedulingSettings(): Promise<SchedulingSettings> {
  const response = await api<{
    success: boolean;
    settings: SchedulingSettings;
  }>("/scheduling/settings");

  return response.settings;
}

export async function updateSchedulingSettings(
  settings: Omit<SchedulingSettings, "building_id" | "building_name">,
): Promise<void> {
  await api<{ success: boolean; message: string }>(
    "/scheduling/settings",
    {
      method: "PUT",
      body: JSON.stringify(settings),
    },
  );
}

export async function getPickupSlots(
  date: string,
): Promise<PickupSlot[]> {
  const response = await api<{
    success: boolean;
    slots: PickupSlot[];
  }>(`/scheduling/slots?date=${encodeURIComponent(date)}`);

  return response.slots;
}
