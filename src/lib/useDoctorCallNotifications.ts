import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { io, Socket } from "socket.io-client";
import { BACKEND_URL } from "./api/socket-client";

interface AvailabilityRequest {
  id: string;
  patientName: string;
  doctorUsername: string;
  callStatus: string;
}

interface IncomingCall {
  id: string;
  appointmentId: string;
  patientName: string;
  patientPhone?: string;
  primaryComplaint?: string;
  doctorUsername: string;
  callStatus: string;
  roomId: string;
}

function buildIncomingCall(
  data: any,
  currentDoctorUsername: string,
  callStatus = "RINGING"
): IncomingCall {
  const appointmentId = String(data.appointmentId || data.appointment_id || data.id || "");
  return {
    id: appointmentId,
    appointmentId,
    patientName: data.patientName || data.patient_name || data.full_name || "Patient",
    patientPhone: data.patientPhone || data.patient_phone || data.phone || data.phone_number || "",
    primaryComplaint:
      data.primaryComplaint ||
      data.primary_complaint ||
      data.primary_complaints ||
      data.reason_for_visit ||
      data.reason ||
      "Video Consultation",
    doctorUsername: data.doctorUsername || data.doctor_username || currentDoctorUsername,
    callStatus,
    roomId: data.roomId || data.room_id || `room_${appointmentId}`,
  };
}

function isForThisDoctor(targetRaw: string | undefined, currentDoctorUsername: string): boolean {
  const target = (targetRaw || "").toLowerCase().trim();
  const me = currentDoctorUsername.toLowerCase().trim();
  if (!me) return false;
  // Empty target = broadcast / unknown doctor field — still show to logged-in doctors
  if (!target) return true;
  return target === me || me === "doctor";
}

export function useDoctorCallNotifications(currentDoctorUsername: string) {
  const [availabilityRequest, setAvailabilityRequest] = useState<AvailabilityRequest | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  useEffect(() => {
    if (!currentDoctorUsername) return;

    let socket: Socket | null = null;
    try {
      socket = io(BACKEND_URL, {
        autoConnect: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1500,
        transports: ["websocket", "polling"],
      });

      const register = () => {
        console.log("[DoctorSocket] Connected:", BACKEND_URL, socket?.id);
        socket?.emit("register-doctor", {
          doctorId: currentDoctorUsername,
          username: currentDoctorUsername,
          doctorUsername: currentDoctorUsername,
        });
      };

      socket.on("connect", register);

      socket.on("connect_error", (err) => {
        console.warn(
          "[DoctorSocket] Connection error:",
          err?.message || err,
          "— relying on Supabase Realtime fallback."
        );
      });

      const handleIncomingCall = (data: any) => {
        console.log("[DoctorSocket] Incoming call event:", data);
        if (!isForThisDoctor(data?.doctorUsername || data?.doctor_username, currentDoctorUsername)) {
          return;
        }
        setIncomingCall(buildIncomingCall(data, currentDoctorUsername, "RINGING"));
      };

      // Socket event the production patient flow emits after payment
      socket.on("incoming-call", handleIncomingCall);

      // Legacy / alternate payment event — must OPEN the ring UI, not auto-join
      const handlePatientPaid = (data: any) => {
        console.log("[DoctorSocket] patient-paid event:", data);
        if (!isForThisDoctor(data?.doctorUsername || data?.doctor_username, currentDoctorUsername)) {
          return;
        }
        setIncomingCall(buildIncomingCall(data, currentDoctorUsername, "RINGING"));
      };
      socket.on("patient-paid", handlePatientPaid);
    } catch (err) {
      console.warn("[DoctorSocket] Socket init error:", err);
    }

    const availabilityChannel = supabase
      .channel(`doctor_availability_${currentDoctorUsername}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        (payload) => {
          const appt = payload.new as any;
          if (!appt) return;

          if (
            !isForThisDoctor(
              appt.doctor_username || appt.doctor_name,
              currentDoctorUsername
            )
          ) {
            return;
          }

          const callStatus = String(appt.call_status || "").toUpperCase();
          const status = String(appt.status || "").toUpperCase();

          // Pre-payment doctor request
          if (callStatus === "REQUESTING_DOCTOR") {
            setAvailabilityRequest({
              id: String(appt.id),
              patientName: appt.patient_name || appt.full_name || "Patient",
              doctorUsername: appt.doctor_username || currentDoctorUsername,
              callStatus,
            });
            return;
          }

          // Post-payment ringing — open incoming call modal
          if (callStatus === "RINGING" || callStatus === "CALLING") {
            setIncomingCall(buildIncomingCall(appt, currentDoctorUsername, callStatus));
            return;
          }

          // Only clear when the call is truly finished / rejected — NOT on IN_PROGRESS from payment
          if (
            callStatus === "ENDED" ||
            callStatus === "DECLINED" ||
            callStatus === "CANCELLED" ||
            status === "COMPLETED" ||
            status === "CANCELLED"
          ) {
            setIncomingCall((prev) =>
              prev && String(prev.appointmentId) === String(appt.id) ? null : prev
            );
          }
        }
      )
      .subscribe();

    const callsChannel = supabase
      .channel(`doctor_calls_${currentDoctorUsername}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calls" },
        (payload) => {
          const newCall = payload.new as any;
          if (!newCall) return;
          if (!isForThisDoctor(newCall.doctor_username, currentDoctorUsername)) return;

          const status = String(newCall.status || "").toLowerCase();
          if (
            status === "calling" ||
            status === "ringing" ||
            status === "pending" ||
            status === "waiting"
          ) {
            setIncomingCall(
              buildIncomingCall(
                {
                  ...newCall,
                  appointmentId: newCall.appointment_id || newCall.id,
                  patientName: newCall.patient_name,
                  patientPhone: newCall.patient_phone || newCall.phone,
                  primaryComplaint: newCall.primary_complaint,
                  roomId: newCall.room_id,
                },
                currentDoctorUsername,
                "RINGING"
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      if (socket) socket.disconnect();
      supabase.removeChannel(availabilityChannel);
      supabase.removeChannel(callsChannel);
    };
  }, [currentDoctorUsername]);

  return {
    availabilityRequest,
    incomingCall,
    closeAvailabilityRequest: () => setAvailabilityRequest(null),
    closeIncomingCall: () => setIncomingCall(null),
  };
}
