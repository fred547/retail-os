"use client";

import { useEffect, useState, useCallback } from "react";
import { FileText, RefreshCw, Search, Filter } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { logError } from "@/lib/error-logger";

interface AuditEvent {
  id: number;
  timestamp: number;
  user_id: number;
  user_name: string | null;
  action: string;
  detail: string | null;
  reason: string | null;
  supervisor_id: number | null;
  store_id: number;
  terminal_id: number;
  order_id: string | null;
  amount: number | null;
  device_id: string | null;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  "order.void": "bg-red-100 text-red-700",
  "order.refund": "bg-red-100 text-red-700",
  "price.override": "bg-amber-100 text-amber-700",
  "discount.apply": "bg-blue-100 text-blue-700",
  "discount.limit_exceeded": "bg-amber-100 text-amber-700",
  "till.open": "bg-green-100 text-green-700",
  "till.close": "bg-green-100 text-green-700",
  "drawer.open": "bg-purple-100 text-purple-700",
  "pin.failed": "bg-red-100 text-red-700",
  "pin.lockout": "bg-red-100 text-red-700",
  "supervisor.pin_ok": "bg-green-100 text-green-700",
  "supervisor.pin_fail": "bg-red-100 text-red-700",
  "cart.clear": "bg-gray-100 text-gray-700",
  "cart.remove_line": "bg-gray-100 text-gray-700",
  "order.create": "bg-blue-100 text-blue-700",
  "user.login": "bg-green-100 text-green-700",
};

const ALL_ACTIONS = [
  "order.void", "order.refund", "order.create", "price.override",
  "discount.apply", "discount.limit_exceeded", "till.open", "till.close",
  "drawer.open", "pin.failed", "pin.lockout", "supervisor.pin_ok",
  "supervisor.pin_fail", "cart.clear", "cart.remove_line", "user.login",
];

export default function AuditTrailPage() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  // Filters
  const [actionFilter, setActionFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (actionFilter) params.set("action", actionFilter);
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);

      const res = await fetch(`/api/fraud/audit-trail?${params}`);
      const data = await res.json();
      setEvents(data.events || []);
      setTotal(data.total || 0);
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      logError("AuditTrail", `Load failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [offset, actionFilter, startDate, endDate]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const formatDate = (d: string) => new Date(d).toLocaleDateString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Fraud Monitor", href: "/fraud" }, { label: "Audit Trail" }]} />

      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText size={28} className="text-posterita-blue" />
          Audit Trail
        </h1>
        <p className="text-sm text-gray-500 mt-1">Complete log of all audited POS actions</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={actionFilter}
          onChange={e => { setActionFilter(e.target.value); setOffset(0); }}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20"
        >
          <option value="">All actions</option>
          {ALL_ACTIONS.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <input
          type="date"
          value={startDate}
          onChange={e => { setStartDate(e.target.value); setOffset(0); }}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20"
          placeholder="Start date"
        />
        <input
          type="date"
          value={endDate}
          onChange={e => { setEndDate(e.target.value); setOffset(0); }}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20"
          placeholder="End date"
        />
        <span className="text-xs text-gray-400">{total} events</span>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">
          <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
          Loading audit trail...
        </div>
      ) : events.length > 0 ? (
        <>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table text-sm">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Detail</th>
                    <th>Reason</th>
                    <th>Supervisor</th>
                    <th className="text-right">Amount</th>
                    <th>Store</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(e => (
                    <tr key={e.id}>
                      <td className="text-xs text-gray-500 whitespace-nowrap">{formatDate(e.created_at)}</td>
                      <td className="font-medium whitespace-nowrap">{e.user_name || `#${e.user_id}`}</td>
                      <td>
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${ACTION_COLORS[e.action] || "bg-gray-100 text-gray-600"}`}>
                          {e.action}
                        </span>
                      </td>
                      <td className="text-xs text-gray-600 max-w-[250px] truncate">{e.detail || "—"}</td>
                      <td className="text-xs text-gray-500">{e.reason || "—"}</td>
                      <td className="text-xs">{e.supervisor_id ? `#${e.supervisor_id}` : "—"}</td>
                      <td className="text-right tabular-nums font-medium">
                        {e.amount != null ? e.amount.toFixed(2) : "—"}
                      </td>
                      <td className="text-xs text-gray-400">{e.store_id || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">
              {offset + 1}–{Math.min(offset + limit, total)} of {total}
            </span>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-12 text-center">
          <FileText size={40} className="mx-auto text-gray-300" />
          <h3 className="text-base font-medium text-gray-700 mt-3">No audit events</h3>
          <p className="text-sm text-gray-500 mt-1">
            Audit events will appear here once POS terminals sync their activity logs.
          </p>
        </div>
      )}
    </div>
  );
}
