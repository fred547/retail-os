import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "STOCK_COUNT",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/** GET /api/stock-count/[id] — plan detail with assignments */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const planId = parseInt(id);

    const [{ data: plan }, { data: assignments }] = await Promise.all([
      getDb().from("count_plan").select("*")
        .eq("id", planId).eq("account_id", accountId).eq("is_deleted", false).single(),
      getDb().from("count_zone_assignment").select("*").eq("plan_id", planId),
    ]);

    if (!plan) return NextResponse.json({ error: "Count plan not found" }, { status: 404 });

    return NextResponse.json({ plan: { ...plan, assignments: assignments ?? [] } });
  } catch (e: any) {
    await logToErrorDb(accountId, `Stock count get: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** PATCH /api/stock-count/[id] — update plan (status, assignments, notes) */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const planId = parseInt(id);
    const body = await req.json();

    const now = new Date().toISOString();
    const updates: any = { updated_at: now };

    if (body.status) {
      updates.status = body.status;
      if (body.status === "active" && !body.started_at) updates.started_at = now;
      if (body.status === "completed") updates.completed_at = now;
    }
    if (body.name) updates.name = body.name;
    if (body.notes !== undefined) updates.notes = body.notes;

    const { error } = await getDb().from("count_plan").update(updates)
      .eq("id", planId).eq("account_id", accountId);
    if (error) throw error;

    // Update assignments if provided
    if (body.assignments) {
      await getDb().from("count_zone_assignment").delete().eq("plan_id", planId);
      if (body.assignments.length > 0) {
        await getDb().from("count_zone_assignment").insert(
          body.assignments.map((a: any) => ({
            plan_id: planId,
            account_id: accountId,
            user_id: a.user_id,
            user_name: a.user_name || null,
            shelf_start: a.shelf_start,
            shelf_end: a.shelf_end,
            height_labels: a.height_labels || [],
          }))
        );
      }
    }

    // Return updated
    const { data: plan } = await getDb().from("count_plan").select("*").eq("id", planId).single();
    const { data: assignments } = await getDb().from("count_zone_assignment").select("*").eq("plan_id", planId);

    return NextResponse.json({ plan: { ...plan, assignments: assignments ?? [] } });
  } catch (e: any) {
    await logToErrorDb(accountId, `Stock count update: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** DELETE /api/stock-count/[id] — soft delete */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    await getDb().from("count_plan").update({
      is_deleted: true, updated_at: new Date().toISOString(),
    }).eq("id", parseInt(id)).eq("account_id", accountId);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    await logToErrorDb(accountId, `Stock count delete: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
