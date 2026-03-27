import { performSync } from "./sync-engine";
import { getSyncStatus, updateSyncStatus } from "./sync-status";
import { getSyncMeta } from "./db";

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes (same as Android CloudSyncWorker)
const RETRY_BACKOFF = [30_000, 60_000, 120_000, 240_000]; // 30s → 4min (same as Android)

let intervalId: ReturnType<typeof setInterval> | null = null;
let retryCount = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let isSyncing = false;

/**
 * Start the periodic sync worker.
 * Mirrors Android's CloudSyncWorker — runs every 5 minutes.
 * Also syncs immediately on startup and when coming back online.
 */
export function startSyncWorker(): void {
  if (intervalId) return; // already running

  // Sync immediately on start
  triggerSync();

  // Periodic sync every 5 minutes
  intervalId = setInterval(() => {
    triggerSync();
  }, SYNC_INTERVAL_MS);

  // Sync when coming back online
  window.addEventListener("online", handleOnline);

  // Update connectivity status
  window.addEventListener("online", () => updateSyncStatus({ state: "idle", message: "Back online" }));
  window.addEventListener("offline", () => updateSyncStatus({ state: "error", message: "Offline — changes saved locally" }));
}

/**
 * Stop the periodic sync worker.
 */
export function stopSyncWorker(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  window.removeEventListener("online", handleOnline);
}

/**
 * Trigger a sync now (debounced — won't overlap with an in-progress sync).
 */
export async function triggerSync(): Promise<void> {
  if (isSyncing) return;
  if (!navigator.onLine) return;

  // Don't sync if not configured
  const accountId = await getSyncMeta("account_id");
  if (!accountId) return;

  isSyncing = true;
  try {
    const result = await performSync();

    if (result.success) {
      retryCount = 0; // reset backoff on success
    } else {
      scheduleRetry();
    }
  } catch {
    scheduleRetry();
  } finally {
    isSyncing = false;
  }
}

/**
 * Quick sync — push orders immediately after a sale (mirrors Android pushOrdersNow).
 * Doesn't wait for the 5-minute interval.
 */
export async function pushNow(): Promise<void> {
  // If already syncing, the current cycle will pick up the new order
  if (isSyncing) return;
  await triggerSync();
}

function handleOnline() {
  // Small delay to let network stabilize
  setTimeout(() => triggerSync(), 2000);
}

function scheduleRetry() {
  if (retryTimer) return;
  const delay = RETRY_BACKOFF[Math.min(retryCount, RETRY_BACKOFF.length - 1)];
  retryCount++;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    triggerSync();
  }, delay);
}
