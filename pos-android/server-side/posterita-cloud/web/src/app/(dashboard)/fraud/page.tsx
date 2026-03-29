"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Shield, AlertTriangle, RefreshCw, Check, X, Eye,
  ChevronRight, Clock, DollarSign, Users,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { logError } from "@/lib/error-logger";

interface FraudSignal {
  id: number;
  signal_type: string;
  severity: string;
  title: string;
  detail: string;
  metric_value: number;
  threshold: number;
  store_id: number | null;
  user_id: number | null;
  status: string;
  created_at: string;
}

interface AuditEvent {
  id: number;
  action: string;
  user_name: string | null;
  detail: string | null;
  amount: number | null;
  store_id: number;
  created_at: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  warning: "bg-amber-100 text-amber-700 border-amber-200",
  info: "bg-blue-100 text-blue-700 border-blue-200",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-red-50 text-red-700",
  acknowledged: "bg-amber-50 text-amber-700",
  resolved: "bg-green-50 text-green-700",
  dismissed: "bg-gray-100 text-gray-500",
};

const SIGNAL_ICONS: Record<string, string> = {
  high_void_rate: "Voids",
  cash_shortage: "Cash",
  excessive_refunds: "Refunds",
  discount_outlier: "Discount",
  price_override_pattern: "Price",
  drawer_no_sale: "Drawer",
  pin_brute_force: "PIN",
  unusual_hours: "Hours",
};

const HIGH_RISK_ACTIONS = ["order.void", "order.refund", "price.override", "discount.limit_exceeded", "pin.lockout", "drawer.open", "supervisor.pin_fail"];

export default function FraudDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [signals, setSignals] = useState<FraudSignal[]>([]);
  const [signalCount, setSignalCount] = useState(0);
  const [recentEvents, setRecentEvents] = useState<AuditEvent[]>([]);
  const [detecting, setDetecting] = useState(false);

  const loadSignals = useCallback(async () => {
    try {
      const res = await fetch("/api/fraud/signals?status=open&limit=20");
      const data = await res.json();
      setSignals(data.signals || []);
      setSignalCount(data.total || 0);
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      logError("Fraud", `Load signals failed: ${err.message}`);
    }
  }, []);

  const loadRecentEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/fraud/audit-trail?limit=15");
      const data = await res.json();
      // Filter to high-risk actions only
      const highRisk = (data.events || []).filter((e: AuditEvent) => HIGH_RISK_ACTIONS.includes(e.action));
      setRecentEvents(highRisk.slice(0, 10));
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      logError("Fraud", `Load events failed: ${err.message}`);
    }
  }, []);

  useEffect(() => {
    Promise.all([loadSignals(), loadRecentEvents()]).finally(() => setLoading(false));
  }, [loadSignals, loadRecentEvents]);

  const handleRunDetection = async () => {
    setDetecting(true);
    try {
      const res = await fetch("/api/fraud/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Detection failed");
      loadSignals();
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      logError("Fraud", `Detection failed: ${err.message}`);
      alert(err.message);
    } finally {
      setDetecting(false);
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await fetch("/api/fraud/signals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      loadSignals();
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      logError("Fraud", `Status update failed: ${err.message}`);
    }
  };

  const severityBreakdown = {
    critical: signals.filter(s => s.severity === "critical").length,
    warning: signals.filter(s => s.severity === "warning").length,
    info: signals.filter(s => s.severity === "info").length,
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Fraud Monitor" }]} />

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield size={28} className="text-red-600" />
            Fraud Monitor
          </h1>
          <p className="text-sm text-gray-500 mt-1">Anomaly detection and audit trail for your stores</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/fraud/audit-trail"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Eye size={16} /> Audit Trail
          </Link>
          <button
            onClick={handleRunDetection}
            disabled={detecting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-posterita-blue text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={16} className={detecting ? "animate-spin" : ""} />
            {detecting ? "Scanning..." : "Run Detection"}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><AlertTriangle size={14} /> Open Signals</div>
          <div className="text-2xl font-bold text-gray-900">{signalCount}</div>
          {severityBreakdown.critical > 0 && (
            <div className="text-xs text-red-600 mt-0.5">{severityBreakdown.critical} critical</div>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><X size={14} /> Critical</div>
          <div className="text-2xl font-bold text-red-600">{severityBreakdown.critical}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><AlertTriangle size={14} /> Warning</div>
          <div className="text-2xl font-bold text-amber-600">{severityBreakdown.warning}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Clock size={14} /> Recent Events</div>
          <div className="text-2xl font-bold text-gray-900">{recentEvents.length}</div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">
          <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
          Loading fraud data...
        </div>
      ) : (
        <>
          {/* Active Signals */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Active Signals</h3>
                <p className="text-xs text-gray-500 mt-0.5">Anomalies detected across your stores</p>
              </div>
            </div>
            {signals.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {signals.map(s => (
                  <div key={s.id} className="px-6 py-4 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${SEVERITY_COLORS[s.severity] || "bg-gray-100 text-gray-600"}`}>
                        {SIGNAL_ICONS[s.signal_type] || "?"}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm">{s.title}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">{s.detail}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${SEVERITY_COLORS[s.severity]}`}>
                            {s.severity}
                          </span>
                          <span className="text-[10px] text-gray-400">{formatDate(s.created_at)}</span>
                          {s.store_id && <span className="text-[10px] text-gray-400">Store {s.store_id}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleUpdateStatus(s.id, "acknowledged")}
                        className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 text-[10px] font-medium hover:bg-amber-100 transition-colors"
                        title="Acknowledge"
                      >
                        Ack
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(s.id, "resolved")}
                        className="px-2.5 py-1 rounded-md bg-green-50 text-green-700 text-[10px] font-medium hover:bg-green-100 transition-colors"
                        title="Resolve"
                      >
                        <Check size={12} />
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(s.id, "dismissed")}
                        className="px-2.5 py-1 rounded-md bg-gray-50 text-gray-500 text-[10px] font-medium hover:bg-gray-100 transition-colors"
                        title="Dismiss"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <Shield size={40} className="mx-auto text-green-300" />
                <h3 className="text-base font-medium text-gray-700 mt-3">All clear</h3>
                <p className="text-sm text-gray-500 mt-1">No open fraud signals. Click &ldquo;Run Detection&rdquo; to scan.</p>
              </div>
            )}
          </div>

          {/* Recent High-Risk Activity */}
          {recentEvents.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Recent High-Risk Activity</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Voids, refunds, price overrides, drawer opens</p>
                </div>
                <Link href="/fraud/audit-trail" className="text-xs text-posterita-blue hover:underline flex items-center gap-1">
                  View all <ChevronRight size={12} />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table text-sm">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>User</th>
                      <th>Action</th>
                      <th>Detail</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentEvents.map(e => (
                      <tr key={e.id}>
                        <td className="text-xs text-gray-500 whitespace-nowrap">{formatDate(e.created_at)}</td>
                        <td className="font-medium">{e.user_name || "—"}</td>
                        <td>
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700">
                            {e.action}
                          </span>
                        </td>
                        <td className="text-xs text-gray-600 max-w-[300px] truncate">{e.detail || "—"}</td>
                        <td className="text-right tabular-nums font-medium">
                          {e.amount != null ? e.amount.toFixed(2) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
