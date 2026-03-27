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
 * GET /api/stock — Multi-store stock overview
 * Query: ?product_id=123 (optional — if omitted, returns all products with stock)
 * Returns: products with quantity_on_hand, shelf_location, expiry_date, batch_number
 */
export async function GET(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("product_id");
    const storeId = searchParams.get("store_id");
    const filter = searchParams.get("filter"); // "low_stock", "out_of_stock", "expiring"

    let query = getDb()
      .from("product")
      .select("product_id, name, upc, quantity_on_hand, reorder_point, track_stock, shelf_location, batch_number, expiry_date, image")
      .eq("account_id", accountId)
      .eq("is_deleted", false)
      .eq("product_status", "live");

    if (productId) {
      query = query.eq("product_id", parseInt(productId));
    }
    if (filter === "low_stock") {
      query = query.gt("quantity_on_hand", 0).filter("quantity_on_hand", "lte", "reorder_point");
    } else if (filter === "out_of_stock") {
      query = query.eq("track_stock", 1).lte("quantity_on_hand", 0);
    } else if (filter === "expiring") {
      const in30days = new Date();
      in30days.setDate(in30days.getDate() + 30);
      query = query.not("expiry_date", "is", null).lte("expiry_date", in30days.toISOString());
    }

    query = query.order("name").limit(200);

    const { data, error } = await query;
    if (error) throw error;

    // If store_id requested, also get stock journal for that store
    let storeStock: any[] | null = null;
    if (storeId) {
      const { data: journal } = await getDb()
        .from("stock_journal")
        .select("product_id, quantity_after")
        .eq("account_id", accountId)
        .eq("store_id", parseInt(storeId))
        .order("created_at", { ascending: false });
      storeStock = journal;
    }

    return NextResponse.json({ products: data ?? [], store_stock: storeStock });
  } catch (e: any) {
    await logToErrorDb(accountId, "STOCK", `Stock query error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
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
