import { api } from "./client";

export type AppointmentStatus = "scheduled" | "cancelled" | "completed";

export interface PickupAppointment {
  id: number;
  package_id: number;
  resident_id: number;
  pickup_start: string;
  pickup_end: string;
  status: AppointmentStatus;
  created_at: string;
  tracking_code?: string;
  carrier_name?: string;
  resident_name?: string;
  resident_unit?: string;
  location_code?: string;
  package_status?: string;
}

interface AppointmentListResponse {
  success: boolean;
  appointments: PickupAppointment[];
}

interface AppointmentResponse {
  success: boolean;
  appointment: PickupAppointment;
}

export async function getAppointments(): Promise<PickupAppointment[]> {
  const response = await api<AppointmentListResponse>("/appointments");
  return response.appointments;
}

export async function createAppointment(
  packageId: number,
  pickupStart: string,
): Promise<PickupAppointment> {
  const response = await api<AppointmentResponse>("/appointments", {
    method: "POST",
    body: JSON.stringify({
      package_id: packageId,
      pickup_start: pickupStart,
    }),
  });

  return response.appointment;
}

export async function cancelAppointment(
  appointmentId: number,
): Promise<void> {
  await api<{ success: boolean; message: string }>(
    `/appointments/${appointmentId}/cancel`,
    { method: "POST" },
  );
}


export async function rescheduleAppointment(
  appointmentId: number,
  pickupStart: string,
): Promise<PickupAppointment> {
  const response = await api<AppointmentResponse>(
    `/appointments/${appointmentId}/reschedule`,
    {
      method: "POST",
      body: JSON.stringify({ pickup_start: pickupStart }),
    },
  );

  return response.appointment;
}
