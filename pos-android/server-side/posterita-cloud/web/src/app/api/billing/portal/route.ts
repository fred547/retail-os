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
 * GET /api/billing/portal
 * Returns the Paddle customer portal URL for managing payment methods and invoices.
 */
export async function GET() {
  const accountId = await getSessionAccountId();
  if (!accountId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const billing = await getAccountPlan(accountId);

    if (!billing.paddle_customer_id) {
      return NextResponse.json({ error: "No billing customer" }, { status: 400 });
    }

    const paddleApiKey = process.env.PADDLE_API_KEY;
    if (!paddleApiKey) {
      await logToErrorDb(accountId, "BILLING", "PADDLE_API_KEY not configured");
      return NextResponse.json({ error: "Billing not configured" }, { status: 500 });
    }

    const paddleEnv = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === "production"
      ? "https://api.paddle.com"
      : "https://sandbox-api.paddle.com";

    // Generate a customer portal session
    const res = await fetch(`${paddleEnv}/customers/${billing.paddle_customer_id}/portal-sessions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${paddleApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const err = await res.text();
      await logToErrorDb(accountId, "BILLING", `Portal session failed: ${err}`);
      return NextResponse.json({ error: "Failed to create portal session" }, { status: 500 });
    }

    const data = await res.json();

    return NextResponse.json({
      portal_url: data.data?.urls?.[0]?.link ?? data.data?.url ?? null,
    });
  } catch (e: any) {
    await logToErrorDb(accountId, "BILLING", `Portal error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
