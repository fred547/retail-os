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

/** GET /api/staff/staffing-requirements — list requirements for a slot or store */
export async function GET(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const slotId = req.nextUrl.searchParams.get("slot_id");

    let query = getDb()
      .from("staffing_requirement")
      .select("*")
      .eq("account_id", accountId)
      .order("role");

    if (slotId) {
      const sid = parseInt(slotId);
      if (isNaN(sid)) return NextResponse.json({ error: "Invalid slot_id" }, { status: 400 });
      query = query.eq("slot_id", sid);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ requirements: data ?? [] });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    await logToErrorDb(accountId, `Staffing requirements GET error: ${err.message}`, err.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

/** POST /api/staff/staffing-requirements — create or replace requirements for a slot */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { slot_id, requirements } = body;

    if (!slot_id || !Array.isArray(requirements)) {
      return NextResponse.json({ error: "slot_id and requirements array are required" }, { status: 400 });
    }

    for (const r of requirements) {
      if (!r.role || r.min_count === undefined) {
        return NextResponse.json({ error: "Each requirement needs role and min_count" }, { status: 400 });
      }
    }

    // Delete existing requirements for this slot, then insert new ones
    await getDb()
      .from("staffing_requirement")
      .delete()
      .eq("slot_id", slot_id)
      .eq("account_id", accountId);

    if (requirements.length === 0) {
      return NextResponse.json({ requirements: [] }, { status: 201 });
    }

    const rows = requirements.map((r: { role: string; min_count: number; max_count?: number }) => ({
      account_id: accountId,
      slot_id,
      role: r.role,
      min_count: r.min_count,
      max_count: r.max_count ?? r.min_count,
    }));

    const { data, error } = await getDb()
      .from("staffing_requirement")
      .insert(rows)
      .select();

    if (error) throw error;

    return NextResponse.json({ requirements: data }, { status: 201 });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    await logToErrorDb(accountId, `Staffing requirements POST error: ${err.message}`, err.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
