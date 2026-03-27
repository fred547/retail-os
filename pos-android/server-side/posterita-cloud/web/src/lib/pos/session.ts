/**
 * POS session management — mirrors Android SessionManager.
 *
 * Stores account/store/terminal/user context.
 * User is resolved from IndexedDB after PIN login.
 */

import { getOfflineDb, getSyncMeta, setSyncMeta } from "@/lib/offline/db";
import type { PosUser, Store, Terminal } from "@/lib/offline/schema";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes (same as Android)
const SESSION_KEY = "posterita_session";

export interface PosSession {
  accountId: string;
  storeId: number;
  terminalId: number;
  userId: number;
  userName: string;
  userRole: string;
  storeName: string;
  terminalName: string;
  lockedAt: number | null; // timestamp when idle lock triggered
}

let currentSession: PosSession | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let lockCallback: (() => void) | null = null;

/**
 * Initialize session from saved state.
 */
export function restoreSession(): PosSession | null {
  try {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) {
      currentSession = JSON.parse(saved);
      startIdleTimer();
      return currentSession;
    }
  } catch { /* ignore */ }
  return null;
}

/**
 * Create session after PIN login.
 */
export async function createSession(user: PosUser): Promise<PosSession> {
  const db = getOfflineDb();
  const accountId = await getSyncMeta("account_id") || "";
  const storeId = parseInt(await getSyncMeta("store_id") || "0");
  const terminalId = parseInt(await getSyncMeta("terminal_id") || "0");

  const store = await db.store.get(storeId);
  const terminal = await db.terminal.get(terminalId);

  currentSession = {
    accountId,
    storeId,
    terminalId,
    userId: user.user_id,
    userName: user.firstname || user.username || "Staff",
    userRole: user.role || "cashier",
    storeName: store?.name || "Store",
    terminalName: terminal?.name || "Terminal",
    lockedAt: null,
  };

  await setSyncMeta("user_id", user.user_id.toString());
  await setSyncMeta("store_name", store?.name || "Store");
  localStorage.setItem(SESSION_KEY, JSON.stringify(currentSession));
  startIdleTimer();

  return currentSession;
}

/**
 * Get current session (null if not logged in or locked).
 */
export function getSession(): PosSession | null {
  return currentSession;
}

/**
 * Check if session is locked (idle timeout).
 */
export function isLocked(): boolean {
  return currentSession?.lockedAt !== null && currentSession?.lockedAt !== undefined;
}

/**
 * Lock the session (idle timeout or manual).
 */
export function lockSession(): void {
  if (currentSession) {
    currentSession.lockedAt = Date.now();
    localStorage.setItem(SESSION_KEY, JSON.stringify(currentSession));
    lockCallback?.();
  }
}

/**
 * Unlock session (after PIN re-entry).
 */
export function unlockSession(): void {
  if (currentSession) {
    currentSession.lockedAt = null;
    localStorage.setItem(SESSION_KEY, JSON.stringify(currentSession));
    startIdleTimer();
  }
}

/**
 * End session (logout).
 */
export function endSession(): void {
  currentSession = null;
  localStorage.removeItem(SESSION_KEY);
  if (idleTimer) clearTimeout(idleTimer);
}

/**
 * Register a callback for when the session locks.
 */
export function onLock(callback: () => void): void {
  lockCallback = callback;
}

/**
 * Reset idle timer (call on any user interaction).
 */
export function resetIdleTimer(): void {
  startIdleTimer();
}

/**
 * Validate a PIN against users in IndexedDB.
 */
export async function validatePin(pin: string): Promise<PosUser | null> {
  const db = getOfflineDb();
  const accountId = await getSyncMeta("account_id") || "";
  const users = await db.pos_user.where("account_id").equals(accountId).toArray();
  return users.find((u) => u.pin === pin && u.isactive === "Y") || null;
}

function startIdleTimer(): void {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    lockSession();
  }, IDLE_TIMEOUT_MS);
}
