import { NextRequest, NextResponse } from "next/server";
import { isAccountManager } from "@/lib/super-admin";
import { getDb } from "@/lib/supabase/admin";
import { cascadeDeleteAccount } from "@/lib/cascade-delete-account";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "ADMIN",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/**
 * DELETE /api/account/[accountId]
 * Deletes a brand (account) and all its data. Does NOT delete the owner.
 * Account manager only.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  let isManager = false;
  try {
    isManager = await isAccountManager();
  } catch (e: any) {
    console.error("[delete-account] isAccountManager check failed:", e.message);
    await logToErrorDb("system", `Delete account auth check failed: ${e.message}`, e.stack);
  }
  if (!isManager) {
    return NextResponse.json({ error: "Account manager access required. Please ensure you are logged in as a super admin." }, { status: 403 });
  }

  const { accountId } = await params;
  const db = getDb();

  const { data: account } = await db
    .from("account")
    .select("account_id, businessname, owner_id, type, status")
    .eq("account_id", accountId)
    .single();

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // Live/active brands must be archived first
  if (account.type === "live" && account.status !== "archived") {
    return NextResponse.json(
      { error: `Cannot delete a live brand that is "${account.status}". Archive it first before deleting.`, code: "ARCHIVE_REQUIRED" },
      { status: 400 }
    );
  }

  await cascadeDeleteAccount(db, accountId);

  return NextResponse.json({
    success: true,
    deleted: accountId,
    businessname: account.businessname,
    owner_preserved: account.owner_id,
  });
}

/**
 * PATCH /api/account/[accountId]
 * Update brand status (archive, suspend, activate, etc.)
 * Body: { status?, businessname? }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  let isManager = false;
  try { isManager = await isAccountManager(); } catch (_) {}
  if (!isManager) {
    return NextResponse.json({ error: "Account manager access required" }, { status: 403 });
  }

  const { accountId } = await params;
  const body = await req.json();
  const db = getDb();

  const { data: account } = await db
    .from("account")
    .select("account_id, status, type")
    .eq("account_id", accountId)
    .single();

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (body.businessname !== undefined) updates.businessname = body.businessname;
  if (body.status !== undefined) updates.status = body.status;

  const { data, error } = await db
    .from("account")
    .update(updates)
    .eq("account_id", accountId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log lifecycle transition
  if (body.status && body.status !== account.status) {
    await db.from("account_lifecycle_log").insert({
      account_id: accountId,
      from_status: account.status,
      to_status: body.status,
      changed_by: "account_manager",
      reason: body.reason || null,
    });
  }

  return NextResponse.json({ success: true, account: data });
}
