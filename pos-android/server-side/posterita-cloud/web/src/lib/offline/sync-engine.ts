import { getOfflineDb, getSyncMeta, setSyncMeta } from "./db";
import { updateSyncStatus, syncError, syncComplete } from "./sync-status";
import type { Order, OrderLine, Payment, Till, Customer } from "./schema";

const EPOCH = "1970-01-01T00:00:00.000Z";

/**
 * Bidirectional sync engine — mirrors Android CloudSyncService.performSync().
 *
 * Push: unsynced orders, order lines, payments, tills, customers → /api/sync
 * Pull: products, categories, taxes, modifiers, customers, users, etc. → IndexedDB
 *
 * Uses the SAME /api/sync endpoint as Android — identical JSON shape.
 */
export async function performSync(): Promise<{
  success: boolean;
  ordersPushed: number;
  tillsPushed: number;
  productsPulled: number;
  errors: string[];
}> {
  const db = getOfflineDb();
  const result = { success: false, ordersPushed: 0, tillsPushed: 0, productsPulled: 0, errors: [] as string[] };

  try {
    const accountId = await getSyncMeta("account_id");
    const storeId = parseInt(await getSyncMeta("store_id") || "0");
    const terminalId = parseInt(await getSyncMeta("terminal_id") || "0");

    if (!accountId) {
      syncError("No account configured");
      return { ...result, errors: ["No account configured"] };
    }

    updateSyncStatus({ state: "connecting", message: "Connecting to cloud...", percent: 5 });

    // Get last sync timestamp
    let lastSyncAt = await getSyncMeta(`last_sync_at_${accountId}`) || EPOCH;

    // Integrity check: if 0 products but non-epoch timestamp, reset for full pull
    // But only do this ONCE per session to prevent infinite loops when the brand is genuinely empty
    const integrityKey = `integrity_check_${accountId}`;
    if (lastSyncAt !== EPOCH) {
      const productCount = await db.product.where("account_id").equals(accountId).count();
      const alreadyChecked = await getSyncMeta(integrityKey);
      if (productCount === 0 && !alreadyChecked) {
        lastSyncAt = EPOCH;
        await setSyncMeta(`last_sync_at_${accountId}`, EPOCH);
        await setSyncMeta(integrityKey, "1"); // Only reset once
      }
    }

    // ── PUSH: Collect unsynced transactional data ──

    const unsyncedOrders = await db.order.where("is_sync").equals(0).toArray();
    const unsyncedTills = await db.till.where("is_sync").equals(0).toArray();

    updateSyncStatus({
      pendingOrders: unsyncedOrders.length,
      pendingTills: unsyncedTills.length,
    });

    // Collect order lines and payments for unsynced orders
    const orderLines: OrderLine[] = [];
    const payments: Payment[] = [];
    for (const order of unsyncedOrders) {
      const lines = await db.orderline.where("order_id").equals(order.order_id).toArray();
      const pays = await db.payment.where("order_id").equals(order.order_id).toArray();
      orderLines.push(...lines);
      payments.push(...pays);
    }

    if (unsyncedOrders.length > 0) {
      updateSyncStatus({
        state: "pushing_orders",
        message: `Uploading ${unsyncedOrders.length} orders...`,
        percent: 10,
      });
    }

    if (unsyncedTills.length > 0) {
      updateSyncStatus({
        state: "pushing_tills",
        message: `Uploading ${unsyncedTills.length} tills...`,
        percent: 15,
      });
    }

    // Collect customers (push all, server deduplicates)
    const allCustomers = await db.customer.where("account_id").equals(accountId).toArray();

    // Compute payload checksum (same as Android)
    const checksumInput = buildChecksumInput(unsyncedOrders, unsyncedTills);
    const payloadChecksum = checksumInput ? await sha256(checksumInput) : undefined;

    // Device ID
    let deviceId = await getSyncMeta("device_id");
    if (!deviceId) {
      deviceId = `pwa_${Date.now()}_${terminalId}`;
      await setSyncMeta("device_id", deviceId);
    }

    // ── BUILD REQUEST (same shape as Android CloudSyncRequest) ──

    const syncRequest: any = {
      account_id: accountId,
      terminal_id: terminalId,
      store_id: storeId,
      last_sync_at: lastSyncAt,
      client_sync_version: 2,
      device_id: deviceId,
      device_name: navigator.userAgent.substring(0, 50),
      device_model: "PWA",
      os_version: `Web ${navigator.userAgent.match(/Chrome\/(\d+)/)?.[1] || "unknown"}`,
      app_version: "pwa-1.0",
      pull_page: 0,
      pull_page_size: 1000,
    };

    // Only include push data if there's something to push
    if (unsyncedOrders.length > 0) syncRequest.orders = unsyncedOrders;
    if (orderLines.length > 0) syncRequest.order_lines = orderLines;
    if (payments.length > 0) syncRequest.payments = payments;
    if (unsyncedTills.length > 0) syncRequest.tills = unsyncedTills;
    if (allCustomers.length > 0) syncRequest.customers = allCustomers;
    if (payloadChecksum) syncRequest.payload_checksum = payloadChecksum;

    updateSyncStatus({ state: "connecting", message: "Sending to cloud...", percent: 20 });

    // ── CALL /api/sync ──

    const response = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(syncRequest),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "Unknown error");
      syncError(`Sync failed (${response.status}): ${errText}`);
      return { ...result, errors: [`HTTP ${response.status}`] };
    }

    const data = await response.json();
    if (data.error && !data.success) {
      syncError(data.error);
      return { ...result, errors: [data.error] };
    }

    // ── PROCESS PUSH RESULTS ──

    // Mark pushed orders as synced
    if (data.orders_synced > 0) {
      const serverErrors = data.errors || [];
      for (const order of unsyncedOrders) {
        const failed = serverErrors.find((e: string) => e.includes(order.uuid || ""));
        if (!failed) {
          await db.order.update(order.order_id, { is_sync: true, sync_error_message: null });
        }
      }
      result.ordersPushed = data.orders_synced;
    }

    // Mark pushed tills as synced
    if (data.tills_synced > 0) {
      for (const till of unsyncedTills) {
        const serverErrors = data.errors || [];
        const failed = serverErrors.find((e: string) => e.includes(till.uuid || ""));
        if (!failed) {
          await db.till.update(till.till_id, { is_sync: true, sync_error_message: null });
        }
      }
      result.tillsPushed = data.tills_synced;
    }

    // ── PROCESS PULL DATA ──

    updateSyncStatus({ state: "saving", message: "Saving data...", percent: 50 });

    await savePullData(data, accountId);
    result.productsPulled = data.products?.length ?? 0;

    // Clear integrity flag if we received products (so the check can run again if data is lost)
    if (result.productsPulled > 0) {
      await setSyncMeta(integrityKey, "");
    }

    // ── PAGINATED PULL (if more pages available) ──

    let page = data.pull_page ?? 0;
    let hasMore = data.has_more_products || data.has_more_customers;

    while (hasMore) {
      page++;
      updateSyncStatus({
        state: "pulling_products",
        message: `Fetching page ${page + 1}...`,
        percent: 60,
      });

      const pageResponse = await fetch("/api/sync", {
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

      if (!pageResponse.ok) break;
      const pageData = await pageResponse.json();

      await savePullData(pageData, accountId);
      result.productsPulled += pageData.products?.length ?? 0;

      hasMore = pageData.has_more_products || pageData.has_more_customers;
      if (page > 50) break; // safety
    }

    // ── SAVE SYNC TIMESTAMP ──

    if (data.server_time) {
      await setSyncMeta(`last_sync_at_${accountId}`, data.server_time);
    }

    result.success = true;
    result.errors = data.errors ?? [];

    // Update pending counts
    const remainingOrders = await db.order.where("is_sync").equals(0).count();
    const remainingTills = await db.till.where("is_sync").equals(0).count();

    syncComplete(data.server_time || new Date().toISOString());
    updateSyncStatus({ pendingOrders: remainingOrders, pendingTills: remainingTills });

    return result;
  } catch (e: any) {
    const msg = e.message || "Sync failed";
    syncError(msg);
    // Log to server for debugging
    try {
      fetch("/api/errors/log", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag: "POS_SYNC", message: `Sync engine crash: ${msg}`, stack_trace: e.stack, severity: "ERROR" }),
      });
    } catch (_) {}
    return { ...result, errors: [msg] };
  }
}

