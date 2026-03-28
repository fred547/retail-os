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

/** GET /api/staff/roster-slots — list template slots */
export async function GET(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const storeId = req.nextUrl.searchParams.get("store_id");

    let query = getDb()
      .from("roster_template_slot")
      .select("*")
      .eq("account_id", accountId)
      .eq("is_deleted", false)
      .order("day_of_week")
      .order("start_time");

    if (storeId) {
      const sid = parseInt(storeId);
      if (isNaN(sid)) return NextResponse.json({ error: "Invalid store_id" }, { status: 400 });
      query = query.eq("store_id", sid);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ slots: data ?? [] });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(e instanceof Error ? e.message : JSON.stringify(e));
    await logToErrorDb(accountId, `Roster slots GET error: ${err.message}`, err.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

/** POST /api/staff/roster-slots — create template slot */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { store_id, name, day_of_week, start_time, end_time, break_minutes, required_role, color } = body;

    if (!store_id || !name || day_of_week === undefined || !start_time || !end_time) {
      return NextResponse.json({ error: "store_id, name, day_of_week, start_time, end_time are required" }, { status: 400 });
    }
    if (day_of_week < 1 || day_of_week > 7) {
      return NextResponse.json({ error: "day_of_week must be 1-7" }, { status: 400 });
    }
    if (start_time >= end_time) {
      return NextResponse.json({ error: "start_time must be before end_time" }, { status: 400 });
    }

    const { data, error } = await getDb()
      .from("roster_template_slot")
      .insert({
        account_id: accountId,
        store_id,
        name,
        day_of_week,
        start_time,
        end_time,
        break_minutes: break_minutes ?? 30,
        required_role: required_role || null,
        color: color || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ slot: data }, { status: 201 });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(e instanceof Error ? e.message : JSON.stringify(e));
    await logToErrorDb(accountId, `Roster slot create error: ${err.message}`, err.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
