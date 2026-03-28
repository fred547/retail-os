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

const VALID_TRANSITIONS: Record<string, string[]> = {
  open: ["picking"],
  picking: ["review"],
  review: ["approved", "picking"],
  approved: ["locked"],
  locked: [],
};

/** GET /api/staff/roster-periods/[id] — get period detail */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const periodId = parseInt(id);
    if (isNaN(periodId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const { data, error } = await getDb()
      .from("roster_period")
      .select("*")
      .eq("id", periodId)
      .eq("account_id", accountId)
      .eq("is_deleted", false)
      .single();

    if (error) throw error;

    return NextResponse.json({ period: data });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    await logToErrorDb(accountId, `Roster period GET error: ${err.message}`, err.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

/** PATCH /api/staff/roster-periods/[id] — update period (including status transitions) */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const periodId = parseInt(id);
    if (isNaN(periodId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const body = await req.json();
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

    // Check status transition if changing status
    if (body.status !== undefined) {
      const { data: current } = await getDb()
        .from("roster_period")
        .select("status")
        .eq("id", periodId)
        .eq("account_id", accountId)
        .single();

      if (!current) return NextResponse.json({ error: "Period not found" }, { status: 404 });

      const allowed = VALID_TRANSITIONS[current.status] || [];
      if (!allowed.includes(body.status)) {
        return NextResponse.json({
          error: `Cannot transition from ${current.status} to ${body.status}. Allowed: ${allowed.join(", ") || "none"}`,
        }, { status: 400 });
      }
      update.status = body.status;
    }

    if (body.name !== undefined) update.name = body.name;
    if (body.start_date !== undefined) update.start_date = body.start_date;
    if (body.end_date !== undefined) update.end_date = body.end_date;
    if (body.picking_deadline !== undefined) update.picking_deadline = body.picking_deadline;

    const { data, error } = await getDb()
      .from("roster_period")
      .update(update)
      .eq("id", periodId)
      .eq("account_id", accountId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ period: data });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    await logToErrorDb(accountId, `Roster period update error: ${err.message}`, err.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

/** DELETE /api/staff/roster-periods/[id] — soft-delete period */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const periodId = parseInt(id);
    if (isNaN(periodId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const { error } = await getDb()
      .from("roster_period")
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq("id", periodId)
      .eq("account_id", accountId);

    if (error) throw error;

    return NextResponse.json({ deleted: true });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    await logToErrorDb(accountId, `Roster period delete error: ${err.message}`, err.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
