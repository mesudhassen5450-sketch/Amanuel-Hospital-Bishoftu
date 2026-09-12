import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, CreditCard, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { io } from "socket.io-client";
import { BACKEND_URL } from "@/lib/api/socket-client";

interface PaymentGateProps {
  onPayment?: () => void;
  onPaymentSuccess?: () => void;
  isProcessingPayment?: boolean;
  amount?: number;
  appointmentId?: string;
}

export function PaymentGate({ onPayment, onPaymentSuccess, isProcessingPayment = false, amount = 100, appointmentId }: PaymentGateProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  const fetchDoctorUsername = async (appointment: any): Promise<string> => {
    // 1. Return doctor_username directly if already populated on the appointment
    if (appointment.doctor_username) {
      return appointment.doctor_username.toLowerCase().trim();
    }

    const doctorIdentifier = appointment.doctor_id;
    if (!doctorIdentifier) return 'doctor';

    // 2. Query staff_accounts dynamically for ANY doctor ID or username
    const { data: staff, error } = await supabase
      .from('staff_accounts')
      .select('username')
      .or(`id.eq.${doctorIdentifier},username.eq.${doctorIdentifier}`)
      .maybeSingle();

    if (error) {
      console.error('Error fetching doctor username:', error);
    }

    return staff?.username ? staff.username.toLowerCase().trim() : 'doctor';
  };

  const handlePayment = async () => {
    setIsProcessing(true);

    try {
      // Mock payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Trigger call initiation if appointmentId is provided
      if (appointmentId) {
        // 1. Fetch appointment details to get doctor_username, doctor_id, and patient info
        const { data: appointment, error: fetchError } = await supabase
          .from("appointments")
          .select("id, patient_id, patient_name, doctor_username, doctor_id")
          .eq("id", appointmentId)
          .single();

        if (fetchError) {
          console.error("Failed to fetch appointment:", fetchError);
          return;
        }

        if (!appointment) {
          console.error("Appointment not found:", appointmentId);
          return;
        }

        // 2. Resolve doctor username dynamically from staff_accounts
        const doctorUsername = await fetchDoctorUsername(appointment);
        const roomId = `room_${appointment.id}`;

        console.log(`Initiating call for Appointment #${appointment.id} -> Target Doctor: "${doctorUsername}"`);

        // Step A: Update Appointment Payment Status in Supabase to IN_PROGRESS & paid
        const { error: apptError } = await supabase
          .from('appointments')
          .update({
            payment_status: 'paid',
            status: 'IN_PROGRESS',
            call_status: 'IN_PROGRESS',
            booking_status: 'confirmed',
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', String(appointment.id));

        if (apptError) {
          console.error('Failed to update appointment:', apptError);
        }

        // Step B: Insert record into calls table
        const { error: callError } = await supabase
          .from('calls')
          .insert([
            {
              appointment_id: String(appointment.id),
              patient_id: String(appointment.patient_id || appointment.id),
              patient_name: appointment.patient_name || 'Patient',
              doctor_username: doctorUsername,
              status: 'calling',
              room_id: roomId,
              created_at: new Date().toISOString(),
            },
          ]);

        if (callError) {
          console.error('Failed to create call:', callError);
        }

        console.log('Call record created successfully');

        // Step C: Dispatch socket event 'patient-paid'
        try {
          const socket = io(BACKEND_URL);
          socket.emit('patient-paid', {
            appointmentId: String(appointment.id),
          });
          console.log('[PaymentGate] Emitted patient-paid socket event for appointment:', appointment.id);
        } catch (socketErr) {
          console.warn('[PaymentGate] Failed to emit socket event:', socketErr);
        }

        // Step D: Trigger parent update / redirect to consultation room
        if (onPaymentSuccess) {
          onPaymentSuccess();
        } else if (onPayment) {
          onPayment();
        } else {
          window.location.href = `/consultation/room/${appointment.id}`;
        }
      } else {
        // If no appointmentId, just call onPayment
        if (onPayment) {
          onPayment();
        }
      }
    } catch (err) {
      console.error('Payment processing error:', err);
      alert("Payment processing failed. Please try again.");
    } finally {
      // ALWAYS reset loading state
      setIsProcessing(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-card border-border shadow-2xl max-h-[85vh] overflow-y-auto">
        <CardContent className="p-4 sm:p-6">
          
          {/* Lock Icon */}
          <div className="flex justify-center mb-4">
            <div className="bg-amber-500/10 p-4 rounded-full">
              <Lock className="h-8 w-8 text-amber-600" />
            </div>
          </div>

          {/* Title */}
          <h3 className="text-xl sm:text-2xl font-bold text-center text-foreground font-display mb-2">
            Unlock Video Consultation
          </h3>

          {/* Description */}
          <p className="text-sm sm:text-base text-center text-muted-foreground mb-6">
            Payment is required to start the video consultation with your doctor.
          </p>

          {/* Price Card */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-6 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Video Consultation Fee</p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground font-display">{amount} ETB</p>
              </div>
              <div className="bg-amber-500/10 p-3 rounded-lg">
                <CreditCard className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </div>

          {/* Payment Button */}
          <Button
            className={cn(
              "w-full h-14 py-3.5 text-base font-semibold rounded-xl shadow-md",
              "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
            )}
            onClick={handlePayment}
            disabled={isProcessing || isProcessingPayment}
          >
            {isProcessing || isProcessingPayment ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processing Payment...
              </>
            ) : (
              "Pay with Telebirr / Chapa"
            )}
          </Button>

          {/* Note */}
          <p className="text-[11px] sm:text-xs text-center text-muted-foreground mt-4">
            Secure payment powered by Telebirr and Chapa
          </p>

        </CardContent>
      </Card>
    </div>
  );
}
