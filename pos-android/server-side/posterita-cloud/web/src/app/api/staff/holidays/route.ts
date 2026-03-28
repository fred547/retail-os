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

/** GET /api/staff/holidays — list public holidays */
export async function GET(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const url = req.nextUrl;
    const countryCode = url.searchParams.get("country_code") || "MU";
    const year = url.searchParams.get("year");

    let query = getDb()
      .from("public_holiday")
      .select("*")
      .eq("account_id", accountId)
      .eq("country_code", countryCode)
      .eq("is_deleted", false)
      .order("date");

    if (year) {
      query = query
        .gte("date", `${year}-01-01`)
        .lte("date", `${year}-12-31`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ holidays: data ?? [] });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(e instanceof Error ? e.message : JSON.stringify(e));
    await logToErrorDb(accountId, `Holidays list error: ${err.message}`, err.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

/** POST /api/staff/holidays — create a public holiday */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { date, name, country_code, is_recurring } = body;

    if (!date || !name) {
      return NextResponse.json({ error: "date and name are required" }, { status: 400 });
    }

    const { data, error } = await getDb()
      .from("public_holiday")
      .upsert({
        account_id: accountId,
        country_code: country_code || "MU",
        date,
        name,
        is_recurring: is_recurring ?? false,
      }, { onConflict: "account_id,country_code,date" })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ holiday: data }, { status: 201 });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(e instanceof Error ? e.message : JSON.stringify(e));
    await logToErrorDb(accountId, `Holiday create error: ${err.message}`, err.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

/** DELETE /api/staff/holidays?id=123 — soft-delete a holiday */
export async function DELETE(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const { error } = await getDb()
      .from("public_holiday")
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq("id", parseInt(id))
      .eq("account_id", accountId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(e instanceof Error ? e.message : JSON.stringify(e));
    await logToErrorDb(accountId, `Holiday delete error: ${err.message}`, err.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
