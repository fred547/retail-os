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

/** GET /api/staff/operating-hours — list store hours by day type */
export async function GET(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const storeId = req.nextUrl.searchParams.get("store_id");
    if (!storeId) return NextResponse.json({ error: "store_id is required" }, { status: 400 });

    const sid = parseInt(storeId);
    if (isNaN(sid)) return NextResponse.json({ error: "Invalid store_id" }, { status: 400 });

    const { data, error } = await getDb()
      .from("store_operating_hours")
      .select("*")
      .eq("account_id", accountId)
      .eq("store_id", sid)
      .order("day_type");

    if (error) throw error;

    return NextResponse.json({ hours: data ?? [] });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    await logToErrorDb(accountId, `Operating hours GET error: ${err.message}`, err.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

/** POST /api/staff/operating-hours — upsert store hours (bulk: all 4 day types) */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const rawEntries: { store_id: number; day_type: string; open_time?: string; close_time?: string; is_closed?: boolean }[] =
      Array.isArray(body.entries) ? body.entries : [body];

    const validDayTypes = ["weekday", "saturday", "sunday", "public_holiday"];
    for (const entry of rawEntries) {
      if (!entry.store_id || !entry.day_type) {
        return NextResponse.json({ error: "store_id and day_type are required" }, { status: 400 });
      }
      if (!validDayTypes.includes(entry.day_type)) {
        return NextResponse.json({ error: `Invalid day_type: ${entry.day_type}` }, { status: 400 });
      }
    }

    const rows = rawEntries.map(e => ({
      account_id: accountId,
      store_id: e.store_id,
      day_type: e.day_type,
      open_time: e.open_time || null,
      close_time: e.close_time || null,
      is_closed: e.is_closed ?? false,
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await getDb()
      .from("store_operating_hours")
      .upsert(rows, { onConflict: "account_id,store_id,day_type" })
      .select();

    if (error) throw error;

    return NextResponse.json({ hours: data }, { status: 201 });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    await logToErrorDb(accountId, `Operating hours POST error: ${err.message}`, err.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
