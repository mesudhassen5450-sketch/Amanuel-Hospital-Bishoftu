import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Calendar, Clock, CreditCard, User, Phone, DollarSign, Home, RefreshCw, FileText } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useBooking } from "@/lib/booking-context";
import { verifyChapaPayment } from "@/lib/chapa-server";
import { addBookingServer } from "@/lib/admin-server";
import { useLanguage } from "@/lib/language-context";
import { t } from "@/lib/translations";
import { supabase } from "@/lib/supabase";
import { notifyDoctorIncomingCall } from "@/lib/notify-doctor-call";

interface PaymentSuccessSearch {
  tx_ref?: string;
}

export const Route = createFileRoute("/payment-success")({
  validateSearch: (search: Record<string, unknown>): PaymentSuccessSearch => {
    return {
      tx_ref: search.tx_ref as string | undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Booking Confirmation — Dr. Amanuel Hospital" },
      { name: "description", content: "Your appointment at Dr. Amanuel Hospital has been successfully booked and payment is verified." },
    ],
  }),
  component: PaymentSuccessPage,
});

function PaymentSuccessPage() {
  const { tx_ref } = Route.useSearch();
  const { booking, setBooking } = useBooking();
  const { lang } = useLanguage();

  const [verifying, setVerifying] = useState(!!tx_ref);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [txDetails, setTxDetails] = useState<any>(null);

  useEffect(() => {
    if (!tx_ref) {
      setVerifying(false);
      return;
    }

    let isMounted = true;

    async function checkPayment() {
      try {
        const result = await verifyChapaPayment({ data: { txRef: tx_ref! } });
        
        if (!isMounted) return;

        if (result.success) {
          setVerified(true);
          setTxDetails(result.data);
          
          const activeBooking = booking || (() => {
            try {
              const stored = sessionStorage.getItem("temp_booking");
              return stored ? JSON.parse(stored) : null;
            } catch {
              return null;
            }
          })();

          if (activeBooking) {
            const confirmedBooking = {
              ...activeBooking,
              status: "Paid & Confirmed",
              paymentStatus: "success",
              txRef: tx_ref
            };

            try {
              await addBookingServer({
                data: {
                  fullName: confirmedBooking.fullName,
                  phoneNumber: confirmedBooking.phoneNumber,
                  appointmentDate: confirmedBooking.appointmentDate,
                  appointmentTime: confirmedBooking.appointmentTime,
                  paymentMethod: confirmedBooking.paymentMethod,
                  amount: confirmedBooking.amount,
                  status: confirmedBooking.status,
                  txRef: confirmedBooking.txRef,
                  paymentStatus: confirmedBooking.paymentStatus
                }
              });
            } catch (serverErr) {
              console.error("Failed to save confirmed booking to server:", serverErr);
            }

            // Trigger call initiation for video consultations
            // Check if this is a video consultation appointment
            const appointmentId = sessionStorage.getItem("appointment_id");
            const doctorUsername = sessionStorage.getItem("doctor_username");
            if (appointmentId && doctorUsername) {
              try {
                // First, get the appointment details
                const { data: appointmentData, error: fetchError } = await supabase
                  .from("appointments")
                  .select("*")
                  .eq("id", appointmentId)
                  .single();

                if (fetchError || !appointmentData) {
                  console.error("Failed to fetch appointment details:", fetchError);
                  throw fetchError;
                }

                // Generate a unique room ID
                const roomId = `room_${Date.now()}_${appointmentId}`;

                // Insert into calls table for real-time signaling
                const { error: callInsertError } = await supabase
                  .from("calls")
                  .insert({
                    patient_id: appointmentData.patient_id || confirmedBooking.phoneNumber,
                    patient_name: appointmentData.full_name || confirmedBooking.fullName,
                    doctor_username: doctorUsername,
                    appointment_id: appointmentId,
                    status: "calling",
                    room_id: roomId,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  });

                if (callInsertError) {
                  console.error("Failed to insert call record:", callInsertError);
                  // Fallback: update appointment status directly
                  await supabase
                    .from("appointments")
                    .update({
                      call_status: "RINGING",
                      payment_status: "paid",
                      booking_status: "confirmed",
                      updated_at: new Date().toISOString()
                    })
                    .eq("id", appointmentId);
                } else {
                  console.log("Call record created with room_id:", roomId);
                  
                  // Update appointment status as well
                  await supabase
                    .from("appointments")
                    .update({
                      call_status: "RINGING",
                      payment_status: "paid",
                      booking_status: "confirmed",
                      room_id: roomId,
                      updated_at: new Date().toISOString()
                    })
                    .eq("id", appointmentId);
                }

                // Always ring the doctor over Socket.IO after payment verification
                await notifyDoctorIncomingCall({
                  appointmentId: String(appointmentId),
                  doctorUsername: String(doctorUsername).toLowerCase().trim(),
                  patientName: appointmentData.full_name || confirmedBooking.fullName || "Patient",
                  patientPhone: appointmentData.patient_id || confirmedBooking.phoneNumber || "",
                  primaryComplaint:
                    appointmentData.primary_complaints ||
                    appointmentData.reason_for_visit ||
                    appointmentData.reason ||
                    "Video Consultation",
                  roomId,
                });
              } catch (callErr) {
                console.error("Failed to trigger call initiation:", callErr);
              }
            }

            setBooking(confirmedBooking);
          }
        } else {
          setError(result.message || "Failed to verify the transaction status.");
        }
      } catch (err: any) {
        if (isMounted) {
          setError("An unexpected error occurred during verification.");
          console.error(err);
        }
      } finally {
        if (isMounted) {
          setVerifying(false);
        }
      }
    }

    checkPayment();

    return () => {
      isMounted = false;
    };
  }, [tx_ref, setBooking]);

  const getPaymentName = (method: string) => {
    if (method === "Card / Other") return "Credit/Debit Card / Bank Transfer";
    return method;
  };

  return (
    <SiteLayout>
      <div className="min-h-[80vh] py-12 md:py-20 px-4 flex items-center justify-center">
        <div className="w-full max-w-2xl">
          {verifying ? (
            <Card className="border border-border bg-card/60 backdrop-blur-md shadow-lg rounded-3xl p-8 text-center animate-pulse">
              <CardContent className="flex flex-col items-center justify-center py-12 space-y-6">
                <RefreshCw className="h-12 w-12 text-primary animate-spin" />
                <div className="space-y-2">
                  <CardTitle className="text-xl font-bold font-display">Verifying Payment</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    Please wait while we securely verify your transaction with Chapa...
                  </CardDescription>
                </div>
              </CardContent>
            </Card>
          ) : verified ? (
            <Card className="border border-border bg-card shadow-lg rounded-3xl overflow-hidden animate-fade-in">
              <div className="h-2 bg-gradient-to-r from-success via-emerald-500 to-success" />
              
              <CardHeader className="text-center p-6 sm:p-8 border-b border-border/40 bg-success/5">
                <div className="flex justify-center mb-4">
                  <div className="bg-success/10 p-3 rounded-full animate-bounce-soft">
                    <CheckCircle2 className="h-14 w-14 text-success" />
                  </div>
                </div>
                <CardTitle className="text-2xl sm:text-3xl font-extrabold text-success font-display">
                  Appointment Confirmed!
                </CardTitle>
                <CardDescription className="text-muted-foreground text-sm mt-2">
                  Your payment has been successfully processed and your appointment is locked in.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 sm:p-8 space-y-6">
                {/* Appointment Information Card */}
                <div className="rounded-2xl border border-border/60 bg-secondary/20 p-5 space-y-4">
                  <h3 className="font-display text-sm font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-primary" />
                    Appointment Details
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="bg-background border border-border p-2 rounded-xl text-primary">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Patient Name</p>
                        <p className="font-semibold text-foreground">{booking?.fullName || "Patient"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="bg-background border border-border p-2 rounded-xl text-primary">
                        <Phone className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Phone Number</p>
                        <p className="font-semibold text-foreground">{booking?.phoneNumber || "N/A"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="bg-background border border-border p-2 rounded-xl text-primary">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Preferred Date</p>
                        <p className="font-semibold text-foreground">{booking?.appointmentDate || "N/A"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="bg-background border border-border p-2 rounded-xl text-primary">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Time Slot</p>
                        <p className="font-semibold text-foreground">{booking?.appointmentTime || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Breakdown */}
                <div className="rounded-2xl border border-border/60 p-5 space-y-4 bg-background">
                  <h3 className="font-display text-sm font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-primary" />
                    Payment Information
                  </h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Method</span>
                      <span className="font-semibold text-foreground">{getPaymentName(booking?.paymentMethod || "Online (Chapa)")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Chapa Reference</span>
                      <span className="font-mono text-xs text-foreground font-semibold break-all">{tx_ref}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-border/40 font-semibold">
                      <span className="text-muted-foreground">Amount Paid</span>
                      <span className="text-success text-lg">{booking?.amount || 300} ETB</span>
                    </div>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col sm:flex-row gap-3 p-6 sm:p-8 bg-secondary/10 border-t border-border/40">
                <Button asChild variant="outline" className="w-full sm:flex-1 rounded-xl h-11">
                  <Link to="/booking">Book Another</Link>
                </Button>
                <Button asChild className="w-full sm:flex-1 rounded-xl h-11 gap-1.5 shadow-md">
                  <Link to="/">
                    <Home className="h-4 w-4" />
                    Back to Home
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card className="border border-border bg-card shadow-lg rounded-3xl overflow-hidden animate-fade-in">
              <div className="h-2 bg-destructive" />
              
              <CardHeader className="text-center p-6 sm:p-8 border-b border-border/40 bg-destructive/5">
                <div className="flex justify-center mb-4">
                  <div className="bg-destructive/10 p-3 rounded-full text-destructive">
                    <AlertTriangle className="h-14 w-14" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold font-display text-destructive">
                  Payment Verification Failed
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground mt-2">
                  {error || "We couldn't confirm your transaction with Chapa."}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 sm:p-8 text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  If the payment was debited from your account, please contact our support team at <span className="font-semibold text-foreground">dramanuelhospital@gmail.com</span> with your reference:
                </p>
                {tx_ref && (
                  <code className="block bg-secondary/40 border border-border p-3 rounded-xl font-mono text-xs text-foreground font-semibold break-all">
                    {tx_ref}
                  </code>
                )}
              </CardContent>

              <CardFooter className="flex flex-col sm:flex-row gap-3 p-6 sm:p-8 bg-secondary/10 border-t border-border/40">
                <Button asChild variant="outline" className="w-full sm:flex-1 rounded-xl h-11">
                  <Link to="/booking">Retry Booking</Link>
                </Button>
                <Button asChild className="w-full sm:flex-1 rounded-xl h-11 gap-1.5">
                  <Link to="/">
                    <Home className="h-4 w-4" />
                    Back to Home
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
