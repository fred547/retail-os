import { NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "XERO",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/** POST /api/integrations/xero/disconnect — revoke connection */
export async function POST() {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { error } = await getDb()
      .from("integration_connection")
      .update({
        status: "disconnected",
        access_token: null,
        refresh_token: null,
        token_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("account_id", accountId)
      .eq("provider", "xero");

    if (error) throw error;

    await getDb().from("integration_event_log").insert({
      account_id: accountId,
      provider: "xero",
      event_type: "oauth.disconnected",
      status: "sent",
    });

    return NextResponse.json({ disconnected: true });
  } catch (e: any) {
    await logToErrorDb(accountId, `Xero disconnect error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
