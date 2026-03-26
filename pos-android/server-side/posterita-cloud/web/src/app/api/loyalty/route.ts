import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId,
      severity: "ERROR",
      tag: "LOYALTY",
      message,
      stack_trace: stackTrace ?? null,
      device_info: "web-api",
      app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/**
 * POST /api/loyalty — earn, redeem, or adjust loyalty points
 * Body: { action: "earn"|"redeem"|"adjust", customer_id, points, order_id?, description?, store_id?, terminal_id? }
 */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { action, customer_id, points, order_id, description, store_id, terminal_id, created_by } = body;

    if (!customer_id || !points || !action) {
      return NextResponse.json({ error: "customer_id, points, and action are required" }, { status: 400 });
    }
    if (!["earn", "redeem", "adjust", "welcome"].includes(action)) {
      return NextResponse.json({ error: "action must be earn, redeem, adjust, or welcome" }, { status: 400 });
    }

    // Get loyalty config
    const { data: config } = await getDb()
      .from("loyalty_config")
      .select("*")
      .eq("account_id", accountId)
      .maybeSingle();

    if (!config?.is_active) {
      return NextResponse.json({ error: "Loyalty program is not active for this account" }, { status: 400 });
    }

    // Get current customer balance
    const { data: customer, error: custErr } = await getDb()
      .from("customer")
      .select("customer_id, loyaltypoints, name")
      .eq("customer_id", customer_id)
      .eq("account_id", accountId)
      .single();

    if (custErr || !customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const currentBalance = customer.loyaltypoints ?? 0;
    let delta = Math.abs(points);

    if (action === "redeem") {
      delta = -delta;
      if (currentBalance + delta < 0) {
        return NextResponse.json({ error: "Insufficient points" }, { status: 400 });
      }
      if (Math.abs(delta) < (config.min_redeem_points ?? 0)) {
        return NextResponse.json({ error: `Minimum ${config.min_redeem_points} points required to redeem` }, { status: 400 });
      }
    } else if (action === "adjust") {
      // adjust can be positive or negative
      delta = points;
    }

    const newBalance = currentBalance + delta;

    // Update customer balance
    const { error: updateErr } = await getDb()
      .from("customer")
      .update({
        loyaltypoints: newBalance,
        updated: new Date().toISOString(),
      })
      .eq("customer_id", customer_id)
      .eq("account_id", accountId);

    if (updateErr) {
      await logToErrorDb(accountId, `Failed to update loyalty points for customer ${customer_id}: ${updateErr.message}`);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Log transaction
    const { error: txErr } = await getDb()
      .from("loyalty_transaction")
      .insert({
        account_id: accountId,
        customer_id,
        order_id: order_id ?? null,
        type: action,
        points: delta,
        balance_after: newBalance,
        description: description || `${action === "redeem" ? "Redeemed" : action === "earn" ? "Earned" : "Adjusted"} ${Math.abs(delta)} points`,
        created_by: created_by ?? null,
        store_id: store_id ?? null,
        terminal_id: terminal_id ?? null,
      });

    if (txErr) {
      await logToErrorDb(accountId, `Failed to log loyalty transaction for customer ${customer_id}: ${txErr.message}`);
    }

    return NextResponse.json({
      customer_id,
      customer_name: customer.name,
      previous_balance: currentBalance,
      delta,
      new_balance: newBalance,
      action,
    });
  } catch (e: any) {
    await logToErrorDb(accountId, `Loyalty operation error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
