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

/** GET /api/staff/labor-config — get labor config (creates default if missing) */
export async function GET(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const countryCode = req.nextUrl.searchParams.get("country_code") || "MU";

    // Try to fetch existing config
    const { data, error } = await getDb()
      .from("labor_config")
      .select("*")
      .eq("account_id", accountId)
      .eq("country_code", countryCode)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      return NextResponse.json({ config: data });
    }

    // Create default config for this account+country
    const { data: created, error: createErr } = await getDb()
      .from("labor_config")
      .insert({
        account_id: accountId,
        country_code: countryCode,
      })
      .select()
      .single();

    if (createErr) throw createErr;

    return NextResponse.json({ config: created });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(e instanceof Error ? e.message : JSON.stringify(e));
    await logToErrorDb(accountId, `Labor config GET error: ${err.message}`, err.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

/** POST /api/staff/labor-config — update labor config */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const {
      country_code,
      standard_weekly_hours,
      standard_daily_hours,
      weekday_multiplier,
      saturday_multiplier,
      sunday_multiplier,
      public_holiday_multiplier,
      overtime_multiplier,
      min_break_minutes,
    } = body;

    const countryCode = country_code || "MU";

    const updateFields: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (standard_weekly_hours !== undefined) updateFields.standard_weekly_hours = standard_weekly_hours;
    if (standard_daily_hours !== undefined) updateFields.standard_daily_hours = standard_daily_hours;
    if (weekday_multiplier !== undefined) updateFields.weekday_multiplier = weekday_multiplier;
    if (saturday_multiplier !== undefined) updateFields.saturday_multiplier = saturday_multiplier;
    if (sunday_multiplier !== undefined) updateFields.sunday_multiplier = sunday_multiplier;
    if (public_holiday_multiplier !== undefined) updateFields.public_holiday_multiplier = public_holiday_multiplier;
    if (overtime_multiplier !== undefined) updateFields.overtime_multiplier = overtime_multiplier;
    if (min_break_minutes !== undefined) updateFields.min_break_minutes = min_break_minutes;

    const { data, error } = await getDb()
      .from("labor_config")
      .upsert({
        account_id: accountId,
        country_code: countryCode,
        ...updateFields,
      }, { onConflict: "account_id,country_code" })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ config: data });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(e instanceof Error ? e.message : JSON.stringify(e));
    await logToErrorDb(accountId, `Labor config update error: ${err.message}`, err.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
