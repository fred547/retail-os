import { NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { createServerSupabase } from "@/lib/supabase/server";
import { getDb } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "DEBUG",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    const accountId = await getSessionAccountId();

    return NextResponse.json({
      auth_user_id: user?.id || null,
      auth_email: user?.email || null,
      resolved_account_id: accountId,
    });
  } catch (e: any) {
    await logToErrorDb("system", `Debug session failed: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message });
  }
}
