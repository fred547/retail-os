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

/** POST /api/staff/picks/bulk — multi-pick at once */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { picks } = body;

    if (!Array.isArray(picks) || picks.length === 0) {
      return NextResponse.json({ error: "picks array is required" }, { status: 400 });
    }

    // Validate all picks have required fields
    for (const p of picks) {
      if (!p.roster_period_id || !p.slot_id || !p.user_id || !p.date) {
        return NextResponse.json({ error: "Each pick needs roster_period_id, slot_id, user_id, date" }, { status: 400 });
      }
    }

    // Verify period is in picking status (all picks should be for same period)
    const periodId = picks[0].roster_period_id;
    const { data: period } = await getDb()
      .from("roster_period")
      .select("status")
      .eq("id", periodId)
      .eq("account_id", accountId)
      .single();

    if (!period) return NextResponse.json({ error: "Period not found" }, { status: 404 });
    if (period.status !== "picking") {
      return NextResponse.json({ error: `Period is ${period.status}, not open for picking` }, { status: 400 });
    }

    // Get all slot details needed
    const slotIds = [...new Set(picks.map((p: { slot_id: number }) => p.slot_id))];
    const { data: slotsData } = await getDb()
      .from("roster_template_slot")
      .select("id, start_time, end_time, break_minutes")
      .in("id", slotIds);

    interface SlotInfo { id: number; start_time: string; end_time: string; break_minutes: number }
    const slotMap = new Map<number, SlotInfo>((slotsData || []).map((s: SlotInfo) => [s.id, s]));

    // Get holidays for date range
    const dates = picks.map((p: { date: string }) => p.date);
    const { data: holidays } = await getDb()
      .from("public_holiday")
      .select("date")
      .eq("account_id", accountId)
      .eq("is_deleted", false)
      .in("date", dates);

    const holidaySet = new Set((holidays || []).map((h: { date: string }) => h.date));

    // Get labor config
    const { data: config } = await getDb()
      .from("labor_config")
      .select("*")
      .eq("account_id", accountId)
      .maybeSingle();

    const rows = picks.map((p: { roster_period_id: number; slot_id: number; user_id: number; date: string; notes?: string }) => {
      const slot = slotMap.get(p.slot_id);
      if (!slot) return null;

      const d = new Date(p.date + "T00:00:00");
      const dow = d.getDay();
      let day_type: string;
      if (holidaySet.has(p.date)) day_type = "public_holiday";
      else if (dow === 0) day_type = "sunday";
      else if (dow === 6) day_type = "saturday";
      else day_type = "weekday";

      const multiplierKey = `${day_type}_multiplier`;
      const multiplier = config ? (config[multiplierKey] ?? 1.0) : (
        day_type === "sunday" ? 1.5 : day_type === "public_holiday" ? 2.0 : 1.0
      );

      const [sh, sm] = slot.start_time.split(":").map(Number);
      const [eh, em] = slot.end_time.split(":").map(Number);
      const realHours = Math.max(0, (eh * 60 + em - sh * 60 - sm - slot.break_minutes) / 60);

      return {
        account_id: accountId,
        roster_period_id: p.roster_period_id,
        slot_id: p.slot_id,
        user_id: p.user_id,
        date: p.date,
        status: "picked",
        effective_hours: Math.round(realHours * multiplier * 100) / 100,
        day_type,
        multiplier,
        notes: p.notes || null,
      };
    }).filter(Boolean);

    const { data, error } = await getDb()
      .from("shift_pick")
      .upsert(rows, { onConflict: "roster_period_id,slot_id,user_id,date", ignoreDuplicates: true })
      .select();

    if (error) throw error;

    return NextResponse.json({ picks: data, count: data?.length ?? 0 }, { status: 201 });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    await logToErrorDb(accountId, `Bulk pick error: ${err.message}`, err.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
