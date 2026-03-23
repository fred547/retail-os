"use client";

import { useState } from "react";
import { RefreshCw, AlertTriangle, CheckCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";

interface SyncLog {
  id: number;
  account_id: string;
  terminal_id: number;
  store_id: number;
  device_model: string | null;
  app_version: string | null;
  client_sync_version: number;
  request_at: string;
  duration_ms: number;
  status: string;
  error_message: string | null;
  orders_pushed: number;
  tills_pushed: number;
  customers_pushed: number;
  error_logs_pushed: number;
  products_pulled: number;
  categories_pulled: number;
  users_pulled: number;
  stores_pulled: number;
  terminals_pulled: number;
  sync_errors: string[] | null;
}

export default function SyncMonitor({
  logs,
  accountMap,
}: {
  logs: SyncLog[];
  accountMap: Record<string, string>;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const success = logs.filter((l) => l.status === "success").length;
  const partial = logs.filter((l) => l.status === "partial").length;
  const failed = logs.filter((l) => l.status === "error").length;
  const avgMs = logs.length > 0 ? Math.round(logs.reduce((s, l) => s + (l.duration_ms || 0), 0) / logs.length) : 0;

  const durationColor = (ms: number) => {
    if (ms < 2000) return "text-green-600";
    if (ms < 5000) return "text-yellow-600";
    return "text-red-600";
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "success": return "bg-green-100 text-green-700";
      case "partial": return "bg-yellow-100 text-yellow-700";
      case "error": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  const timeAgo = (iso: string) => {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return `${Math.round(diff)}s ago`;
    if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
    return `${Math.round(diff / 86400)}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500">Total Syncs</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{logs.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500">Successful</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{success}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500">With Errors</p>
          <p className="text-3xl font-bold text-yellow-600 mt-1">{partial + failed}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500">Avg Duration</p>
          <p className={`text-3xl font-bold mt-1 ${durationColor(avgMs)}`}>{avgMs}ms</p>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-16">
          <RefreshCw className="mx-auto text-gray-400" size={48} />
          <h3 className="text-lg font-medium text-gray-700 mt-4">No sync requests yet</h3>
          <p className="text-gray-500 mt-1">Sync requests from Android devices will appear here</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 30 }}></th>
                <th>Time</th>
                <th>Account</th>
                <th>Device</th>
                <th className="text-right">Duration</th>
                <th className="text-center">Status</th>
                <th className="text-center">Pushed</th>
                <th className="text-center">Pulled</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <>
                  <tr
                    key={log.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  >
                    <td>
                      {expandedId === log.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </td>
                    <td className="text-sm">
                      <span title={new Date(log.request_at).toLocaleString()}>{timeAgo(log.request_at)}</span>
                    </td>
                    <td className="text-sm font-medium">
                      {accountMap[log.account_id] || log.account_id}
                    </td>
                    <td className="text-xs text-gray-500">
                      {log.device_model || "—"} {log.app_version ? `v${log.app_version}` : ""}
                    </td>
                    <td className={`text-right text-sm font-mono ${durationColor(log.duration_ms || 0)}`}>
                      {log.duration_ms}ms
                    </td>
                    <td className="text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="text-center text-sm text-gray-600">
                      {(log.orders_pushed || 0) + (log.tills_pushed || 0) + (log.customers_pushed || 0)}
                    </td>
                    <td className="text-center text-sm text-gray-600">
                      {(log.products_pulled || 0) + (log.categories_pulled || 0) + (log.users_pulled || 0)}
                    </td>
                  </tr>
                  {expandedId === log.id && (
                    <tr key={`${log.id}-detail`}>
                      <td colSpan={8} className="bg-gray-50 p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-xs text-gray-400 uppercase mb-1">Push</p>
                            <p>Orders: {log.orders_pushed}</p>
                            <p>Tills: {log.tills_pushed}</p>
                            <p>Customers: {log.customers_pushed}</p>
                            <p>Error logs: {log.error_logs_pushed}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 uppercase mb-1">Pull</p>
                            <p>Products: {log.products_pulled}</p>
                            <p>Categories: {log.categories_pulled}</p>
                            <p>Users: {log.users_pulled}</p>
                            <p>Stores: {log.stores_pulled}</p>
                            <p>Terminals: {log.terminals_pulled}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 uppercase mb-1">Connection</p>
                            <p>Terminal: {log.terminal_id}</p>
                            <p>Store: {log.store_id}</p>
                            <p>API v{log.client_sync_version || "?"}</p>
                          </div>
                          {log.sync_errors && (
                            <div>
                              <p className="text-xs text-red-400 uppercase mb-1">Errors</p>
                              {(Array.isArray(log.sync_errors) ? log.sync_errors : []).map((e, i) => (
                                <p key={i} className="text-red-600 text-xs">{e}</p>
                              ))}
                            </div>
                          )}
                        </div>
                        {log.error_message && (
                          <div className="mt-3 p-3 bg-red-50 rounded-lg">
                            <p className="text-xs text-red-700">{log.error_message}</p>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
