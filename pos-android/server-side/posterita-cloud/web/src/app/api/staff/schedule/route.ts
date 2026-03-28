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

/** GET /api/staff/schedule — list schedule for a date range */
export async function GET(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const url = req.nextUrl;
    const storeId = url.searchParams.get("store_id");
    const userId = url.searchParams.get("user_id");
    let startDate = url.searchParams.get("start_date");
    let endDate = url.searchParams.get("end_date");

    // Default range: current week (Monday to Sunday)
    if (!startDate || !endDate) {
      const now = new Date();
      const day = now.getDay();
      const diffToMon = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMon);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      startDate = startDate ?? monday.toISOString().slice(0, 10);
      endDate = endDate ?? sunday.toISOString().slice(0, 10);
    }

    let query = getDb()
      .from("staff_schedule")
      .select("*")
      .eq("account_id", accountId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date")
      .order("start_time");

    if (storeId) {
      const sid = parseInt(storeId);
      if (isNaN(sid)) return NextResponse.json({ error: "Invalid store_id" }, { status: 400 });
      query = query.eq("store_id", sid);
    }
    if (userId) {
      const uid = parseInt(userId);
      if (isNaN(uid)) return NextResponse.json({ error: "Invalid user_id" }, { status: 400 });
      query = query.eq("user_id", uid);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ entries: data ?? [] });
  } catch (e: any) {
    await logToErrorDb(accountId, `Schedule list error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

/** POST /api/staff/schedule — create schedule entry (or bulk) */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const rawEntries: any[] = Array.isArray(body.entries) ? body.entries : [body];

    // Validate all entries
    for (const entry of rawEntries) {
      if (!entry.store_id || !entry.user_id || !entry.date || !entry.start_time || !entry.end_time) {
        return NextResponse.json({ error: "store_id, user_id, date, start_time, end_time are required" }, { status: 400 });
      }
      if (entry.start_time >= entry.end_time) {
        return NextResponse.json({ error: "start_time must be before end_time" }, { status: 400 });
      }
    }

    const rows = rawEntries.map((e) => ({
      account_id: accountId,
      store_id: e.store_id,
      user_id: e.user_id,
      date: e.date,
      start_time: e.start_time,
      end_time: e.end_time,
      break_minutes: e.break_minutes ?? 0,
      role_override: e.role_override ?? null,
      notes: e.notes ?? null,
    }));

    const { data, error } = await getDb()
      .from("staff_schedule")
      .insert(rows)
      .select();

    if (error) throw error;

    return NextResponse.json({ entries: data }, { status: 201 });
  } catch (e: any) {
    await logToErrorDb(accountId, `Schedule create error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
