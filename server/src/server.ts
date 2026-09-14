import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io";
import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import staffRoutes from "./routes/staff.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import doctorRoutes from "./routes/doctors.routes.js";
import { setupCallSockets } from "./sockets/call.socket.js";
import { prisma } from "./config/db.js";

const app = express();
const server = http.createServer(app);

const PORT = Number(process.env.PORT) || 3001;

// ── CORS Configuration ─────────────────────────────────────────────────────
const allowedOrigins = [
  "https://amanuelhospital.com.et",
  "https://www.amanuelhospital.com.et",
  "https://amanuelhospital.netlify.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

// Add custom origin from environment variable if provided
if (process.env.CORS_ORIGIN) {
  const customOrigins = process.env.CORS_ORIGIN.split(",").map((o) => o.trim());
  allowedOrigins.push(...customOrigins);
}

function isAllowedOrigin(origin?: string | null): boolean {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    if (host.endsWith(".netlify.app")) return true;
    if (host.endsWith(".onrender.com")) return true;
    if (host.endsWith("amanuelhospital.com.et")) return true;
  } catch {
    return false;
  }
  return false;
}

// ── Middlewares ─────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin) return callback(null, true);

      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      // Reject other origins
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── HTTP Routes ─────────────────────────────────────────────────────────────
app.use("/health", healthRoutes);
app.use("/api/health", healthRoutes);

// Authentication Routes
app.use("/api/auth", authRoutes);

// Staff Management Routes
app.use("/api/staff", staffRoutes);

// Doctors Showcase Routes
app.use("/api/doctors", doctorRoutes);

// Payment Processing Routes

// Payment Processing Routes
app.use("/api/payments", paymentRoutes);

// WebRTC ICE Servers Endpoint
app.get("/api/webrtc/ice-servers", (req, res) => {
  // Return STUN servers for WebRTC connections
  // In production, you can add TURN servers here for better connectivity
  const iceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ];

  res.json({ iceServers });
});

app.get("/", (req, res) => {
  res.json({
    name: "Dr. Amanuel Hospital Backend Server",
    status: "running",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      auth: "/api/auth",
      staff: "/api/staff",
      doctors: "/api/doctors",
      payments: "/api/payments",
    },
  });
});

