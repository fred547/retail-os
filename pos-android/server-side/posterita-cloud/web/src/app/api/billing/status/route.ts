import { NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";
import { getAccountPlan } from "@/lib/billing";

async function logToErrorDb(accountId: string, tag: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId,
      severity: "ERROR",
      tag,
      message,
      stack_trace: stackTrace ?? null,
      device_info: "web-api",
      app_version: "web",
    });
  } catch (_) { /* swallow error-logging errors */ }
}

/**
 * GET /api/billing/status
 * Returns current plan, usage counts, and limits.
 */
export async function GET() {
  const accountId = await getSessionAccountId();
  if (!accountId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const billing = await getAccountPlan(accountId);

    // Get usage counts
    const [usersRes, terminalsRes, storesRes] = await Promise.all([
      getDb()
        .from("pos_user")
        .select("user_id", { count: "exact", head: true })
        .eq("account_id", accountId)
        .eq("isactive", "Y"),
      getDb()
        .from("terminal")
        .select("terminal_id", { count: "exact", head: true })
        .eq("account_id", accountId)
        .eq("isactive", "Y"),
      getDb()
        .from("store")
        .select("store_id", { count: "exact", head: true })
        .eq("account_id", accountId)
        .eq("isactive", "Y"),
    ]);

    // Get recent billing events
    const { data: events } = await getDb()
      .from("billing_event")
      .select("id, event_type, paddle_event_id, created_at")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({
      plan: billing.plan,
      billing_region: billing.region,
      subscription_status: billing.status,
      current_period_end: billing.current_period_end,
      paddle_customer_id: billing.paddle_customer_id,
      paddle_subscription_id: billing.paddle_subscription_id,
      usage: {
        users: usersRes.count ?? 0,
        terminals: terminalsRes.count ?? 0,
        stores: storesRes.count ?? 0,
      },
      limits: billing.limits,
      events: events ?? [],
    });
  } catch (e: any) {
    await logToErrorDb(accountId, "BILLING", `Status query error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
