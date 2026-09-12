import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { io, Socket } from "socket.io-client";
import { BACKEND_URL } from "./api/socket-client";

interface AppointmentRequest {
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

export function useDoctorCallNotifications(currentDoctorUsername: string) {
  const [availabilityRequest, setAvailabilityRequest] = useState<AppointmentRequest | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  useEffect(() => {
    if (!currentDoctorUsername) return;

    // 1. Socket.io Real-Time Channel Registration & Event Listener with Reconnection Limits
    let socket: Socket | null = null;
    try {
      socket = io(BACKEND_URL, {
        autoConnect: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        transports: ["websocket", "polling"],
      });

      socket.on("connect", () => {
        console.log("[DoctorSocket] Connected to signaling server:", BACKEND_URL, socket?.id);
        socket?.emit("register-doctor", {
          doctorId: currentDoctorUsername,
          username: currentDoctorUsername,
          doctorUsername: currentDoctorUsername,
        });
      });

      socket.on("connect_error", (err) => {
        console.warn("[DoctorSocket] Connection error:", err?.message || err, "— relying on Supabase Realtime fallback.");
      });

      socket.on("incoming-call", (data: any) => {
        console.log("[DoctorSocket] Incoming call event received:", data);
        const targetDoctor = (data.doctorUsername || "").toLowerCase().trim();
        const myUsername = currentDoctorUsername.toLowerCase().trim();

        // Target match or fallback to doctor role
        if (!targetDoctor || targetDoctor === myUsername || myUsername === "doctor") {
          setIncomingCall({
            id: String(data.appointmentId || data.id),
            appointmentId: String(data.appointmentId || data.id),
            patientName: data.patientName || "Patient",
            patientPhone: data.patientPhone || data.phone || "",
            primaryComplaint: data.primaryComplaint || "Video Consultation",
            doctorUsername: data.doctorUsername || currentDoctorUsername,
            callStatus: "RINGING",
            roomId: data.roomId || `room_${data.appointmentId}`,
          });
        }
      });

      socket.on("patient-paid", (data: any) => {
        console.log("[DoctorSocket] Patient paid event received:", data);
        const apptId = String(data.appointmentId || data.id);
        setIncomingCall(null);
        window.location.href = `/consultation/room/${apptId}`;
      });
    } catch (err) {
      console.warn("[DoctorSocket] Socket initialization error:", err);
    }

    // 2. Supabase Realtime Fallback Subscriptions (Reliable trigger when Socket server is offline)
    const availabilitySubscription = supabase
      .channel(`doctor_availability_${currentDoctorUsername}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
        },
        (payload) => {
          const appt = payload.new as any;
          if (!appt) return;
          console.log("[Supabase Realtime Fallback] Appointment change payload:", appt);

          const docInPayload = (appt.doctor_username || appt.doctor_name || "").toLowerCase().trim();
          const myKey = currentDoctorUsername.toLowerCase().trim();

          if (!docInPayload || docInPayload === myKey || myKey === "doctor") {
            if (appt.status === "IN_PROGRESS" || appt.status === "ACCEPTED" || appt.call_status === "IN_PROGRESS") {
              console.log("[Supabase Backup] Status transitioned to IN_PROGRESS/ACCEPTED, clearing incoming call");
              setIncomingCall(null);
            } else if (appt.call_status === "RINGING" || appt.call_status === "REQUESTING_DOCTOR") {
              console.log("[Supabase Realtime Fallback] Opening Incoming Call Modal for appointment:", appt.id);
              setIncomingCall({
                id: String(appt.id),
                appointmentId: String(appt.id),
                patientName: appt.patient_name || appt.full_name || "Patient",
                patientPhone: appt.phone || appt.phone_number || "",
                primaryComplaint: appt.primary_complaints || appt.reason_for_visit || appt.reason || "Video Consultation",
                doctorUsername: appt.doctor_username || currentDoctorUsername,
                callStatus: appt.call_status || "RINGING",
                roomId: `room_${appt.id}`,
              });
            }
          }
        }
      )
      .subscribe();

    // Subscription for incoming calls (calls table)
    const callsSubscription = supabase
      .channel(`doctor_calls_${currentDoctorUsername}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "calls",
        },
        (payload) => {
          const newCall = payload.new as any;
          if (!newCall) return;
          console.log("[Supabase Realtime Fallback] Calls table payload:", newCall);

          const docInCall = (newCall.doctor_username || "").toLowerCase().trim();
          const myKey = currentDoctorUsername.toLowerCase().trim();

          if (!docInCall || docInCall === myKey || myKey === "doctor") {
            if (newCall.status === "calling" || newCall.status === "RINGING") {
              console.log("[Supabase Realtime Fallback] Opening Incoming Call Modal from calls table:", newCall.appointment_id);
              setIncomingCall({
                id: String(newCall.id),
                appointmentId: String(newCall.appointment_id || newCall.id),
                patientName: newCall.patient_name || "Patient",
                patientPhone: newCall.patient_phone || newCall.phone || "",
                primaryComplaint: newCall.primary_complaint || "Video Consultation",
                doctorUsername: newCall.doctor_username || currentDoctorUsername,
                callStatus: newCall.status,
                roomId: newCall.room_id || `room_${newCall.appointment_id}`,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      if (socket) {
        socket.disconnect();
      }
      supabase.removeChannel(availabilitySubscription);
      supabase.removeChannel(callsSubscription);
    };
  }, [currentDoctorUsername]);

  const closeAvailabilityRequest = () => {
    setAvailabilityRequest(null);
  };

  const closeIncomingCall = () => {
    setIncomingCall(null);
  };

  return {
    availabilityRequest,
    incomingCall,
    closeAvailabilityRequest,
    closeIncomingCall,
  };
}
