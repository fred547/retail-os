import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAccountManager } from "@/lib/super-admin";

function getDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
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

  // Delete all data for this account (FK order)
  const { data: orders } = await db.from("orders").select("order_id").eq("account_id", accountId);
  const orderIds = (orders ?? []).map((o: any) => o.order_id);
  if (orderIds.length > 0) {
    await db.from("payment").delete().in("order_id", orderIds);
    await db.from("orderline").delete().in("order_id", orderIds);
  }
  await db.from("orders").delete().eq("account_id", accountId);

  const { data: batches } = await db.from("intake_batch").select("batch_id").eq("account_id", accountId);
  const batchIds = (batches ?? []).map((b: any) => b.batch_id);
  if (batchIds.length > 0) {
    await db.from("intake_item").delete().in("batch_id", batchIds);
  }
  await db.from("intake_batch").delete().eq("account_id", accountId);

  const { data: sessions } = await db.from("inventory_count_session").select("session_id").eq("account_id", accountId);
  const sessionIds = (sessions ?? []).map((s: any) => s.session_id);
  if (sessionIds.length > 0) {
    await db.from("inventory_count_entry").delete().in("session_id", sessionIds);
  }
  await db.from("inventory_count_session").delete().eq("account_id", accountId);

  await db.from("till").delete().eq("account_id", accountId);
  await db.from("product").delete().eq("account_id", accountId);
  await db.from("modifier").delete().eq("account_id", accountId);
  await db.from("productcategory").delete().eq("account_id", accountId);
  await db.from("tax").delete().eq("account_id", accountId);
  await db.from("pos_user").delete().eq("account_id", accountId);
  await db.from("registered_device").delete().eq("account_id", accountId);
  await db.from("terminal").delete().eq("account_id", accountId);
  await db.from("store").delete().eq("account_id", accountId);
  await db.from("error_logs").delete().eq("account_id", accountId);
  await db.from("customer").delete().eq("account_id", accountId);
  await db.from("restaurant_table").delete().eq("account_id", accountId);
  await db.from("preference").delete().eq("account_id", accountId);
  await db.from("discountcode").delete().eq("account_id", accountId);
  await db.from("owner_account_session").delete().eq("account_id", accountId);
  await db.from("account").delete().eq("account_id", accountId);

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
