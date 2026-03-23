"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, AlertCircle, Info, Flame,
  Search, ChevronLeft, ChevronRight, Check, X, Eye,
} from "lucide-react";

const SEVERITY_META: Record<string, { icon: typeof AlertTriangle; color: string; bg: string }> = {
  FATAL: { icon: Flame, color: "text-red-700", bg: "bg-red-100" },
  ERROR: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
  WARN: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
  INFO: { icon: Info, color: "text-blue-600", bg: "bg-blue-50" },
};

type SummaryCounts = { total: number; error: number; warn: number; fatal: number; open: number };

export default function ErrorLogList({
  errors, totalCount, page, totalPages,
  severity, tag, status, search, uniqueTags, summaryCounts,
}: {
  errors: any[];
  totalCount: number;
  page: number;
  totalPages: number;
  severity: string;
  tag: string;
  status: string;
  search: string;
  uniqueTags: string[];
  summaryCounts: SummaryCounts;
}) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(search);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);

  const navigate = (overrides: Record<string, string>) => {
    const params = new URLSearchParams();
    const merged = { severity, tag, status, q: search, page: String(page), ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== "all" && v !== "1" && v !== "") params.set(k, v);
    }
    router.push(`/platform/error-logs?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); navigate({ q: searchInput, page: "1" }); };

  const updateStatus = async (id: number, newStatus: string) => {
    setUpdating(id);
    await fetch("/api/errors/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _update: true, id, status: newStatus }),
    });
    // Simplified: just use direct Supabase update via a dedicated endpoint
    await fetch("/api/data/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "error_logs", id: { column: "id", value: id }, updates: { status: newStatus } }),
    });
    setUpdating(null);
    router.refresh();
  };

  const summaryCards = [
    { label: "Total", value: summaryCounts.total, color: "text-slate-700" },
    { label: "Open", value: summaryCounts.open, color: "text-red-600" },
    { label: "Errors", value: summaryCounts.error, color: "text-red-500" },
    { label: "Warnings", value: summaryCounts.warn, color: "text-amber-600" },
    { label: "Fatal", value: summaryCounts.fatal, color: "text-red-800" },
  ];

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-5 gap-3">
        {summaryCards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
            <div className="text-xs text-slate-500 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <form onSubmit={handleSearch} className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search message, tag, account..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm" />
        </form>

        <select value={severity} onChange={(e) => navigate({ severity: e.target.value, page: "1" })}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm">
          <option value="all">All severities</option>
          <option value="FATAL">Fatal</option>
          <option value="ERROR">Error</option>
          <option value="WARN">Warning</option>
          <option value="INFO">Info</option>
        </select>

        <select value={tag} onChange={(e) => navigate({ tag: e.target.value, page: "1" })}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm">
          <option value="all">All tags</option>
          {uniqueTags.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <select value={status} onChange={(e) => navigate({ status: e.target.value, page: "1" })}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm">
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="fixed">Fixed</option>
          <option value="ignored">Ignored</option>
        </select>
      </div>

      {/* Error list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">{totalCount} error{totalCount !== 1 ? "s" : ""}</span>
          {totalPages > 1 && <span className="text-xs text-slate-400">Page {page}/{totalPages}</span>}
        </div>

        {errors.length === 0 ? (
          <div className="text-center py-12 text-slate-400">No errors match your filters</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {errors.map((err) => {
              const meta = SEVERITY_META[err.severity] || SEVERITY_META.ERROR;
              const Icon = meta.icon;
              const isExpanded = expandedId === err.id;
              const errStatus = err.status || "open";
              const time = err.created_at ? new Date(err.created_at).toLocaleString() : "—";

              return (
                <div key={err.id} className={`${isExpanded ? "bg-slate-50" : ""}`}>
                  <div
                    className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition"
                    onClick={() => setExpandedId(isExpanded ? null : err.id)}
                  >
                    <div className={`p-1.5 rounded-lg ${meta.bg} mt-0.5`}>
                      <Icon size={14} className={meta.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{err.tag}</span>
                        <span className="text-xs text-slate-400">{err.device_info?.includes("web") ? "Web" : "Android"}</span>
                        <span className="text-xs text-slate-300">{time}</span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          errStatus === "fixed" ? "bg-green-100 text-green-700" :
                          errStatus === "ignored" ? "bg-gray-100 text-gray-500" :
                          "bg-red-100 text-red-600"
                        }`}>{errStatus}</span>
                      </div>
                      <p className="text-sm text-slate-800 mt-1 line-clamp-2">{err.message}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{err.account_id} {err.device_info ? `• ${err.device_info}` : ""}</p>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 pl-12">
                      {err.stack_trace && (
                        <pre className="text-xs text-slate-600 bg-slate-100 rounded-lg p-3 overflow-x-auto max-h-48 mt-2 font-mono">{err.stack_trace}</pre>
                      )}
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => updateStatus(err.id, "fixed")} disabled={updating === err.id}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition disabled:opacity-50">
                          <Check size={12} /> Mark Fixed
                        </button>
                        <button onClick={() => updateStatus(err.id, "ignored")} disabled={updating === err.id}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition disabled:opacity-50">
                          <X size={12} /> Ignore
                        </button>
                        <button onClick={() => updateStatus(err.id, "open")} disabled={updating === err.id}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition disabled:opacity-50">
                          <Eye size={12} /> Reopen
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <button onClick={() => navigate({ page: String(page - 1) })} disabled={page <= 1}
              className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-800 disabled:opacity-30">
              <ChevronLeft size={16} /> Prev
            </button>
            <button onClick={() => navigate({ page: String(page + 1) })} disabled={page >= totalPages}
              className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-800 disabled:opacity-30">
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
