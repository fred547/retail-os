"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Store, Monitor, User, ExternalLink, RefreshCw, Trash2, Info, Clock } from "lucide-react";
import Link from "next/link";
import { getOfflineDb, getSyncMeta, clearAccountData, setSyncMeta } from "@/lib/offline/db";
import { getSession, endSession } from "@/lib/pos/session";
import type { Store as StoreType, Terminal, PosUser } from "@/lib/offline/schema";
import { PosBottomNav } from "../home/page";

/**
 * Admin Page — Store, terminal, user info, settings, and maintenance.
 * All data from IndexedDB. Works fully offline.
 */
export default function AdminPage() {
  const [ready, setReady] = useState(false);
  const [store, setStore] = useState<StoreType | null>(null);
  const [terminal, setTerminal] = useState<Terminal | null>(null);
  const [currentUser, setCurrentUser] = useState<PosUser | null>(null);
  const [accountId, setAccountId] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const acctId = await getSyncMeta("account_id");
        const sId = parseInt(await getSyncMeta("store_id") || "0");
        const tId = parseInt(await getSyncMeta("terminal_id") || "0");
        const devId = await getSyncMeta("device_id");
        const session = getSession();

        if (!acctId) { setReady(true); return; }
        setAccountId(acctId);
        setDeviceId(devId || "");

        const db = getOfflineDb();
        const [storeData, terminalData, syncTs] = await Promise.all([
          sId ? db.store.get(sId) : Promise.resolve(undefined),
          tId ? db.terminal.get(tId) : Promise.resolve(undefined),
          getSyncMeta(`last_sync_at_${acctId}`),
        ]);

        setStore(storeData || null);
        setTerminal(terminalData || null);
        setLastSync(syncTs || null);

        // Resolve current user
        if (session?.userId) {
          const user = await db.pos_user.get(session.userId);
          setCurrentUser(user || null);
        }

        setReady(true);
      } catch (e: any) {
        console.error("[ADMIN] init failed:", e);
        setReady(true);
      }
    }
    init();
  }, []);

  const handleClearAndResync = useCallback(async () => {
    setClearing(true);
    try {
      // Reset sync timestamp so next sync pulls everything
      if (accountId) {
        await setSyncMeta(`last_sync_at_${accountId}`, "1970-01-01T00:00:00.000Z");
      }
      localStorage.removeItem("posterita_sync_log");
      window.location.href = "/pos/sync";
    } catch {
      setClearing(false);
    }
  }, [accountId]);

  const handleFullReset = useCallback(async () => {
    setClearing(true);
    try {
      if (accountId) {
        await clearAccountData(accountId);
      }
      endSession();
      localStorage.clear();
      sessionStorage.clear();
      const dbs = await indexedDB.databases?.() || [];
      for (const db of dbs) {
        if (db.name) indexedDB.deleteDatabase(db.name);
      }
      window.location.href = "/pos/setup";
    } catch {
      setClearing(false);
    }
  }, [accountId]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
        <Link href="/pos/home" className="text-gray-400 hover:text-white p-1.5 hover:bg-gray-800 rounded-lg transition">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-sm font-semibold flex-1">Admin</h1>
      </div>

      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {/* Store info */}
        <div className="bg-gray-800 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center">
              <Store size={18} />
            </div>
            <h2 className="text-sm font-semibold">Store</h2>
          </div>
          {store ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Name</span>
                <span className="font-medium">{store.name}</span>
              </div>
              {store.address && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Address</span>
                  <span className="font-medium text-right max-w-[60%]">{store.address}</span>
                </div>
              )}
              {(store.city || store.country) && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Location</span>
                  <span className="font-medium">{[store.city, store.state, store.country].filter(Boolean).join(", ")}</span>
                </div>
              )}
              {store.currency && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Currency</span>
                  <span className="font-medium">{store.currency}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Type</span>
                <span className="font-medium capitalize">{store.store_type || "retail"}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No store data</p>
          )}
        </div>

        {/* Terminal info */}
        <div className="bg-gray-800 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-600/20 text-amber-400 rounded-full flex items-center justify-center">
              <Monitor size={18} />
            </div>
            <h2 className="text-sm font-semibold">Terminal</h2>
          </div>
          {terminal ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Name</span>
                <span className="font-medium">{terminal.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Type</span>
                <span className="font-medium capitalize">{terminal.terminal_type?.replace(/_/g, " ") || "POS Retail"}</span>
              </div>
              {terminal.prefix && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Prefix</span>
                  <span className="font-medium">{terminal.prefix}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Terminal ID</span>
                <span className="font-medium text-gray-500">{terminal.terminal_id}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No terminal data</p>
          )}
        </div>

        {/* User info */}
        <div className="bg-gray-800 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-600/20 text-purple-400 rounded-full flex items-center justify-center">
              <User size={18} />
            </div>
            <h2 className="text-sm font-semibold">User</h2>
          </div>
          {currentUser ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Name</span>
                <span className="font-medium">{currentUser.firstname} {currentUser.lastname || ""}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Username</span>
                <span className="font-medium">{currentUser.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Role</span>
                <span className="font-medium capitalize">{currentUser.role || "cashier"}</span>
              </div>
              {currentUser.email && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Email</span>
                  <span className="font-medium text-gray-500 text-right max-w-[60%] truncate">{currentUser.email}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Not logged in</p>
          )}
        </div>

        {/* Quick links */}
        <div className="bg-gray-800 rounded-2xl overflow-hidden">
          <Link
            href="/pos/sync"
            className="flex items-center gap-3 px-5 py-4 hover:bg-gray-750 transition border-b border-gray-700"
          >
            <RefreshCw size={16} className="text-cyan-400" />
            <span className="text-sm flex-1">Sync Status</span>
            <span className="text-xs text-gray-500">{lastSync ? new Date(lastSync).toLocaleString() : "Never synced"}</span>
          </Link>
          <Link
            href="/pos/shifts"
            className="flex items-center gap-3 px-5 py-4 hover:bg-gray-750 transition border-b border-gray-700"
          >
            <Clock size={16} className="text-blue-400" />
            <span className="text-sm flex-1">Shifts</span>
          </Link>
          <a
            href="https://web.posterita.com/customer"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-5 py-4 hover:bg-gray-750 transition"
          >
            <ExternalLink size={16} className="text-green-400" />
            <span className="text-sm flex-1">Open Web Console</span>
            <span className="text-xs text-gray-500">web.posterita.com</span>
          </a>
        </div>

        {/* Device info */}
        <div className="bg-gray-800 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gray-700 text-gray-400 rounded-full flex items-center justify-center">
              <Info size={18} />
            </div>
            <h2 className="text-sm font-semibold">Device</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Platform</span>
              <span className="font-medium">PWA</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Version</span>
              <span className="font-medium">1.0.0</span>
            </div>
            {deviceId && (
              <div className="flex justify-between">
                <span className="text-gray-400">Device ID</span>
                <span className="font-medium text-gray-500 text-right max-w-[60%] truncate text-xs">{deviceId}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-400">Account ID</span>
              <span className="font-medium text-gray-500 text-right max-w-[60%] truncate text-xs">{accountId}</span>
            </div>
          </div>
        </div>

        {/* Maintenance */}
        <div className="space-y-3 pb-2">
          <button
            onClick={handleClearAndResync}
            disabled={clearing}
            className="w-full flex items-center justify-center gap-2 bg-gray-800 text-cyan-400 py-3 rounded-xl text-sm font-medium hover:bg-gray-750 transition disabled:opacity-50"
          >
            <RefreshCw size={14} /> Clear Cache & Re-sync
          </button>
          <button
            onClick={() => setShowClearConfirm(true)}
            disabled={clearing}
            className="w-full flex items-center justify-center gap-2 bg-gray-800 text-red-400 py-3 rounded-xl text-sm font-medium hover:bg-gray-750 transition disabled:opacity-50"
          >
            <Trash2 size={14} /> Reset POS Data
          </button>
        </div>
      </main>

      <PosBottomNav current="admin" />

      {/* Reset confirm modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4" onClick={() => setShowClearConfirm(false)}>
          <div className="bg-gray-800 max-w-sm w-full rounded-2xl p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-red-400" />
            </div>
            <h2 className="text-lg font-bold mb-2">Reset POS Data?</h2>
            <p className="text-sm text-gray-400 mb-6">
              This will delete all local data and return to setup. Unsynced orders will be lost.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 bg-gray-700 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleFullReset}
                disabled={clearing}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
              >
                {clearing ? "Resetting..." : "Reset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
