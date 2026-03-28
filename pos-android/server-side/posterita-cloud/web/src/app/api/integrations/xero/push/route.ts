import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";
import { refreshAccessToken, createInvoice, createPayment, mapOrderToInvoice, mapPaymentToXero } from "@/lib/xero";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "XERO",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/** Ensure access token is fresh — refresh if expired */
async function getValidToken(accountId: string): Promise<{ accessToken: string; tenantId: string } | null> {
  const { data: conn } = await getDb()
    .from("integration_connection")
    .select("*")
    .eq("account_id", accountId)
    .eq("provider", "xero")
    .eq("status", "active")
    .single();

  if (!conn?.access_token || !conn?.refresh_token) return null;

  const expiresAt = new Date(conn.token_expires_at).getTime();
  const now = Date.now();

  // Refresh if token expires within 5 minutes
  if (now > expiresAt - 5 * 60 * 1000) {
    try {
      const tokens = await refreshAccessToken(conn.refresh_token);
      const newExpiry = new Date(now + tokens.expires_in * 1000).toISOString();

      await getDb()
        .from("integration_connection")
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: newExpiry,
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conn.id);

      return { accessToken: tokens.access_token, tenantId: conn.tenant_id };
    } catch (e: any) {
      await getDb()
        .from("integration_connection")
        .update({ status: "error", error_message: `Token refresh failed: ${e.message}`, updated_at: new Date().toISOString() })
        .eq("id", conn.id);
      return null;
    }
  }

  return { accessToken: conn.access_token, tenantId: conn.tenant_id };
}

/**
 * POST /api/integrations/xero/push — push an order to Xero as invoice + payment
 * Body: { order_id } or { order_uuid }
 */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { order_id, order_uuid } = body;

    if (!order_id && !order_uuid) {
      return NextResponse.json({ error: "order_id or order_uuid required" }, { status: 400 });
    }

    // Get valid token
    const auth = await getValidToken(accountId);
    if (!auth) {
      return NextResponse.json({ error: "Xero not connected or token expired. Reconnect in Settings → Integrations." }, { status: 401 });
    }

    // Get order
    let orderQuery = getDb()
      .from("orders")
      .select("*")
      .eq("account_id", accountId);

    if (order_id) orderQuery = orderQuery.eq("order_id", order_id);
    else orderQuery = orderQuery.eq("uuid", order_uuid);

    const { data: order, error: orderErr } = await orderQuery.single();
    if (orderErr || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check not already pushed
    const { data: existing } = await getDb()
      .from("integration_event_log")
      .select("id, external_id")
      .eq("account_id", accountId)
      .eq("provider", "xero")
      .eq("event_type", "order.paid")
      .eq("reference_id", order.uuid)
      .eq("status", "sent")
      .limit(1);

    if (existing?.length) {
      return NextResponse.json({
        error: "Order already pushed to Xero",
        xero_invoice_id: existing[0].external_id,
      }, { status: 409 });
    }

    // Get order lines
    const { data: lines } = await getDb()
      .from("orderline")
      .select("*")
      .eq("order_id", order.order_id);

    // Get account currency
    const { data: account } = await getDb()
      .from("account")
      .select("currency")
      .eq("account_id", accountId)
      .single();

    const currency = account?.currency || "MUR";

    // Map and create invoice
    const invoice = mapOrderToInvoice(order, lines ?? [], currency);
    const invoiceResult = await createInvoice(auth.accessToken, auth.tenantId, invoice);

    // Log invoice event
    await getDb().from("integration_event_log").insert({
      account_id: accountId,
      provider: "xero",
      event_type: "order.paid",
      reference_id: order.uuid,
      external_id: invoiceResult.InvoiceID,
      status: "sent",
      request_body: invoice,
      response_body: invoiceResult,
    });

    // Get payments for this order and push each
    const { data: payments } = await getDb()
      .from("payment")
      .select("*")
      .eq("order_id", order.order_id);

    const paymentResults = [];
    for (const pmt of payments ?? []) {
      try {
        const xeroPayment = mapPaymentToXero(pmt, invoiceResult.InvoiceID);
        const result = await createPayment(auth.accessToken, auth.tenantId, xeroPayment);
        paymentResults.push(result);

        await getDb().from("integration_event_log").insert({
          account_id: accountId,
          provider: "xero",
          event_type: "payment.created",
          reference_id: order.uuid,
          external_id: result.PaymentID,
          status: "sent",
        });
      } catch (pmtErr: any) {
        await logToErrorDb(accountId, `Xero payment push failed for order ${order.uuid}: ${pmtErr.message}`);
      }
    }

    // Update last_sync_at
    await getDb()
      .from("integration_connection")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("account_id", accountId)
      .eq("provider", "xero");

    return NextResponse.json({
      invoice_id: invoiceResult.InvoiceID,
      invoice_number: invoiceResult.InvoiceNumber,
      payments_pushed: paymentResults.length,
    });
  } catch (e: any) {
    // Log failed event
    await getDb().from("integration_event_log").insert({
      account_id: accountId,
      provider: "xero",
      event_type: "order.paid",
      reference_id: "unknown",
      status: "failed",
      error_message: e.message,
    }).catch(() => {});

    await logToErrorDb(accountId, `Xero push error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
