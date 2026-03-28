import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";
import { Plan, BillingRegion, PLANS, getPaddlePriceId, getAccountPlan } from "@/lib/billing";

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
 * POST /api/billing/checkout
 * Creates a Paddle checkout transaction for upgrading to a paid plan.
 * Body: { plan, billing_region }
 * Returns: { transaction_id } for the client-side Paddle.js overlay.
 */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { plan, billing_region } = body as { plan: Plan; billing_region: BillingRegion };

    if (!plan || !PLANS.includes(plan) || plan === "free") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (!billing_region || !["developing", "emerging", "developed"].includes(billing_region)) {
      return NextResponse.json({ error: "Invalid billing_region" }, { status: 400 });
    }

    const priceId = getPaddlePriceId(plan, billing_region);
    if (!priceId) {
      return NextResponse.json({ error: "Price not configured for this plan/region" }, { status: 400 });
    }

    // Get or create Paddle customer
    const billing = await getAccountPlan(accountId);

    // Get account email for customer creation
    const { data: account } = await getDb()
      .from("account")
      .select("account_id")
      .eq("account_id", accountId)
      .single();

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Get owner email for the Paddle customer
    const { data: owner } = await getDb()
      .from("owner")
      .select("email")
      .eq("id", (await getDb().from("account").select("owner_id").eq("account_id", accountId).single()).data?.owner_id)
      .single();

    const paddleApiKey = process.env.PADDLE_API_KEY;
    if (!paddleApiKey) {
      await logToErrorDb(accountId, "BILLING", "PADDLE_API_KEY not configured");
      return NextResponse.json({ error: "Billing not configured" }, { status: 500 });
    }

    const paddleEnv = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === "production"
      ? "https://api.paddle.com"
      : "https://sandbox-api.paddle.com";

    let customerId = billing.paddle_customer_id;

    // Create Paddle customer if we don't have one
    if (!customerId) {
      const customerRes = await fetch(`${paddleEnv}/customers`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${paddleApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: owner?.email ?? `account-${accountId}@posterita.com`,
          custom_data: { account_id: accountId },
        }),
      });

      if (!customerRes.ok) {
        const err = await customerRes.text();
        await logToErrorDb(accountId, "BILLING", `Paddle customer creation failed: ${err}`);
        return NextResponse.json({ error: "Failed to create billing customer" }, { status: 500 });
      }

      const customerData = await customerRes.json();
      customerId = customerData.data?.id;

      // Store paddle_customer_id
      await getDb()
        .from("account")
        .update({ paddle_customer_id: customerId })
        .eq("account_id", accountId);
    }

    // Create a transaction for the checkout overlay
    const txnRes = await fetch(`${paddleEnv}/transactions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${paddleApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer_id: customerId,
        items: [{ price_id: priceId, quantity: 1 }],
        custom_data: { account_id: accountId, plan, billing_region },
      }),
    });

    if (!txnRes.ok) {
      const err = await txnRes.text();
      await logToErrorDb(accountId, "BILLING", `Paddle transaction creation failed: ${err}`);
      return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
    }

    const txnData = await txnRes.json();

    // Update billing_region on account if changed
    if (billing.region !== billing_region) {
      await getDb()
        .from("account")
        .update({ billing_region })
        .eq("account_id", accountId);
    }

    return NextResponse.json({
      transaction_id: txnData.data?.id,
    });
  } catch (e: any) {
    await logToErrorDb(accountId, "BILLING", `Checkout error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
