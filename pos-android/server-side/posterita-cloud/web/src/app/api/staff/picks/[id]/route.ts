import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "ROSTER",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/** PATCH /api/staff/picks/[id] — update pick status */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const pickId = parseInt(id);
    if (isNaN(pickId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const body = await req.json();
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.status !== undefined) update.status = body.status;
    if (body.notes !== undefined) update.notes = body.notes;

    const { data, error } = await getDb()
      .from("shift_pick")
      .update(update)
      .eq("id", pickId)
      .eq("account_id", accountId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ pick: data });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    await logToErrorDb(accountId, `Pick update error: ${err.message}`, err.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

/** DELETE /api/staff/picks/[id] — cancel pick */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const pickId = parseInt(id);
    if (isNaN(pickId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const { error } = await getDb()
      .from("shift_pick")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", pickId)
      .eq("account_id", accountId);

    if (error) throw error;

    return NextResponse.json({ cancelled: true });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    await logToErrorDb(accountId, `Pick cancel error: ${err.message}`, err.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
