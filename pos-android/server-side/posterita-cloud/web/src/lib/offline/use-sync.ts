"use client";

import { useState, useEffect, useCallback } from "react";
import { subscribeSyncStatus, type SyncStatus } from "./sync-status";
import { triggerSync } from "./sync-worker";

/**
 * React hook for sync status — re-renders component when sync state changes.
 * Mirrors Android SyncStatusManager observation pattern.
 */
export function useSyncStatus(): SyncStatus & { syncNow: () => void } {
  const [status, setStatus] = useState<SyncStatus>({
    state: "idle",
    message: "",
    percent: 0,
    pendingOrders: 0,
    pendingTills: 0,
    lastSyncAt: null,
    lastError: null,
  });

  useEffect(() => {
    return subscribeSyncStatus(setStatus);
  }, []);

  const syncNow = useCallback(() => {
    triggerSync();
  }, []);

  return { ...status, syncNow };
}
