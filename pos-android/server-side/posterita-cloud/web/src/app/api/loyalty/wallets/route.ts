import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId,
      severity: "ERROR",
      tag: "LOYALTY_WALLETS",
      message,
      stack_trace: stackTrace ?? null,
      device_info: "web-api",
      app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/** GET /api/loyalty/wallets — list all customers with loyalty points > 0 */
export async function GET(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = 50;
    const offset = (page - 1) * limit;

    let query = getDb()
      .from("customer")
      .select("customer_id, name, phone1, email, loyaltypoints, isactive", { count: "exact" })
      .eq("account_id", accountId)
      .gt("loyaltypoints", 0)
      .order("loyaltypoints", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone1.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, count, error } = await query;

    if (error) {
      await logToErrorDb(accountId, `Failed to fetch loyalty wallets: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Summary stats
    const { data: stats } = await getDb()
      .from("customer")
      .select("loyaltypoints")
      .eq("account_id", accountId)
      .gt("loyaltypoints", 0);

    const totalPoints = (stats || []).reduce((sum: number, c: any) => sum + (c.loyaltypoints || 0), 0);
    const memberCount = stats?.length || 0;

    return NextResponse.json({
      wallets: data || [],
      total: count || 0,
      page,
      summary: {
        total_members: memberCount,
        total_points_outstanding: totalPoints,
      },
    });
  } catch (e: any) {
    await logToErrorDb(accountId, `Loyalty wallets error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
