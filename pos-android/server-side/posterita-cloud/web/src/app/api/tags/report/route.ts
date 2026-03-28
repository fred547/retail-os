import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "TAG_REPORT",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/**
 * GET /api/tags/report — sales breakdown by tag
 * Query: ?from=2026-01-01&to=2026-03-31&tag_ids=1,2,3&group_id=1
 */
export async function GET(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const tagIdsParam = url.searchParams.get("tag_ids");
    const groupId = url.searchParams.get("group_id");

    // Get all product_tags for this account (filtered by tag_ids if provided)
    let ptQuery = getDb()
      .from("product_tag")
      .select("product_id, tag_id")
      .eq("account_id", accountId);

    if (tagIdsParam) {
      const tagIds = tagIdsParam.split(",").map(Number).filter(n => !isNaN(n));
      if (tagIds.length > 0) ptQuery = ptQuery.in("tag_id", tagIds);
    }

    const { data: productTags, error: ptErr } = await ptQuery;
    if (ptErr) throw ptErr;
    if (!productTags?.length) {
      return NextResponse.json({ breakdown: [], summary: { total_revenue: 0, total_qty: 0, order_count: 0 } });
    }

    // Get tags + groups for display
    const tagIdSet = new Set<number>();
    for (const pt of productTags) tagIdSet.add(pt.tag_id);
    const tagIds: number[] = [...tagIdSet];

    let tagQuery = getDb()
      .from("tag")
      .select("tag_id, name, color, tag_group_id")
      .eq("account_id", accountId)
      .in("tag_id", tagIds);

    const { data: tags } = await tagQuery;

    let groupQuery = getDb()
      .from("tag_group")
      .select("tag_group_id, name, color")
      .eq("account_id", accountId);

    if (groupId) groupQuery = groupQuery.eq("tag_group_id", parseInt(groupId));

    const { data: groups } = await groupQuery;

    // Get order lines for tagged products within date range
    const productIds = [...new Set(productTags.map((pt: any) => pt.product_id))];

    let olQuery = getDb()
      .from("orderline")
      .select("product_id, qtyentered, lineamt, order_id")
      .eq("account_id", accountId)
      .in("product_id", productIds);

    // Filter by date via orders table
    let orderFilter = getDb()
      .from("orders")
      .select("order_id")
      .eq("account_id", accountId);

    if (from) orderFilter = orderFilter.gte("created_at", `${from}T00:00:00`);
    if (to) orderFilter = orderFilter.lte("created_at", `${to}T23:59:59`);

    const { data: orders } = await orderFilter;
    const orderIds = (orders ?? []).map((o: any) => o.order_id);

    if (orderIds.length > 0) {
      olQuery = olQuery.in("order_id", orderIds);
    } else if (from || to) {
      // Date filter active but no orders found
      return NextResponse.json({ breakdown: [], summary: { total_revenue: 0, total_qty: 0, order_count: 0 } });
    }

    const { data: orderLines } = await olQuery;

    // Build tag→product lookup
    const tagToProducts: Record<number, Set<number>> = {};
    for (const pt of productTags) {
      if (!tagToProducts[pt.tag_id]) tagToProducts[pt.tag_id] = new Set();
      tagToProducts[pt.tag_id].add(pt.product_id);
    }

    // Build tag lookup
    const tagMap: Record<number, any> = {};
    for (const t of tags ?? []) tagMap[t.tag_id] = t;

    const groupMap: Record<number, any> = {};
    for (const g of groups ?? []) groupMap[g.tag_group_id] = g;

    // Aggregate per tag
    const breakdown = tagIds.map((tagId: number) => {
      const productSet = tagToProducts[tagId] || new Set();
      const lines = (orderLines ?? []).filter((ol: any) => productSet.has(ol.product_id));
      const revenue = lines.reduce((sum: number, ol: any) => sum + (ol.lineamt || 0), 0);
      const qty = lines.reduce((sum: number, ol: any) => sum + (ol.qtyentered || 0), 0);
      const orderCount = new Set(lines.map((ol: any) => ol.order_id)).size;
      const tag = tagMap[tagId as number];
      const group = tag ? groupMap[tag.tag_group_id] : null;

      return {
        tag_id: tagId,
        tag_name: tag?.name ?? "Unknown",
        tag_color: tag?.color ?? null,
        group_name: group?.name ?? "Ungrouped",
        group_color: group?.color ?? "#6B7280",
        revenue: Math.round(revenue * 100) / 100,
        qty: Math.round(qty * 100) / 100,
        order_count: orderCount,
      };
    }).filter(b => b.revenue > 0 || b.qty > 0)
      .sort((a, b) => b.revenue - a.revenue);

    const summary = {
      total_revenue: Math.round(breakdown.reduce((s, b) => s + b.revenue, 0) * 100) / 100,
      total_qty: Math.round(breakdown.reduce((s, b) => s + b.qty, 0) * 100) / 100,
      order_count: new Set(breakdown.flatMap(b => b.order_count)).size || breakdown.reduce((s, b) => s + b.order_count, 0),
    };

    return NextResponse.json({ breakdown, summary });
  } catch (e: any) {
    await logToErrorDb(accountId, `Tag report error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
