import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "MENU_SCHEDULE",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/** PATCH /api/menu-schedules/[id] — update schedule */
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
    if (body.name !== undefined) update.name = body.name;
    if (body.description !== undefined) update.description = body.description;
    if (body.store_id !== undefined) update.store_id = body.store_id;
    if (body.category_ids !== undefined) update.category_ids = body.category_ids;
    if (body.start_time !== undefined) update.start_time = body.start_time;
    if (body.end_time !== undefined) update.end_time = body.end_time;
    if (body.days_of_week !== undefined) update.days_of_week = body.days_of_week;
    if (body.priority !== undefined) update.priority = body.priority;
    if (body.is_active !== undefined) update.is_active = body.is_active;

    const { data, error } = await getDb()
      .from("menu_schedule")
      .update(update)
      .eq("id", scheduleId)
      .eq("account_id", accountId)
      .select()
      .single();

    if (error) {
      await logToErrorDb(accountId, `Failed to update menu schedule ${id}: ${error.message}`);
      return NextResponse.json({ error: "Operation failed" }, { status: 500 });
    }
    return NextResponse.json({ schedule: data });
  } catch (e: any) {
    await logToErrorDb(accountId, `Menu schedule update error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

/** DELETE /api/menu-schedules/[id] — delete schedule */
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
      .from("menu_schedule")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", scheduleId)
      .eq("account_id", accountId);

    if (error) {
      await logToErrorDb(accountId, `Failed to delete menu schedule ${id}: ${error.message}`);
      return NextResponse.json({ error: "Operation failed" }, { status: 500 });
    }
    return NextResponse.json({ deleted: true });
  } catch (e: any) {
    await logToErrorDb(accountId, `Menu schedule delete error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
