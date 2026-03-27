import { getOfflineDb, setSyncMeta, getSyncMeta } from "./db";

const EPOCH = "1970-01-01T00:00:00.000Z";

/**
 * Perform initial sync: pull all data from the server into IndexedDB.
 * Mirrors Android's first-sync behavior: last_sync_at = epoch → full pull.
 *
 * @param accountId The account to sync
 * @param storeId The store context (0 for all stores)
 * @param terminalId The terminal context (0 for initial pull)
 * @returns Stats about what was pulled
 */
export async function initialSync(
  accountId: string,
  storeId: number = 0,
  terminalId: number = 0,
): Promise<{ productCount: number; error?: string }> {
  const db = getOfflineDb();
  let lastSyncAt = await getSyncMeta(`last_sync_at_${accountId}`) || EPOCH;

  // Integrity check: if we have a non-epoch timestamp but 0 products, reset
  if (lastSyncAt !== EPOCH) {
    const productCount = await db.product.where("account_id").equals(accountId).count();
    if (productCount === 0) {
      lastSyncAt = EPOCH;
      await setSyncMeta(`last_sync_at_${accountId}`, EPOCH);
    }
  }

  let totalProducts = 0;
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account_id: accountId,
        terminal_id: terminalId,
        store_id: storeId,
        last_sync_at: lastSyncAt,
        pull_page: page,
        pull_page_size: 1000,
      }),
    });

    if (!response.ok) {
      return { productCount: totalProducts, error: `Sync failed: ${response.status}` };
    }

    const data = await response.json();
    if (!data.success && data.error) {
      return { productCount: totalProducts, error: data.error };
    }

    // Save pulled data to IndexedDB (same order as Android processSyncResponse)
    await db.transaction("rw",
      [db.product, db.productcategory, db.tax, db.modifier, db.customer,
       db.pos_user, db.store, db.terminal, db.preference, db.discountcode,
       db.loyalty_config, db.promotion, db.menu_schedule,
       db.tag_group, db.tag, db.product_tag],
      async () => {
        if (data.products?.length) {
          await db.product.bulkPut(data.products);
          totalProducts += data.products.length;
        }
        if (data.product_categories?.length) {
          await db.productcategory.bulkPut(data.product_categories);
        }
        if (data.taxes?.length) {
          await db.tax.bulkPut(data.taxes);
        }
        if (data.modifiers?.length) {
          await db.modifier.bulkPut(data.modifiers);
        }
        if (data.customers?.length) {
          await db.customer.bulkPut(data.customers);
        }
        if (data.users?.length) {
          await db.pos_user.bulkPut(data.users);
        }
        if (data.stores?.length) {
          await db.store.bulkPut(data.stores);
        }
        if (data.terminals?.length) {
          await db.terminal.bulkPut(data.terminals);
        }
        if (data.preferences?.length) {
          await db.preference.bulkPut(data.preferences);
        }
        if (data.discount_codes?.length) {
          await db.discountcode.bulkPut(data.discount_codes);
        }
        // Full-replace entities
        if (data.loyalty_configs?.length) {
          await db.loyalty_config.where("account_id").equals(accountId).delete();
          await db.loyalty_config.bulkPut(data.loyalty_configs);
        }
        if (data.promotions?.length) {
          await db.promotion.bulkPut(data.promotions);
        }
        if (data.menu_schedules?.length) {
          await db.menu_schedule.bulkPut(data.menu_schedules);
        }
        // Tags: full replace
        if (data.tag_groups?.length) {
          await db.tag_group.where("account_id").equals(accountId).delete();
          await db.tag_group.bulkPut(data.tag_groups);
        }
        if (data.tags?.length) {
          await db.tag.where("account_id").equals(accountId).delete();
          await db.tag.bulkPut(data.tags);
        }
        if (data.product_tags?.length) {
          await db.product_tag.where("account_id").equals(accountId).delete();
          await db.product_tag.bulkPut(data.product_tags);
        }
      }
    );

    // Save server time for next sync
    if (data.server_time) {
      await setSyncMeta(`last_sync_at_${accountId}`, data.server_time);
    }

    // Check pagination
    hasMore = data.has_more_products || data.has_more_customers;
    page++;

    // Safety: max 50 pages (50,000 products)
    if (page > 50) break;
  }

  // Save context
  await setSyncMeta("account_id", accountId);
  await setSyncMeta("store_id", storeId.toString());
  await setSyncMeta("terminal_id", terminalId.toString());

  return { productCount: totalProducts };
}

/**
 * Check if IndexedDB has been seeded for this account.
 */
export async function isSeeded(accountId: string): Promise<boolean> {
  const lastSync = await getSyncMeta(`last_sync_at_${accountId}`);
  if (!lastSync || lastSync === EPOCH) return false;
  const count = await getOfflineDb().product.where("account_id").equals(accountId).count();
  return count > 0;
}
