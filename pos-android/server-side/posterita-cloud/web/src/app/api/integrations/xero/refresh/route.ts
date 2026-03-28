import { NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";
import { refreshAccessToken } from "@/lib/xero";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "XERO",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/** POST /api/integrations/xero/refresh — force token refresh */
export async function POST() {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { data: conn } = await getDb()
      .from("integration_connection")
      .select("*")
      .eq("account_id", accountId)
      .eq("provider", "xero")
      .single();

    if (!conn?.refresh_token) {
      return NextResponse.json({ error: "No Xero connection found" }, { status: 404 });
    }

    const tokens = await refreshAccessToken(conn.refresh_token);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    await getDb()
      .from("integration_connection")
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
        status: "active",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conn.id);

    return NextResponse.json({ refreshed: true, expires_at: expiresAt });
  } catch (e: any) {
    await logToErrorDb(accountId, `Xero refresh error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
