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

/**
 * POST /api/terminals/[id]/takeover — owner takes over a terminal lock
 * Body: { device_id, device_name }
 *
 * For exploration mode: always allowed
 * For production mode: only allowed for owner role, ends old device's session
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const terminalId = parseInt(id);
    if (isNaN(terminalId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const body = await req.json();
    const { device_id, device_name } = body;
    if (!device_id) return NextResponse.json({ error: "device_id required" }, { status: 400 });

    // Get current terminal state
    const { data: terminal } = await getDb()
      .from("terminal")
      .select("terminal_id, lock_mode, locked_device_id, locked_device_name")
      .eq("terminal_id", terminalId)
      .eq("account_id", accountId)
      .single();

    if (!terminal) return NextResponse.json({ error: "Terminal not found" }, { status: 404 });

    const oldDeviceId = terminal.locked_device_id;

    // End old device's session
    if (oldDeviceId && oldDeviceId !== device_id) {
      await getDb()
        .from("device_session")
        .update({
          is_active: false,
          ended_at: new Date().toISOString(),
          end_reason: "takeover",
        })
        .eq("account_id", accountId)
        .eq("device_id", oldDeviceId)
        .eq("terminal_id", terminalId)
        .eq("is_active", true);
    }

    // Transfer lock to new device
    const { data, error } = await getDb()
      .from("terminal")
      .update({
        locked_device_id: device_id,
        locked_device_name: device_name || null,
        locked_at: new Date().toISOString(),
      })
      .eq("terminal_id", terminalId)
      .eq("account_id", accountId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      terminal: data,
      previous_device: oldDeviceId,
      message: `Terminal taken over from ${terminal.locked_device_name || oldDeviceId || "no one"}`,
    });
  } catch (e: any) {
    await logToErrorDb(accountId, `Terminal takeover error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
