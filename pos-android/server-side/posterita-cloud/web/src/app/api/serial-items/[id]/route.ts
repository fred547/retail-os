import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

/**
 * GET /api/serial-items/[id] — Get single serial item
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accountId = await getSessionAccountId();
  if (!accountId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  const { data, error } = await getDb()
    .from("serial_item")
    .select("*")
    .eq("serial_item_id", parseInt(id))
    .eq("account_id", accountId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ data });
}

/**
 * PATCH /api/serial-items/[id] — Update serial item fields
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accountId = await getSessionAccountId();
  if (!accountId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  // Only allow updating specific fields
  const allowedFields = [
    "status",
    "notes",
    "delivered_date",
    "customer_id",
    "customer_name",
    "order_id",
    "sold_date",
    "sold_price",
    "supplier_name",
    "warranty_months",
    "color",
    "year",
    "engine_number",
    "store_id",
  ];

  const updates: Record<string, any> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await getDb()
    .from("serial_item")
    .update(updates)
    .eq("serial_item_id", parseInt(id))
    .eq("account_id", accountId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
