import { api } from "./client";

// Every handoff step returns the same summary from the backend.
export interface HandoffResponse {
  success: boolean;
  appointment_id: number;
  package_id: number;
  operation: string;
  message: string;
  timestamp: string;
}

// Step 1 (resident): tell the desk you've arrived.
export async function checkIn(appointmentId: number): Promise<HandoffResponse> {
  return api<HandoffResponse>(`/appointments/${appointmentId}/check-in`, {
    method: "POST",
  });
}

// Step 2 (staff): confirm the resident's identity.
export async function verifyIdentity(
  appointmentId: number,
): Promise<HandoffResponse> {
  return api<HandoffResponse>(`/appointments/${appointmentId}/verify-identity`, {
    method: "POST",
    body: JSON.stringify({ identity_confirmed: true }),
  });
}

// Step 3 (staff): record who received the package.
export async function signoff(
  appointmentId: number,
  recipientName: string,
  note?: string,
): Promise<HandoffResponse> {
  return api<HandoffResponse>(`/appointments/${appointmentId}/signoff`, {
    method: "POST",
    body: JSON.stringify({
      recipient_name: recipientName,
      acknowledged: true,
      note,
    }),
  });
}

// Step 4 (staff): finish the pickup and mark the package picked up.
export async function completeHandoff(
  appointmentId: number,
): Promise<HandoffResponse> {
  return api<HandoffResponse>(`/appointments/${appointmentId}/complete`, {
    method: "POST",
  });
}
