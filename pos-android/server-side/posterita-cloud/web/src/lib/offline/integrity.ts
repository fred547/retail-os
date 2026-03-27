/**
 * Offline data integrity checks — mirrors Android SplashActivity + CloudSyncService checks.
 *
 * Run on POS startup to ensure IndexedDB is consistent.
 */

import { getOfflineDb, getSyncMeta, setSyncMeta } from "./db";

const EPOCH = "1970-01-01T00:00:00.000Z";

export interface IntegrityResult {
  ok: boolean;
  issues: string[];
  fixed: string[];
}

/**
 * Run all integrity checks. Auto-fixes what it can.
 */
export async function checkIntegrity(): Promise<IntegrityResult> {
  const issues: string[] = [];
  const fixed: string[] = [];
  const db = getOfflineDb();

  const accountId = await getSyncMeta("account_id");
  if (!accountId) {
    return { ok: false, issues: ["No account configured"], fixed: [] };
  }

  // 1. Products vs sync timestamp
  // If last_sync_at is not epoch but product count is 0, reset for full pull
  const lastSync = await getSyncMeta(`last_sync_at_${accountId}`);
  const productCount = await db.product.where("account_id").equals(accountId).count();

  if (lastSync && lastSync !== EPOCH && productCount === 0) {
    issues.push("Sync timestamp set but no products in local DB");
    await setSyncMeta(`last_sync_at_${accountId}`, EPOCH);
    fixed.push("Reset sync timestamp to epoch for full re-pull");
  }

  // 2. Users exist for this account (needed for PIN login)
  const userCount = await db.pos_user.where("account_id").equals(accountId).count();
  if (userCount === 0) {
    issues.push("No users in local DB — PIN login will fail");
    // Can't auto-fix — needs sync
    if (lastSync !== EPOCH) {
      await setSyncMeta(`last_sync_at_${accountId}`, EPOCH);
      fixed.push("Reset sync timestamp — users will be pulled on next sync");
    }
  }

  // 3. Active till consistency
  const tillUuid = await getSyncMeta("active_till_uuid");
  if (tillUuid) {
    const till = await db.till.where("uuid").equals(tillUuid).first();
    if (!till) {
      issues.push("Active till UUID references missing till");
      await setSyncMeta("active_till_uuid", "");
      fixed.push("Cleared stale active till reference");
    } else if (till.date_closed) {
      issues.push("Active till is already closed");
      await setSyncMeta("active_till_uuid", "");
      fixed.push("Cleared closed till from active reference");
    }
  }

  // 4. Orphaned order lines (order_id doesn't exist)
  const allLines = await db.orderline.toArray();
  const orderIds = new Set((await db.order.toArray()).map((o) => o.order_id));
  const orphanLines = allLines.filter((l) => !orderIds.has(l.order_id));
  if (orphanLines.length > 0) {
    issues.push(`${orphanLines.length} orphaned order lines`);
    await db.orderline.bulkDelete(orphanLines.map((l) => l.orderline_id));
    fixed.push(`Deleted ${orphanLines.length} orphaned order lines`);
  }

  // 5. Cart in localStorage but no products
  try {
    const savedCart = localStorage.getItem("posterita_cart");
    if (savedCart) {
      const cart = JSON.parse(savedCart);
      if (cart.items?.length > 0 && productCount === 0) {
        issues.push("Cart has items but no products in DB");
        localStorage.removeItem("posterita_cart");
        fixed.push("Cleared orphaned cart");
      }
    }
  } catch { /* ignore */ }

  return {
    ok: issues.length === 0 || issues.length === fixed.length,
    issues,
    fixed,
  };
}

/**
 * Estimate IndexedDB storage usage.
 */
export async function getStorageEstimate(): Promise<{
  used: string;
  quota: string;
  percent: number;
}> {
  if (!navigator.storage?.estimate) {
    return { used: "unknown", quota: "unknown", percent: 0 };
  }
  const est = await navigator.storage.estimate();
  const used = est.usage ?? 0;
  const quota = est.quota ?? 0;
  return {
    used: formatBytes(used),
    quota: formatBytes(quota),
    percent: quota > 0 ? Math.round((used / quota) * 100) : 0,
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
