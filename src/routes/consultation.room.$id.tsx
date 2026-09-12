import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Video, Phone, X, Loader2, AlertCircle, Mic, MicOff, Camera, CameraOff, LayoutDashboard, Calendar, MessageSquare, Video as VideoIcon, Settings, LogOut, Send, Paperclip, User, Stethoscope, Clock, PhoneCall } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useWebRTCSocket } from "@/hooks/useWebRTCSocket";
import { useStaffAuth } from "@/lib/staff-auth";
import { io, Socket } from "socket.io-client";

export const Route = createFileRoute("/consultation/room/$id")({
  head: () => ({
    meta: [
      { title: "Video Consultation Room — Dr. Amanuel Hospital" },
      { name: "description", content: "Secure video consultation room" },
    ],
  }),
  component: ConsultationRoomPage,
});

// Message interface for real-time chat
interface ChatMessage {
  id: string;
  appointment_id: string;
  room_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: 'doctor' | 'patient';
  message: string;
  created_at: string;
}

function ConsultationRoomPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user: staffUser, hydrated } = useStaffAuth();
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'messages' | 'attachments'>('messages');
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [attachments, setAttachments] = useState<Array<{ name: string; size: string; date: string }>>([
    { name: 'Patient_Medical_History.pdf', size: '2.4 MB', date: 'Today' },
    { name: 'Lab_Report_Vitals.pdf', size: '1.1 MB', date: 'Today' },
  ]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const userRole = staffUser?.username ? 'doctor' : 'patient';
  
  useEffect(() => {
    console.log('[ConsultationRoom] Room Info:', { 
      appointmentId: id,
      hasStaffUser: !!staffUser, 
      username: staffUser?.username, 
      determinedRole: userRole 
    });
  }, [id, userRole, staffUser]);
  const userId = staffUser?.username || `patient_${id}`;

  // WebRTC hook for peer-to-peer video connection
  // ALWAYS call at top level with consistent enabled value
  const {
    connectionState,
    error: webrtcError,
    localStream,
    remoteStream,
    isAudioOnly,
    mediaError,
    retryCameraAccess,
    toggleAudio,
    toggleVideo,
    endCall: disconnectWebRTC,
    isAudioEnabled,
    isVideoEnabled,
  } = useWebRTCSocket({
    signalingServerUrl: import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || 'http://localhost:3001',
    appointmentId: id,
    userId,
    userRole: userRole as 'doctor' | 'patient',
    localVideoRef,
    remoteVideoRef,
    enabled: true, // Always enabled to ensure consistent hook count
  });

  const hasLocalVideo = localStream && localStream.getVideoTracks().length > 0;

  // Audio cleanup on room mount - stops any ringing/ringtone immediately
  useEffect(() => {
    console.log('[Audio Cleanup] Stopping all audio elements on room mount');
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
  }, []); // Run once on mount

  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        const { data, error } = await supabase
          .from("appointments")
          .select("*")
          .eq("id", id)
          .single();

        if (error) {
          setError("Failed to load appointment details");
          console.error("Error fetching appointment:", error);
          return;
        }

        if (!data) {
          setError("Appointment not found");
          return;
        }

        setAppointment(data);
      } catch (err) {
        setError("An error occurred while loading the consultation");
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointment();
  }, [id]);

  // Socket.IO setup for real-time messaging
  useEffect(() => {
    if (!id || !userId) return;

    const roomId = `apt_${id}`;
    
    console.log('[Chat] Initializing Socket.IO connection for room:', roomId);
    
    // Initialize Socket.IO connection with optional authentication
    const backendUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || 'http://localhost:3001';
    console.log('[Chat] Connecting to backend URL:', backendUrl);
    
    // Get authentication token if available (for staff users)
    const authToken = localStorage.getItem('token') || localStorage.getItem('auth_token');
    
    socketRef.current = io(backendUrl, {
      transports: ['websocket', 'polling'],
      auth: {
        token: authToken || '', // Optional token for authenticated users
      },
      query: {
        token: authToken || '', // Fallback in query params
      },
    });

    // Handle successful connection / reconnect
    const joinConsultationRoom = () => {
      console.log('[Chat] Socket.IO connected:', socketRef.current?.id, 'joining', roomId);
      socketRef.current?.emit('join-room', { roomId, room_id: roomId, userId, userRole });
    };
    socketRef.current.on('connect', joinConsultationRoom);
    socketRef.current.on('reconnect', joinConsultationRoom);

    // Listen for incoming messages with duplicate prevention
    socketRef.current.on('receive-message', (newMessage: any) => {
      console.log('[Chat] Real-time message received:', newMessage);
      setMessages((prev) => {
        // Prevent duplicates by checking if message already exists
        const exists = prev.some((m) => {
          // Check by timestamp and sender for optimistic updates
          return (
            m.created_at === newMessage.created_at &&
            m.sender_id === newMessage.sender_id &&
            m.message === newMessage.message
          );
        });
        
        if (exists) {
          console.log('[Chat] Duplicate message detected, skipping');
          return prev;
        }
        
        console.log('[Chat] Adding new message to state');
        return [...prev, newMessage];
      });
    });

    // Handle connection errors
    socketRef.current.on('connect_error', (error) => {
      console.error('[Chat] Socket connection error:', error);
    });

    // Handle disconnection
    socketRef.current.on('disconnect', (reason) => {
      console.log('[Chat] Socket disconnected:', reason);
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        console.log('[Chat] Cleaning up Socket.IO connection');
        socketRef.current.emit('leave-room', { roomId, userId });
        socketRef.current.off('connect');
        socketRef.current.off('reconnect');
        socketRef.current.off('receive-message');
        socketRef.current.off('connect_error');
        socketRef.current.off('disconnect');
        socketRef.current.disconnect();
      }
    };
  }, [id, userId, userRole]);

  // Fetch historical messages from Supabase
  useEffect(() => {
    if (!id) return;

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('consultation_messages')
          .select('*')
          .eq('appointment_id', id)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('[Chat] Error fetching messages:', error);
          return;
        }

        if (data) {
          console.log('[Chat] Loaded', data.length, 'historical messages');
          setMessages((prev) => {
            const byKey = new Map<string, ChatMessage>();
            for (const m of data as ChatMessage[]) {
              byKey.set(String(m.id), m);
            }
            for (const m of prev) {
              const key = String(m.id);
              if (!byKey.has(key)) byKey.set(key, m);
            }
            return Array.from(byKey.values()).sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          });
        }
      } catch (err) {
        console.error('[Chat] Error:', err);
      }
    };

    fetchMessages();

    // Supabase Realtime subscription as fallback
    const roomId = `apt_${id}`;
    console.log('[Chat] Setting up Supabase Realtime subscription for room:', roomId);
    
    const channel = supabase
      .channel(`consultation-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'consultation_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          console.log('[Chat] Supabase Realtime message received:', payload.new);
          const newMessage = payload.new as ChatMessage;
          
          setMessages((prev) => {
            // Check if message already exists
            const exists = prev.some((m) => m.id === newMessage.id);
            if (exists) {
              console.log('[Chat] Message already exists (from Socket.IO), skipping');
              return prev;
            }
            console.log('[Chat] Adding message from Supabase Realtime');
            return [...prev, newMessage];
          });
        }
      )
      .subscribe((status) => {
        console.log('[Chat] Supabase Realtime subscription status:', status);
      });

    // Polling fallback so messages still sync if sockets/realtime drop
    const pollId = window.setInterval(fetchMessages, 4000);

    // Cleanup subscription
    return () => {
      console.log('[Chat] Cleaning up Supabase Realtime subscription');
      window.clearInterval(pollId);
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Bind localStream to localVideoRef
  useEffect(() => {
    const videoEl = localVideoRef.current;
    if (!videoEl || !localStream) return;

    if (videoEl.srcObject !== localStream) {
      videoEl.srcObject = localStream;
      videoEl.muted = true; // Crucial for browser autoplay compliance
      videoEl.play().catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Local video play error:', err);
        }
      });
    }
  }, [localStream, localVideoRef.current]);

  // Bind remoteStream to remoteVideoRef
  useEffect(() => {
    const videoEl = remoteVideoRef.current;
    if (!videoEl || !remoteStream) return;

    if (videoEl.srcObject !== remoteStream) {
      videoEl.srcObject = remoteStream;
      videoEl.play().catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Remote video play error:', err);
        }
      });
    }
  }, [remoteStream, remoteVideoRef.current]);

  const handleEndCall = async () => {
    try {
      // Disconnect WebRTC
      disconnectWebRTC();

      // Update appointment status to completed
      const { error } = await supabase
        .from("appointments")
        .update({ call_status: "COMPLETED" })
        .eq("id", id);

      if (error) {
        console.error("Error ending call:", error);
      }

      // Redirect based on user role
      if (userRole === 'doctor') {
        navigate({ to: "/staff/doctor/dashboard" });
      } else {
        navigate({ to: "/" });
      }
    } catch (err) {
      console.error("Error ending call:", err);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !socketRef.current || !id) return;

    const roomId = `apt_${id}`;
    const senderName = staffUser?.username || appointment?.patient_name || 'User';
    const messageText = newMessage.trim();
    
    // Clear input immediately for better UX
    setNewMessage('');
    
    // Create message payload with temporary ID
    const messagePayload = {
      id: `temp_${Date.now()}`, // Temporary ID for optimistic update
      appointment_id: id,
      room_id: roomId,
      sender_id: userId,
      sender_name: senderName,
      sender_role: userRole as 'doctor' | 'patient',
      message: messageText,
      created_at: new Date().toISOString(),
    };

    // 1. Immediately push to local UI (optimistic update)
    setMessages((prev) => [...prev, messagePayload]);

    // 2. Broadcast immediately over Socket.IO for real-time delivery
    socketRef.current.emit('send-message', {
      ...messagePayload,
      roomId,
      room_id: roomId,
      client_msg_id: messagePayload.id,
    });

    // 3. Persist to Supabase in the background (non-blocking)
    try {
      const { error } = await supabase
        .from('consultation_messages')
        .insert([{
          appointment_id: id,
          room_id: roomId,
          sender_id: userId,
          sender_name: senderName,
          sender_role: userRole as 'doctor' | 'patient',
          message: messageText,
          created_at: new Date().toISOString(),
        }]);

      if (error) {
        console.error('[Chat] Supabase save error:', error);
        // Note: Message already sent via Socket.IO, so no need to restore input
      }
    } catch (err) {
      console.error('[Chat] Unexpected error saving message:', err);
      // Message already broadcasted, just log the error
    }
  };

  // Handle Enter key press to send message
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Conditional returns AFTER all hooks
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-slate-600">Loading consultation room...</p>
        </div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Consultation Error
            </h2>
            <p className="text-slate-600 mb-4">
              {error || "Unable to load consultation details"}
            </p>
            <Button onClick={() => navigate({ to: "/" })}>
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black flex flex-col md:flex-row">
      {/* 1. MAIN VIDEO CONTAINER (Full Screen on Mobile) */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center bg-gray-900 overflow-hidden">
        {webrtcError ? (
          <div className="flex items-center justify-center h-full">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-8 text-center">
                <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-slate-900 mb-2">Connection Error</h2>
                <p className="text-slate-600 mb-6">{webrtcError}</p>
                <Button onClick={() => window.location.reload()}>Retry Connection</Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            {/* Media Error / Retry Notification Banner */}
            {mediaError && (
              <div className="absolute top-4 left-4 z-50 bg-amber-600/90 text-white px-4 py-2 rounded-lg text-xs flex items-center gap-3 backdrop-blur-md shadow-lg border border-amber-500/50">
                <span>{mediaError}</span>
                <button
                  onClick={retryCameraAccess}
                  className="bg-white text-amber-900 px-2.5 py-1 rounded font-semibold text-[11px] hover:bg-amber-100 transition shadow-sm"
                >
                  Retry Camera
                </button>
              </div>
            )}

            {/* Remote Video Stream (Full Screen) */}
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                onLoadedMetadata={() => console.log('Remote video metadata loaded')}
                onPlay={() => console.log('Remote video playing')}
                onError={(e) => console.error('Remote video error:', e)}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                <div className="text-center">
                  <VideoIcon className="h-16 w-16 text-slate-500 mx-auto mb-4 animate-pulse" />
                  <p className="text-slate-400 text-sm">
                    {connectionState === 'connecting' ? 'Connecting to peer...' : 
                     connectionState === 'connected' ? 'Waiting for video stream...' : 
                     'Waiting for participant to join...'}
                  </p>
                </div>
              </div>
            )}

            {/* Top Floating Header Overlay */}
            <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
              {/* Left Group */}
              <div className="pointer-events-auto flex items-center gap-2">
                {/* Connection Status Badge */}
                <span className={`px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-md border flex items-center gap-2 ${
                  connectionState === 'connected' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 
                  connectionState === 'connecting' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 
                  'bg-red-500/20 text-red-300 border-red-500/30'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    connectionState === 'connected' ? 'bg-emerald-400' : 
                    connectionState === 'connecting' ? 'bg-amber-400 animate-pulse' : 
                    'bg-red-400'
                  }`} />
                  {connectionState === 'connecting' ? 'Connecting...' : 
                   connectionState === 'connected' ? 'Connected' : 
                   connectionState === 'failed' ? 'Failed' : 'Disconnected'}
                </span>
                {/* Dynamic User Badge */}
                <span className="px-3 py-1.5 rounded-full bg-slate-900/60 text-white text-xs font-medium backdrop-blur-md border border-slate-700/50 flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  {userRole === 'doctor' ? `Patient: ${appointment?.patient_name || "Patient"}` : `Doctor: ${appointment?.doctor_username || "Doctor"}`}
                </span>
              </div>
            </div>

            {/* Picture-in-Picture Local Video */}
            <div className="absolute top-4 right-4 w-28 h-40 md:w-48 md:h-32 bg-gray-800 rounded-xl overflow-hidden shadow-lg border-2 border-white/20 z-20 flex items-center justify-center">
              {hasLocalVideo ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                /* Fallback view when camera is locked or audio-only */
                <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center space-y-1">
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200">
                    👤
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">Camera Unavailable</span>
                  <button
                    onClick={retryCameraAccess}
                    className="text-[10px] text-blue-400 font-semibold underline hover:text-blue-300 transition"
                  >
                    Retry Camera
                  </button>
                </div>
              )}
              {!isVideoEnabled && hasLocalVideo && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                  <CameraOff className="h-8 w-8 text-slate-600" />
                </div>
              )}
            </div>

            {/* Floating Imo-Style Controls at Bottom */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 z-20">
              <button
                onClick={toggleVideo}
                className={`p-3 rounded-full text-white transition-colors ${isVideoEnabled ? 'bg-white/20 hover:bg-white/30' : 'bg-red-600 hover:bg-red-700'}`}
                title={isVideoEnabled ? "Turn Off Camera" : "Turn On Camera"}
              >
                {isVideoEnabled ? <Camera className="w-6 h-6" /> : <CameraOff className="w-6 h-6" />}
              </button>

              <button
                onClick={toggleAudio}
                className={`p-3 rounded-full text-white transition-colors ${isAudioEnabled ? 'bg-white/20 hover:bg-white/30' : 'bg-red-600 hover:bg-red-700'}`}
                title={isAudioEnabled ? "Mute Microphone" : "Unmute Microphone"}
              >
                {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
              </button>
              
              {/* Chat Toggle Button */}
              <button 
                onClick={() => setIsChatOpen(!isChatOpen)} 
                className="p-3 bg-blue-600 hover:bg-blue-700 rounded-full text-white relative transition-colors"
                title="Toggle Chat"
              >
                <MessageSquare className="w-6 h-6" />
                {messages.length > 0 && !isChatOpen && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900" />
                )}
              </button>

              <button
                onClick={handleEndCall}
                className="p-3 bg-red-600 hover:bg-red-700 rounded-full text-white transition-colors"
                title="End Call"
              >
                <Phone className="w-6 h-6 rotate-[135deg]" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* 2. CHAT PANEL (Slide-over drawer on Mobile, Sidebar on Desktop) */}
      <div
        className={`
          fixed inset-0 z-50 bg-white flex flex-col transition-transform duration-300 ease-in-out
          ${isChatOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none md:pointer-events-auto'}
          md:static md:translate-y-0 md:w-[380px] md:h-full md:flex md:border-l border-slate-200
        `}
      >
        {/* Mobile Chat Header with Close/Back Button */}
        <div className="p-4 bg-blue-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsChatOpen(false)} 
              className="md:hidden p-1 hover:bg-blue-700 rounded-full text-white font-medium text-xs flex items-center gap-1"
            >
              ← Back
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">
                  {userRole === 'doctor' ? 'Dr. ' + staffUser?.username : appointment?.doctor_username || 'Doctor'}
                </h3>
                <span className="text-xs text-blue-200">General Practitioner</span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setIsChatOpen(false)} 
            className="md:hidden p-1 hover:bg-blue-700 rounded-full text-white"
            title="Close Chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('messages')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'messages' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Recent Messages
            </button>
            <button
              onClick={() => setActiveTab('attachments')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'attachments' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Attachments
            </button>
          </div>
        </div>

        {/* Messages Area */}
        {activeTab === 'messages' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="text-center">
              <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                Consultation started
              </span>
            </div>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender_id === userId ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                    message.sender_id === userId
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                  }`}
                >
                  <p className="text-xs font-medium mb-1 opacity-80">
                    {message.sender_name}
                  </p>
                  <p className="text-sm">{message.message}</p>
                  <p className={`text-xs mt-1 ${message.sender_id === userId ? 'text-blue-200' : 'text-slate-400'}`}>
                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        )}

        {/* Attachments Area */}
        {activeTab === 'attachments' && (
          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center justify-between">
                <span>Shared Files & Documents</span>
                <span className="text-xs text-blue-600 font-normal">{attachments.length} files</span>
              </h3>
              <div className="space-y-2">
                {attachments.map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                    <div className="flex items-center gap-3">
                      <Paperclip className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-xs font-medium text-slate-800">{file.name}</p>
                        <p className="text-[10px] text-slate-400">{file.size} · {file.date}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600">Download</Button>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
              <Paperclip className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-600 font-medium">Drag & drop files or click to upload</p>
              <p className="text-[10px] text-slate-400 mt-1">PDF, PNG, JPG up to 10MB</p>
            </div>
          </div>
        )}

        {/* Message Input */}
        <div className="p-3 border-t bg-gray-50">
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
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
