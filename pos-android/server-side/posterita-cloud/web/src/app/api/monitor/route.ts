import { NextResponse } from "next/server";
import { getDb } from "@/lib/supabase/admin";
import { RENDER_BACKEND_URL, VERCEL_URL } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * GET /api/monitor — system health dashboard
 * Tests all services and reports status.
 */
export async function GET() {
  const start = Date.now();
  const checks: Record<string, { status: string; ms: number; detail?: string }> = {};

  // 1. Supabase DB
  try {
    const t = Date.now();
    const { data, error } = await getDb()
      .from("account")
      .select("account_id")
      .limit(1);
    checks.supabase = {
      status: error ? "error" : "ok",
      ms: Date.now() - t,
      detail: error?.message,
    };
  } catch (e: any) {
    checks.supabase = { status: "error", ms: 0, detail: e.message };
  }

  // 2. Render Backend
  try {
    const t = Date.now();
    const res = await fetch(`${RENDER_BACKEND_URL}/health`, { signal: AbortSignal.timeout(10000) });
    const json = await res.json();
    checks.render_backend = {
      status: json.status === "ok" ? "ok" : "degraded",
      ms: Date.now() - t,
      detail: `uptime: ${json.uptime_seconds}s, region: ${json.region}`,
    };
  } catch (e: any) {
    checks.render_backend = { status: "down", ms: 0, detail: e.message };
  }

  // 3. Render Monitor endpoints
  try {
    const t = Date.now();
    const res = await fetch(`${RENDER_BACKEND_URL}/monitor/errors`, { signal: AbortSignal.timeout(10000) });
    const json = await res.json();
    checks.error_monitor = {
      status: json.fatal_count > 0 ? "alert" : "ok",
      ms: Date.now() - t,
      detail: `${json.open_count} open, ${json.fatal_count} fatal`,
    };
  } catch (e: any) {
    checks.error_monitor = { status: "unreachable", ms: 0, detail: e.message };
  }

  // 4. Render Sync monitor
  try {
    const t = Date.now();
    const res = await fetch(`${RENDER_BACKEND_URL}/monitor/sync`, { signal: AbortSignal.timeout(10000) });
    const json = await res.json();
    checks.sync_monitor = {
      status: json.slow ? "slow" : "ok",
      ms: Date.now() - t,
      detail: `${json.syncs_last_hour} syncs/hr, avg ${json.avg_duration_ms}ms, ${json.failed_count} failed`,
    };
  } catch (e: any) {
    checks.sync_monitor = { status: "unreachable", ms: 0, detail: e.message };
  }

  // 5. Vercel self-check (sync API)
  try {
    const t = Date.now();
    const res = await fetch(`${VERCEL_URL}/api/sync`);
    const json = await res.json();
    checks.vercel_sync_api = {
      status: res.ok ? "ok" : "error",
      ms: Date.now() - t,
      detail: `v${json.sync_api_version}`,
    };
  } catch (e: any) {
    checks.vercel_sync_api = { status: "error", ms: 0, detail: e.message };
  }

  // Overall status
  const allOk = Object.values(checks).every(
    (c) => c.status === "ok"
  );
  const hasDown = Object.values(checks).some(
    (c) => c.status === "down" || c.status === "error"
  );

  return NextResponse.json({
    status: hasDown ? "degraded" : allOk ? "healthy" : "warning",
    total_ms: Date.now() - start,
    timestamp: new Date().toISOString(),
    checks,
  });
}