// ── Socket.IO Server & Real-Time Signaling ──────────────────────────────────
const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps)
      if (!origin) return callback(null, true);

      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      // Reject other origins
      console.warn(`[Socket.IO CORS] Blocked request from origin: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// ── Initialize Real-Time Call & Queue System (JWT-authenticated) ────────────
setupCallSockets(io);
console.log("[Socket.IO] Real-time call & queue system initialized");

// ── Legacy Socket Events (for backward compatibility) ───────────────────────
// In-memory mapping for registered doctors and room participants
const connectedDoctors = new Map<string, string>(); // doctorUsername -> socketId
const roomParticipants = new Map<string, Set<string>>(); // roomId -> Set of socketIds

function normalizeConsultationRoomId(raw?: string | null): string {
  if (!raw) return "";
  const value = String(raw).trim();
  if (!value) return "";
  const cleaned = value.replace(/^(apt_|room_|call_)/i, "");
  return `apt_${cleaned}`;
}

io.on("connection", (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // Doctor registration for incoming call notifications
  socket.on("register-doctor", (data: {
    doctorUsername?: string;
    doctorId?: string;
    username?: string;
  }) => {
    const doctorUsername = (
      data.doctorUsername ||
      data.doctorId ||
      data.username ||
      ""
    )
      .toLowerCase()
      .trim();
    if (!doctorUsername) return;

    connectedDoctors.set(doctorUsername, socket.id);
    // Join a private room so incoming-call can be routed to this doctor only
    const roomName = `doctor_${doctorUsername}`;
    socket.join(roomName);
    console.log(`[Socket.IO] Doctor registered: ${doctorUsername} → ${roomName} (${socket.id})`);
    socket.emit("doctor-registered", { success: true, channel: roomName });
  });

  // Patient → doctor availability request (pre-payment)
  socket.on("consultation-request", (data: {
    doctorUsername?: string;
    doctorId?: string;
    appointmentId?: string;
    id?: string;
    patientName?: string;
    patientPhone?: string;
    primaryComplaint?: string;
    callStatus?: string;
    roomId?: string;
  }) => {
    const docKey = (data.doctorUsername || data.doctorId || "").toLowerCase().trim();
    const appointmentId = String(data.appointmentId || data.id || "");
    const payload = {
      appointmentId,
      id: appointmentId,
      patientName: data.patientName || "Patient",
      patientPhone: data.patientPhone || "",
      primaryComplaint: data.primaryComplaint || "Video Consultation Request",
      doctorUsername: docKey,
      callStatus: data.callStatus || "REQUESTING_DOCTOR",
      roomId: data.roomId || `room_${appointmentId}`,
      createdAt: new Date().toISOString(),
    };

    console.log(`[Socket.IO] consultation-request for doctor="${docKey}" appointment=${appointmentId}`);

    if (docKey) {
      io.to(`doctor_${docKey}`).emit("consultation-request", payload);
      const doctorSocketId = connectedDoctors.get(docKey);
      if (doctorSocketId) {
        io.to(doctorSocketId).emit("consultation-request", payload);
      }
    }
    socket.broadcast.emit("consultation-request", payload);
  });

  // Patient → doctor ringing (post-payment). This is what the doctor UI listens for.
  socket.on("incoming-call", (data: {
    doctorUsername?: string;
    doctorId?: string;
    appointmentId?: string;
    id?: string;
    patientName?: string;
    patientPhone?: string;
    primaryComplaint?: string;
    roomId?: string;
    roomUrl?: string;
  }) => {
    const docKey = (data.doctorUsername || data.doctorId || "").toLowerCase().trim();
    const appointmentId = String(data.appointmentId || data.id || "");
    const payload = {
      appointmentId,
      id: appointmentId,
      patientName: data.patientName || "Patient",
      patientPhone: data.patientPhone || "",
      primaryComplaint: data.primaryComplaint || "Video Consultation",
      doctorUsername: docKey,
      roomId: data.roomId || `room_${appointmentId}`,
      roomUrl: data.roomUrl || `/consultation/room/${appointmentId}`,
      createdAt: new Date().toISOString(),
    };

    console.log(`[Socket.IO] incoming-call for doctor="${docKey}" appointment=${appointmentId}`);

    if (docKey) {
      io.to(`doctor_${docKey}`).emit("incoming-call", payload);
      const doctorSocketId = connectedDoctors.get(docKey);
      if (doctorSocketId) {
        io.to(doctorSocketId).emit("incoming-call", payload);
      }
    }
    // Fallback broadcast so a connected doctor UI still receives the ring
    // even if register-doctor username casing/room join failed.
    socket.broadcast.emit("incoming-call", payload);
  });

  // Join video consultation room
  socket.on("join-room", (data: { roomId?: string; room_id?: string; userId: string; userRole?: string }) => {
    const roomId = normalizeConsultationRoomId(data.roomId || data.room_id);
    const { userId, userRole } = data;
    if (!roomId) return;

    socket.join(roomId);
    if (!roomParticipants.has(roomId)) {
      roomParticipants.set(roomId, new Set());
    }
    roomParticipants.get(roomId)!.add(socket.id);

    console.log(`[Socket.IO] User ${userId} (${userRole || "participant"}) joined room: ${roomId}`);

    // Notify other participants in room
    socket.to(roomId).emit("user-joined", { userId, socketId: socket.id, userRole });
  });

  // Leave consultation room
  socket.on("leave-room", (data: { roomId?: string; room_id?: string; userId: string }) => {
    const roomId = normalizeConsultationRoomId(data.roomId || data.room_id);
    const { userId } = data;
    if (!roomId) return;

    socket.leave(roomId);
    if (roomParticipants.has(roomId)) {
      roomParticipants.get(roomId)!.delete(socket.id);
    }

    console.log(`[Socket.IO] User ${userId} left room: ${roomId}`);
    socket.to(roomId).emit("user-left", { userId, socketId: socket.id });
  });

  // Real-time chat message broadcast (doctor <-> patient)
  socket.on("send-message", (messageData: any) => {
    const roomId = normalizeConsultationRoomId(messageData.roomId || messageData.room_id);
    if (!roomId) return;

    const payload = {
      ...messageData,
      roomId,
      room_id: roomId,
    };

    console.log(`[Socket.IO] Real-time message in room ${roomId}:`, payload.message);
    // Broadcast to other participants only — sender already has optimistic UI
    socket.to(roomId).emit("receive-message", payload);
  });

  // Patient paid event — also ring the doctor when username is included
  socket.on(
    "patient-paid",
    (data: {
      appointmentId: string;
      doctorUsername?: string;
      patientName?: string;
      primaryComplaint?: string;
      roomId?: string;
    }) => {
      console.log(`[Socket.IO] Patient paid for appointment: ${data.appointmentId}`);
      io.emit("patient-paid", data);

      const docKey = (data.doctorUsername || "").toLowerCase().trim();
      if (!docKey || !data.appointmentId) return;

      const payload = {
        appointmentId: String(data.appointmentId),
        id: String(data.appointmentId),
        patientName: data.patientName || "Patient",
        primaryComplaint: data.primaryComplaint || "Video Consultation",
        doctorUsername: docKey,
        roomId: data.roomId || `room_${data.appointmentId}`,
        roomUrl: `/consultation/room/${data.appointmentId}`,
        createdAt: new Date().toISOString(),
      };
      io.to(`doctor_${docKey}`).emit("incoming-call", payload);
      const doctorSocketId = connectedDoctors.get(docKey);
      if (doctorSocketId) {
        io.to(doctorSocketId).emit("incoming-call", payload);
      }
      socket.broadcast.emit("incoming-call", payload);
    }
  );

  // Call acceptance & rejection signaling (support both naming styles)
  const emitAccepted = (data: { appointmentId: string; doctorUsername?: string }) => {
    console.log(`[Socket.IO] Call accepted for appointment: ${data.appointmentId}`);
    io.emit("call-accepted", data);
    io.emit("accept-call", data);
  };
  const emitDeclined = (data: { appointmentId: string; doctorUsername?: string }) => {
    console.log(`[Socket.IO] Call declined for appointment: ${data.appointmentId}`);
    io.emit("call-declined", data);
    io.emit("decline-call", data);
  };
  socket.on("accept-call", emitAccepted);
  socket.on("call-accepted", emitAccepted);
  socket.on("decline-call", emitDeclined);
  socket.on("call-declined", emitDeclined);

  // WebRTC P2P Signaling Relays (Offer, Answer, ICE Candidate)
  socket.on("offer", (data: { roomId?: string; room_id?: string; offer: any }) => {
    const roomId = normalizeConsultationRoomId(data.roomId || data.room_id);
    if (!roomId) return;
    socket.to(roomId).emit("offer", { ...data, roomId });
  });

  socket.on("answer", (data: { roomId?: string; room_id?: string; answer: any }) => {
    const roomId = normalizeConsultationRoomId(data.roomId || data.room_id);
    if (!roomId) return;
    socket.to(roomId).emit("answer", { ...data, roomId });
  });

  socket.on("ice-candidate", (data: { roomId?: string; room_id?: string; candidate: any }) => {
    const roomId = normalizeConsultationRoomId(data.roomId || data.room_id);
    if (!roomId) return;
    socket.to(roomId).emit("ice-candidate", { ...data, roomId });
  });

  // Clean up on disconnect
  socket.on("disconnect", () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);

    // Remove from connected doctors
    for (const [doctorUsername, sId] of connectedDoctors.entries()) {
      if (sId === socket.id) {
        connectedDoctors.delete(doctorUsername);
        break;
      }
    }

    // Remove from room participants
    for (const [roomId, socketSet] of roomParticipants.entries()) {
      if (socketSet.has(socket.id)) {
        socketSet.delete(socket.id);
        socket.to(roomId).emit("user-left", { socketId: socket.id });
      }
    }
  });
});

// ── Start HTTP & Socket Server ───────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`
  🏥 Dr. Amanuel Hospital Backend Server
  🚀 HTTP & Socket.IO server running on http://localhost:${PORT}
  📡 CORS allowed origins: ${allowedOrigins.join(", ")}
  ⚡ Health Check: http://localhost:${PORT}/health
  🔐 Auth Endpoint: http://localhost:${PORT}/api/auth/login
  `);

  // Repair older production DBs missing doctors.experience_years / status / etc.
  // Without this, Admin "Save Changes" for specialty/bio returns 500 and public
  // /doctors stays stuck on defaults.
  import("./utils/doctorProfile.js")
    .then(({ ensureDoctorSchema }) => ensureDoctorSchema(prisma))
    .catch((err) =>
      console.warn("[Server] Doctor schema ensure failed:", err?.message || err)
    );
});

// ── Graceful Shutdown Handler ───────────────────────────────────────────────
const gracefulShutdown = async (signal: string) => {
  console.log(`\n[Server] ${signal} signal received. Closing connections...`);
  try {
    io.close(() => console.log("[Server] Socket.IO server closed."));
    server.close(() => console.log("[Server] Express HTTP server closed."));
    await prisma.$disconnect();
    console.log("[Server] Prisma Database Client disconnected.");
    process.exit(0);
  } catch (err) {
    console.error("[Server] Error during graceful shutdown:", err);
    process.exit(1);
  }
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));