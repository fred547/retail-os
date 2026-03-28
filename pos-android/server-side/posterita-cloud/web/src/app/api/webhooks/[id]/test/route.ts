import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";
import { fireWebhook, generateTestPayload, type WebhookEvent, WEBHOOK_EVENTS } from "@/lib/webhooks";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "INFO", tag: "WEBHOOK_TEST",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/**
 * POST /api/webhooks/[id]/test — send a test event to the webhook.
 * Body: { event?: string } — defaults to first subscribed event.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const subId = parseInt(id);
    if (isNaN(subId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    // Get the subscription
    const { data: sub } = await getDb()
      .from("webhook_subscription")
      .select("id, url, events, secret, is_active")
      .eq("id", subId)
      .eq("account_id", accountId)
      .single();

    if (!sub) return NextResponse.json({ error: "Webhook not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const validEvents = new Set(WEBHOOK_EVENTS as readonly string[]);
    const event = (body.event && validEvents.has(body.event) ? body.event : sub.events?.[0] || "order.created") as WebhookEvent;
    const testPayload = generateTestPayload(event);

    // Fire the webhook (this logs to webhook_log internally)
    await fireWebhook(getDb(), accountId, event, testPayload);

    await logToErrorDb(accountId, `Test webhook fired: ${event} → ${sub.url}`);

    return NextResponse.json({
      success: true,
      event,
      url: sub.url,
      message: `Test ${event} event sent to ${sub.url}`,
    });
  } catch (e: any) {
    await logToErrorDb(accountId, `Webhook test failed: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
