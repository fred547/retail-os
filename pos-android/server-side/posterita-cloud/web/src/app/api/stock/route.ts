import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

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
 * POST /api/stock — Manual stock adjustment
 * Body: { product_id, store_id, new_quantity, reason, notes }
 */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { product_id, store_id, new_quantity, reason, notes } = body;

    if (!product_id || new_quantity == null) {
      return NextResponse.json(
        { error: "product_id and new_quantity are required" },
        { status: 400 }
      );
    }

    // Get current stock
    const { data: product, error: fetchErr } = await getDb()
      .from("product")
      .select("product_id, quantity_on_hand, track_stock")
      .eq("product_id", product_id)
      .eq("account_id", accountId)
      .single();

    if (fetchErr || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const oldQty = product.quantity_on_hand ?? 0;
    const delta = new_quantity - oldQty;

    // Update product
    const { error: updateErr } = await getDb()
      .from("product")
      .update({
        quantity_on_hand: new_quantity,
        updated_at: new Date().toISOString(),
      })
      .eq("product_id", product_id)
      .eq("account_id", accountId);

    if (updateErr) {
      await logToErrorDb(accountId, "STOCK", `Stock update failed for product ${product_id}: ${updateErr.message}`);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Journal entry
    const { error: journalErr } = await getDb()
      .from("stock_journal")
      .insert({
        account_id: accountId,
        product_id,
        store_id: store_id ?? 0,
        quantity_change: delta,
        quantity_after: new_quantity,
        reason: reason || "adjustment",
        reference_type: "manual",
        notes: notes || null,
      });

    if (journalErr) {
      await logToErrorDb(accountId, "STOCK", `Stock journal insert failed for product ${product_id}: ${journalErr.message}`);
    }

    return NextResponse.json({
      product_id,
      old_quantity: oldQty,
      new_quantity,
      delta,
    });
  } catch (e: any) {
    await logToErrorDb(accountId, "STOCK", `Stock adjustment error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
