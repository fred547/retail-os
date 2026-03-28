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

/** GET /api/staff/leave — list leave requests */
export async function GET(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const url = req.nextUrl;
    const status = url.searchParams.get("status");
    const userId = url.searchParams.get("user_id");

    let query = getDb()
      .from("leave_request")
      .select("*")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }
    if (userId) {
      const uid = parseInt(userId);
      if (isNaN(uid)) return NextResponse.json({ error: "Invalid user_id" }, { status: 400 });
      query = query.eq("user_id", uid);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ requests: data ?? [] });
  } catch (e: any) {
    await logToErrorDb(accountId, `Leave list error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

/** POST /api/staff/leave — create leave request */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { user_id, leave_type_id, start_date, end_date, days, reason } = body;

    if (!user_id || !leave_type_id || !start_date || !end_date || days === undefined) {
      return NextResponse.json({ error: "user_id, leave_type_id, start_date, end_date, and days are required" }, { status: 400 });
    }

    if (start_date > end_date) {
      return NextResponse.json({ error: "start_date must be before or equal to end_date" }, { status: 400 });
    }

    const { data, error } = await getDb()
      .from("leave_request")
      .insert({
        account_id: accountId,
        user_id: parseInt(user_id),
        leave_type_id: parseInt(leave_type_id),
        start_date,
        end_date,
        days,
        reason: reason ?? null,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ request: data }, { status: 201 });
  } catch (e: any) {
    await logToErrorDb(accountId, `Leave create error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
