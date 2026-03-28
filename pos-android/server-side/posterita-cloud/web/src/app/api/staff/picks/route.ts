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

/** Compute effective hours for a pick */
async function computeEffectiveHours(
  accountId: string,
  date: string,
  startTime: string,
  endTime: string,
  breakMinutes: number,
): Promise<{ effective_hours: number; day_type: string; multiplier: number }> {
  const d = new Date(date + "T00:00:00");
  const dayOfWeek = d.getDay(); // 0=Sun

  // Check if public holiday
  const { data: holiday } = await getDb()
    .from("public_holiday")
    .select("id")
    .eq("account_id", accountId)
    .eq("date", date)
    .eq("is_deleted", false)
    .maybeSingle();

  let day_type: string;
  if (holiday) day_type = "public_holiday";
  else if (dayOfWeek === 0) day_type = "sunday";
  else if (dayOfWeek === 6) day_type = "saturday";
  else day_type = "weekday";

  // Get multiplier from labor config
  const { data: config } = await getDb()
    .from("labor_config")
    .select("*")
    .eq("account_id", accountId)
    .maybeSingle();

  const multiplierKey = `${day_type}_multiplier`;
  const multiplier = config ? (config[multiplierKey] ?? 1.0) : (
    day_type === "sunday" ? 1.5 : day_type === "public_holiday" ? 2.0 : 1.0
  );

  // Calculate real hours
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const realHours = Math.max(0, (eh * 60 + em - sh * 60 - sm - breakMinutes) / 60);

  return {
    effective_hours: Math.round(realHours * multiplier * 100) / 100,
    day_type,
    multiplier,
  };
}

/** GET /api/staff/picks — list picks for a period */
export async function GET(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const url = req.nextUrl;
    const periodId = url.searchParams.get("roster_period_id");
    const userId = url.searchParams.get("user_id");
    const status = url.searchParams.get("status");

    if (!periodId) return NextResponse.json({ error: "roster_period_id is required" }, { status: 400 });

    let query = getDb()
      .from("shift_pick")
      .select("*")
      .eq("account_id", accountId)
      .eq("roster_period_id", parseInt(periodId))
      .order("date")
      .order("created_at");

    if (userId) query = query.eq("user_id", parseInt(userId));
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ picks: data ?? [] });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(e instanceof Error ? e.message : (e?.message || JSON.stringify(e)));
    await logToErrorDb(accountId, `Picks GET error: ${err.message}`, err.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

/** POST /api/staff/picks — create a single pick */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { roster_period_id, slot_id, user_id, date, notes } = body;

    if (!roster_period_id || !slot_id || !user_id || !date) {
      return NextResponse.json({ error: "roster_period_id, slot_id, user_id, date are required" }, { status: 400 });
    }

    // Verify period is in picking status
    const { data: period } = await getDb()
      .from("roster_period")
      .select("status")
      .eq("id", roster_period_id)
      .eq("account_id", accountId)
      .single();

    if (!period) return NextResponse.json({ error: "Period not found" }, { status: 404 });
    if (period.status !== "picking") {
      return NextResponse.json({ error: `Period is ${period.status}, not open for picking` }, { status: 400 });
    }

    // Get slot details for effective hours computation
    const { data: slot } = await getDb()
      .from("roster_template_slot")
      .select("start_time, end_time, break_minutes")
      .eq("id", slot_id)
      .single();

    if (!slot) return NextResponse.json({ error: "Slot not found" }, { status: 404 });

    const { effective_hours, day_type, multiplier } = await computeEffectiveHours(
      accountId, date, slot.start_time, slot.end_time, slot.break_minutes,
    );

    const { data, error } = await getDb()
      .from("shift_pick")
      .insert({
        account_id: accountId,
        roster_period_id,
        slot_id,
        user_id,
        date,
        status: "picked",
        effective_hours,
        day_type,
        multiplier,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "You already picked this slot for this date" }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ pick: data }, { status: 201 });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(e instanceof Error ? e.message : (e?.message || JSON.stringify(e)));
    await logToErrorDb(accountId, `Pick create error: ${err.message}`, err.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
