import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "AUTH",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

export async function POST(req: NextRequest) {
  const supabase = getDb();

  try {
    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ error: "token required" }, { status: 400 });
    }

    // Atomically mark as used and return the row — prevents race conditions
    const { data, error } = await supabase
      .from("ott_tokens")
      .update({ used: true })
      .eq("token", token)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    return NextResponse.json({
      valid: true,
      account_id: data.account_id,
      user_id: data.user_id,
      user_role: data.user_role,
      store_id: data.store_id,
      terminal_id: data.terminal_id,
    });
  } catch (e: any) {
    await logToErrorDb("system", `OTT validation failed: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
