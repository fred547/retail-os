import { Router } from "express";
import { getDb } from "../db";

const router = Router();
const startTime = Date.now();

router.get("/health", async (_req, res) => {
  const uptime = Math.round((Date.now() - startTime) / 1000);

  // Quick DB connectivity check
  let dbOk = false;
  try {
    const { data } = await getDb()
      .from("account")
      .select("account_id")
      .limit(1);
    dbOk = Array.isArray(data);
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
