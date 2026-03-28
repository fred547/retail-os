import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "STAFF",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/** PATCH /api/staff/schedule/[id] — update schedule entry */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const scheduleId = parseInt(id);
    if (isNaN(scheduleId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await req.json();
    const update: Record<string, any> = { updated_at: new Date().toISOString() };
    if (body.date !== undefined) update.date = body.date;
    if (body.start_time !== undefined) update.start_time = body.start_time;
    if (body.end_time !== undefined) update.end_time = body.end_time;
    if (body.break_minutes !== undefined) update.break_minutes = body.break_minutes;
    if (body.role_override !== undefined) update.role_override = body.role_override;
    if (body.notes !== undefined) update.notes = body.notes;
    if (body.status !== undefined) update.status = body.status;

    // Validate time order if both provided
    const st = body.start_time;
    const et = body.end_time;
    if (st !== undefined && et !== undefined && st >= et) {
      return NextResponse.json({ error: "start_time must be before end_time" }, { status: 400 });
    }

    const { data, error } = await getDb()
      .from("staff_schedule")
      .update(update)
      .eq("id", scheduleId)
      .eq("account_id", accountId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ entry: data });
  } catch (e: any) {
    await logToErrorDb(accountId, `Schedule update error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

/** DELETE /api/staff/schedule/[id] — soft-cancel schedule entry */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const scheduleId = parseInt(id);
    if (isNaN(scheduleId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const { error } = await getDb()
      .from("staff_schedule")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", scheduleId)
      .eq("account_id", accountId);

    if (error) throw error;
    return NextResponse.json({ cancelled: true });
  } catch (e: any) {
    await logToErrorDb(accountId, `Schedule cancel error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
