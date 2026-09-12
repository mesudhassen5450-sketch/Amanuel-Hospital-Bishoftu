import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Phone, X, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAudioNotification } from "@/lib/audio-utils";
import { supabase } from "@/lib/supabase";
import { io } from "socket.io-client";
import { BACKEND_URL } from "@/lib/api/socket-client";

interface IncomingCallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: {
    id: string;
    appointmentId: string;
    patientName: string;
    patientPhone?: string;
    primaryComplaint?: string;
    doctorUsername: string;
    callStatus: string;
    roomId: string;
  } | null;
  currentDoctorUsername: string;
}

export function IncomingCallModal({
  open,
  onOpenChange,
  appointment,
  currentDoctorUsername,
}: IncomingCallModalProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const audioNotification = getAudioNotification();
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  const stopRingtone = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
    audioNotification.stop();
    if (typeof document !== "undefined") {
      document.querySelectorAll("audio").forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
    }
  };

  useEffect(() => {
    // Start continuous ringtone when modal opens
    if (open && appointment) {
      if (typeof window !== "undefined" && !ringtoneRef.current) {
        ringtoneRef.current = new Audio("/sounds/incoming-call.mp3");
        ringtoneRef.current.loop = true;
      }
      if (ringtoneRef.current) {
        ringtoneRef.current.play().catch((err) => console.log("Ringtone play error:", err));
      }
      audioNotification.startRingtone();
    }

    // Stop ringtone when modal closes
    return () => {
      if (!open) {
        stopRingtone();
      }
    };
  }, [open, appointment, audioNotification]);

  const handleAcceptCall = async () => {
    if (!appointment) return;

    try {
      setIsAccepting(true);
      // STOP THE SOUND IMMEDIATELY 🛑
      stopRingtone();

      // Use appointmentId instead of id for the query
      const appointmentId = appointment.appointmentId || appointment.id;
      console.log("Accepting call for appointment ID:", appointmentId);

      // Update appointment call_status to IN_PROGRESS
      const { error } = await supabase
        .from("appointments")
        .update({ call_status: "IN_PROGRESS" })
        .eq("id", String(appointmentId));

      if (error) {
        console.error("Error accepting call:", error);
        throw error;
      }

      // Emit accept-call event via socket
      try {
        const socket = io(BACKEND_URL);
        socket.emit("accept-call", {
          appointmentId: String(appointmentId),
          doctorUsername: currentDoctorUsername,
        });
      } catch (sErr) {
        console.warn("Socket accept emit error:", sErr);
      }

      // Redirect both doctor and patient to consultation room
      window.location.href = `/consultation/room/${appointmentId}`;
    } catch (error) {
      console.error("Failed to accept call:", error);
      setIsAccepting(false);
      if (ringtoneRef.current) {
        ringtoneRef.current.play().catch(() => {});
      }
      audioNotification.startRingtone(); // Restart ringtone on error
    }
  };

  const handleRejectCall = async () => {
    if (!appointment) return;

    try {
      // STOP THE SOUND IMMEDIATELY 🛑
      stopRingtone();

      // Use appointmentId instead of id for the query
      const appointmentId = appointment.appointmentId || appointment.id;
      console.log("Rejecting call for appointment ID:", appointmentId);

      // Update appointment call_status to indicate call rejected
      const { error } = await supabase
        .from("appointments")
        .update({ call_status: "CALL_REJECTED" })
        .eq("id", String(appointmentId));

      if (error) {
        console.error("Error rejecting call:", error);
        throw error;
      }

      // Emit decline-call event via socket
      try {
        const socket = io(BACKEND_URL);
        socket.emit("decline-call", {
          appointmentId: String(appointmentId),
          doctorUsername: currentDoctorUsername,
        });
      } catch (sErr) {
        console.warn("Socket decline emit error:", sErr);
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Failed to reject call:", error);
    }
  };

  if (!appointment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 border-2 border-blue-200 dark:border-blue-800">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-blue-600 dark:bg-blue-700 flex items-center justify-center animate-pulse">
              <Phone className="h-10 w-10 text-white" />
            </div>
          </div>
          <DialogTitle className="text-2xl font-display font-bold text-blue-900 dark:text-blue-100">
            Incoming Video Call
          </DialogTitle>
          <DialogDescription className="text-base text-slate-700 dark:text-slate-300">
            Patient is calling for consultation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex-shrink-0">
              <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <User className="h-7 w-7 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg text-slate-900 dark:text-white truncate">
                {appointment.patientName || "Patient"}
              </p>
              {appointment.patientPhone && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {appointment.patientPhone}
                </p>
              )}
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-1">
                Reason: {appointment.primaryComplaint || "Video Consultation"}
              </p>
            </div>
          </div>

          <div className="flex justify-center">
            <Badge className="bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-4 py-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse mr-2" />
              Ringing...
            </Badge>
          </div>
        </div>

        <div className="flex gap-4 pt-4 border-t border-blue-200 dark:border-blue-800">
          <Button
            variant="outline"
            onClick={handleRejectCall}
            disabled={isAccepting}
            className="flex-1 h-14 rounded-full border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
          >
            <X className="h-5 w-5 mr-2" />
            Decline
          </Button>
          <Button
            onClick={handleAcceptCall}
            disabled={isAccepting}
            className="flex-1 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isAccepting ? (
              "Connecting..."
            ) : (
              <>
                <Video className="h-5 w-5 mr-2" />
                Accept & Join Call
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
