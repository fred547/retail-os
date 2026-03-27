/**
 * Observable sync state — mirrors Android SyncStatusManager.
 * React components subscribe via useSyncStatus() hook.
 */

export type SyncState =
  | "idle"
  | "connecting"
  | "pushing_orders"
  | "pushing_tills"
  | "pulling_products"
  | "pulling_categories"
  | "saving"
  | "complete"
  | "error";

export interface SyncStatus {
  state: SyncState;
  message: string;
  detail?: string;
  percent: number;
  pendingOrders: number;
  pendingTills: number;
  lastSyncAt: string | null;
  lastError: string | null;
}

type Listener = (status: SyncStatus) => void;

const listeners = new Set<Listener>();

let currentStatus: SyncStatus = {
  state: "idle",
  message: "",
  percent: 0,
  pendingOrders: 0,
  pendingTills: 0,
  lastSyncAt: null,
  lastError: null,
};

function notify() {
  for (const fn of listeners) {
    try { fn(currentStatus); } catch { /* ignore */ }
  }
}

export function getSyncStatus(): SyncStatus {
  return currentStatus;
}

export function subscribeSyncStatus(fn: Listener): () => void {
  listeners.add(fn);
  fn(currentStatus); // immediate callback with current state
  return () => listeners.delete(fn);
}

export function updateSyncStatus(partial: Partial<SyncStatus>) {
  currentStatus = { ...currentStatus, ...partial };
  notify();
}

export function syncError(message: string) {
  currentStatus = { ...currentStatus, state: "error", message, lastError: message };
  notify();
}

export function syncComplete(serverTime: string) {
  currentStatus = {
    ...currentStatus,
    state: "complete",
    message: "Sync complete",
    percent: 100,
    lastSyncAt: serverTime,
    lastError: null,
  };
  notify();
  // Reset to idle after 3 seconds
  setTimeout(() => {
    if (currentStatus.state === "complete") {
      updateSyncStatus({ state: "idle", message: "", percent: 0 });
    }
  }, 3000);
}
