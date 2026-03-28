import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";
import { Plan, PLANS, getPaddlePriceId, getAccountPlan } from "@/lib/billing";

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
 * POST /api/billing/change-plan
 * Upgrades or downgrades the Paddle subscription to a new plan.
 * Body: { new_plan }
 */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { new_plan } = body as { new_plan: Plan };

    if (!new_plan || !PLANS.includes(new_plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const billing = await getAccountPlan(accountId);

    if (!billing.paddle_subscription_id) {
      return NextResponse.json(
        { error: "No active subscription. Use checkout to subscribe first." },
        { status: 400 }
      );
    }

    if (billing.plan === new_plan) {
      return NextResponse.json({ error: "Already on this plan" }, { status: 400 });
    }

    // For downgrade to free, cancel instead
    if (new_plan === "free") {
      return NextResponse.json(
        { error: "To downgrade to free, cancel your subscription instead." },
        { status: 400 }
      );
    }

    const priceId = getPaddlePriceId(new_plan, billing.region);
    if (!priceId) {
      return NextResponse.json({ error: "Price not configured" }, { status: 400 });
    }

    const paddleApiKey = process.env.PADDLE_API_KEY;
    if (!paddleApiKey) {
      await logToErrorDb(accountId, "BILLING", "PADDLE_API_KEY not configured");
      return NextResponse.json({ error: "Billing not configured" }, { status: 500 });
    }

    const paddleEnv = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === "production"
      ? "https://api.paddle.com"
      : "https://sandbox-api.paddle.com";

    // Update the subscription with new price
    const isUpgrade = PLANS.indexOf(new_plan) > PLANS.indexOf(billing.plan);
    const res = await fetch(`${paddleEnv}/subscriptions/${billing.paddle_subscription_id}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${paddleApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ price_id: priceId, quantity: 1 }],
        proration_billing_mode: isUpgrade
          ? "prorated_immediately"   // Upgrade: charge difference now
          : "prorated_next_billing_period", // Downgrade: apply at next cycle
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      await logToErrorDb(accountId, "BILLING", `Plan change failed: ${err}`);
      return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      previous_plan: billing.plan,
      new_plan,
      effective: isUpgrade ? "immediately" : "next_billing_period",
    });
  } catch (e: any) {
    await logToErrorDb(accountId, "BILLING", `Plan change error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
