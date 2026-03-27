import { NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "INTEGRATION",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/** GET /api/integrations — list all connected integrations for the account */
export async function GET() {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { data, error } = await getDb()
      .from("integration_connection")
      .select("id, provider, org_name, status, settings, last_sync_at, error_message, created_at")
      .eq("account_id", accountId)
      .order("provider");

    if (error) throw error;

    // Recent events per provider
    const { data: events } = await getDb()
      .from("integration_event_log")
      .select("provider, event_type, status, external_id, created_at")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({
      connections: data ?? [],
      recent_events: events ?? [],
    });
  } catch (e: any) {
    await logToErrorDb(accountId, `Integration list error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
