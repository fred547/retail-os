import { createHmac } from "crypto";

/**
 * Webhook event firing utility.
 *
 * Usage:
 *   await fireWebhook(db, accountId, "order.created", { order_id: 123, ... });
 *
 * - Looks up active subscriptions for the account + event
 * - Sends HTTP POST with JSON payload + HMAC signature
 * - Logs delivery result to webhook_log
 * - Auto-disables subscription after 10 consecutive failures
 */

export const WEBHOOK_EVENTS = [
  "order.created",
  "order.refunded",
  "product.created",
  "product.updated",
  "customer.created",
  "stock.low",
  "till.opened",
  "till.closed",
] as const;

export type WebhookEvent = typeof WEBHOOK_EVENTS[number];

interface SupabaseClient {
  from(table: string): any;
}

export async function fireWebhook(
  db: SupabaseClient,
  accountId: string,
  event: WebhookEvent,
  payload: Record<string, any>
): Promise<void> {
  try {
    // Find active subscriptions for this event
    const { data: subs } = await db
      .from("webhook_subscription")
      .select("id, url, secret, failure_count")
      .eq("account_id", accountId)
      .eq("is_active", true)
      .contains("events", [event]);

    if (!subs?.length) return;

    const fullPayload = {
      event,
      account_id: accountId,
      timestamp: new Date().toISOString(),
      data: payload,
    };
    const body = JSON.stringify(fullPayload);

    // Fire all webhooks concurrently (non-blocking)
    await Promise.allSettled(
      subs.map((sub: any) => deliverWebhook(db, sub, accountId, event, body))
    );
  } catch (_) {
    // Never let webhook errors affect the main operation
  }
}

async function deliverWebhook(
  db: SupabaseClient,
  sub: { id: number; url: string; secret: string; failure_count: number },
  accountId: string,
  event: string,
  body: string
): Promise<void> {
  const signature = createHmac("sha256", sub.secret).update(body).digest("hex");

  let statusCode = 0;
  let responseBody = "";
  let success = false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000); // 10s timeout

    const res = await fetch(sub.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Event": event,
        "X-Webhook-Signature": signature,
        "X-Webhook-Timestamp": new Date().toISOString(),
        "User-Agent": "Posterita-Webhooks/1.0",
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    statusCode = res.status;
    responseBody = (await res.text()).substring(0, 500);
    success = res.ok;
  } catch (e: any) {
    responseBody = e.message?.substring(0, 500) || "Request failed";
  }

  // Log delivery
  await db.from("webhook_log").insert({
    subscription_id: sub.id,
    account_id: accountId,
    event,
    payload: JSON.parse(body),
    status: success ? "success" : "failed",
    status_code: statusCode || null,
    response_body: responseBody || null,
    attempts: 1,
    delivered_at: success ? new Date().toISOString() : null,
  });

  // Update subscription metadata
  if (success) {
    await db.from("webhook_subscription").update({
      last_triggered: new Date().toISOString(),
      failure_count: 0,
      updated_at: new Date().toISOString(),
    }).eq("id", sub.id);
  } else {
    const newFailCount = (sub.failure_count || 0) + 1;
    const updates: Record<string, any> = {
      failure_count: newFailCount,
      updated_at: new Date().toISOString(),
    };
    // Auto-disable after 10 consecutive failures
    if (newFailCount >= 10) {
      updates.is_active = false;
    }
    await db.from("webhook_subscription").update(updates).eq("id", sub.id);
  }
}

/**
 * Generate a test payload for a given event type.
 */
export function generateTestPayload(event: WebhookEvent): Record<string, any> {
  const now = new Date().toISOString();
  switch (event) {
    case "order.created":
      return { order_id: 0, document_no: "TEST-001", grand_total: 150.00, date_ordered: now, items: 3 };
    case "order.refunded":
      return { order_id: 0, document_no: "TEST-001", refund_amount: 50.00, date_refunded: now };
    case "product.created":
      return { product_id: 0, name: "Test Product", sellingprice: 29.99, category: "General" };
    case "product.updated":
      return { product_id: 0, name: "Test Product", sellingprice: 34.99, changed_fields: ["sellingprice"] };
    case "customer.created":
      return { customer_id: 0, name: "Test Customer", email: "test@example.com" };
    case "stock.low":
      return { product_id: 0, name: "Test Product", quantity_on_hand: 2, low_stock_threshold: 5 };
    case "till.opened":
      return { till_id: 0, terminal_name: "Register 1", opening_float: 500.00, opened_at: now };
    case "till.closed":
      return { till_id: 0, terminal_name: "Register 1", total_sales: 2500.00, closed_at: now };
    default:
      return { test: true };
  }
}
