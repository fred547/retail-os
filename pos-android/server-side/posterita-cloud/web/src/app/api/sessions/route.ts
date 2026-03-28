import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "SESSION",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/** GET /api/sessions/active — list active device sessions */
export async function GET() {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { data, error } = await getDb()
      .from("device_session")
      .select("*")
      .eq("account_id", accountId)
      .eq("is_active", true)
      .order("started_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ sessions: data ?? [] });
  } catch (e: any) {
    await logToErrorDb(accountId, `Session list error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** POST /api/sessions — start or end a session */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "start") {
      const { device_id, terminal_id, user_id, user_name, store_id } = body;
      if (!device_id || !terminal_id || !user_id) {
        return NextResponse.json({ error: "device_id, terminal_id, user_id required" }, { status: 400 });
      }

      // End any existing active session for this device
      await getDb()
        .from("device_session")
        .update({ is_active: false, ended_at: new Date().toISOString(), end_reason: "new_session" })
        .eq("account_id", accountId)
        .eq("device_id", device_id)
        .eq("is_active", true);

      // Handle exploration lock: auto-acquire
      const { data: terminal } = await getDb()
        .from("terminal")
        .select("terminal_id, lock_mode, locked_device_id")
        .eq("terminal_id", terminal_id)
        .eq("account_id", accountId)
        .single();

      if (terminal?.lock_mode === "exploration") {
        // Auto-lock to this device (release any previous exploration lock by this device)
        await getDb()
          .from("terminal")
          .update({ locked_device_id: null, locked_device_name: null, locked_at: null })
          .eq("account_id", accountId)
          .eq("locked_device_id", device_id)
          .eq("lock_mode", "exploration");

        // Lock this terminal
        await getDb()
          .from("terminal")
          .update({
            locked_device_id: device_id,
            locked_device_name: body.device_name || null,
            locked_at: new Date().toISOString(),
          })
          .eq("terminal_id", terminal_id)
          .eq("account_id", accountId);
      }

      // Check production lock conflict
      let preview_mode = false;
      if (terminal?.lock_mode === "production" && terminal?.locked_device_id && terminal.locked_device_id !== device_id) {
        preview_mode = true;
      }

      // Create session
      const { data: session, error } = await getDb()
        .from("device_session")
        .insert({
          account_id: accountId,
          device_id,
          terminal_id,
          user_id,
          user_name: user_name || null,
          store_id: store_id || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ session, preview_mode }, { status: 201 });
    }

    if (action === "end") {
      const { device_id, end_reason } = body;
      if (!device_id) return NextResponse.json({ error: "device_id required" }, { status: 400 });

      // End active sessions for this device
      const { data, error } = await getDb()
        .from("device_session")
        .update({
          is_active: false,
          ended_at: new Date().toISOString(),
          end_reason: end_reason || "logout",
        })
        .eq("account_id", accountId)
        .eq("device_id", device_id)
        .eq("is_active", true)
        .select();

      if (error) throw error;

      // If exploration mode, release the terminal lock
      if (data?.length) {
        const terminalId = data[0].terminal_id;
        await getDb()
          .from("terminal")
          .update({ locked_device_id: null, locked_device_name: null, locked_at: null })
          .eq("terminal_id", terminalId)
          .eq("account_id", accountId)
          .eq("locked_device_id", device_id)
          .eq("lock_mode", "exploration");
      }

      return NextResponse.json({ ended: data?.length || 0 });
    }

    if (action === "heartbeat") {
      const { device_id, session_id, till_uuid } = body;

      const update: any = { last_seen_at: new Date().toISOString() };
      if (till_uuid !== undefined) update.till_uuid = till_uuid;

      await getDb()
        .from("device_session")
        .update(update)
        .eq("account_id", accountId)
        .eq("device_id", device_id)
        .eq("is_active", true);

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "action must be start, end, or heartbeat" }, { status: 400 });
  } catch (e: any) {
    await logToErrorDb(accountId, `Session error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
