import { io } from "socket.io-client";
import { BACKEND_URL } from "./api/socket-client";

export type DoctorNotifyPayload = {
  appointmentId: string;
  doctorUsername: string;
  patientName?: string;
  patientPhone?: string;
  primaryComplaint?: string;
  roomId?: string;
};

function emitToDoctor(
  eventName: "incoming-call" | "consultation-request" | "patient-paid",
  payload: Record<string, unknown>
): Promise<void> {
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
      socket.emit(eventName, payload);
      console.log(
        `[notifyDoctor] Emitted ${eventName}`,
        payload.doctorUsername,
        payload.appointmentId
      );
      setTimeout(finish, 500);
    };

    if (socket.connected) {
      send();
    } else {
      socket.once("connect", send);
      socket.once("connect_error", (err) => {
        console.warn(`[notifyDoctor] connect_error (${eventName}):`, err?.message || err);
        finish();
      });
      setTimeout(finish, 13000);
    }
  });
}

/**
 * Pre-payment: tell the doctor a patient is requesting availability.
 */
export async function notifyDoctorConsultationRequest(
  payload: DoctorNotifyPayload
): Promise<void> {
  const doctorUsername = String(payload.doctorUsername || "").toLowerCase().trim();
  const appointmentId = String(payload.appointmentId || "").trim();
  if (!appointmentId || !doctorUsername) {
    console.warn("[notifyDoctorConsultationRequest] Missing fields", payload);
    return;
  }

  const eventPayload = {
    appointmentId,
    id: appointmentId,
    doctorUsername,
    doctorId: doctorUsername,
    patientName: payload.patientName || "Patient",
    patientPhone: payload.patientPhone || "",
    primaryComplaint: payload.primaryComplaint || "Video Consultation Request",
    callStatus: "REQUESTING_DOCTOR",
    roomId: payload.roomId || `room_${appointmentId}`,
    createdAt: new Date().toISOString(),
  };

  await emitToDoctor("consultation-request", eventPayload);
  // Also emit incoming-call so any doctor UI listening for calls still wakes up
  await emitToDoctor("incoming-call", eventPayload);
}

/**
 * Post-payment: ring the doctor for the live video call.
 */
export async function notifyDoctorIncomingCall(payload: DoctorNotifyPayload): Promise<void> {
  const doctorUsername = String(payload.doctorUsername || "").toLowerCase().trim();
  const appointmentId = String(payload.appointmentId || "").trim();
  if (!appointmentId || !doctorUsername) {
    console.warn("[notifyDoctorIncomingCall] Missing appointmentId or doctorUsername", payload);
    return;
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

  await emitToDoctor("incoming-call", eventPayload);
  await emitToDoctor("patient-paid", {
    appointmentId,
    doctorUsername,
    patientName: eventPayload.patientName,
    primaryComplaint: eventPayload.primaryComplaint,
    roomId,
  });
}
