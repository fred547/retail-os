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
 * POST /api/billing/cancel
 * Cancels the Paddle subscription (effective at end of billing period).
 */
export async function POST() {
  const accountId = await getSessionAccountId();
  if (!accountId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const billing = await getAccountPlan(accountId);

    if (!billing.paddle_subscription_id) {
      return NextResponse.json({ error: "No active subscription" }, { status: 400 });
    }

    if (billing.status === "canceled") {
      return NextResponse.json({ error: "Subscription already canceled" }, { status: 400 });
    }

    const paddleApiKey = process.env.PADDLE_API_KEY;
    if (!paddleApiKey) {
      await logToErrorDb(accountId, "BILLING", "PADDLE_API_KEY not configured");
      return NextResponse.json({ error: "Billing not configured" }, { status: 500 });
    }

    const paddleEnv = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === "production"
      ? "https://api.paddle.com"
      : "https://sandbox-api.paddle.com";

    // Cancel effective at period end (not immediately)
    const res = await fetch(`${paddleEnv}/subscriptions/${billing.paddle_subscription_id}/cancel`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${paddleApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        effective_from: "next_billing_period",
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      await logToErrorDb(accountId, "BILLING", `Cancel failed: ${err}`);
      return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
    }

    // Update local status
    await getDb()
      .from("account")
      .update({ subscription_status: "canceled" })
      .eq("account_id", accountId);

    return NextResponse.json({
      success: true,
      effective: "end_of_billing_period",
      current_period_end: billing.current_period_end,
    });
  } catch (e: any) {
    await logToErrorDb(accountId, "BILLING", `Cancel error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
