import { Router } from "express";
import { getDb } from "../db";

const router = Router();

/**
 * GET /monitor/errors — quick check for new open errors
 */
router.get("/monitor/errors", async (_req, res) => {
  const { data, count } = await getDb()
    .from("error_logs")
    .select("id, severity, tag, message, created_at", { count: "exact" })
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(10);

  const fatal = (data ?? []).filter((e: any) => e.severity === "FATAL").length;

  res.json({
    open_count: count ?? 0,
    fatal_count: fatal,
    recent: data ?? [],
    alert: fatal > 0 ? "FATAL errors detected" : null,
  });
});

/**
 * GET /monitor/sync — recent sync health
 */
router.get("/monitor/sync", async (_req, res) => {
  const hourAgo = new Date(Date.now() - 3600000).toISOString();

  const { data: recent, count } = await getDb()
    .from("sync_request_log")
    .select("id, account_id, status, duration_ms, error_message", { count: "exact" })
    .gte("request_at", hourAgo)
    .order("request_at", { ascending: false })
    .limit(20);

  const failed = (recent ?? []).filter((r: any) => r.status === "error").length;
  const avgMs = recent?.length
    ? Math.round(recent.reduce((s: number, r: any) => s + (r.duration_ms || 0), 0) / recent.length)
    : 0;

  res.json({
    syncs_last_hour: count ?? 0,
    failed_count: failed,
    avg_duration_ms: avgMs,
    slow: avgMs > 5000,
    recent: recent ?? [],
  });
});

/**
 * GET /monitor/accounts — quick stats
 */
router.get("/monitor/accounts", async (_req, res) => {
  const [accounts, owners, devices] = await Promise.all([
    getDb().from("account").select("account_id", { count: "exact", head: true }),
    getDb().from("owner").select("id", { count: "exact", head: true }),
    getDb().from("registered_device").select("device_id", { count: "exact", head: true }).eq("is_active", true),
  ]);

  res.json({
    accounts: accounts.count ?? 0,
    owners: owners.count ?? 0,
    active_devices: devices.count ?? 0,
  });
});

export default router;
