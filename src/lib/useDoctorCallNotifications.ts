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
  if (!target) return true;
  return target === me || me === "doctor";
}

function isRequestingStatus(status: string): boolean {
  const s = status.toUpperCase();
  return (
    s === "REQUESTING_DOCTOR" ||
    s === "PENDING" ||
    s === "WAITING" ||
    s === "REQUESTED"
  );
}

export function useDoctorCallNotifications(currentDoctorUsername: string) {
  const [availabilityRequest, setAvailabilityRequest] = useState<AvailabilityRequest | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  useEffect(() => {
    if (!currentDoctorUsername) return;
    const me = currentDoctorUsername.toLowerCase().trim();

    const openAvailability = (data: any) => {
      const id = String(data.appointmentId || data.appointment_id || data.id || "");
      if (!id) return;
      if (!isForThisDoctor(data.doctorUsername || data.doctor_username, me)) return;
      setAvailabilityRequest({
        id,
        patientName: data.patientName || data.patient_name || data.full_name || "Patient",
        doctorUsername: data.doctorUsername || data.doctor_username || me,
        callStatus: String(data.callStatus || data.call_status || "REQUESTING_DOCTOR"),
      });
    };

    // Catch requests that arrived while the doctor tab was refreshing / Realtime missed INSERT
    const loadPendingRequests = async () => {
      try {
        const { data, error } = await supabase
          .from("appointments")
          .select(
            "id, patient_name, full_name, doctor_username, doctor_id, call_status, status, phone, phone_number, created_at"
          )
          .eq("doctor_username", me)
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) {
          console.warn("[DoctorSocket] Pending request query failed:", error.message);
          return;
        }

        const pending = (data || []).find((appt: any) =>
          isRequestingStatus(String(appt.call_status || appt.status || ""))
        );
        if (pending) {
          console.log("[DoctorSocket] Found pending consultation request:", pending.id);
          openAvailability(pending);
        }
      } catch (err) {
        console.warn("[DoctorSocket] Pending request load error:", err);
      }
    };

    void loadPendingRequests();
    const pendingPoll = setInterval(() => {
      void loadPendingRequests();
    }, 8000);

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
          doctorId: me,
          username: me,
          doctorUsername: me,
        });
      };

      socket.on("connect", register);

      socket.on("connect_error", (err) => {
        console.warn(
          "[DoctorSocket] Connection error:",
          err?.message || err,
          "— relying on Supabase / polling fallback."
        );
      });

      const handleIncomingCall = (data: any) => {
        console.log("[DoctorSocket] Incoming call event:", data);
        if (!isForThisDoctor(data?.doctorUsername || data?.doctor_username, me)) return;

        const callStatus = String(data?.callStatus || data?.call_status || "").toUpperCase();
        // Pre-payment requests should open the availability modal, not the in-call ring UI
        if (isRequestingStatus(callStatus) || callStatus === "REQUESTING_DOCTOR") {
          openAvailability(data);
          return;
        }
        setIncomingCall(buildIncomingCall(data, me, "RINGING"));
      };

      socket.on("incoming-call", handleIncomingCall);
      socket.on("consultation-request", (data: any) => {
        console.log("[DoctorSocket] consultation-request event:", data);
        openAvailability(data);
      });

      const handlePatientPaid = (data: any) => {
        console.log("[DoctorSocket] patient-paid event:", data);
        if (!isForThisDoctor(data?.doctorUsername || data?.doctor_username, me)) return;
        setIncomingCall(buildIncomingCall(data, me, "RINGING"));
      };
      socket.on("patient-paid", handlePatientPaid);
    } catch (err) {
      console.warn("[DoctorSocket] Socket init error:", err);
    }

    const availabilityChannel = supabase
      .channel(`doctor_availability_${me}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        (payload) => {
          const appt = payload.new as any;
          if (!appt) return;

          if (!isForThisDoctor(appt.doctor_username || appt.doctor_name, me)) {
            return;
          }

          const callStatus = String(appt.call_status || "").toUpperCase();
          const status = String(appt.status || "").toUpperCase();

          if (isRequestingStatus(callStatus)) {
            openAvailability(appt);
            return;
          }

          if (callStatus === "RINGING" || callStatus === "CALLING") {
            setIncomingCall(buildIncomingCall(appt, me, callStatus));
            return;
          }

          if (
            callStatus === "ENDED" ||
            callStatus === "DECLINED" ||
            callStatus === "CANCELLED" ||
            callStatus === "DOCTOR_DECLINED" ||
            status === "COMPLETED" ||
            status === "CANCELLED"
          ) {
            setIncomingCall((prev) =>
              prev && String(prev.appointmentId) === String(appt.id) ? null : prev
            );
            setAvailabilityRequest((prev) =>
              prev && String(prev.id) === String(appt.id) ? null : prev
            );
          }
        }
      )
      .subscribe();

    const callsChannel = supabase
      .channel(`doctor_calls_${me}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calls" },
        (payload) => {
          const newCall = payload.new as any;
          if (!newCall) return;
          if (!isForThisDoctor(newCall.doctor_username, me)) return;

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
                me,
                "RINGING"
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(pendingPoll);
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
