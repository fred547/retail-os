"use client";

import { useEffect, useState } from "react";
import { Shield, CheckCircle, Clock, AlertTriangle, MinusCircle } from "lucide-react";

interface MraStats {
  filed: number;
  pending: number;
  failed: number;
  exempt: number;
  total: number;
  recentErrors: Array<{ order_id: number; document_no: string; mra_error: string; date_ordered: string }>;
  config: { brn: string; tan: string; is_enabled: boolean } | null;
}

export default function MraDashboard() {
  const [stats, setStats] = useState<MraStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Fetch orders with MRA status
      const ordersRes = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "orders", select: "order_id, document_no, mra_status, mra_fiscal_id, mra_error, date_ordered" }),
      });
      const { data: orders } = await ordersRes.json();

      // Fetch tax config
      const configRes = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "account_tax_config", select: "brn, tan, is_enabled" }),
      });
      const { data: configs } = await configRes.json();

      let filed = 0, pending = 0, failed = 0, exempt = 0;
      const recentErrors: MraStats["recentErrors"] = [];

      for (const o of orders ?? []) {
        switch (o.mra_status) {
          case "filed": filed++; break;
          case "pending": pending++; break;
          case "failed":
            failed++;
            if (recentErrors.length < 5 && o.mra_error) {
              recentErrors.push({ order_id: o.order_id, document_no: o.document_no, mra_error: o.mra_error, date_ordered: o.date_ordered });
            }
            break;
          case "exempt": exempt++; break;
        }
      }

      setStats({
        filed, pending, failed, exempt,
        total: (orders ?? []).length,
        recentErrors,
        config: configs?.[0] ?? null,
      });
    } catch (_) {}
    setLoading(false);
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading MRA data...</div>;
  if (!stats) return <div className="text-center py-12 text-gray-500">Failed to load MRA data</div>;

  const filingRate = stats.total > 0 ? Math.round((stats.filed / (stats.total - stats.exempt)) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Config status */}
      {!stats.config?.is_enabled ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
          <p className="text-sm text-amber-700">
            MRA e-invoicing is <strong>not enabled</strong> for this brand.
            Go to <a href="/settings" className="underline font-medium">Settings → Tax Compliance</a> to configure.
          </p>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3">
          <p className="text-sm text-green-700">
            MRA e-invoicing is <strong>active</strong>. BRN: <strong className="font-mono">{stats.config.brn}</strong> · TAN: <strong className="font-mono">{stats.config.tan}</strong>
          </p>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
            <Shield size={14} />
            Total Orders
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 text-green-600 text-xs mb-1">
            <CheckCircle size={14} />
            Filed
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.filed}</p>
          {stats.total > 0 && <p className="text-xs text-gray-400 mt-1">{filingRate}% filing rate</p>}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 text-amber-600 text-xs mb-1">
            <Clock size={14} />
            Pending
          </div>
          <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 text-red-600 text-xs mb-1">
            <AlertTriangle size={14} />
            Failed
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
            <MinusCircle size={14} />
            Exempt
          </div>
          <p className="text-2xl font-bold text-gray-400">{stats.exempt}</p>
        </div>
      </div>

      {/* Recent errors */}
      {stats.recentErrors.length > 0 && (
        <div className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-red-50">
            <h3 className="font-semibold text-red-700">Recent Filing Errors</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentErrors.map((e) => (
                <tr key={e.order_id}>
                  <td className="font-mono text-sm">{e.document_no}</td>
                  <td className="text-sm text-gray-500">{new Date(e.date_ordered).toLocaleDateString()}</td>
                  <td className="text-sm text-red-600">{e.mra_error}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* No errors */}
      {stats.failed === 0 && stats.config?.is_enabled && (
        <div className="text-center py-8 text-gray-500">
          <CheckCircle className="mx-auto text-green-400 mb-2" size={40} />
          <p className="text-sm">All invoices filed successfully. No errors.</p>
        </div>
      )}
    </div>
  );
}
