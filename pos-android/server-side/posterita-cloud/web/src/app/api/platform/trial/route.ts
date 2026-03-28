import { NextRequest, NextResponse } from "next/server";
import { isAccountManager } from "@/lib/super-admin";
import { getDb } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "TRIAL",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/**
 * POST /api/platform/trial
 * Grant, extend, or revoke a trial for an account. Admin only.
 * Body: { account_id, trial_plan, trial_days, action: 'grant' | 'extend' | 'revoke' }
 */
export async function POST(req: NextRequest) {
  try {
    const isManager = await isAccountManager();
    if (!isManager) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { account_id, trial_plan, trial_days, action } = await req.json();

    if (!account_id || !action) {
      return NextResponse.json({ error: "account_id and action are required" }, { status: 400 });
    }

    if (!["grant", "extend", "revoke"].includes(action)) {
      return NextResponse.json({ error: "action must be grant, extend, or revoke" }, { status: 400 });
    }

    const db = getDb();

    // Verify account exists
    const { data: account, error: accErr } = await db
      .from("account")
      .select("account_id, businessname, trial_plan, trial_ends_at")
      .eq("account_id", account_id)
      .single();

    if (accErr || !account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    let updateData: Record<string, any> = {};

    if (action === "grant") {
      if (!trial_plan || !trial_days) {
        return NextResponse.json({ error: "trial_plan and trial_days required for grant" }, { status: 400 });
      }
      const endsAt = new Date();
      endsAt.setDate(endsAt.getDate() + trial_days);
      updateData = {
        trial_plan,
        trial_ends_at: endsAt.toISOString(),
        trial_granted_by: "admin",
      };
    } else if (action === "extend") {
      if (!trial_days) {
        return NextResponse.json({ error: "trial_days required for extend" }, { status: 400 });
      }
      // Extend from current trial_ends_at (or from now if expired/no trial)
      const baseDate = account.trial_ends_at && new Date(account.trial_ends_at) > new Date()
        ? new Date(account.trial_ends_at)
        : new Date();
      baseDate.setDate(baseDate.getDate() + trial_days);
      updateData = {
        trial_ends_at: baseDate.toISOString(),
        // Keep existing trial_plan if extending
        ...(trial_plan ? { trial_plan } : {}),
      };
    } else if (action === "revoke") {
      updateData = {
        trial_plan: null,
        trial_ends_at: null,
        trial_granted_by: null,
      };
    }

    const { error: updateErr } = await db
      .from("account")
      .update(updateData)
      .eq("account_id", account_id);

    if (updateErr) {
      await logToErrorDb(account_id, `Trial ${action} failed: ${updateErr.message}`);
      return NextResponse.json({ error: "Failed to update trial" }, { status: 500 });
    }

    // Log to billing_event
    try {
      await db.from("billing_event").insert({
        account_id,
        event_type: `trial_${action}`,
        payload: JSON.stringify({ trial_plan: trial_plan ?? account.trial_plan, trial_days, action }),
      });
    } catch (_) { /* non-blocking */ }

    return NextResponse.json({
      success: true,
      action,
      account_id,
      trial_plan: action === "revoke" ? null : (trial_plan ?? account.trial_plan),
      trial_ends_at: action === "revoke" ? null : updateData.trial_ends_at,
    });
  } catch (e: any) {
    await logToErrorDb("system", `Trial management failed: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