/**
 * Save pulled data to IndexedDB — mirrors Android processSyncResponse().
 */
async function savePullData(data: any, accountId: string): Promise<void> {
  const db = getOfflineDb();

  await db.transaction("rw",
    [db.product, db.productcategory, db.tax, db.modifier, db.customer,
     db.pos_user, db.store, db.terminal, db.preference, db.discountcode,
     db.loyalty_config, db.promotion, db.menu_schedule,
     db.tag_group, db.tag, db.product_tag],
    async () => {
      if (data.products?.length) await db.product.bulkPut(data.products);
      if (data.product_categories?.length) await db.productcategory.bulkPut(data.product_categories);
      if (data.taxes?.length) await db.tax.bulkPut(data.taxes);
      if (data.modifiers?.length) await db.modifier.bulkPut(data.modifiers);
      if (data.customers?.length) await db.customer.bulkPut(data.customers);
      if (data.users?.length) await db.pos_user.bulkPut(data.users);
      if (data.stores?.length) await db.store.bulkPut(data.stores);
      if (data.terminals?.length) await db.terminal.bulkPut(data.terminals);
      if (data.preferences?.length) await db.preference.bulkPut(data.preferences);
      if (data.discount_codes?.length) await db.discountcode.bulkPut(data.discount_codes);

      // Full-replace entities
      if (data.loyalty_configs?.length) {
        await db.loyalty_config.where("account_id").equals(accountId).delete();
        await db.loyalty_config.bulkPut(data.loyalty_configs);
      }
      if (data.promotions?.length) await db.promotion.bulkPut(data.promotions);
      if (data.menu_schedules?.length) await db.menu_schedule.bulkPut(data.menu_schedules);

      // Tags: full replace per sync
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
}

/**
 * Build checksum input (same format as Android).
 */
function buildChecksumInput(orders: Order[], tills: Till[]): string {
  let input = "";
  const sortedOrders = [...orders].sort((a, b) => (a.uuid || "").localeCompare(b.uuid || ""));
  for (const o of sortedOrders) {
    input += `O:${o.uuid}:${o.grand_total};`;
  }
  const sortedTills = [...tills].sort((a, b) => (a.uuid || "").localeCompare(b.uuid || ""));
  for (const t of sortedTills) {
    input += `T:${t.uuid}:${t.opening_amt}:${t.grand_total};`;
  }
  return input;
}

/**
 * SHA-256 hash using Web Crypto API.
 */
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
