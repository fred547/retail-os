import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cascade-delete all data for a single account.
 * Deletes in FK dependency order. Does NOT delete the owner record.
 */
export async function cascadeDeleteAccount(
  db: SupabaseClient,
  accountId: string
): Promise<void> {
  // Orders → payment/orderline first (FK deps)
  const { data: orders } = await db
    .from("orders")
    .select("order_id")
    .eq("account_id", accountId);
  const orderIds = (orders ?? []).map((o: any) => o.order_id);
  if (orderIds.length > 0) {
    await db.from("payment").delete().in("order_id", orderIds);
    await db.from("orderline").delete().in("order_id", orderIds);
  }
  await db.from("orders").delete().eq("account_id", accountId);

  // Intake pipeline
  const { data: batches } = await db
    .from("intake_batch")
    .select("batch_id")
    .eq("account_id", accountId);
  const batchIds = (batches ?? []).map((b: any) => b.batch_id);
  if (batchIds.length > 0) {
    await db.from("intake_item").delete().in("batch_id", batchIds);
  }
  await db.from("intake_batch").delete().eq("account_id", accountId);

  // Inventory
  const { data: sessions } = await db
    .from("inventory_count_session")
    .select("session_id")
    .eq("account_id", accountId);
  const sessionIds = (sessions ?? []).map((s: any) => s.session_id);
  if (sessionIds.length > 0) {
    await db.from("inventory_count_entry").delete().in("session_id", sessionIds);
  }
  await db.from("inventory_count_session").delete().eq("account_id", accountId);

  // Kitchen & restaurant (must delete before store/terminal)
  await db.from("category_station_mapping").delete().eq("account_id", accountId);
  await db.from("preparation_station").delete().eq("account_id", accountId);
  await db.from("table_section").delete().eq("account_id", accountId);

  // Core data
  await db.from("till").delete().eq("account_id", accountId);
  await db.from("product").delete().eq("account_id", accountId);
  await db.from("modifier").delete().eq("account_id", accountId);
  await db.from("productcategory").delete().eq("account_id", accountId);
  await db.from("tax").delete().eq("account_id", accountId);
  await db.from("printer").delete().eq("account_id", accountId);
  await db.from("pos_user").delete().eq("account_id", accountId);
  await db.from("registered_device").delete().eq("account_id", accountId);
  await db.from("terminal").delete().eq("account_id", accountId);
  await db.from("store").delete().eq("account_id", accountId);

  // Logs & misc
  await db.from("error_logs").delete().eq("account_id", accountId);
  await db.from("sync_request_log").delete().eq("account_id", accountId);
  await db.from("account_lifecycle_log").delete().eq("account_id", accountId);
  await db.from("customer").delete().eq("account_id", accountId);
  await db.from("restaurant_table").delete().eq("account_id", accountId);
  await db.from("preference").delete().eq("account_id", accountId);
  await db.from("discountcode").delete().eq("account_id", accountId);
  await db.from("owner_account_session").delete().eq("account_id", accountId);

  // Finally, the account itself
  await db.from("account").delete().eq("account_id", accountId);
}
