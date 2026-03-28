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

/** GET /api/staff/operating-hours/overrides — list date-specific overrides */
export async function GET(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const url = req.nextUrl;
    const storeId = url.searchParams.get("store_id");
    if (!storeId) return NextResponse.json({ error: "store_id is required" }, { status: 400 });

    const sid = parseInt(storeId);
    if (isNaN(sid)) return NextResponse.json({ error: "Invalid store_id" }, { status: 400 });

    let query = getDb()
      .from("store_hours_override")
      .select("*")
      .eq("account_id", accountId)
      .eq("store_id", sid)
      .order("date");

    const startDate = url.searchParams.get("start_date");
    const endDate = url.searchParams.get("end_date");
    if (startDate) query = query.gte("date", startDate);
    if (endDate) query = query.lte("date", endDate);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ overrides: data ?? [] });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    await logToErrorDb(accountId, `Hours override GET error: ${err.message}`, err.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

/** POST /api/staff/operating-hours/overrides — upsert date override */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { store_id, date, open_time, close_time, is_closed, reason } = body;

    if (!store_id || !date) {
      return NextResponse.json({ error: "store_id and date are required" }, { status: 400 });
    }

    const { data, error } = await getDb()
      .from("store_hours_override")
      .upsert({
        account_id: accountId,
        store_id,
        date,
        open_time: open_time || null,
        close_time: close_time || null,
        is_closed: is_closed ?? false,
        reason: reason || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "account_id,store_id,date" })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ override: data }, { status: 201 });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    await logToErrorDb(accountId, `Hours override POST error: ${err.message}`, err.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

/** DELETE /api/staff/operating-hours/overrides?id=123 — remove override */
export async function DELETE(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const { error } = await getDb()
      .from("store_hours_override")
      .delete()
      .eq("id", parseInt(id))
      .eq("account_id", accountId);

    if (error) throw error;

    return NextResponse.json({ deleted: true });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    await logToErrorDb(accountId, `Hours override DELETE error: ${err.message}`, err.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
