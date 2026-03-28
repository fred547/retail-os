import { NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { buildAuthUrl } from "@/lib/xero";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "XERO",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/** GET /api/integrations/xero/connect — redirect to Xero OAuth */
export async function GET() {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    // State = accountId (used in callback to associate the connection)
    const state = Buffer.from(JSON.stringify({ account_id: accountId })).toString("base64url");
    const url = buildAuthUrl(state);

    return NextResponse.redirect(url);
  } catch (e: any) {
    await logToErrorDb(accountId, `Xero connect error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
