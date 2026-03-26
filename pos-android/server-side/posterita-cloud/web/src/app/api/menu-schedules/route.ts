import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "MENU_SCHEDULE",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/** GET /api/menu-schedules — list all menu schedules */
export async function GET(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const url = new URL(req.url);
    const storeId = url.searchParams.get("store_id");

    let query = getDb()
      .from("menu_schedule")
      .select("*")
      .eq("account_id", accountId)
      .order("priority", { ascending: false });

    if (storeId) query = query.or(`store_id.eq.0,store_id.eq.${storeId}`);

    const { data, error } = await query;
    if (error) {
      await logToErrorDb(accountId, `Failed to fetch menu schedules: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ schedules: data || [] });
  } catch (e: any) {
    await logToErrorDb(accountId, `Menu schedules list error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** POST /api/menu-schedules — create a menu schedule */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { name, description, store_id, category_ids, start_time, end_time, days_of_week, priority } = body;

    if (!name || !start_time || !end_time) {
      return NextResponse.json({ error: "name, start_time, and end_time are required" }, { status: 400 });
    }

    const { data, error } = await getDb()
      .from("menu_schedule")
      .insert({
        account_id: accountId,
        store_id: store_id || 0,
        name,
        description: description || null,
        category_ids: category_ids || [],
        start_time,
        end_time,
        days_of_week: days_of_week || [1, 2, 3, 4, 5, 6, 7],
        priority: priority || 0,
      })
      .select()
      .single();

    if (error) {
      await logToErrorDb(accountId, `Failed to create menu schedule: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ schedule: data }, { status: 201 });
  } catch (e: any) {
    await logToErrorDb(accountId, `Menu schedule create error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
