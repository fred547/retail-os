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

/** POST /api/staff/breaks — start a break */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { user_id, shift_id, break_type } = body;

    if (!user_id) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }

    const uid = parseInt(user_id);
    if (isNaN(uid)) return NextResponse.json({ error: "Invalid user_id" }, { status: 400 });

    const { data, error } = await getDb()
      .from("staff_break")
      .insert({
        account_id: accountId,
        user_id: uid,
        shift_id: shift_id ? parseInt(shift_id) : null,
        break_type: break_type ?? "general",
        start_time: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ break: data }, { status: 201 });
  } catch (e: any) {
    await logToErrorDb(accountId, `Break start error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

/** PATCH /api/staff/breaks?id=N — end a break */
export async function PATCH(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const breakIdStr = req.nextUrl.searchParams.get("id");
    if (!breakIdStr) return NextResponse.json({ error: "id query param is required" }, { status: 400 });

    const breakId = parseInt(breakIdStr);
    if (isNaN(breakId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    // Fetch break to compute duration
    const { data: existing, error: fetchErr } = await getDb()
      .from("staff_break")
      .select("start_time")
      .eq("id", breakId)
      .eq("account_id", accountId)
      .single();

    if (fetchErr) throw fetchErr;
    if (!existing) return NextResponse.json({ error: "Break not found" }, { status: 404 });

    const endTime = new Date();
    const startTime = new Date(existing.start_time);
    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

    const { data, error } = await getDb()
      .from("staff_break")
      .update({
        end_time: endTime.toISOString(),
        duration_minutes: durationMinutes,
        updated_at: endTime.toISOString(),
      })
      .eq("id", breakId)
      .eq("account_id", accountId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ break: data });
  } catch (e: any) {
    await logToErrorDb(accountId, `Break end error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
