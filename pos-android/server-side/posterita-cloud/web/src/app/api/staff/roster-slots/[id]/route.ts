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

/** PATCH /api/staff/roster-slots/[id] — update template slot */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const slotId = parseInt(id);
    if (isNaN(slotId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const body = await req.json();
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.name !== undefined) update.name = body.name;
    if (body.day_of_week !== undefined) {
      if (body.day_of_week < 1 || body.day_of_week > 7) {
        return NextResponse.json({ error: "day_of_week must be 1-7" }, { status: 400 });
      }
      update.day_of_week = body.day_of_week;
    }
    if (body.start_time !== undefined) update.start_time = body.start_time;
    if (body.end_time !== undefined) update.end_time = body.end_time;
    if (body.break_minutes !== undefined) update.break_minutes = body.break_minutes;
    if (body.required_role !== undefined) update.required_role = body.required_role;
    if (body.color !== undefined) update.color = body.color;

    // Validate time order if both provided
    if (body.start_time !== undefined && body.end_time !== undefined && body.start_time >= body.end_time) {
      return NextResponse.json({ error: "start_time must be before end_time" }, { status: 400 });
    }

    const { data, error } = await getDb()
      .from("roster_template_slot")
      .update(update)
      .eq("id", slotId)
      .eq("account_id", accountId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ slot: data });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(e instanceof Error ? e.message : (e?.message || JSON.stringify(e)));
    await logToErrorDb(accountId, `Roster slot update error: ${err.message}`, err.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

/** DELETE /api/staff/roster-slots/[id] — soft-delete template slot */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const slotId = parseInt(id);
    if (isNaN(slotId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const { error } = await getDb()
      .from("roster_template_slot")
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq("id", slotId)
      .eq("account_id", accountId);

    if (error) throw error;

    return NextResponse.json({ deleted: true });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(e instanceof Error ? e.message : (e?.message || JSON.stringify(e)));
    await logToErrorDb(accountId, `Roster slot delete error: ${err.message}`, err.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
