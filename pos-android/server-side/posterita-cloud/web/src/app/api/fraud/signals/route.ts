import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "FRAUD",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/** GET /api/fraud/signals — list fraud signals */
export async function GET(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const url = req.nextUrl;
    const status = url.searchParams.get("status");
    const signalType = url.searchParams.get("signal_type");
    const severity = url.searchParams.get("severity");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    let query = getDb()
      .from("fraud_signal")
      .select("*", { count: "exact" })
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (signalType) query = query.eq("signal_type", signalType);
    if (severity) query = query.eq("severity", severity);

    const { data, count, error } = await query;
    if (error) throw error;

    return NextResponse.json({ signals: data ?? [], total: count ?? 0 });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    await logToErrorDb(accountId, `Fraud signals GET error: ${err.message}`, err.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

/** PATCH /api/fraud/signals — update signal status */
export async function PATCH(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) return NextResponse.json({ error: "id and status are required" }, { status: 400 });

    const validStatuses = ["acknowledged", "resolved", "dismissed"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `status must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
    }

    const update: Record<string, unknown> = { status };
    if (status === "resolved" || status === "dismissed") {
      update.resolved_at = new Date().toISOString();
      update.resolved_by = body.resolved_by || null;
    }

    const { data, error } = await getDb()
      .from("fraud_signal")
      .update(update)
      .eq("id", id)
      .eq("account_id", accountId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ signal: data });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    await logToErrorDb(accountId, `Fraud signal update error: ${err.message}`, err.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
