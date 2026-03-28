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

/** GET /api/staff/roster-periods/[id]/hours — per-staff effective hours vs target */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const periodId = parseInt(id);
    if (isNaN(periodId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    // Get period for date range
    const { data: period } = await getDb()
      .from("roster_period")
      .select("start_date, end_date")
      .eq("id", periodId)
      .eq("account_id", accountId)
      .single();

    if (!period) return NextResponse.json({ error: "Period not found" }, { status: 404 });

    // Get all non-cancelled picks
    const { data: picks } = await getDb()
      .from("shift_pick")
      .select("user_id, effective_hours, status")
      .eq("roster_period_id", periodId)
      .eq("account_id", accountId)
      .neq("status", "cancelled");

    // Get labor config for weekly target
    const { data: config } = await getDb()
      .from("labor_config")
      .select("standard_weekly_hours")
      .eq("account_id", accountId)
      .maybeSingle();

    const weeklyTarget = config?.standard_weekly_hours ?? 45;

    // Count weeks in period
    const start = new Date(period.start_date);
    const end = new Date(period.end_date);
    const weeks = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)));
    const periodTarget = weeklyTarget * weeks;

    // Aggregate by user
    const byUser: Record<number, { picked: number; approved: number; total: number }> = {};
    for (const pick of (picks || [])) {
      if (!byUser[pick.user_id]) {
        byUser[pick.user_id] = { picked: 0, approved: 0, total: 0 };
      }
      const h = pick.effective_hours || 0;
      byUser[pick.user_id].total += h;
      if (pick.status === "picked") byUser[pick.user_id].picked += h;
      if (pick.status === "approved") byUser[pick.user_id].approved += h;
    }

    const staffHours = Object.entries(byUser).map(([userId, hours]) => ({
      user_id: parseInt(userId),
      ...hours,
      target: periodTarget,
      pct: periodTarget > 0 ? Math.round((hours.total / periodTarget) * 100) : 0,
    }));

    return NextResponse.json({
      weekly_target: weeklyTarget,
      period_weeks: weeks,
      period_target: periodTarget,
      staff_hours: staffHours,
    });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(e instanceof Error ? e.message : (e?.message || JSON.stringify(e)));
    await logToErrorDb(accountId, `Hours GET error: ${err.message}`, err.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
