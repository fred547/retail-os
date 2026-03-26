import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

/**
 * GET /api/serial-items — List serial items for account
 * Query params: status, product_id, store_id, search (by serial_number)
 */
export async function GET(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const productId = searchParams.get("product_id");
  const storeId = searchParams.get("store_id");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") ?? "1");
  const perPage = 50;
  const offset = (page - 1) * perPage;

  let query = getDb()
    .from("serial_item")
    .select("*", { count: "exact" })
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (status) query = query.eq("status", status);
  if (productId) query = query.eq("product_id", parseInt(productId));
  if (storeId) query = query.eq("store_id", parseInt(storeId));
  if (search) query = query.ilike("serial_number", `%${search}%`);

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, count });
}

/**
 * POST /api/serial-items — Create/receive serial items (batch)
 * Body: { items: [{ serial_number, product_id, store_id, serial_type, supplier_name, purchase_date, cost_price, warranty_months, color, year, engine_number, notes }] }
 */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { items } = body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items array is required" }, { status: 400 });
  }

  // Validate each item has required fields
  for (const item of items) {
    if (!item.serial_number || !item.product_id || !item.store_id) {
      return NextResponse.json(
        { error: "Each item must have serial_number, product_id, and store_id" },
        { status: 400 }
      );
    }
  }

  const records = items.map((item: any) => ({
    account_id: accountId,
    serial_number: item.serial_number,
    product_id: item.product_id,
    store_id: item.store_id,
    serial_type: item.serial_type || "serial",
    status: "in_stock",
    supplier_name: item.supplier_name || null,
    purchase_date: item.purchase_date || null,
    cost_price: item.cost_price != null ? Number(item.cost_price) : null,
    warranty_months: item.warranty_months != null ? Number(item.warranty_months) : null,
    color: item.color || null,
    year: item.year != null ? Number(item.year) : null,
    engine_number: item.engine_number || null,
    notes: item.notes || null,
  }));

  const { data, error } = await getDb()
    .from("serial_item")
    .insert(records)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, count: data?.length ?? 0 });
}
