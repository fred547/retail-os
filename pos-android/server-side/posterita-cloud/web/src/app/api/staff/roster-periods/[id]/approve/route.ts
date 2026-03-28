import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId, getSessionUserId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "ROSTER",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/** POST /api/staff/roster-periods/[id]/approve — batch approve picks → generate staff_schedule rows */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const periodId = parseInt(id);
    if (isNaN(periodId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    // Get period — must be in review status
    const { data: period } = await getDb()
      .from("roster_period")
      .select("*")
      .eq("id", periodId)
      .eq("account_id", accountId)
      .single();

    if (!period) return NextResponse.json({ error: "Period not found" }, { status: 404 });
    if (period.status !== "review") {
      return NextResponse.json({ error: `Period must be in review status (currently: ${period.status})` }, { status: 400 });
    }

    // Get all "picked" status picks
    const { data: picks } = await getDb()
      .from("shift_pick")
      .select("*")
      .eq("roster_period_id", periodId)
      .eq("account_id", accountId)
      .eq("status", "picked");

    if (!picks || picks.length === 0) {
      return NextResponse.json({ error: "No picks to approve" }, { status: 400 });
    }

    // Get slot details for schedule generation
    interface PickRow { id: number; slot_id: number; user_id: number; date: string; effective_hours: number; day_type: string; multiplier: number }
    const slotIds = [...new Set(picks.map((p: PickRow) => p.slot_id))];
    const { data: slotsData } = await getDb()
      .from("roster_template_slot")
      .select("id, name, start_time, end_time, break_minutes, required_role")
      .in("id", slotIds);

    interface SlotDetail { id: number; name: string; start_time: string; end_time: string; break_minutes: number; required_role: string | null }
    const slotMap = new Map<number, SlotDetail>((slotsData || []).map((s: SlotDetail) => [s.id, s]));

    // Approve all picks
    const pickIds = picks.map((p: PickRow) => p.id);
    await getDb()
      .from("shift_pick")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .in("id", pickIds)
      .eq("account_id", accountId);

    // Generate staff_schedule rows from approved picks
    const scheduleRows = picks.map((pick: PickRow) => {
      const slot = slotMap.get(pick.slot_id);
      return {
        account_id: accountId,
        store_id: period.store_id,
        user_id: pick.user_id,
        date: pick.date,
        start_time: slot?.start_time || "08:00",
        end_time: slot?.end_time || "17:00",
        break_minutes: slot?.break_minutes ?? 30,
        role_override: slot?.required_role || null,
        notes: `Roster: ${slot?.name || "shift"}`,
        slot_id: pick.slot_id,
        roster_period_id: periodId,
        pick_id: pick.id,
        effective_hours: pick.effective_hours,
        day_type: pick.day_type,
        multiplier: pick.multiplier,
      };
    });

    const { data: schedules, error: schedErr } = await getDb()
      .from("staff_schedule")
      .insert(scheduleRows)
      .select();

    if (schedErr) throw schedErr;

    // Update period status to approved
    const userId = await getSessionUserId();
    await getDb()
      .from("roster_period")
      .update({
        status: "approved",
        approved_by: userId || null,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", periodId)
      .eq("account_id", accountId);

    return NextResponse.json({
      approved_picks: pickIds.length,
      generated_schedules: schedules?.length ?? 0,
    });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(e instanceof Error ? e.message : JSON.stringify(e));
    await logToErrorDb(accountId, `Approve error: ${err.message}`, err.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
