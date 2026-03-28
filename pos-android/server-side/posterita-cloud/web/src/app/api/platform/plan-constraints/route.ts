import { NextRequest, NextResponse } from "next/server";
import { isAccountManager } from "@/lib/super-admin";
import { getDb } from "@/lib/supabase/admin";
import { _clearConstraintCache } from "@/lib/billing";

export const dynamic = "force-dynamic";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "PLAN_CONSTRAINTS",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/**
 * GET /api/platform/plan-constraints
 * Returns all constraints grouped by plan. Admin only.
 */
export async function GET() {
  try {
    const isManager = await isAccountManager();
    if (!isManager) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await getDb()
      .from("plan_constraint")
      .select("*")
      .order("plan")
      .order("constraint_key");

    if (error) {
      await logToErrorDb("system", `Failed to load plan constraints: ${error.message}`);
      return NextResponse.json({ error: "Failed to load constraints" }, { status: 500 });
    }

    // Group by plan
    const grouped: Record<string, any[]> = {};
    for (const row of data ?? []) {
      if (!grouped[row.plan]) grouped[row.plan] = [];
      grouped[row.plan].push(row);
    }

    return NextResponse.json({ constraints: grouped, total: data?.length ?? 0 });
  } catch (e: any) {
    await logToErrorDb("system", `Plan constraints GET failed: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

/**
 * POST /api/platform/plan-constraints
 * Updates a single constraint. Admin only.
 * Body: { plan, constraint_key, constraint_value, description? }
 */
export async function POST(req: NextRequest) {
  try {
    const isManager = await isAccountManager();
    if (!isManager) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { plan, constraint_key, constraint_value, description } = await req.json();

    if (!plan || !constraint_key || constraint_value === undefined) {
      return NextResponse.json({ error: "plan, constraint_key, and constraint_value are required" }, { status: 400 });
    }

    const { data, error } = await getDb()
      .from("plan_constraint")
      .upsert(
        {
          plan,
          constraint_key,
          constraint_value: String(constraint_value),
          description: description ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "plan,constraint_key" }
      )
      .select()
      .single();

    if (error) {
      await logToErrorDb("system", `Failed to update plan constraint: ${error.message}`);
      return NextResponse.json({ error: "Failed to update constraint" }, { status: 500 });
    }

    // Clear the in-memory cache so new values take effect immediately
    _clearConstraintCache();

    return NextResponse.json({ constraint: data });
  } catch (e: any) {
    await logToErrorDb("system", `Plan constraints POST failed: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
