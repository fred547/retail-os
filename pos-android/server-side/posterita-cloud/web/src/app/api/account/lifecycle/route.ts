import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "ADMIN",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/**
 * Valid account lifecycle transitions:
 *   draft → onboarding
 *   onboarding → active | failed
 *   active → suspended
 *   suspended → active | archived
 *   failed → onboarding (retry)
 *   testing → active (demo graduation)
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["onboarding"],
  onboarding: ["active", "failed"],
  active: ["suspended"],
  suspended: ["active", "archived"],
  failed: ["onboarding"],
  testing: ["active"],
};

/**
 * PATCH /api/account/lifecycle
 * Body: { account_id, status, reason? }
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { account_id, status, reason } = body;

    if (!account_id || !status) {
      return NextResponse.json({ error: "account_id and status are required" }, { status: 400 });
    }

    const db = getDb();

    // Get current status
    const { data: account } = await db
      .from("account")
      .select("account_id, status")
      .eq("account_id", account_id)
      .single();

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const currentStatus = account.status || "draft";
    const allowed = VALID_TRANSITIONS[currentStatus];

    if (!allowed || !allowed.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from '${currentStatus}' to '${status}'. Allowed: ${allowed?.join(", ") || "none"}` },
        { status: 400 }
      );
    }

    // Update status
    const { error } = await db
      .from("account")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("account_id", account_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log the transition
    await db.from("account_lifecycle_log").insert({
      account_id,
      from_status: currentStatus,
      to_status: status,
      changed_by: (await getSessionAccountId()) || "system",
      reason: reason || null,
    });

    return NextResponse.json({ success: true, from: currentStatus, to: status });
  } catch (e: any) {
    await logToErrorDb("system", `Lifecycle transition failed: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * GET /api/account/lifecycle?account_id=xxx
 * Returns lifecycle history for an account
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("account_id");

    if (!accountId) {
      return NextResponse.json({ error: "account_id query param required" }, { status: 400 });
    }

    const { data } = await getDb()
      .from("account_lifecycle_log")
      .select("*")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false });

    return NextResponse.json({ data: data ?? [] });
  } catch (e: any) {
    await logToErrorDb("system", `Lifecycle history fetch failed: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
