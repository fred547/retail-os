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

    // Fetch staff names
    const { data: staffList } = await getDb()
      .from("pos_user")
      .select("user_id, username, firstname, lastname")
      .eq("account_id", accountId);
    const staffMap = new Map<number, string>((staffList ?? []).map((u: any) => [
      u.user_id as number,
      (u.firstname ? `${u.firstname} ${u.lastname || ""}`.trim() : u.username || `User ${u.user_id}`) as string,
    ]));

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
      user_name: string;
      total_hours: number;
      overtime_hours: number;
      break_hours: number;
      net_hours: number;
      shift_count: number;
      days_worked: Set<string>;
      late_count: number;
    }> = {};

    const STANDARD_HOURS_PER_DAY = 8;

    for (const shift of (shifts ?? [])) {
      const uid = shift.user_id;
      if (!userMap[uid]) {
        userMap[uid] = {
          user_id: uid,
          user_name: staffMap.get(uid) || shift.user_name || `User ${uid}`,
          total_hours: 0, overtime_hours: 0, break_hours: 0, net_hours: 0,
          shift_count: 0, days_worked: new Set(), late_count: 0,
        };
      }

      if (shift.clock_in && shift.clock_out) {
        const hours = (new Date(shift.clock_out).getTime() - new Date(shift.clock_in).getTime()) / (1000 * 60 * 60);
        userMap[uid].total_hours += hours;
        userMap[uid].shift_count += 1;
        userMap[uid].days_worked.add(shift.clock_in.slice(0, 10));

        const overtime = Math.max(0, hours - STANDARD_HOURS_PER_DAY);
        userMap[uid].overtime_hours += overtime;
      }

      if (shift.is_late) {
        userMap[uid].late_count += 1;
      }
    }

    for (const b of (breaks ?? [])) {
      const uid = b.user_id;
      if (!userMap[uid]) {
        userMap[uid] = {
          user_id: uid, user_name: staffMap.get(uid) ?? `User ${uid}`,
          total_hours: 0, overtime_hours: 0, break_hours: 0, net_hours: 0,
          shift_count: 0, days_worked: new Set(), late_count: 0,
        };
      }
      if (b.duration_minutes) {
        userMap[uid].break_hours += b.duration_minutes / 60;
      }
    }

    // Compute net hours + regular hours
    const summary = Object.values(userMap).map((u) => {
      const totalH = Math.round(u.total_hours * 100) / 100;
      const overtimeH = Math.round(u.overtime_hours * 100) / 100;
      const breakH = Math.round(u.break_hours * 100) / 100;
      const netH = Math.round((u.total_hours - u.break_hours) * 100) / 100;
      return {
        user_id: u.user_id,
        user_name: u.user_name,
        days_worked: u.days_worked.size,
        total_hours: totalH,
        regular_hours: Math.round((totalH - overtimeH) * 100) / 100,
        overtime_hours: overtimeH,
        break_hours: breakH,
        net_hours: netH,
        shift_count: u.shift_count,
        late_count: u.late_count,
      };
    });

    return NextResponse.json({ timesheets: summary });
  } catch (e: any) {
    await logToErrorDb(accountId, `Timesheet report error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
