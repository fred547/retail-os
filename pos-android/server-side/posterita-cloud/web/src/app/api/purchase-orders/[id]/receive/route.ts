import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "GRN",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/**
 * POST /api/purchase-orders/[id]/receive — Goods Received Note (GRN)
 * Body: { lines: [{ id, quantity_received }] }
 * Updates PO line received qty, updates product stock, creates stock journal entries.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const poId = parseInt(id);
    const body = await req.json();
    const { lines } = body;

    if (!lines?.length) return NextResponse.json({ error: "lines array is required" }, { status: 400 });

    // Verify PO exists and belongs to account
    const { data: po, error: poErr } = await getDb()
      .from("purchase_order")
      .select("po_id, status, store_id")
      .eq("po_id", poId)
      .eq("account_id", accountId)
      .single();

    if (poErr || !po) return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    if (po.status === "cancelled") return NextResponse.json({ error: "Cannot receive cancelled PO" }, { status: 400 });

    const results: any[] = [];
    let allFullyReceived = true;

    for (const line of lines) {
      const { id: lineId, quantity_received } = line;
      if (!lineId || quantity_received == null) continue;

      // Get PO line
      const { data: poLine } = await getDb()
        .from("purchase_order_line")
        .select("*")
        .eq("id", lineId)
        .eq("po_id", poId)
        .eq("account_id", accountId)
        .single();

      if (!poLine) continue;

      const newReceived = (poLine.quantity_received || 0) + quantity_received;

      // Update PO line received qty
      await getDb()
        .from("purchase_order_line")
        .update({ quantity_received: newReceived })
        .eq("id", lineId)
        .eq("account_id", accountId);

      // Update product stock
      const { data: product } = await getDb()
        .from("product")
        .select("product_id, quantity_on_hand, track_stock")
        .eq("product_id", poLine.product_id)
        .eq("account_id", accountId)
        .single();

      if (product && product.track_stock !== false) {
        const newQty = (product.quantity_on_hand || 0) + quantity_received;
        await getDb()
          .from("product")
          .update({ quantity_on_hand: newQty, updated_at: new Date().toISOString() })
          .eq("product_id", poLine.product_id)
          .eq("account_id", accountId);

        // Stock journal entry
        await getDb()
          .from("stock_journal")
          .insert({
            account_id: accountId,
            product_id: poLine.product_id,
            store_id: po.store_id || 0,
            quantity_change: quantity_received,
            quantity_after: newQty,
            reason: "receive",
            reference_type: "purchase_order",
            reference_id: String(poId),
            notes: `GRN from PO #${poId}`,
          });
      }

      if (newReceived < (poLine.quantity_ordered || 0)) allFullyReceived = false;

      results.push({
        line_id: lineId,
        product_id: poLine.product_id,
        quantity_received,
        total_received: newReceived,
        quantity_ordered: poLine.quantity_ordered,
      });
    }

    // Update PO status
    const newStatus = allFullyReceived ? "received" : "partial";
    await getDb()
      .from("purchase_order")
      .update({
        status: newStatus,
        received_date: allFullyReceived ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("po_id", poId)
      .eq("account_id", accountId);

    return NextResponse.json({ po_id: poId, status: newStatus, lines_received: results });
  } catch (e: any) {
    await logToErrorDb(accountId, `GRN error for PO ${(await params).id}: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
