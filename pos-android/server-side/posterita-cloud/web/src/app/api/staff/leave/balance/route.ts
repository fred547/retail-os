import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "STAFF",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/** GET /api/staff/leave/balance — get leave balances */
export async function GET(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const url = req.nextUrl;
    const userId = url.searchParams.get("user_id");
    const yearStr = url.searchParams.get("year");
    const year = yearStr ? parseInt(yearStr) : new Date().getFullYear();

    if (isNaN(year)) return NextResponse.json({ error: "Invalid year" }, { status: 400 });

    let query = getDb()
      .from("leave_balance")
      .select("*")
      .eq("account_id", accountId)
      .eq("year", year);

    if (userId) {
      const uid = parseInt(userId);
      if (isNaN(uid)) return NextResponse.json({ error: "Invalid user_id" }, { status: 400 });
      query = query.eq("user_id", uid);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ balances: data ?? [] });
  } catch (e: any) {
    await logToErrorDb(accountId, `Leave balance error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
