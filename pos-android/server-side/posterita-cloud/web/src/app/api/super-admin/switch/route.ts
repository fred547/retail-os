import { NextRequest, NextResponse } from "next/server";
import { switchAccount } from "@/lib/super-admin";
import { cookies } from "next/headers";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "ADMIN",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { account_id } = body;

    const success = await switchAccount(account_id ?? null);

    if (!success) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Clear account cache so next request re-resolves from DB
    try {
      const cookieStore = await cookies();
      cookieStore.delete("posterita_account_cache");
    } catch (_) {}

    return NextResponse.json({ success: true, account_id });
  } catch (e: any) {
    await logToErrorDb("system", `Super admin switch failed: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
