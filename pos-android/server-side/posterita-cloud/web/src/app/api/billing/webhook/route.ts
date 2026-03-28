import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/supabase/admin";
import { createHmac, timingSafeEqual } from "crypto";

async function logToErrorDb(accountId: string | null, tag: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId ?? "system",
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
 * Verifies the Paddle webhook signature (Paddle-Signature header).
 * See: https://developer.paddle.com/webhooks/signature-verification
 */
function verifyPaddleSignature(rawBody: string, signatureHeader: string, secret: string): boolean {
  try {
    // Parse header: ts=<timestamp>;h1=<hash>
    const parts: Record<string, string> = {};
    for (const part of signatureHeader.split(";")) {
      const [key, value] = part.split("=");
      if (key && value) parts[key] = value;
    }

    const ts = parts["ts"];
    const h1 = parts["h1"];
    if (!ts || !h1) return false;

    // Construct signed payload: ts:rawBody
    const signedPayload = `${ts}:${rawBody}`;
    const expectedSig = createHmac("sha256", secret)
      .update(signedPayload)
      .digest("hex");

    // Timing-safe comparison
    const sigBuffer = Buffer.from(h1, "hex");
    const expectedBuffer = Buffer.from(expectedSig, "hex");
    if (sigBuffer.length !== expectedBuffer.length) return false;

    return timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * Resolves the account_id from the webhook payload.
 * Paddle sends custom_data with account_id, or we look up by paddle_customer_id.
 */
async function resolveAccountId(payload: any): Promise<string | null> {
  // Try custom_data first (set during checkout)
  const customData = payload.data?.custom_data;
  if (customData?.account_id) return customData.account_id;

  // Try subscription custom_data
  const subCustomData = payload.data?.subscription?.custom_data;
  if (subCustomData?.account_id) return subCustomData.account_id;

  // Fallback: look up by paddle_customer_id
  const customerId = payload.data?.customer_id;
  if (customerId) {
    const { data } = await getDb()
      .from("account")
      .select("account_id")
      .eq("paddle_customer_id", customerId)
      .limit(1)
      .single();
    if (data?.account_id) return data.account_id;
  }

  return null;
}

/**
 * Resolves the plan from a Paddle price_id by checking against our price map.
 * Falls back to custom_data if present.
 */
function resolvePlanFromPrice(payload: any): string | null {
  // Check custom_data
  const customData = payload.data?.custom_data;
  if (customData?.plan) return customData.plan;

  // TODO: map price_id back to plan when real Paddle price IDs are configured
  return null;
}

/**
 * POST /api/billing/webhook
 * Handles Paddle webhook events. No session auth — verified by signature.
 */
export async function POST(req: NextRequest) {
  try {
    const secret = process.env.PADDLE_WEBHOOK_SECRET;
    if (!secret) {
      await logToErrorDb(null, "BILLING_WEBHOOK", "PADDLE_WEBHOOK_SECRET not configured");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
    }

    const rawBody = await req.text();
    const signature = req.headers.get("Paddle-Signature") ?? "";

    if (!verifyPaddleSignature(rawBody, signature, secret)) {
      await logToErrorDb(null, "BILLING_WEBHOOK", "Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const eventType: string = payload.event_type;
    const paddleEventId: string | undefined = payload.event_id;

    // Dedup by paddle_event_id
    if (paddleEventId) {
      const { data: existing } = await getDb()
        .from("billing_event")
        .select("id")
        .eq("paddle_event_id", paddleEventId)
        .maybeSingle();

      if (existing) {
        // Already processed
        return NextResponse.json({ received: true, deduplicated: true });
      }
    }

    const accountId = await resolveAccountId(payload);

    // Log every event to billing_event
    await getDb().from("billing_event").insert({
      account_id: accountId,
      event_type: eventType,
      paddle_event_id: paddleEventId ?? null,
      payload,
    });

    if (!accountId) {
      await logToErrorDb(null, "BILLING_WEBHOOK", `Could not resolve account_id for event: ${eventType}`, JSON.stringify(payload));
      return NextResponse.json({ received: true, warning: "account_id not resolved" });
    }

    // ── Region mismatch detection ─────────────────────────────
    // On subscription and transaction events, check if the Paddle payment
    // country matches the account's registered billing region.
    if (
      eventType === "subscription.created" ||
      eventType === "subscription.activated" ||
      eventType === "transaction.completed" ||
      eventType === "transaction.paid"
    ) {
      try {
        // Extract country from Paddle payload (address or customer address)
        const paddleCountry =
          payload.data?.address?.country_code ||
          payload.data?.customer?.address?.country_code ||
          payload.data?.billing_details?.payment_information?.country_code ||
          null;

        if (paddleCountry && accountId) {
          // Look up what region the Paddle country maps to
          const { data: paddleRegionData } = await getDb()
            .from("country_config")
            .select("billing_region")
            .eq("country_code", paddleCountry.toUpperCase())
            .maybeSingle();

          // Get account's registered region
          const { data: accountData } = await getDb()
            .from("account")
            .select("country_code, billing_region")
            .eq("account_id", accountId)
            .maybeSingle();

          const paddleRegion = paddleRegionData?.billing_region || "developed";
          const accountRegion = accountData?.billing_region || "developing";

          if (paddleRegion !== accountRegion) {
            // Region mismatch — log for admin review, do NOT auto-change
            await logToErrorDb(
              accountId,
              "BILLING_REGION_MISMATCH",
              `Region mismatch: account region '${accountRegion}' (country: ${accountData?.country_code || "unknown"}) but Paddle payment from '${paddleRegion}' (country: ${paddleCountry}). Event: ${eventType}`,
            );

            // Record mismatch in billing_event for dashboard alerting
            await getDb().from("billing_event").insert({
              account_id: accountId,
              event_type: "region_mismatch_detected",
              paddle_event_id: null,
              payload: {
                account_country: accountData?.country_code,
                account_region: accountRegion,
                paddle_country: paddleCountry,
                paddle_region: paddleRegion,
                source_event: eventType,
                paddle_event_id: paddleEventId,
              },
            });
          }
        }
      } catch (_) {
        // Non-blocking — don't fail the webhook over mismatch check
      }
    }

    // Process event
    switch (eventType) {
      // ── Subscription Events ──────────────────────────────
      case "subscription.created":
      case "subscription.activated": {
        const subscriptionId = payload.data?.id;
        const customerId = payload.data?.customer_id;
        const currentPeriodEnd = payload.data?.current_billing_period?.ends_at;
        const plan = resolvePlanFromPrice(payload);

        const update: Record<string, any> = {
          subscription_status: "active",
          paddle_subscription_id: subscriptionId ?? undefined,
          paddle_customer_id: customerId ?? undefined,
        };
        if (plan) update.plan = plan;
        if (currentPeriodEnd) update.current_period_end = currentPeriodEnd;

        await getDb()
          .from("account")
          .update(update)
          .eq("account_id", accountId);
        break;
      }

      case "subscription.updated": {
        const currentPeriodEnd = payload.data?.current_billing_period?.ends_at;
        const status = payload.data?.status;
        const plan = resolvePlanFromPrice(payload);

        const update: Record<string, any> = {};
        if (plan) update.plan = plan;
        if (currentPeriodEnd) update.current_period_end = currentPeriodEnd;
        if (status === "active") update.subscription_status = "active";
        else if (status === "past_due") update.subscription_status = "past_due";
        else if (status === "paused") update.subscription_status = "paused";
        else if (status === "canceled") update.subscription_status = "canceled";
        else if (status === "trialing") update.subscription_status = "trialing";

        if (Object.keys(update).length > 0) {
          await getDb()
            .from("account")
            .update(update)
            .eq("account_id", accountId);
        }
        break;
      }

      case "subscription.canceled": {
        const currentPeriodEnd = payload.data?.current_billing_period?.ends_at;
        const update: Record<string, any> = { subscription_status: "canceled" };
        if (currentPeriodEnd) update.current_period_end = currentPeriodEnd;
        await getDb().from("account").update(update).eq("account_id", accountId);
        break;
      }

      case "subscription.past_due": {
        await getDb().from("account").update({ subscription_status: "past_due" }).eq("account_id", accountId);
        break;
      }

      case "subscription.paused": {
        await getDb().from("account").update({ subscription_status: "paused" }).eq("account_id", accountId);
        break;
      }

      case "subscription.resumed": {
        await getDb().from("account").update({ subscription_status: "active" }).eq("account_id", accountId);
        break;
      }

      case "subscription.trialing": {
        await getDb().from("account").update({ subscription_status: "trialing" }).eq("account_id", accountId);
        break;
      }

      // ── Transaction Events ───────────────────────────────
      case "transaction.paid":
      case "transaction.completed":
      case "transaction.billed":
      case "transaction.created":
      case "transaction.ready":
      case "transaction.revised":
      case "transaction.updated": {
        // Logged to billing_event above — no account state change needed
        break;
      }

      case "transaction.past_due": {
        // Flag the account if this is a subscription payment
        if (payload.data?.subscription_id) {
          await getDb().from("account").update({ subscription_status: "past_due" }).eq("account_id", accountId);
        }
        break;
      }

      case "transaction.payment_failed": {
        // Log payment failure as a warning
        await logToErrorDb(accountId, "BILLING_PAYMENT", `Payment failed for transaction ${payload.data?.id}. Origin: ${payload.data?.origin}`);
        break;
      }

      case "transaction.canceled": {
        // Logged above — no further action unless it's a subscription cancellation
        break;
      }

      // ── Customer Events ──────────────────────────────────
      case "customer.created":
      case "customer.updated":
      case "customer.imported": {
        // Sync Paddle customer_id to account if we can resolve it
        const customerId = payload.data?.id;
        if (customerId && accountId) {
          await getDb().from("account").update({ paddle_customer_id: customerId }).eq("account_id", accountId);
        }
        break;
      }

      // ── Address & Business Events ────────────────────────
      case "address.created":
      case "address.updated":
      case "address.imported":
      case "business.created":
      case "business.updated":
      case "business.imported": {
        // Logged to billing_event — useful for tax compliance & invoice auditing
        break;
      }

      // ── Adjustment Events (refunds/credits) ──────────────
      case "adjustment.created":
      case "adjustment.updated": {
        const action = payload.data?.action; // refund, credit, chargeback
        const status = payload.data?.status; // pending, approved, rejected
        if (action === "refund" && status === "approved") {
          await logToErrorDb(accountId, "BILLING_REFUND", `Refund approved: ${payload.data?.id}, amount: ${JSON.stringify(payload.data?.totals)}`);
        }
        break;
      }

      // ── Payment Method Events ────────────────────────────
      case "payment_method.saved":
      case "payment_method.deleted": {
        // Logged to billing_event — useful for tracking card changes
        break;
      }

      // ── Payout Events ────────────────────────────────────
      case "payout.created":
      case "payout.paid": {
        // Logged to billing_event — track when Paddle pays us
        break;
      }

      // ── Discount Events ──────────────────────────────────
      case "discount.created":
      case "discount.updated":
      case "discount.imported": {
        // Logged to billing_event — promo code tracking
        break;
      }

      default:
        // Unknown/new event type — already logged to billing_event
        break;
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    await logToErrorDb(null, "BILLING_WEBHOOK", `Webhook processing error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
