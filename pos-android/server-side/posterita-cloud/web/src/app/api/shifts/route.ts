import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "SHIFT",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/** GET /api/shifts — list shifts (filter by date, user, status) */
export async function GET(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("user_id");
    const status = url.searchParams.get("status");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = 50;
    const offset = (page - 1) * limit;

    let query = getDb()
      .from("shift")
      .select("*", { count: "exact" })
      .eq("account_id", accountId)
      .order("clock_in", { ascending: false })
      .range(offset, offset + limit - 1);

    if (userId) query = query.eq("user_id", parseInt(userId));
    if (status) query = query.eq("status", status);
    if (from) query = query.gte("clock_in", `${from}T00:00:00`);
    if (to) query = query.lte("clock_in", `${to}T23:59:59`);

    const { data, count, error } = await query;
    if (error) {
      await logToErrorDb(accountId, `Failed to fetch shifts: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Summary: total hours for the filtered period
    const totalHours = (data || []).reduce((sum: number, s: any) => sum + (s.hours_worked || 0), 0);
    const activeCount = (data || []).filter((s: any) => s.status === "active").length;

    return NextResponse.json({
      shifts: data || [],
      total: count || 0,
      page,
      summary: { total_hours: Math.round(totalHours * 100) / 100, active_shifts: activeCount },
    });
  } catch (e: any) {
    await logToErrorDb(accountId, `Shifts list error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** POST /api/shifts — clock in or clock out */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { action, user_id, user_name, store_id, terminal_id, break_minutes, notes, shift_id } = body;

    if (!action || !user_id) {
      return NextResponse.json({ error: "action and user_id are required" }, { status: 400 });
    }

    if (action === "clock_in") {
      // Check if user already has an active shift
      const { data: existing } = await getDb()
        .from("shift")
        .select("id")
        .eq("account_id", accountId)
        .eq("user_id", user_id)
        .eq("status", "active")
        .limit(1);

      if (existing?.length) {
        return NextResponse.json({ error: "User already has an active shift. Clock out first." }, { status: 400 });
      }

      const { data, error } = await getDb()
        .from("shift")
        .insert({
          account_id: accountId,
          store_id: store_id || 0,
          terminal_id: terminal_id || 0,
          user_id,
          user_name: user_name || null,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) {
        await logToErrorDb(accountId, `Failed to clock in user ${user_id}: ${error.message}`);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ shift: data, action: "clocked_in" }, { status: 201 });
    }

    if (action === "clock_out") {
      // Find active shift
      let activeShiftId = shift_id;
      if (!activeShiftId) {
        const { data: active } = await getDb()
          .from("shift")
          .select("id, clock_in")
          .eq("account_id", accountId)
          .eq("user_id", user_id)
          .eq("status", "active")
          .order("clock_in", { ascending: false })
          .limit(1);

        if (!active?.length) {
          return NextResponse.json({ error: "No active shift found for this user" }, { status: 404 });
        }
        activeShiftId = active[0].id;
      }

      const clockOut = new Date();
      // Get the shift to compute hours
      const { data: shift } = await getDb()
        .from("shift")
        .select("clock_in")
        .eq("id", activeShiftId)
        .eq("account_id", accountId)
        .single();

      const clockIn = shift ? new Date(shift.clock_in) : new Date();
      const breakMins = break_minutes || 0;
      const hoursWorked = Math.max(0, (clockOut.getTime() - clockIn.getTime()) / 3600000 - breakMins / 60);

      const { data, error } = await getDb()
        .from("shift")
        .update({
          clock_out: clockOut.toISOString(),
          break_minutes: breakMins,
          hours_worked: Math.round(hoursWorked * 100) / 100,
          notes: notes || null,
          status: "completed",
        })
        .eq("id", activeShiftId)
        .eq("account_id", accountId)
        .select()
        .single();

      if (error) {
        await logToErrorDb(accountId, `Failed to clock out user ${user_id}: ${error.message}`);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ shift: data, action: "clocked_out", hours_worked: Math.round(hoursWorked * 100) / 100 });
    }

    return NextResponse.json({ error: "action must be clock_in or clock_out" }, { status: 400 });
  } catch (e: any) {
    await logToErrorDb(accountId, `Shift operation error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
