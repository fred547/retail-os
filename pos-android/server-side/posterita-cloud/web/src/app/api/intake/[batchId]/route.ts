import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/**
 * GET /api/intake/[batchId] — get batch with all its items
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const { batchId } = await params;
  const supabase = getSupabase();

  const [{ data: batch, error: batchErr }, { data: items, error: itemsErr }] =
    await Promise.all([
      supabase.from("intake_batch").select("*").eq("batch_id", batchId).single(),
      supabase.from("intake_item").select("*").eq("batch_id", batchId).order("item_id"),
    ]);

  if (batchErr) return NextResponse.json({ error: batchErr.message }, { status: 404 });
  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 });

  // Fetch matched products for items that have a match
  const matchedIds = (items ?? [])
    .filter((i: any) => i.match_product_id)
    .map((i: any) => i.match_product_id);

  let matchedProducts: any[] = [];
  if (matchedIds.length > 0) {
    const { data } = await supabase
      .from("product")
      .select("product_id, name, sellingprice, costprice, image, upc, productcategory_id")
      .in("product_id", matchedIds);
    matchedProducts = data ?? [];
  }

  return NextResponse.json({ batch, items: items ?? [], matchedProducts });
}
