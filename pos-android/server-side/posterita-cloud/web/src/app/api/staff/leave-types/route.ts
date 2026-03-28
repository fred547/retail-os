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

/** GET /api/staff/leave-types — list leave types for account */
export async function GET() {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { data, error } = await getDb()
      .from("leave_type")
      .select("*")
      .eq("account_id", accountId)
      .order("name");

    if (error) throw error;

    return NextResponse.json({ leave_types: data ?? [] });
  } catch (e: any) {
    await logToErrorDb(accountId, `Leave types list error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

/** POST /api/staff/leave-types — create leave type */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { name, paid, default_days, color } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const { data, error } = await getDb()
      .from("leave_type")
      .insert({
        account_id: accountId,
        name: name.trim(),
        paid: paid ?? true,
        default_days: default_days ?? 0,
        color: color ?? "#6B7280",
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes("duplicate")) {
        return NextResponse.json({ error: `Leave type "${name}" already exists` }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ leave_type: data }, { status: 201 });
  } catch (e: any) {
    await logToErrorDb(accountId, `Leave type create error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
