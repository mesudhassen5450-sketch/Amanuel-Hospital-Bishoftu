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
  socket.on("register-doctor", (data: { doctorUsername?: string; doctorId?: string }) => {
    const doctorUsername = (data.doctorUsername || data.doctorId || "").toLowerCase().trim();
    if (doctorUsername) {
      connectedDoctors.set(doctorUsername, socket.id);
      console.log(`[Socket.IO] Doctor registered: ${doctorUsername} (${socket.id})`);
    }
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

  // Patient paid event
  socket.on("patient-paid", (data: { appointmentId: string }) => {
    console.log(`[Socket.IO] Patient paid notification for appointment: ${data.appointmentId}`);
    io.emit("patient-paid", data);
  });

  // Call acceptance & rejection signaling
  socket.on("accept-call", (data: { appointmentId: string; doctorUsername?: string }) => {
    console.log(`[Socket.IO] Call accepted for appointment: ${data.appointmentId}`);
    io.emit("call-accepted", data);
  });

  socket.on("decline-call", (data: { appointmentId: string; doctorUsername?: string }) => {
    console.log(`[Socket.IO] Call declined for appointment: ${data.appointmentId}`);
    io.emit("call-declined", data);
  });

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