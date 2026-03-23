"use client";

import { useState } from "react";
import { RefreshCw, ChevronDown, ChevronUp, Play, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface InboxEntry {
  id: number;
  account_id: string;
  terminal_id: number;
  device_id: string | null;
  sync_version: number;
  status: string;
  items_summary: string | null;
  error_message: string | null;
  errors: string[] | null;
  retry_count: number;
  received_at: string;
  processed_at: string | null;
}

const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  processed: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-50", label: "Processed" },
  failed: { icon: XCircle, color: "text-red-600", bg: "bg-red-50", label: "Failed" },
  partial: { icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50", label: "Partial" },
  processing: { icon: RefreshCw, color: "text-blue-600", bg: "bg-blue-50", label: "Processing" },
  received: { icon: Clock, color: "text-gray-500", bg: "bg-gray-50", label: "Received" },
};

export default function SyncInboxTable({ entries }: { entries: InboxEntry[] }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [replaying, setReplaying] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all" ? entries : entries.filter(e => e.status === filter);

  const replay = async (id: number) => {
    setReplaying(id);
    try {
      const res = await fetch("/api/sync/replay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inbox_id: id }),
      });
      const body = await res.json();
      if (body.success) {
        alert(`Replay successful: ${body.orders_synced} orders, ${body.tills_synced} tills`);
        window.location.reload();
      } else {
        alert(`Replay failed: ${body.error || "Unknown error"}`);
      }
    } catch (e: any) {
      alert(`Replay error: ${e.message}`);
    } finally {
      setReplaying(null);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  };

  const formatDuration = (received: string, processed: string | null) => {
    if (!processed) return "\u2014";
    const ms = new Date(processed).getTime() - new Date(received).getTime();
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2">
        {["all", "failed", "partial", "processed"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === f
                ? "bg-posterita-blue text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== "all" && ` (${entries.filter(e => e.status === f).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Clock size={48} className="mx-auto mb-4 text-gray-300" />
          <p>No sync entries {filter !== "all" ? `with status "${filter}"` : "yet"}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Time</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Terminal</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Items</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Duration</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(entry => {
                const cfg = statusConfig[entry.status] || statusConfig.received;
                const Icon = cfg.icon;
                const isExpanded = expandedId === entry.id;

                return (
                  <tr key={entry.id} className="group">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        className="flex items-center gap-1 text-gray-700 hover:text-posterita-blue"
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {formatTime(entry.received_at)}
                      </button>
                      {isExpanded && (
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs space-y-1">
                          <p><strong>ID:</strong> {entry.id}</p>
                          <p><strong>Device:</strong> {entry.device_id || "\u2014"}</p>
                          <p><strong>Sync Version:</strong> {entry.sync_version}</p>
                          <p><strong>Retries:</strong> {entry.retry_count}</p>
                          {entry.error_message && (
                            <div className="mt-2 p-2 bg-red-50 rounded text-red-700 break-all">
                              <strong>Error:</strong> {entry.error_message}
                            </div>
                          )}
                          {entry.errors && entry.errors.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {(entry.errors as string[]).map((err, i) => (
                                <p key={i} className="text-red-600">{"\u2022"} {err}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">T{entry.terminal_id}</td>
                    <td className="px-4 py-3 text-gray-700">{entry.items_summary || "\u2014"}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDuration(entry.received_at, entry.processed_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                        <Icon size={12} />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(entry.status === "failed" || entry.status === "partial") && (
                        <button
                          onClick={() => replay(entry.id)}
                          disabled={replaying === entry.id}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-posterita-blue text-white hover:bg-blue-700 transition disabled:opacity-50"
                        >
                          {replaying === entry.id ? (
                            <RefreshCw size={12} className="animate-spin" />
                          ) : (
                            <Play size={12} />
                          )}
                          Replay
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
