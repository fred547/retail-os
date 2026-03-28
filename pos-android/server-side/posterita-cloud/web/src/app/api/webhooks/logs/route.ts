import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

/**
 * GET /api/webhooks/logs — list webhook delivery logs for the account.
 * Query: ?subscription_id=N&limit=50
 */
export async function GET(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const subId = searchParams.get("subscription_id");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);

    let query = getDb()
      .from("webhook_log")
      .select("id, subscription_id, event, status, status_code, response_body, attempts, created_at, delivered_at")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })
      .limit(isNaN(limit) ? 50 : limit);

    if (subId) {
      const parsedSubId = parseInt(subId);
      if (!isNaN(parsedSubId)) {
        query = query.eq("subscription_id", parsedSubId);
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
