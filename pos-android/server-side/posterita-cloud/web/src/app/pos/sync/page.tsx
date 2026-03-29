"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, CheckCircle, AlertCircle, Database, Upload, Clock, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getOfflineDb, getSyncMeta } from "@/lib/offline/db";
import { useSyncStatus } from "@/lib/offline/use-sync";
import { performSync } from "@/lib/offline/sync-engine";
import ConnectivityDot from "@/components/pos/ConnectivityDot";
import { PosBottomNav } from "../home/page";

/** Format relative timestamp */
function formatRelative(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const d = new Date(dateStr);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString();
}

interface SyncLogEntry {
  time: string;
  message: string;
  success: boolean;
  ordersPushed: number;
  tillsPushed: number;
  productsPulled: number;
}

/**
 * Sync Page — sync status, pending data, data stats, manual sync, sync log.
 * All data from IndexedDB. Works fully offline.
 */
export default function SyncPage() {
  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [productCount, setProductCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [categoryCount, setCategoryCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [tillCount, setTillCount] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [pendingTills, setPendingTills] = useState(0);
  const [syncLog, setSyncLog] = useState<SyncLogEntry[]>([]);

  const sync = useSyncStatus();

  const loadCounts = useCallback(async () => {
    const db = getOfflineDb();
    const accountId = await getSyncMeta("account_id");
    if (!accountId) return;

    const [prods, ords, custs, cats, users, tills, unsyncOrds, unsyncTills] = await Promise.all([
      db.product.where("account_id").equals(accountId).count(),
      db.order.count(),
      db.customer.where("account_id").equals(accountId).count(),
      db.productcategory.where("account_id").equals(accountId).count(),
      db.pos_user.where("account_id").equals(accountId).count(),
      db.till.count(),
      db.order.where("is_sync").equals(0).count(),
      db.till.where("is_sync").equals(0).count(),
    ]);

    setProductCount(prods);
    setOrderCount(ords);
    setCustomerCount(custs);
    setCategoryCount(cats);
    setUserCount(users);
    setTillCount(tills);
    setPendingOrders(unsyncOrds);
    setPendingTills(unsyncTills);
  }, []);

  useEffect(() => {
    async function init() {
      // Load stored sync log from localStorage
      try {
        const stored = localStorage.getItem("posterita_sync_log");
        if (stored) setSyncLog(JSON.parse(stored));
      } catch { /* ignore */ }

      await loadCounts();
      setReady(true);
    }
    init();
  }, [loadCounts]);

  // Refresh counts whenever sync completes
  useEffect(() => {
    if (sync.lastSyncAt) loadCounts();
  }, [sync.lastSyncAt, loadCounts]);

  const handleSyncNow = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const result = await performSync();
      const entry: SyncLogEntry = {
        time: new Date().toISOString(),
        message: result.success ? "Sync completed successfully" : (result.errors[0] || "Sync failed"),
        success: result.success,
        ordersPushed: result.ordersPushed,
        tillsPushed: result.tillsPushed,
        productsPulled: result.productsPulled,
      };
      const updatedLog = [entry, ...syncLog].slice(0, 10);
      setSyncLog(updatedLog);
      localStorage.setItem("posterita_sync_log", JSON.stringify(updatedLog));
      await loadCounts();
    } catch (e: any) {
      const entry: SyncLogEntry = {
        time: new Date().toISOString(),
        message: e.message || "Sync crashed",
        success: false,
        ordersPushed: 0,
        tillsPushed: 0,
        productsPulled: 0,
      };
      const updatedLog = [entry, ...syncLog].slice(0, 10);
      setSyncLog(updatedLog);
      localStorage.setItem("posterita_sync_log", JSON.stringify(updatedLog));
    } finally {
      setSyncing(false);
    }
  }, [syncing, syncLog, loadCounts]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading sync status...</p>
        </div>
      </div>
    );
  }

  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
        <Link href="/pos/home" className="text-gray-400 hover:text-white p-1.5 hover:bg-gray-800 rounded-lg transition">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-sm font-semibold flex-1">Synchronizer</h1>
        <ConnectivityDot />
      </div>

      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {/* Sync status card */}
        <div className={`rounded-2xl p-5 ${
          sync.state === "error" ? "bg-red-900/20 border border-red-800/50" :
          sync.state === "complete" ? "bg-green-900/20 border border-green-800/50" :
          syncing ? "bg-cyan-900/20 border border-cyan-800/50" : "bg-gray-800"
        }`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              sync.state === "error" ? "bg-red-600/20" :
              sync.state === "complete" ? "bg-green-600/20" :
              syncing ? "bg-cyan-600/20" : "bg-gray-700"
            }`}>
              {sync.state === "error" ? (
                <AlertCircle size={18} className="text-red-400" />
              ) : sync.state === "complete" ? (
                <CheckCircle size={18} className="text-green-400" />
              ) : syncing ? (
                <RefreshCw size={18} className="text-cyan-400 animate-spin" />
              ) : (
                <RefreshCw size={18} className="text-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">
                {syncing ? sync.message || "Syncing..." : sync.state === "error" ? "Sync Error" : "Last Sync"}
              </p>
              <p className="text-xs text-gray-500">{formatRelative(sync.lastSyncAt)}</p>
            </div>
            <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? "bg-green-400" : "bg-red-400"}`} />
          </div>

          {sync.lastError && !syncing && (
            <p className="text-xs text-red-400 bg-red-900/20 rounded-lg px-3 py-2 mb-3">{sync.lastError}</p>
          )}

          {syncing && sync.percent > 0 && (
            <div className="w-full bg-gray-700 rounded-full h-1.5 mb-3">
              <div className="bg-cyan-500 h-1.5 rounded-full transition-all" style={{ width: `${sync.percent}%` }} />
            </div>
          )}

          <button
            onClick={handleSyncNow}
            disabled={syncing || !isOnline}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium py-2.5 rounded-xl transition"
          >
            {syncing ? "Syncing..." : "Sync Now"}
          </button>
        </div>

        {/* Pending uploads */}
        <div className="bg-gray-800 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Upload size={14} className="text-amber-400" /> Pending Upload
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Orders</span>
              <span className={`text-xs font-medium ${pendingOrders > 0 ? "text-amber-400" : "text-green-400"}`}>
                {pendingOrders > 0 ? `${pendingOrders} pending` : "All synced"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Tills</span>
              <span className={`text-xs font-medium ${pendingTills > 0 ? "text-amber-400" : "text-green-400"}`}>
                {pendingTills > 0 ? `${pendingTills} pending` : "All synced"}
              </span>
            </div>
          </div>
        </div>

        {/* Data stats */}
        <div className="bg-gray-800 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Database size={14} className="text-blue-400" /> Local Data
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Products", count: productCount, color: "text-blue-400" },
              { label: "Categories", count: categoryCount, color: "text-purple-400" },
              { label: "Customers", count: customerCount, color: "text-pink-400" },
              { label: "Orders", count: orderCount, color: "text-green-400" },
              { label: "Tills", count: tillCount, color: "text-amber-400" },
              { label: "Users", count: userCount, color: "text-cyan-400" },
            ].map(stat => (
              <div key={stat.label} className="bg-gray-700/50 rounded-xl p-2.5 text-center">
                <p className={`text-lg font-bold ${stat.color}`}>{stat.count}</p>
                <p className="text-[10px] text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sync log */}
        <div className="bg-gray-800 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Clock size={14} className="text-gray-400" /> Sync Log
          </h3>
          {syncLog.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">No sync events recorded</p>
          ) : (
            <div className="space-y-2">
              {syncLog.map((entry, i) => (
                <div key={i} className="flex items-start gap-2.5 py-2 border-b border-gray-700/50 last:border-0">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    entry.success ? "bg-green-600/20" : "bg-red-600/20"
                  }`}>
                    {entry.success ? (
                      <CheckCircle size={10} className="text-green-400" />
                    ) : (
                      <AlertCircle size={10} className="text-red-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{entry.message}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {new Date(entry.time).toLocaleString()}
                      {entry.success && (entry.ordersPushed > 0 || entry.productsPulled > 0) && (
                        <span className="ml-2">
                          {entry.ordersPushed > 0 && `${entry.ordersPushed} sent`}
                          {entry.ordersPushed > 0 && entry.productsPulled > 0 && " | "}
                          {entry.productsPulled > 0 && `${entry.productsPulled} received`}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <PosBottomNav current="sync" />
    </div>
  );
}
