"use client";

import { useEffect, useState } from "react";
import { Shield, CheckCircle, Clock, AlertTriangle, MinusCircle, Building2, Activity } from "lucide-react";

interface BrandMraStatus {
  account_id: string;
  businessname: string;
  is_enabled: boolean;
  brn: string | null;
  tan: string | null;
  filed: number;
  pending: number;
  failed: number;
  exempt: number;
  lastFiled: string | null;
  lastError: string | null;
}

interface MraHealth {
  brands: BrandMraStatus[];
  totals: { filed: number; pending: number; failed: number; exempt: number; total: number };
  enabledBrands: number;
  totalBrands: number;
  mraServerReachable: boolean | null;
}

export default function MraDashboard() {
  const [health, setHealth] = useState<MraHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadHealth(); }, []);

  const loadHealth = async () => {
    setLoading(true);
    try {
      // Fetch ALL accounts (platform-wide, not impersonated)
      const accRes = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "account", select: "account_id, businessname, type, status" }),
      });
      const { data: accounts } = await accRes.json();

      // Fetch ALL tax configs
      const taxRes = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "account_tax_config", select: "account_id, brn, tan, is_enabled" }),
      });
      const { data: taxConfigs } = await taxRes.json();
      const taxMap: Record<string, any> = {};
      for (const tc of taxConfigs ?? []) taxMap[tc.account_id] = tc;

      // Fetch ALL orders with MRA status
      const ordRes = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "orders", select: "account_id, mra_status, mra_error, mra_submitted_at" }),
      });
      const { data: orders } = await ordRes.json();

      // Aggregate per brand
      const brandMap: Record<string, BrandMraStatus> = {};
      const totals = { filed: 0, pending: 0, failed: 0, exempt: 0, total: 0 };

      for (const acc of accounts ?? []) {
        if (acc.status === "archived") continue;
        const tc = taxMap[acc.account_id];
        brandMap[acc.account_id] = {
          account_id: acc.account_id,
          businessname: acc.businessname || acc.account_id,
          is_enabled: tc?.is_enabled ?? false,
          brn: tc?.brn ?? null,
          tan: tc?.tan ?? null,
          filed: 0, pending: 0, failed: 0, exempt: 0,
          lastFiled: null, lastError: null,
        };
      }

      for (const o of orders ?? []) {
        const brand = brandMap[o.account_id];
        if (!brand) continue;
        totals.total++;
        switch (o.mra_status) {
          case "filed":
            brand.filed++; totals.filed++;
            if (!brand.lastFiled || o.mra_submitted_at > brand.lastFiled) brand.lastFiled = o.mra_submitted_at;
            break;
          case "pending": brand.pending++; totals.pending++; break;
          case "failed":
            brand.failed++; totals.failed++;
            if (o.mra_error) brand.lastError = o.mra_error;
            break;
          case "exempt": brand.exempt++; totals.exempt++; break;
        }
      }

      // Check MRA server reachability
      let mraReachable: boolean | null = null;
      try {
        const pingRes = await fetch("https://posterita-backend.onrender.com/health", { signal: AbortSignal.timeout(5000) });
        mraReachable = pingRes.ok;
      } catch (_) { mraReachable = false; }

      const brands = Object.values(brandMap).sort((a, b) => (b.filed + b.pending + b.failed) - (a.filed + a.pending + a.failed));
      const enabledBrands = brands.filter(b => b.is_enabled).length;

      setHealth({ brands, totals, enabledBrands, totalBrands: brands.length, mraServerReachable: mraReachable });
    } catch (_) {}
    setLoading(false);
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading MRA control tower...</div>;
  if (!health) return <div className="text-center py-12 text-gray-500">Failed to load MRA data</div>;

  const filingRate = health.totals.total > 0 && (health.totals.total - health.totals.exempt) > 0
    ? Math.round((health.totals.filed / (health.totals.total - health.totals.exempt)) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Server health */}
      <div className={`flex items-center gap-3 px-5 py-3 rounded-xl border ${
        health.mraServerReachable === true ? "bg-green-50 border-green-200" :
        health.mraServerReachable === false ? "bg-red-50 border-red-200" :
        "bg-gray-50 border-gray-200"
      }`}>
        <Activity size={18} className={health.mraServerReachable ? "text-green-600" : "text-red-600"} />
        <div>
          <p className={`text-sm font-medium ${health.mraServerReachable ? "text-green-700" : "text-red-700"}`}>
            MRA Backend: {health.mraServerReachable ? "Online" : "Unreachable"}
          </p>
          <p className="text-xs text-gray-500">
            {health.enabledBrands} of {health.totalBrands} brands have MRA enabled
          </p>
        </div>
      </div>

      {/* Platform-wide totals */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{health.totals.total}</p>
          <p className="text-xs text-gray-500">Total Orders</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{health.totals.filed}</p>
          <p className="text-xs text-gray-500">Filed</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{health.totals.pending}</p>
          <p className="text-xs text-gray-500">Pending</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{health.totals.failed}</p>
          <p className="text-xs text-gray-500">Failed</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-gray-400">{health.totals.exempt}</p>
          <p className="text-xs text-gray-500">Exempt</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-posterita-blue">{filingRate}%</p>
          <p className="text-xs text-gray-500">Filing Rate</p>
        </div>
      </div>

      {/* Per-brand breakdown */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <h3 className="font-semibold text-gray-900">Brand MRA Status</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Brand</th>
              <th>BRN</th>
              <th>MRA</th>
              <th className="text-right">Filed</th>
              <th className="text-right">Pending</th>
              <th className="text-right">Failed</th>
              <th>Last Filed</th>
              <th>Last Error</th>
            </tr>
          </thead>
          <tbody>
            {health.brands.map((b) => (
              <tr key={b.account_id} className={!b.is_enabled ? "opacity-40" : ""}>
                <td>
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-gray-400" />
                    <span className="font-medium">{b.businessname}</span>
                  </div>
                </td>
                <td className="font-mono text-xs text-gray-500">{b.brn || "—"}</td>
                <td>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    b.is_enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
                  }`}>
                    {b.is_enabled ? "Enabled" : "Off"}
                  </span>
                </td>
                <td className="text-right text-green-600 font-medium">{b.filed || "—"}</td>
                <td className="text-right text-amber-600">{b.pending || "—"}</td>
                <td className="text-right text-red-600">{b.failed || "—"}</td>
                <td className="text-xs text-gray-500">
                  {b.lastFiled ? new Date(b.lastFiled).toLocaleString() : "—"}
                </td>
                <td className="text-xs text-red-500 max-w-xs truncate" title={b.lastError || ""}>
                  {b.lastError || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Alert if failures exist */}
      {health.totals.failed > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3">
          <p className="text-sm text-red-700">
            <AlertTriangle size={14} className="inline mr-1" />
            <strong>{health.totals.failed}</strong> order(s) failed MRA filing across {health.brands.filter(b => b.failed > 0).length} brand(s).
            The cron job retries every 15 minutes.
          </p>
        </div>
      )}

      {health.totals.failed === 0 && health.enabledBrands > 0 && (
        <div className="text-center py-6 text-gray-500">
          <CheckCircle className="mx-auto text-green-400 mb-2" size={36} />
          <p className="text-sm">All MRA-enabled brands filing successfully.</p>
        </div>
      )}
    </div>
  );
}
