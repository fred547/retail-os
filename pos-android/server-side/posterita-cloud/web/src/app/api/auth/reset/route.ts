import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/supabase/admin";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * POST /api/auth/reset
 *
 * Deletes all cloud data for an account (cascading).
 * Body: { account_id, email? }
 * Headers: x-sync-timestamp, x-sync-signature (HMAC auth required)
 *
 * Used by the Android "Reset Account" feature to clean up cloud state
 * before the device clears local data and re-signs up.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { account_id, email } = body;

    if (!account_id) {
      return NextResponse.json({ error: "account_id is required" }, { status: 400 });
    }

    // SECURITY: Require HMAC authentication — this endpoint deletes all data
    const timestamp = req.headers.get("x-sync-timestamp");
    const signature = req.headers.get("x-sync-signature");

    if (!timestamp || !signature) {
      return NextResponse.json({ error: "Authentication required (HMAC headers missing)" }, { status: 401 });
    }

    // Verify timestamp is within 5 minutes
    const now = Math.floor(Date.now() / 1000);
    const ts = parseInt(timestamp, 10);
    if (isNaN(ts) || Math.abs(now - ts) > 300) {
      return NextResponse.json({ error: "Timestamp expired" }, { status: 401 });
    }

    // Verify HMAC signature
    const supabase = getDb();
    const { data: acc } = await supabase
      .from("account")
      .select("sync_secret")
      .eq("account_id", account_id)
      .single();

    if (!acc?.sync_secret) {
      return NextResponse.json({ error: "Account not found or no sync_secret" }, { status: 401 });
    }

    const payload = `${timestamp}.${JSON.stringify(body)}`;
    const expected = createHmac("sha256", acc.sync_secret).update(payload).digest("hex");
    try {
      const sigBuf = Buffer.from(signature, "hex");
      const expBuf = Buffer.from(expected, "hex");
      if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid signature format" }, { status: 401 });
    }

    // Verify the account exists
    const { data: account } = await supabase
      .from("account")
      .select("account_id, owner_id")
      .eq("account_id", account_id)
      .single();

    if (!account) {
      return NextResponse.json({ success: true, message: "Account not found (already clean)" });
    }

    const ownerId = account.owner_id;

    // Find all accounts for this owner (live + demo)
    const accountIds = [account_id];
    if (ownerId) {
      const { data: siblingAccounts } = await supabase
        .from("account")
        .select("account_id")
        .eq("owner_id", ownerId);
      for (const a of siblingAccounts ?? []) {
        if (!accountIds.includes(a.account_id)) {
          accountIds.push(a.account_id);
        }
      }
    }

    // Delete data for all related accounts (order matters for FKs)
    for (const accId of accountIds) {
      // Get order IDs first for FK-dependent deletes
      const { data: orders } = await supabase
        .from("orders")
        .select("order_id")
        .eq("account_id", accId);
      const orderIds = (orders ?? []).map((o: any) => o.order_id);

      // Get batch IDs for intake items
      const { data: batches } = await supabase
        .from("intake_batch")
        .select("batch_id")
        .eq("account_id", accId);
      const batchIds = (batches ?? []).map((b: any) => b.batch_id);

      // Get session IDs for inventory entries
      const { data: invSessions } = await supabase
        .from("inventory_count_session")
        .select("session_id")
        .eq("account_id", accId);
      const sessionIds = (invSessions ?? []).map((s: any) => s.session_id);

      // Delete in FK order
      if (orderIds.length > 0) {
        await supabase.from("payment").delete().in("order_id", orderIds);
        await supabase.from("orderline").delete().in("order_id", orderIds);
      }
      await supabase.from("orders").delete().eq("account_id", accId);
      await supabase.from("till_adjustment").delete().eq("account_id", accId);
      await supabase.from("till").delete().eq("account_id", accId);
      if (sessionIds.length > 0) {
        await supabase.from("inventory_count_entry").delete().in("session_id", sessionIds);
      }
      await supabase.from("inventory_count_session").delete().eq("account_id", accId);
      if (batchIds.length > 0) {
        await supabase.from("intake_item").delete().in("batch_id", batchIds);
      }
      await supabase.from("intake_batch").delete().eq("account_id", accId);
      await supabase.from("product").delete().eq("account_id", accId);
      await supabase.from("modifier").delete().eq("account_id", accId);
      await supabase.from("productcategory").delete().eq("account_id", accId);
      await supabase.from("tax").delete().eq("account_id", accId);
      await supabase.from("pos_user").delete().eq("account_id", accId);
      await supabase.from("terminal").delete().eq("account_id", accId);
      await supabase.from("store").delete().eq("account_id", accId);
      await supabase.from("error_logs").delete().eq("account_id", accId);
      await supabase.from("customer").delete().eq("account_id", accId);
      await supabase.from("restaurant_table").delete().eq("account_id", accId);
      await supabase.from("preference").delete().eq("account_id", accId);
      await supabase.from("discountcode").delete().eq("account_id", accId);

      // Delete the account itself
      await supabase.from("account").delete().eq("account_id", accId);
    }

    // Delete owner-account sessions and owner
    if (ownerId) {
      await supabase.from("owner_account_session").delete().eq("owner_id", ownerId);
      await supabase.from("owner").delete().eq("id", ownerId);
    }

    // Delete auth user if email provided
    if (email) {
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const authUser = authUsers?.users?.find((u: any) => u.email === email);
      if (authUser) {
        await supabase.auth.admin.deleteUser(authUser.id);
      }
    }

    return NextResponse.json({
      success: true,
      deleted_accounts: accountIds,
      deleted_owner: ownerId,
    });
  } catch (e: any) {
    console.error("[reset] Error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
