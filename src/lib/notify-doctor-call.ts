import { io } from "socket.io-client";
import { BACKEND_URL } from "./api/socket-client";

export type IncomingCallNotifyPayload = {
  appointmentId: string;
  doctorUsername: string;
  patientName?: string;
  patientPhone?: string;
  primaryComplaint?: string;
  roomId?: string;
};

/**
 * Notify the target doctor that a patient is ringing after payment.
 * Waits for socket connect so the event is not dropped on cold start.
 */
export function notifyDoctorIncomingCall(payload: IncomingCallNotifyPayload): Promise<void> {
  const doctorUsername = String(payload.doctorUsername || "")
    .toLowerCase()
    .trim();
  const appointmentId = String(payload.appointmentId || "").trim();
  if (!appointmentId || !doctorUsername) {
    console.warn("[notifyDoctorIncomingCall] Missing appointmentId or doctorUsername", payload);
    return Promise.resolve();
  }

  const roomId = payload.roomId || `room_${appointmentId}`;
  const eventPayload = {
    appointmentId,
    id: appointmentId,
    doctorUsername,
    doctorId: doctorUsername,
    patientName: payload.patientName || "Patient",
    patientPhone: payload.patientPhone || "",
    primaryComplaint: payload.primaryComplaint || "Video Consultation",
    roomId,
    roomUrl: `/consultation/room/${appointmentId}`,
    createdAt: new Date().toISOString(),
  };

  return new Promise((resolve) => {
    const socket = io(BACKEND_URL, {
      autoConnect: true,
      transports: ["websocket", "polling"],
      reconnection: false,
      timeout: 12000,
    });

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      try {
        socket.disconnect();
      } catch {
        /* ignore */
      }
      resolve();
    };

    const send = () => {
      // Primary: dedicated incoming-call channel the doctor UI listens for
      socket.emit("incoming-call", eventPayload);
      // Also keep patient-paid for older listeners, with doctor context
      socket.emit("patient-paid", {
        appointmentId,
        doctorUsername,
        patientName: eventPayload.patientName,
        primaryComplaint: eventPayload.primaryComplaint,
        roomId,
      });
      console.log(
        "[notifyDoctorIncomingCall] Emitted incoming-call + patient-paid for",
        doctorUsername,
        appointmentId
      );
      // Give the server a brief moment to relay before tearing down
      setTimeout(finish, 400);
    };

    if (socket.connected) {
      send();
    } else {
      socket.once("connect", send);
      socket.once("connect_error", (err) => {
        console.warn("[notifyDoctorIncomingCall] connect_error:", err?.message || err);
        finish();
      });
      setTimeout(finish, 13000);
    }
  });
}
