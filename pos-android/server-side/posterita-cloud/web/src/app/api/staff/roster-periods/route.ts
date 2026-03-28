import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "ROSTER",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/** GET /api/staff/roster-periods — list periods */
export async function GET(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const url = req.nextUrl;
    const storeId = url.searchParams.get("store_id");
    const status = url.searchParams.get("status");

    let query = getDb()
      .from("roster_period")
      .select("*")
      .eq("account_id", accountId)
      .eq("is_deleted", false)
      .order("start_date", { ascending: false });

    if (storeId) {
      const sid = parseInt(storeId);
      if (isNaN(sid)) return NextResponse.json({ error: "Invalid store_id" }, { status: 400 });
      query = query.eq("store_id", sid);
    }
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ periods: data ?? [] });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(e instanceof Error ? e.message : (e?.message || JSON.stringify(e)));
    await logToErrorDb(accountId, `Roster periods GET error: ${err.message}`, err.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

/** POST /api/staff/roster-periods — create a period */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { store_id, name, start_date, end_date, picking_deadline } = body;

    if (!store_id || !start_date || !end_date) {
      return NextResponse.json({ error: "store_id, start_date, end_date are required" }, { status: 400 });
    }
    if (start_date >= end_date) {
      return NextResponse.json({ error: "start_date must be before end_date" }, { status: 400 });
    }

    const { data, error } = await getDb()
      .from("roster_period")
      .insert({
        account_id: accountId,
        store_id,
        name: name || `${start_date} to ${end_date}`,
        start_date,
        end_date,
        picking_deadline: picking_deadline || null,
        status: "open",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ period: data }, { status: 201 });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(e instanceof Error ? e.message : (e?.message || JSON.stringify(e)));
    await logToErrorDb(accountId, `Roster period create error: ${err.message}`, err.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
