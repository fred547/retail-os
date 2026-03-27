import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "INFO", tag: "TERMINAL_UNLOCK",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/**
 * POST /api/terminals/[id]/unlock — release a terminal's device lock.
 * Only owner/admin can do this from the web console.
 * After unlocking, any device can enroll on this terminal.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const terminalId = parseInt(id);

    // Get current lock info for audit log
    const { data: terminal } = await getDb()
      .from("terminal")
      .select("terminal_id, name, locked_device_id, locked_device_name")
      .eq("terminal_id", terminalId)
      .eq("account_id", accountId)
      .single();

    if (!terminal) {
      return NextResponse.json({ error: "Terminal not found" }, { status: 404 });
    }

    if (!terminal.locked_device_id) {
      return NextResponse.json({ message: "Terminal is not locked to any device" });
    }

    // Clear the lock
    const { error } = await getDb()
      .from("terminal")
      .update({
        locked_device_id: null,
        locked_device_name: null,
        locked_at: null,
      })
      .eq("terminal_id", terminalId)
      .eq("account_id", accountId);

    if (error) throw error;

    await logToErrorDb(
      accountId,
      `Terminal "${terminal.name}" (ID ${terminalId}) unlocked — was locked to device ${terminal.locked_device_name || terminal.locked_device_id}`,
    );

    return NextResponse.json({
      success: true,
      message: `Terminal "${terminal.name}" unlocked. Any device can now enroll on it.`,
      previous_device: terminal.locked_device_name || terminal.locked_device_id,
    });
  } catch (e: any) {
    await logToErrorDb(accountId, `Terminal unlock error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
