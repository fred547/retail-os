import { NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "TOWER",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/** GET /api/tower — combined tower control dashboard data */
export async function GET() {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const [sessionsRes, terminalsRes, tillsRes, devicesRes, errorsRes] = await Promise.all([
      // Active sessions
      getDb()
        .from("device_session")
        .select("id, device_id, terminal_id, user_id, user_name, store_id, started_at, last_seen_at, till_uuid")
        .eq("account_id", accountId)
        .eq("is_active", true)
        .order("started_at", { ascending: false }),

      // All terminals with lock info
      getDb()
        .from("terminal")
        .select("terminal_id, name, terminal_type, lock_mode, locked_device_id, locked_device_name, locked_at, isactive")
        .eq("account_id", accountId)
        .order("name"),

      // Open tills
      getDb()
        .from("till")
        .select("till_id, uuid, documentno, terminal_id, store_id, opening_amt, grand_total, status")
        .eq("account_id", accountId)
        .eq("status", "open"),

      // Registered devices
      getDb()
        .from("registered_device")
        .select("device_id, device_name, device_model, app_version, terminal_id, last_sync_at, is_active")
        .eq("account_id", accountId)
        .eq("is_active", true)
        .order("last_sync_at", { ascending: false }),

      // Recent errors (last hour)
      getDb()
        .from("error_logs")
        .select("id, tag, message, severity, device_info, created_at")
        .eq("account_id", accountId)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    // Build terminal name map
    const terminalMap: Record<number, string> = {};
    for (const t of terminalsRes.data ?? []) {
      terminalMap[t.terminal_id] = t.name;
    }

    // Enrich sessions with terminal names
    const sessions = (sessionsRes.data ?? []).map((s: any) => ({
      ...s,
      terminal_name: terminalMap[s.terminal_id] || `Terminal #${s.terminal_id}`,
      minutes_ago: Math.round((Date.now() - new Date(s.last_seen_at).getTime()) / 60000),
    }));

    return NextResponse.json({
      sessions,
      terminals: terminalsRes.data ?? [],
      open_tills: tillsRes.data ?? [],
      devices: devicesRes.data ?? [],
      recent_errors: errorsRes.data ?? [],
      summary: {
        active_sessions: sessions.length,
        total_terminals: (terminalsRes.data ?? []).length,
        production_terminals: (terminalsRes.data ?? []).filter((t: any) => t.lock_mode === "production").length,
        open_tills: (tillsRes.data ?? []).length,
        active_devices: (devicesRes.data ?? []).length,
        open_errors: (errorsRes.data ?? []).length,
      },
    });
  } catch (e: any) {
    await logToErrorDb(accountId, `Tower status error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
