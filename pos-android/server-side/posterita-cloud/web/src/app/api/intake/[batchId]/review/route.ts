import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/intake/[batchId]/review
 *
 * Body: { actions: [{ item_id, action, overrides? }] }
 * action: "approve" | "reject" | "merge"
 * overrides: { name?, selling_price?, category_id? }
 *
 * For "approve" on new items: creates a product
 * For "merge" on matched items: updates the existing product
 * For "reject": marks as rejected, no product change
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const { batchId } = await params;
  const body = await req.json();
  const { actions } = body as { actions: ReviewAction[] };

  if (!actions || !Array.isArray(actions) || actions.length === 0) {
    return NextResponse.json({ error: "actions array is required" }, { status: 400 });
  }

  // Load batch
  const { data: batch } = await supabaseAdmin
    .from("intake_batch")
    .select("*")
    .eq("batch_id", batchId)
    .single();

  if (!batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  // Load items for this batch
  const itemIds = actions.map(a => a.item_id);
  const { data: items } = await supabaseAdmin
    .from("intake_item")
    .select("*")
    .in("item_id", itemIds);

  if (!items || items.length === 0) {
    return NextResponse.json({ error: "No items found" }, { status: 404 });
  }

  // Get next product_id
  const { data: maxProduct } = await supabaseAdmin
    .from("product")
    .select("product_id")
    .eq("account_id", batch.account_id)
    .order("product_id", { ascending: false })
    .limit(1);

  let nextProductId = (maxProduct?.[0]?.product_id ?? 0) + 1;

  // Resolve category names to IDs
  const { data: categories } = await supabaseAdmin
    .from("productcategory")
    .select("productcategory_id, name")
    .eq("account_id", batch.account_id)
    .eq("isactive", "Y");

  const categoryMap = new Map((categories ?? []).map((c: any) => [c.name.toLowerCase(), c.productcategory_id]));

  let approvedCount = 0;
  let rejectedCount = 0;
  const results: any[] = [];

  for (const action of actions) {
    const item = items.find((i: any) => i.item_id === action.item_id);
    if (!item) continue;

    if (action.action === "reject") {
      await supabaseAdmin.from("intake_item").update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
      }).eq("item_id", action.item_id);
      rejectedCount++;
      results.push({ item_id: action.item_id, action: "rejected" });
      continue;
    }

    // Resolve category
    const finalName = action.overrides?.name ?? item.override_name ?? item.name;
    const finalPrice = action.overrides?.selling_price ?? item.override_price ?? item.selling_price ?? 0;
    const categoryName = item.category_name?.toLowerCase();
    let categoryId = action.overrides?.category_id ?? item.override_category_id;

    if (!categoryId && categoryName) {
      categoryId = categoryMap.get(categoryName) ?? null;

      // Create category if it doesn't exist
      if (!categoryId) {
        const { data: maxCat } = await supabaseAdmin
          .from("productcategory")
          .select("productcategory_id")
          .eq("account_id", batch.account_id)
          .order("productcategory_id", { ascending: false })
          .limit(1);

        const newCatId = (maxCat?.[0]?.productcategory_id ?? 0) + 1;
        await supabaseAdmin.from("productcategory").insert({
          productcategory_id: newCatId,
          account_id: batch.account_id,
          name: item.category_name,
          isactive: "Y",
        });
        categoryId = newCatId;
        categoryMap.set(categoryName, newCatId);
      }
    }

    if (action.action === "approve" && (item.match_type === "new" || !item.match_product_id)) {
      // Create a new product
      const productId = nextProductId++;
      const imageUrl = item.image_cdn_url || item.image_url || null;

      const { error: insertErr } = await supabaseAdmin.from("product").insert({
        product_id: productId,
        account_id: batch.account_id,
        name: finalName,
        description: item.description ?? "",
        sellingprice: finalPrice,
        costprice: item.cost_price ?? finalPrice * 0.6,
        productcategory_id: categoryId ?? 0,
        image: imageUrl,
        isactive: "Y",
        istaxincluded: "Y",
        isstock: "Y",
        product_status: "live",
        source: batch.source,
      });

      if (!insertErr) {
        await supabaseAdmin.from("intake_item").update({
          status: "approved",
          committed_product_id: productId,
          reviewed_at: new Date().toISOString(),
        }).eq("item_id", action.item_id);
        approvedCount++;
        results.push({ item_id: action.item_id, action: "approved", product_id: productId });
      } else {
        results.push({ item_id: action.item_id, action: "error", error: insertErr.message });
      }

    } else if ((action.action === "approve" || action.action === "merge") && item.match_product_id) {
      // Update existing product
      const updates: Record<string, any> = {};
      if (item.cost_price != null) updates.costprice = item.cost_price;
      if (action.overrides?.selling_price != null) updates.sellingprice = action.overrides.selling_price;
      if (item.image_cdn_url || item.image_url) updates.image = item.image_cdn_url || item.image_url;
      if (item.description) updates.description = item.description;
      if (categoryId) updates.productcategory_id = categoryId;
      if (action.overrides?.name) updates.name = action.overrides.name;
      updates.needs_price_review = null; // owner just reviewed

      if (Object.keys(updates).length > 0) {
        await supabaseAdmin.from("product").update(updates).eq("product_id", item.match_product_id);
      }

      await supabaseAdmin.from("intake_item").update({
        status: "merged",
        committed_product_id: item.match_product_id,
        reviewed_at: new Date().toISOString(),
      }).eq("item_id", action.item_id);
      approvedCount++;
      results.push({ item_id: action.item_id, action: "merged", product_id: item.match_product_id });
    }
  }

  // Update batch counts
  const { data: batchItems } = await supabaseAdmin
    .from("intake_item")
    .select("status")
    .eq("batch_id", batchId);

  const pendingCount = (batchItems ?? []).filter((i: any) => i.status === "pending").length;
  const totalApproved = (batchItems ?? []).filter((i: any) => i.status === "approved" || i.status === "merged").length;
  const totalRejected = (batchItems ?? []).filter((i: any) => i.status === "rejected").length;

  await supabaseAdmin.from("intake_batch").update({
    approved_count: totalApproved,
    rejected_count: totalRejected,
    status: pendingCount === 0 ? "committed" : "in_review",
    ...(pendingCount === 0 ? { reviewed_at: new Date().toISOString() } : {}),
  }).eq("batch_id", batchId);

  return NextResponse.json({
    results,
    approved: approvedCount,
    rejected: rejectedCount,
    remaining: pendingCount,
  });
}

interface ReviewAction {
  item_id: number;
  action: "approve" | "reject" | "merge";
  overrides?: {
    name?: string;
    selling_price?: number;
    category_id?: number;
  };
}
