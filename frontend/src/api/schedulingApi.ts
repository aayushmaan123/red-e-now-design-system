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
  /** IANA zone of the building's clock, e.g. "America/New_York" (read-only). */
  timezone?: string;
  /**
   * The building's current wall-clock time, "YYYY-MM-DDTHH:MM:SS" with no
   * offset (read-only). Pickup times use the same clock, so `building_now.slice(0, 10)`
   * is "today" at the front desk even when the viewer is in another time zone.
   */
  building_now?: string;
}

/** The fields staff can change in Pickup Settings. */
export type SchedulingSettingsInput = Pick<
  SchedulingSettings,
  "open_time" | "close_time" | "slot_minutes" | "default_capacity" | "cancellation_cutoff_minutes"
>;

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
  settings: SchedulingSettingsInput,
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
