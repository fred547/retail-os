import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/auth/reset
 *
 * Deletes all cloud data for an account (cascading).
 * Body: { account_id, email? }
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

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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
