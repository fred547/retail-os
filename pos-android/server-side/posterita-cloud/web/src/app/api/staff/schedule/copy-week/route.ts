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

/** POST /api/staff/schedule/copy-week — copy one week's schedule to another */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { source_date, target_date, store_id } = body;

    if (!source_date || !target_date || !store_id) {
      return NextResponse.json({ error: "source_date, target_date, and store_id are required" }, { status: 400 });
    }

    const sid = parseInt(store_id);
    if (isNaN(sid)) return NextResponse.json({ error: "Invalid store_id" }, { status: 400 });

    // Compute source week Mon-Sun
    const srcDate = new Date(source_date + "T00:00:00Z");
    const srcDay = srcDate.getUTCDay();
    const diffToMon = srcDay === 0 ? -6 : 1 - srcDay;
    const srcMonday = new Date(srcDate);
    srcMonday.setUTCDate(srcDate.getUTCDate() + diffToMon);
    const srcSunday = new Date(srcMonday);
    srcSunday.setUTCDate(srcMonday.getUTCDate() + 6);

    const srcMondayStr = srcMonday.toISOString().slice(0, 10);
    const srcSundayStr = srcSunday.toISOString().slice(0, 10);

    // Compute target week Monday
    const tgtDate = new Date(target_date + "T00:00:00Z");
    const tgtDay = tgtDate.getUTCDay();
    const tgtDiffToMon = tgtDay === 0 ? -6 : 1 - tgtDay;
    const tgtMonday = new Date(tgtDate);
    tgtMonday.setUTCDate(tgtDate.getUTCDate() + tgtDiffToMon);

    // Day offset between source and target Mondays
    const dayOffset = Math.round((tgtMonday.getTime() - srcMonday.getTime()) / (1000 * 60 * 60 * 24));

    // Fetch source entries
    const { data: srcEntries, error: fetchErr } = await getDb()
      .from("staff_schedule")
      .select("*")
      .eq("account_id", accountId)
      .eq("store_id", sid)
      .gte("date", srcMondayStr)
      .lte("date", srcSundayStr)
      .neq("status", "cancelled");

    if (fetchErr) throw fetchErr;
    if (!srcEntries || srcEntries.length === 0) {
      return NextResponse.json({ copied: 0, message: "No entries found in source week" });
    }

    // Build copies with offset dates
    const copies = srcEntries.map((e: any) => {
      const d = new Date(e.date + "T00:00:00Z");
      d.setUTCDate(d.getUTCDate() + dayOffset);
      return {
        account_id: accountId,
        store_id: e.store_id,
        user_id: e.user_id,
        date: d.toISOString().slice(0, 10),
        start_time: e.start_time,
        end_time: e.end_time,
        break_minutes: e.break_minutes,
        role_override: e.role_override,
        notes: e.notes,
      };
    });

    const { error: insertErr } = await getDb()
      .from("staff_schedule")
      .insert(copies);

    if (insertErr) throw insertErr;

    return NextResponse.json({ copied: copies.length }, { status: 201 });
  } catch (e: any) {
    await logToErrorDb(accountId, `Schedule copy-week error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
