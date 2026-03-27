import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "QUOTATION",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/**
 * POST /api/quotations/[id]/convert — convert quotation to order
 * Creates an order + order lines from the quotation, marks quote as converted.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const quotationId = parseInt(id);

    // Fetch quotation + lines
    const [{ data: quotation }, { data: lines }] = await Promise.all([
      getDb().from("quotation").select("*")
        .eq("quotation_id", quotationId).eq("account_id", accountId).eq("is_deleted", false).single(),
      getDb().from("quotation_line").select("*")
        .eq("quotation_id", quotationId).order("position"),
    ]);

    if (!quotation) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    if (quotation.status === "converted") {
      return NextResponse.json({ error: "Quotation already converted", order_id: quotation.converted_order_id }, { status: 400 });
    }
    if (quotation.status === "cancelled") {
      return NextResponse.json({ error: "Cannot convert a cancelled quotation" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const orderUuid = crypto.randomUUID();

    // Create order
    const { data: order, error: oErr } = await getDb()
      .from("orders")
      .insert({
        account_id: accountId,
        customer_id: quotation.customer_id ?? 0,
        store_id: quotation.store_id ?? 0,
        terminal_id: quotation.terminal_id ?? 0,
        order_type: "quotation",
        document_no: quotation.document_no,
        doc_status: "CO",
        is_paid: false,
        subtotal: quotation.subtotal,
        tax_total: quotation.tax_total,
        grand_total: quotation.grand_total,
        qty_total: (lines ?? []).reduce((sum: number, l: any) => sum + (l.quantity ?? 0), 0),
        date_ordered: now,
        uuid: orderUuid,
        currency: quotation.currency,
        note: quotation.notes,
        is_sync: true,
        updated_at: now,
      })
      .select("order_id")
      .single();

    if (oErr) throw oErr;

    // Create order lines
    if (lines?.length) {
      const orderLines = lines.map((line: any) => ({
        order_id: order.order_id,
        product_id: line.product_id ?? 0,
        productcategory_id: 0,
        tax_id: line.tax_id ?? 0,
        qtyentered: line.quantity ?? 1,
        priceentered: line.unit_price ?? 0,
        lineamt: line.line_total ?? 0,
        linenetamt: Math.round((line.line_total + line.line_total * (line.tax_rate ?? 0) / 100) * 100) / 100,
        costamt: 0,
        productname: line.product_name,
        productdescription: line.description,
      }));

      const { error: lErr } = await getDb().from("orderline").insert(orderLines);
      if (lErr) throw lErr;
    }

    // Mark quotation as converted
    const { error: uErr } = await getDb().from("quotation").update({
      status: "converted",
      converted_order_id: order.order_id,
      accepted_at: quotation.accepted_at ?? now,
      updated_at: now,
    }).eq("quotation_id", quotationId).eq("account_id", accountId);
    if (uErr) throw uErr;

    return NextResponse.json({
      success: true,
      order_id: order.order_id,
      order_uuid: orderUuid,
    });
  } catch (e: any) {
    await logToErrorDb(accountId, `Quotation convert error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
