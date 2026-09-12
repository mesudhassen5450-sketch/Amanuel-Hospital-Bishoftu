import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { VideoConsultationContainer } from "@/components/telemedicine/VideoConsultationContainer";
import { supabase } from "@/lib/supabase";
import { getStaffRole } from "@/lib/staff-auth";
import { toast } from "sonner";
import { Loader2, User, Clock, PhoneCall, Mic, MicOff, Camera, CameraOff, Video as VideoIcon, LayoutDashboard, Send, Paperclip, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { io } from "socket.io-client";

export const Route = createFileRoute("/appointments/$appointmentId")({
  head: () => ({ meta: [{ title: "Video Consultation — Dr. Amanuel Hospital" }] }),
  component: VideoConsultationPage,
});

// ── helpers ───────────────────────────────────────────────────────────────────
function calcAge(dob?: string | null): number | null {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

function VideoConsultationPage() {
  const { appointmentId } = Route.useParams();
  const navigate = useNavigate();

  // ── Auth: is this a doctor/staff session? ───────────────────────────────────
  const staffRole = getStaffRole();
  const isDoctor =
    staffRole === "doctor" ||
    staffRole === "staff" ||
    staffRole === "admin" ||
    (typeof window !== "undefined" && !!sessionStorage.getItem("staff_session"));

  // ── State ───────────────────────────────────────────────────────────────────
  const [loadingAppt, setLoadingAppt]   = useState(true);
  const [appointment, setAppointment]   = useState<any>(null);
  const [isPaid, setIsPaid]             = useState(isDoctor);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [hasJoinedCall, setHasJoinedCall] = useState(false);
  const [patientTab, setPatientTab]     = useState<'messages' | 'overview'>('messages');
  const [messages, setMessages] = useState<Array<{ id: string; text: string; sender: 'me' | 'other'; timestamp: Date }>>([
    { id: '1', text: 'Hello, I\'m ready for the consultation.', sender: 'other', timestamp: new Date() },
  ]);
  const [newMessage, setNewMessage] = useState('');
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Fetch appointment + patient from Supabase ───────────────────────────────
  const fetchAppointmentData = async () => {
    setLoadingAppt(true);
    try {
      // Parse appointment ID from room string (e.g. "apt_53" → "53") or use directly
      const cleanId = String(appointmentId).replace(/^apt_/i, "");

      console.log('Fetching appointment with ID:', cleanId);

      const { data, error } = await supabase
        .from("appointments")
        .select("*, patient:patients(*)")
        .eq("id", cleanId)
        .maybeSingle();

      if (error) {
        console.error('Supabase Appointment Fetch Error:', error);
        throw error;
      }

      console.log('Supabase Appointment Data:', data);

      if (data) {
        const patient = data.patient;
        const age = calcAge(patient?.date_of_birth);

        // Flexible field mapping for patient data
        const patientName = data.patient_name || data.full_name || patient?.full_name || patient?.name || "";
        const phoneNumber = data.phone_number || data.phone || patient?.phone_number || patient?.phone || "";
        const reason = data.reason_for_visit || data.symptoms || data.reason || data.complaint || data.chief_complaint || "Online Video Consultation";
        const patientAge = age || data.age || null;
        const patientGender = patient?.gender || data.gender || null;

        setAppointment({
          id:              String(data.id),
          // Patient info — live from DB with flexible mapping
          patient_name:    patientName,
          phone:           phoneNumber,
          patient_age:     patientAge,
          patient_gender:  patientGender,
          primary_complaints: reason,
          // Payment / status
          payment_status:  data.payment_status,
          status:          data.status ?? "SCHEDULED",
          consultation_fee: data.amount ?? data.consultation_fee ?? 100,
          // Vitals — show "N/A" if not recorded
          vitals: {
            temperature:   patient?.temperature   ?? data.temperature   ?? "N/A",
            blood_pressure: patient?.blood_pressure ?? data.blood_pressure ?? "N/A",
            heart_rate:    patient?.heart_rate    ?? data.heart_rate    ?? "N/A",
            weight:        patient?.weight        ?? data.weight        ?? "N/A",
          },
          // Extra
          doctor_name:     data.doctor_name ?? "",
        });
        // Doctor bypasses payment; patients need paid status
        setIsPaid(
          isDoctor ||
          data.payment_status === "paid" ||
          data.payment_status === "PAID"
        );
      } else {
        // Appointment not found — no mock patient/doctor names
        setAppointment(null);
        setIsPaid(false);
      }
    } catch (err: any) {
      console.error("Failed to load appointment:", err);
      toast.error("Could not load appointment details.");
      setAppointment(null);
      setIsPaid(false);
    } finally {
      setLoadingAppt(false);
    }
  };

  // ── Effects (ALL HOOKS MUST RUN UNCONDITIONALLY AT THE TOP) ─────────────────
  useEffect(() => {
    fetchAppointmentData();
  }, [appointmentId, isDoctor]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Cash payment handler ─────────────────────────────────────────────────────
  const handlePayment = async () => {
    try {
      setIsProcessingPayment(true);
      const numericId = String(appointmentId).replace(/^apt_/i, "");

      const { error } = await supabase
        .from("appointments")
        .update({
          payment_status: "paid",
          paid_at:        new Date().toISOString(),
          booking_status: "confirmed",
          status:         "IN_PROGRESS",
          call_status:    "IN_PROGRESS",
          updated_at:     new Date().toISOString(),
        })
        .eq("id", numericId);

      if (error) { toast.error(`Payment failed: ${error.message}`); return; }

      // Emit patient-paid socket event to signaling server
      try {
        const socket = io('http://localhost:3001');
        socket.emit('patient-paid', {
          appointmentId: String(numericId),
        });
        console.log('Emitted patient-paid event post-payment for appointment:', numericId);
      } catch (sErr) {
        console.warn('Socket emit error:', sErr);
      }

      toast.success("Payment completed successfully!");
      window.location.href = `/consultation/room/${numericId}`;
    } catch (err: any) {
      toast.error(err?.message ?? "Payment failed. Please try again.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      setMessages([...messages, {
        id: Date.now().toString(),
        text: newMessage,
        sender: 'me',
        timestamp: new Date()
      }]);
      setNewMessage('');
    }
  };

  const handleEndCall = async () => {
    try {
      setHasJoinedCall(false);
      await supabase
        .from("appointments")
        .update({
          visit_status: "completed",
          call_status: "ended",
          status: "COMPLETED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", appointmentId);

      if (isDoctor) {
        navigate({ to: '/staff/doctor/dashboard' });
      } else {
        navigate({ to: '/' });
      }
    } catch (error) {
      console.error("Error ending call:", error);
    }
  };

  // ── Loading state guard (MUST BE AFTER ALL HOOKS) ────────────────────────────
  if (loadingAppt) {
    return (
      <div className="h-screen w-screen flex items-center justify-center text-slate-400 gap-2 bg-slate-950">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">Loading appointment...</span>
      </div>
    );
  }

  // ── Main layout — Full-screen video + chat sidebar ─────────────────────────────
  return (
    <div className="h-screen w-screen flex overflow-hidden bg-slate-950">
      {/* Center Main Stage - Full Width */}
      <div className="flex-1 flex flex-col h-full">
        {/* Full-Bleed Video Stage */}
        <div className="relative flex-1 h-full w-full bg-slate-950 overflow-hidden flex flex-col">
          
          {/* Payment Gate Overlay - Show ONLY when unpaid */}
          {!isPaid && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/95">
              <div className="text-center space-y-6 max-w-md p-8">
                <div className="w-24 h-24 rounded-full bg-amber-600/20 border-2 border-amber-500/40 flex items-center justify-center mx-auto">
                  <VideoIcon className="w-12 h-12 text-amber-400"/>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Payment Required</h3>
                  <p className="text-slate-400 text-sm">
                    Please complete the payment to join the video consultation.
                  </p>
                  <p className="text-amber-400 font-semibold mt-2">Amount: {appointment.consultation_fee || 100} ETB</p>
                </div>
                <Button
                  onClick={handlePayment}
                  disabled={isProcessingPayment}
                  className="w-full h-14 text-lg font-semibold bg-amber-600 hover:bg-amber-700 rounded-xl gap-2"
                >
                  {isProcessingPayment ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Pay Now"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Pre-Call Screen - Show green button before joining */}
          {isPaid && !hasJoinedCall && (
            <div className="h-full flex flex-col items-center justify-center bg-slate-950 p-6">
              <div className="text-center space-y-6 max-w-md">
                <div className="w-24 h-24 rounded-full bg-emerald-600/20 border-2 border-emerald-500/40 flex items-center justify-center mx-auto">
                  <VideoIcon className="w-12 h-12 text-emerald-400"/>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    Join Video Call
                  </h3>
                  <p className="text-slate-400 text-sm">
                    You're about to join a video consultation with your doctor. Click below to begin.
                  </p>
                </div>
                <Button
                  onClick={() => setHasJoinedCall(true)}
                  className="w-full h-14 text-lg font-semibold bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2"
                >
                  <VideoIcon className="h-5 w-5" />
                  Join Video Call
                </Button>
              </div>
            </div>
          )}

          {/* Full-Screen Video Layout - Show ONLY when joined */}
          {isPaid && hasJoinedCall && (
            <>
              {/* Remote Video */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />

              {/* Top Floating Header Overlay */}
              <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
                {/* Left Group */}
                <div className="pointer-events-auto flex items-center gap-2">
                  {/* Connection Status Badge */}
                  <span className="px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium backdrop-blur-md border border-emerald-500/30 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Connected
                  </span>
                  {/* Doctor Info Badge */}
                  <span className="px-3 py-1.5 rounded-full bg-slate-900/60 text-white text-xs font-medium backdrop-blur-md border border-slate-700/50 flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Doctor: {appointment?.doctor_name || "—"}
                  </span>
                </div>
                {/* Right Group */}
                <div className="pointer-events-auto">
                  <button
                    onClick={handleEndCall}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-medium shadow-lg transition-colors flex items-center gap-2"
                  >
                    <PhoneCall className="h-4 w-4" />
                    End Call
                  </button>
                </div>
              </div>

              {/* Floating Local Self-View (Picture-in-Picture) */}
              <div className="absolute top-16 right-4 w-48 h-32 rounded-xl border-2 border-white/80 shadow-xl overflow-hidden z-20 bg-slate-900">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Floating Dock Controls */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-slate-900/80 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-slate-700/50 flex items-center gap-3 shadow-2xl">
                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-full bg-slate-200 hover:bg-slate-300 text-slate-900"
                >
                  <Mic className="h-5 w-5" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-full bg-slate-200 hover:bg-slate-300 text-slate-900"
                >
                  <Camera className="h-5 w-5" />
                </Button>
                <div className="w-px h-8 bg-slate-600" />
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <LayoutDashboard className="h-5 w-5" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right Panel - Doctor Profile & Chat */}
      <div className="w-80 lg:w-96 bg-white border-l border-slate-200 flex flex-col">
        {/* Doctor Profile Header */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-600 text-white p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <User className="h-8 w-8" />
            </div>
            <div>
              <h2 className="font-bold text-lg">
                {appointment?.doctor_name || "—"}
              </h2>
              <p className="text-blue-100 text-sm">General Practitioner</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-xs text-blue-100">Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200">
          <div className="flex">
            <button
              onClick={() => setPatientTab('messages')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                patientTab === 'messages' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Recent Messages
            </button>
            <button
              onClick={() => setPatientTab('overview')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                patientTab === 'overview' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Patient Overview
            </button>
          </div>
        </div>

        {/* Messages Area */}
        {patientTab === 'messages' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="text-center">
              <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                Consultation started
              </span>
            </div>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                    message.sender === 'me'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                  <p className={`text-xs mt-1 ${message.sender === 'me' ? 'text-blue-200' : 'text-slate-400'}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        )}

        {/* Patient Overview Area */}
        {patientTab === 'overview' && (
          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Consultation Details</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Patient Name</p>
                  <p className="text-sm font-medium text-slate-800">{appointment?.patient_name || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Phone Number</p>
                  <p className="text-sm font-medium text-slate-800">{appointment?.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Primary Complaint</p>
                  <p className="text-sm font-medium text-slate-800">{appointment?.primary_complaints || 'Online Video Consultation'}</p>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Appointment Status</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Appointment ID:</span>
                  <span className="font-mono font-medium text-slate-800">#{appointmentId}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Fee:</span>
                  <span className="font-semibold text-emerald-600">{appointment?.consultation_fee || 100} ETB (Paid)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Message Input */}
        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-slate-600"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 bg-slate-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button
              onClick={handleSendMessage}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full"
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
