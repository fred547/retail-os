import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "STAFF",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/** GET /api/staff/timesheets — timesheet report */
export async function GET(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const url = req.nextUrl;
    const startDate = url.searchParams.get("start_date");
    const endDate = url.searchParams.get("end_date");
    const userId = url.searchParams.get("user_id");
    const storeId = url.searchParams.get("store_id");

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "start_date and end_date are required" }, { status: 400 });
    }

    // Fetch shifts for date range
    let shiftQuery = getDb()
      .from("shift")
      .select("*")
      .eq("account_id", accountId)
      .gte("clock_in", startDate + "T00:00:00")
      .lte("clock_in", endDate + "T23:59:59");

    if (userId) {
      const uid = parseInt(userId);
      if (isNaN(uid)) return NextResponse.json({ error: "Invalid user_id" }, { status: 400 });
      shiftQuery = shiftQuery.eq("user_id", uid);
    }
    if (storeId) {
      const sid = parseInt(storeId);
      if (isNaN(sid)) return NextResponse.json({ error: "Invalid store_id" }, { status: 400 });
      shiftQuery = shiftQuery.eq("store_id", sid);
    }

    const { data: shifts, error: shiftErr } = await shiftQuery;
    if (shiftErr) throw shiftErr;

    // Fetch breaks for date range
    let breakQuery = getDb()
      .from("staff_break")
      .select("*")
      .eq("account_id", accountId)
      .gte("start_time", startDate + "T00:00:00")
      .lte("start_time", endDate + "T23:59:59");

    if (userId) {
      breakQuery = breakQuery.eq("user_id", parseInt(userId));
    }

    const { data: breaks, error: breakErr } = await breakQuery;
    if (breakErr) throw breakErr;

    // Group by user_id and compute totals
    const userMap: Record<number, {
      user_id: number;
      total_hours: number;
      overtime_hours: number;
      break_hours: number;
      net_hours: number;
      shift_count: number;
    }> = {};

    const STANDARD_HOURS_PER_DAY = 8;

    for (const shift of (shifts ?? [])) {
      const uid = shift.user_id;
      if (!userMap[uid]) {
        userMap[uid] = { user_id: uid, total_hours: 0, overtime_hours: 0, break_hours: 0, net_hours: 0, shift_count: 0 };
      }

      if (shift.clock_in && shift.clock_out) {
        const hours = (new Date(shift.clock_out).getTime() - new Date(shift.clock_in).getTime()) / (1000 * 60 * 60);
        userMap[uid].total_hours += hours;
        userMap[uid].shift_count += 1;

        const overtime = Math.max(0, hours - STANDARD_HOURS_PER_DAY);
        userMap[uid].overtime_hours += overtime;
      }
    }

    for (const b of (breaks ?? [])) {
      const uid = b.user_id;
      if (!userMap[uid]) {
        userMap[uid] = { user_id: uid, total_hours: 0, overtime_hours: 0, break_hours: 0, net_hours: 0, shift_count: 0 };
      }
      if (b.duration_minutes) {
        userMap[uid].break_hours += b.duration_minutes / 60;
      }
    }

    // Compute net hours
    const summary = Object.values(userMap).map((u) => ({
      ...u,
      total_hours: Math.round(u.total_hours * 100) / 100,
      overtime_hours: Math.round(u.overtime_hours * 100) / 100,
      break_hours: Math.round(u.break_hours * 100) / 100,
      net_hours: Math.round((u.total_hours - u.break_hours) * 100) / 100,
    }));

    return NextResponse.json({ timesheets: summary });
  } catch (e: any) {
    await logToErrorDb(accountId, `Timesheet report error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
