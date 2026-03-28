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

/** GET /api/stock-count — list count plans */
export async function GET(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const url = new URL(req.url);
    const storeId = url.searchParams.get("store_id");
    const status = url.searchParams.get("status");

    let query = getDb()
      .from("count_plan")
      .select("*")
      .eq("account_id", accountId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (storeId) query = query.eq("store_id", parseInt(storeId));
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    // Load assignments for each plan
    const planIds = (data ?? []).map((p: any) => p.id);
    const { data: assignments } = planIds.length > 0
      ? await getDb().from("count_zone_assignment").select("*").in("plan_id", planIds)
      : { data: [] };

    const assignmentMap: Record<number, any[]> = {};
    for (const a of assignments ?? []) {
      if (!assignmentMap[a.plan_id]) assignmentMap[a.plan_id] = [];
      assignmentMap[a.plan_id].push(a);
    }

    const enriched = (data ?? []).map((p: any) => ({
      ...p,
      assignments: assignmentMap[p.id] || [],
    }));

    return NextResponse.json({ plans: enriched });
  } catch (e: any) {
    await logToErrorDb(accountId, `Stock count list: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** POST /api/stock-count — create a count plan with assignments */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { name, store_id, notes, assignments } = body;

    if (!name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });
    if (!store_id) return NextResponse.json({ error: "store_id is required" }, { status: 400 });

    // Create plan
    const { data: plan, error: planErr } = await getDb()
      .from("count_plan")
      .insert({
        account_id: accountId,
        store_id,
        name: name.trim(),
        notes: notes || null,
        created_by: body.created_by ?? 0,
      })
      .select()
      .single();

    if (planErr) throw planErr;

    // Create zone assignments
    if (assignments?.length) {
      const rows = assignments.map((a: any) => ({
        plan_id: plan.id,
        account_id: accountId,
        user_id: a.user_id,
        user_name: a.user_name || null,
        shelf_start: a.shelf_start,
        shelf_end: a.shelf_end,
        height_labels: a.height_labels || [],
      }));

      const { error: assignErr } = await getDb()
        .from("count_zone_assignment")
        .insert(rows);

      if (assignErr) throw assignErr;
    }

    // Return with assignments
    const { data: finalAssignments } = await getDb()
      .from("count_zone_assignment")
      .select("*")
      .eq("plan_id", plan.id);

    return NextResponse.json({
      plan: { ...plan, assignments: finalAssignments ?? [] },
    }, { status: 201 });
  } catch (e: any) {
    await logToErrorDb(accountId, `Stock count create: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
