import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { requestVideoConsultation } from "@/lib/telemedicine-server";
import { supabase } from "@/lib/supabase";
import { notifyDoctorConsultationRequest } from "@/lib/notify-doctor-call";

interface PatientRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctor: {
    id: string;
    username?: string;
    name: string;
    specialty: string;
    consultationFee: number;
  } | null;
}

type RequestStatus = "idle" | "requesting" | "waiting" | "available" | "declined" | "error";

export function PatientRequestModal({ open, onOpenChange, doctor }: PatientRequestModalProps) {
  const [patientName, setPatientName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [status, setStatus] = useState<RequestStatus>("idle");
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Supabase Realtime subscription for doctor availability updates
  useEffect(() => {
    let subscription: any = null;
    let pollingInterval: NodeJS.Timeout | null = null;

    if (appointmentId && status === "waiting") {
      console.log("Setting up realtime subscription for appointment:", appointmentId);
      const ACCEPTED_STATUSES = ["IN_PROGRESS", "ACCEPTED", "APPROVED", "RINGING", "DOCTOR_READY"];

      subscription = supabase
        .channel(`appointment_${appointmentId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "appointments",
            filter: `id=eq.${appointmentId}`,
          },
          (payload) => {
            const updatedAppt = payload.new as any;
            const callStatus = updatedAppt?.call_status;
            const apptStatus = updatedAppt?.status;
            console.log("Appointment status updated via realtime:", { apptStatus, callStatus, paymentStatus: updatedAppt?.payment_status });

            if (ACCEPTED_STATUSES.includes(apptStatus) || ACCEPTED_STATUSES.includes(callStatus)) {
              if (updatedAppt.payment_status === "paid") {
                window.location.href = `/consultation/room/${appointmentId}`;
              } else {
                setStatus("available");
              }
            } else if (callStatus === "DOCTOR_DECLINED" || apptStatus === "DECLINED" || callStatus === "DECLINED") {
              setStatus("declined");
            }
          }
        )
        .subscribe((subStatus) => {
          console.log("Subscription status:", subStatus);
        });

      // Fallback polling mechanism in case Realtime fails
      pollingInterval = setInterval(async () => {
        try {
          const { data, error } = await supabase
            .from("appointments")
            .select("status, call_status, payment_status")
            .eq("id", appointmentId)
            .single();

          if (error) {
            console.error("Polling error:", error);
            return;
          }

          console.log("Polling appointment status:", data);

          if (ACCEPTED_STATUSES.includes(data?.status) || ACCEPTED_STATUSES.includes(data?.call_status)) {
            if (pollingInterval) clearInterval(pollingInterval);
            if (data?.payment_status === "paid") {
              window.location.href = `/consultation/room/${appointmentId}`;
            } else {
              setStatus("available");
            }
          } else if (data?.call_status === "DOCTOR_DECLINED" || data?.status === "DECLINED" || data?.call_status === "DECLINED") {
            if (pollingInterval) clearInterval(pollingInterval);
            setStatus("declined");
          }
        } catch (err) {
          console.error("Polling fetch error:", err);
        }
      }, 3000); // Poll every 3 seconds
    }

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [appointmentId, status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!doctor) return;

    try {
      setStatus("requesting");
      setError(null);

      // doctor.id from /api/doctors is a numeric staff id — always prefer username
      const doctorUsername = (
        doctor.username ||
        (doctor as any).userName ||
        doctor.id
      )
        .toString()
        .toLowerCase()
        .trim();

      const result = await requestVideoConsultation({
        data: {
          doctorId: doctor.id,
          doctorUsername,
          patientName: patientName.trim(),
          phoneNumber: phoneNumber.trim(),
          consultationFee: doctor.consultationFee,
        },
      });

      const resolvedUsername = (
        result.doctorUsername ||
        doctorUsername
      )
        .toString()
        .toLowerCase()
        .trim();

      setAppointmentId(result.appointmentId);
      setStatus("waiting");

      // Store appointment ID and doctor username for payment success handler
      sessionStorage.setItem("appointment_id", result.appointmentId);
      sessionStorage.setItem("doctor_username", resolvedUsername);

      // Immediately notify the connected doctor over Socket.IO
      // (Supabase Realtime alone is unreliable for staff without a Supabase session)
      void notifyDoctorConsultationRequest({
        appointmentId: String(result.appointmentId),
        doctorUsername: resolvedUsername,
        patientName: patientName.trim(),
        patientPhone: phoneNumber.trim(),
        primaryComplaint: "Instant video consultation request",
      });

    } catch (err: any) {
      setError(err?.message || "Failed to request consultation");
      setStatus("error");
    }
  };

  const handleProceedToPayment = () => {
    // Open payment modal instead of redirecting
    if (appointmentId) {
      // TODO: Open PaymentModal with appointmentId and fee
      window.location.href = `/appointments/${appointmentId}`;
    }
  };

  const handleClose = () => {
    setStatus("idle");
    setPatientName("");
    setPhoneNumber("");
    setAppointmentId(null);
    setError(null);
    onOpenChange(false);
  };

  if (!doctor) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-display font-bold">
            Request Video Consultation
          </DialogTitle>
          <DialogDescription>
            {doctor.name} - {doctor.specialty}
          </DialogDescription>
        </DialogHeader>

        <CardContent className="pt-4">
          {status === "idle" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="patientName">Patient Name *</Label>
                <Input
                  id="patientName"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number *</Label>
                <Input
                  id="phoneNumber"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+251 9XX XXX XXX"
                  required
                />
              </div>

              <Card className="bg-slate-50 dark:bg-slate-800/50 border-border">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Video Consultation Fee</p>
                      <p className="text-lg font-bold text-foreground">{doctor.consultationFee} ETB</p>
                    </div>
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={!patientName || !phoneNumber}>
                  Request Consultation
                </Button>
              </div>
            </form>
          )}

          {status === "requesting" && (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
              <p className="text-foreground font-medium">Sending request...</p>
            </div>
          )}

          {status === "waiting" && (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
              <p className="text-foreground font-medium mb-2">
                Notifying Dr. {doctor.name}...
              </p>
              <p className="text-sm text-muted-foreground">
                Please wait for confirmation
              </p>
            </div>
          )}

          {status === "available" && (
            <div className="text-center py-8 space-y-4">
              <CheckCircle className="h-16 w-16 text-emerald-600 mx-auto mb-4" />
              <div>
                <p className="text-foreground font-bold text-lg mb-1">
                  Dr. {doctor.name} is ready!
                </p>
                <p className="text-sm text-muted-foreground">
                  Proceed to payment to enter the video consultation room
                </p>
              </div>
              <Card className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                    Consultation Fee: {doctor.consultationFee} ETB
                  </p>
                </CardContent>
              </Card>
              <Button onClick={handleProceedToPayment} className="w-full">
                Proceed to Payment
              </Button>
            </div>
          )}

          {status === "declined" && (
            <div className="text-center py-8 space-y-4">
              <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
              <div>
                <p className="text-foreground font-bold text-lg mb-1">
                  Dr. {doctor.name} is currently unavailable
                </p>
                <p className="text-sm text-muted-foreground">
                  Please try again later or select another doctor
                </p>
              </div>
              <Button onClick={handleClose} variant="outline">
                Close
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="text-center py-8 space-y-4">
              <p className="text-destructive font-medium">
                {error || "Failed to request consultation"}
              </p>
              <Button onClick={handleClose} variant="outline">
                Close
              </Button>
            </div>
          )}
        </CardContent>
      </DialogContent>
    </Dialog>
  );
}
