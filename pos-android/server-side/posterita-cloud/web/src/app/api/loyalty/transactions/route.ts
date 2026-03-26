import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId,
      severity: "ERROR",
      tag: "LOYALTY_TX",
      message,
      stack_trace: stackTrace ?? null,
      device_info: "web-api",
      app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/** GET /api/loyalty/transactions — loyalty transaction history */
export async function GET(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const url = new URL(req.url);
    const customerId = url.searchParams.get("customer_id");
    const type = url.searchParams.get("type");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = 50;
    const offset = (page - 1) * limit;

    let query = getDb()
      .from("loyalty_transaction")
      .select("*", { count: "exact" })
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (customerId) query = query.eq("customer_id", parseInt(customerId));
    if (type) query = query.eq("type", type);
    if (from) query = query.gte("created_at", `${from}T00:00:00`);
    if (to) query = query.lte("created_at", `${to}T23:59:59`);

    const { data, count, error } = await query;

    if (error) {
      await logToErrorDb(accountId, `Failed to fetch loyalty transactions: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Resolve customer names
    const customerIds = [...new Set((data || []).map((t: any) => t.customer_id))];
    let customerMap: Record<number, string> = {};
    if (customerIds.length > 0) {
      const { data: customers } = await getDb()
        .from("customer")
        .select("customer_id, name")
        .eq("account_id", accountId)
        .in("customer_id", customerIds);
      if (customers) {
        for (const c of customers) {
          customerMap[c.customer_id] = c.name || "Unknown";
        }
      }
    }

    const enriched = (data || []).map((t: any) => ({
      ...t,
      customer_name: customerMap[t.customer_id] || "Unknown",
    }));

    return NextResponse.json({
      transactions: enriched,
      total: count || 0,
      page,
    });
  } catch (e: any) {
    await logToErrorDb(accountId, `Loyalty transactions error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
