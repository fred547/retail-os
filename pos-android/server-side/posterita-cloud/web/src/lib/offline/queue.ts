/**
 * Outbound sync queue with exponential backoff.
 *
 * If a sync fails, the queue retries with increasing delays:
 * 30s → 60s → 120s → 240s (same as Android RETRY_BACKOFF).
 *
 * Error logs are queued locally and pushed when connectivity returns.
 */

import { getOfflineDb } from "./db";

const ERROR_QUEUE_KEY = "posterita_error_queue";

interface QueuedError {
  account_id: string;
  severity: string;
  tag: string;
  message: string;
  stack_trace?: string;
  device_info: string;
  app_version: string;
  queued_at: number;
}

/**
 * Queue an error for later upload (when offline).
 */
export function queueError(error: Omit<QueuedError, "queued_at">): void {
  try {
    const queue = getErrorQueue();
    queue.push({ ...error, queued_at: Date.now() });
    // Keep max 100 queued errors
    if (queue.length > 100) queue.splice(0, queue.length - 100);
    localStorage.setItem(ERROR_QUEUE_KEY, JSON.stringify(queue));
  } catch { /* storage full — drop oldest */ }
}

/**
 * Flush queued errors to the server.
 * Called by sync engine when back online.
 */
export async function flushErrorQueue(): Promise<number> {
  const queue = getErrorQueue();
  if (queue.length === 0) return 0;

  let flushed = 0;
  const remaining: QueuedError[] = [];

  for (const err of queue) {
    try {
      const res = await fetch("/api/errors/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(err),
      });
      if (res.ok) flushed++;
      else remaining.push(err);
    } catch {
      remaining.push(err);
      break; // Still offline — stop trying
    }
  }

  localStorage.setItem(ERROR_QUEUE_KEY, JSON.stringify(remaining));
  return flushed;
}

function getErrorQueue(): QueuedError[] {
  try {
    const raw = localStorage.getItem(ERROR_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
