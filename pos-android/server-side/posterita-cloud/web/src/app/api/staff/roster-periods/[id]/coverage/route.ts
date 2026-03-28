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

/** GET /api/staff/roster-periods/[id]/coverage — slots vs picks vs requirements */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const periodId = parseInt(id);
    if (isNaN(periodId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    // Get period
    const { data: period } = await getDb()
      .from("roster_period")
      .select("*")
      .eq("id", periodId)
      .eq("account_id", accountId)
      .single();

    if (!period) return NextResponse.json({ error: "Period not found" }, { status: 404 });

    // Get template slots for this store
    const { data: slots } = await getDb()
      .from("roster_template_slot")
      .select("*")
      .eq("account_id", accountId)
      .eq("store_id", period.store_id)
      .eq("is_deleted", false)
      .order("day_of_week")
      .order("start_time");

    // Get picks for this period (not cancelled)
    const { data: picks } = await getDb()
      .from("shift_pick")
      .select("*")
      .eq("roster_period_id", periodId)
      .eq("account_id", accountId)
      .neq("status", "cancelled")
      .order("date");

    // Get staffing requirements for all slots
    const slotIds = (slots || []).map((s: { id: number }) => s.id);
    let requirements: { slot_id: number; role: string; min_count: number; max_count: number }[] = [];
    if (slotIds.length > 0) {
      const { data: reqs } = await getDb()
        .from("staffing_requirement")
        .select("*")
        .in("slot_id", slotIds);
      requirements = reqs || [];
    }

    return NextResponse.json({
      period,
      slots: slots ?? [],
      picks: picks ?? [],
      requirements,
    });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(e instanceof Error ? e.message : JSON.stringify(e));
    await logToErrorDb(accountId, `Coverage GET error: ${err.message}`, err.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
