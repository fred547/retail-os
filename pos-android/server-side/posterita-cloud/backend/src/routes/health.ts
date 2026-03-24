import { Router } from "express";
import { getDb } from "../db";

const router = Router();
const startTime = Date.now();

router.get("/health", async (_req, res) => {
  const uptime = Math.round((Date.now() - startTime) / 1000);

  // Quick DB connectivity check with 3s timeout so Render health probe never times out
  let dbOk = false;
  try {
    const dbCheck = getDb()
      .from("account")
      .select("account_id")
      .limit(1);
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
    const result = await Promise.race([dbCheck, timeout]);
    dbOk = result !== null && Array.isArray((result as any).data);
  } catch (_) {}

  res.json({
    service: "posterita-backend",
    status: dbOk ? "ok" : "db_error",
    uptime_seconds: uptime,
    version: process.env.npm_package_version || "1.0.0",
    region: process.env.RENDER_REGION || "unknown",
    timestamp: new Date().toISOString(),
  });
});

export default router;
