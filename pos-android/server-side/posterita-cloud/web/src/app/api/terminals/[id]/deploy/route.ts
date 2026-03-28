import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "TERMINAL",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/** POST /api/terminals/[id]/deploy — switch from exploration to production lock */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const terminalId = parseInt(id);
    if (isNaN(terminalId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const { data, error } = await getDb()
      .from("terminal")
      .update({
        lock_mode: "production",
        updated_at: new Date().toISOString(),
      })
      .eq("terminal_id", terminalId)
      .eq("account_id", accountId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ terminal: data, message: "Terminal deployed — lock is now permanent" });
  } catch (e: any) {
    await logToErrorDb(accountId, `Terminal deploy error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
