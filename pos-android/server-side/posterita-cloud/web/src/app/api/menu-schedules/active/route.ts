import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "MENU_SCHEDULE",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/**
 * GET /api/menu-schedules/active — get currently active menu schedule(s)
 * Used by POS to filter visible categories by time of day.
 * Query params: store_id, time (HH:MM, defaults to now), day (1-7 ISO, defaults to today)
 */
export async function GET(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const url = new URL(req.url);
    const storeId = url.searchParams.get("store_id") || "0";
    const now = new Date();
    const timeParam = url.searchParams.get("time") || `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const dayParam = parseInt(url.searchParams.get("day") || String(now.getDay() === 0 ? 7 : now.getDay()));

    // Get all active schedules for this account/store
    const { data: schedules, error } = await getDb()
      .from("menu_schedule")
      .select("*")
      .eq("account_id", accountId)
      .eq("is_active", true)
      .or(`store_id.eq.0,store_id.eq.${storeId}`)
      .order("priority", { ascending: false });

    if (error) {
      await logToErrorDb(accountId, `Failed to fetch active menu schedules: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter by time and day
    const active = (schedules || []).filter((s: any) => {
      const days = s.days_of_week || [1, 2, 3, 4, 5, 6, 7];
      if (!days.includes(dayParam)) return false;

      // Compare times as strings (HH:MM format)
      const time = timeParam;
      if (s.start_time <= s.end_time) {
        // Normal range (e.g., 06:00-11:00)
        return time >= s.start_time && time <= s.end_time;
      } else {
        // Overnight range (e.g., 22:00-02:00)
        return time >= s.start_time || time <= s.end_time;
      }
    });

    // Collect all category IDs from active menus
    const categoryIds = [...new Set(active.flatMap((s: any) => s.category_ids || []))];

    return NextResponse.json({
      active_schedules: active,
      category_ids: categoryIds,
      current_time: timeParam,
      current_day: dayParam,
    });
  } catch (e: any) {
    await logToErrorDb(accountId, `Active menu schedule error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
