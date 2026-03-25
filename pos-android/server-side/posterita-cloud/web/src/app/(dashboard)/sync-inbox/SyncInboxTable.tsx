"use client";

import { useState } from "react";
import { RefreshCw, ChevronDown, ChevronUp, Play, Clock, CheckCircle, XCircle, AlertTriangle, Copy, Check } from "lucide-react";

interface InboxEntry {
  id: number;
  account_id: string;
  terminal_id: number;
  device_id: string | null;
  sync_version: number;
  status: string;
  payload: any;
  items_summary: string | null;
  error_message: string | null;
  errors: string[] | null;
  retry_count: number;
  received_at: string;
  processed_at: string | null;
}

const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  processed: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-50", label: "Synced" },
  failed:    { icon: XCircle, color: "text-red-600", bg: "bg-red-50", label: "Not Synced" },
  partial:   { icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50", label: "Partial" },
  processing:{ icon: RefreshCw, color: "text-blue-600", bg: "bg-blue-50", label: "Processing" },
  received:  { icon: Clock, color: "text-gray-500", bg: "bg-gray-50", label: "Received" },
};

export default function SyncInboxTable({ entries }: { entries: InboxEntry[] }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [replaying, setReplaying] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [copied, setCopied] = useState<number | null>(null);

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
        window.location.reload();
      } else {
        alert(`Retry failed: ${body.error || "Unknown error"}`);
      }
    } catch (e: any) {
      alert(`Retry error: ${e.message}`);
    } finally {
      setReplaying(null);
    }
  };

  const copyJson = (entry: InboxEntry) => {
    navigator.clipboard.writeText(JSON.stringify(entry.payload, null, 2));
    setCopied(entry.id);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  };

  const timeAgo = (iso: string) => {
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 60000) return "just now";
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
    if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ago`;
    return `${Math.floor(ms / 86400000)}d ago`;
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
      <div className="flex gap-2 flex-wrap">
        {["all", "failed", "partial", "processed", "processing"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === f
                ? "bg-posterita-blue text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f === "all" ? "All" : f === "processed" ? "Synced" : f === "failed" ? "Not Synced" : f.charAt(0).toUpperCase() + f.slice(1)}
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
        <div className="space-y-3">
          {filtered.map(entry => {
            const cfg = statusConfig[entry.status] || statusConfig.received;
            const Icon = cfg.icon;
            const isExpanded = expandedId === entry.id;
            const isFailed = entry.status === "failed" || entry.status === "partial";

            return (
              <div key={entry.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
                isFailed ? "border-red-200" : "border-gray-100"
              }`}>
                {/* Main row */}
                <div
                  className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-gray-50 transition"
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                >
                  <div className="flex-shrink-0">
                    {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>

                  {/* Status badge */}
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
                    <Icon size={13} />
                    {cfg.label}
                  </span>

                  {/* Time */}
                  <div className="min-w-0">
                    <span className="text-sm text-gray-700">{formatTime(entry.received_at)}</span>
                    <span className="text-xs text-gray-400 ml-2">{timeAgo(entry.received_at)}</span>
                  </div>

                  {/* Items */}
                  <span className="text-sm text-gray-500 hidden sm:inline">
                    {entry.items_summary || "pull only"}
                  </span>

                  {/* Version badge */}
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-mono hidden sm:inline">
                    v{entry.sync_version}
                  </span>

                  {/* Duration */}
                  <span className="text-xs text-gray-400 ml-auto hidden sm:inline">
                    {formatDuration(entry.received_at, entry.processed_at)}
                  </span>

                  {/* Terminal */}
                  <span className="text-xs text-gray-400 hidden sm:inline">
                    T{entry.terminal_id}
                  </span>

                  {/* Error preview (inline for failed) */}
                  {isFailed && entry.error_message && (
                    <span className="text-xs text-red-500 truncate max-w-[200px] hidden md:inline" title={entry.error_message}>
                      {entry.error_message}
                    </span>
                  )}

                  {/* Retry button */}
                  {isFailed && (
                    <button
                      onClick={(e) => { e.stopPropagation(); replay(entry.id); }}
                      disabled={replaying === entry.id}
                      className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-posterita-blue text-white hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {replaying === entry.id ? (
                        <RefreshCw size={12} className="animate-spin" />
                      ) : (
                        <Play size={12} />
                      )}
                      Retry
                    </button>
                  )}
                </div>

                {/* Error message bar (always visible for failed) */}
                {isFailed && entry.error_message && !isExpanded && (
                  <div className="px-4 pb-3 -mt-1">
                    <p className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">
                      {entry.error_message}
                    </p>
                  </div>
                )}

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-4 space-y-4 bg-gray-50/50">
                    {/* Metadata grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <p className="text-gray-400 font-medium">ID</p>
                        <p className="text-gray-700 font-mono">{entry.id}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 font-medium">Device</p>
                        <p className="text-gray-700 font-mono">{entry.device_id || "\u2014"}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 font-medium">Sync Version</p>
                        <p className="text-gray-700 font-mono">v{entry.sync_version}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 font-medium">Retries</p>
                        <p className="text-gray-700">{entry.retry_count}</p>
                      </div>
                    </div>

                    {/* Error details */}
                    {entry.error_message && (
                      <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                        <p className="text-xs font-medium text-red-700 mb-1">Error</p>
                        <p className="text-sm text-red-600 break-all">{entry.error_message}</p>
                      </div>
                    )}
                    {entry.errors && (entry.errors as string[]).length > 0 && (
                      <div className="p-3 bg-red-50 rounded-lg border border-red-100 space-y-1">
                        <p className="text-xs font-medium text-red-700 mb-1">Errors ({(entry.errors as string[]).length})</p>
                        {(entry.errors as string[]).map((err, i) => (
                          <p key={i} className="text-xs text-red-600">{"\u2022"} {err}</p>
                        ))}
                      </div>
                    )}

                    {/* JSON Payload */}
                    {entry.payload && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium text-gray-500">Payload JSON</p>
                          <button
                            onClick={() => copyJson(entry)}
                            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-posterita-blue transition"
                          >
                            {copied === entry.id ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                            {copied === entry.id ? "Copied" : "Copy"}
                          </button>
                        </div>
                        <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto max-h-64 overflow-y-auto font-mono">
                          {JSON.stringify(entry.payload, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Retry button in expanded view too */}
                    {isFailed && (
                      <button
                        onClick={() => replay(entry.id)}
                        disabled={replaying === entry.id}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-posterita-blue text-white hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        {replaying === entry.id ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <Play size={14} />
                        )}
                        Retry Sync
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
