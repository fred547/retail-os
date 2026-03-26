import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

/**
 * GET /api/stock/journal — Stock movement history
 * Query params: product_id, store_id, reason, from, to, page
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
    const reason = searchParams.get("reason");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const page = parseInt(searchParams.get("page") ?? "1");
    const perPage = 50;
    const offset = (page - 1) * perPage;

    let query = getDb()
      .from("stock_journal")
      .select("*", { count: "exact" })
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })
      .range(offset, offset + perPage - 1);

    if (productId) query = query.eq("product_id", parseInt(productId));
    if (storeId) query = query.eq("store_id", parseInt(storeId));
    if (reason) query = query.eq("reason", reason);
    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);

    const { data, error, count } = await query;
    if (error) {
      // Log query failure to error_logs
      try {
        await getDb().from("error_logs").insert({
          account_id: accountId,
          severity: "ERROR",
          tag: "STOCK_JOURNAL",
          message: `Stock journal query failed: ${error.message}`,
          stack_trace: null,
          device_info: "web-api",
          app_version: "web",
        });
      } catch (_) { /* swallow */ }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, count });
  } catch (e: any) {
    try {
      await getDb().from("error_logs").insert({
        account_id: accountId,
        severity: "ERROR",
        tag: "STOCK_JOURNAL",
        message: `Stock journal error: ${e.message}`,
        stack_trace: e.stack ?? null,
        device_info: "web-api",
        app_version: "web",
      });
    } catch (_) { /* swallow */ }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
