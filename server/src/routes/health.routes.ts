import { Router, Request, Response } from "express";
import { prisma } from "../config/db.js";

const router = Router();

/**
 * GET /health
 * System & Database Status Health Check
 */
router.get("/", async (req: Request, res: Response) => {
  const startTime = Date.now();
  let dbStatus = "disconnected";
  let dbLatencyMs = 0;

  try {
    const dbPingStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbPingStart;
    dbStatus = "connected";
  } catch (error: any) {
    // Keep details in server logs only — health responses are public
    console.error("[Health] Database ping failed:", error?.message || error);
    dbStatus = "error: database unreachable";
  }

  const isHealthy = dbStatus === "connected";
  const statusCode = isHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: isHealthy ? "ok" : "degraded",
    system: {
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      memoryUsage: process.memoryUsage(),
    },
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
    },
    responseTimeMs: Date.now() - startTime,
  });
});

export default router;
