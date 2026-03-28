"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Link2, Unlink, Settings, RefreshCw, ExternalLink,
  CheckCircle, XCircle, AlertCircle, Clock, Send,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";

interface Connection {
  id: number;
  provider: string;
  org_name: string | null;
  status: string;
  settings: Record<string, any>;
  last_sync_at: string | null;
  error_message: string | null;
  created_at: string;
}

interface EventLog {
  provider: string;
  event_type: string;
  status: string;
  external_id: string | null;
  created_at: string;
}

const PROVIDERS = [
  {
    key: "xero",
    name: "Xero",
    description: "Push invoices and payments automatically when orders are completed",
    color: "bg-[#13B5EA]",
    logo: "X",
  },
  {
    key: "quickbooks",
    name: "QuickBooks",
    description: "Sync sales, expenses, and customer data",
    color: "bg-[#2CA01C]",
    logo: "QB",
    comingSoon: true,
  },
  {
    key: "shopify",
    name: "Shopify",
    description: "Sync products and inventory between POS and online store",
    color: "bg-[#96BF48]",
    logo: "S",
    comingSoon: true,
  },
];

export default function IntegrationsPage() {
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [events, setEvents] = useState<EventLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Settings form
  const [syncMode, setSyncMode] = useState("per_order");
  const [autoPush, setAutoPush] = useState(true);
  const [salesCode, setSalesCode] = useState("200");
  const [cashCode, setCashCode] = useState("090");
  const [cardCode, setCardCode] = useState("091");
  const [tipsCode, setTipsCode] = useState("260");
  const [discountCode, setDiscountCode] = useState("400");
  const [roundingCode, setRoundingCode] = useState("490");
  const [varianceCode, setVarianceCode] = useState("480");
  const [taxMappings, setTaxMappings] = useState<Record<string, string>>({});

  // Xero data (fetched from their API)
  const [xeroAccounts, setXeroAccounts] = useState<Array<{ code: string; name: string; type: string; class: string }>>([]);
  const [xeroTaxRates, setXeroTaxRates] = useState<Array<{ taxType: string; name: string; rate: number }>>([]);
  const [localTaxes, setLocalTaxes] = useState<Array<{ tax_id: number; name: string; rate: number }>>([]);
  const [loadingSettings, setLoadingSettings] = useState(false);

  // Flash messages from OAuth redirect
  const success = searchParams.get("success");
  const error = searchParams.get("error");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations");
      const data = await res.json();
      setConnections(data.connections || []);
      setEvents(data.recent_events || []);

      // Load settings for xero if connected
      const xero = (data.connections || []).find((c: Connection) => c.provider === "xero");
      if (xero?.settings) {
        const s = xero.settings;
        setSyncMode(s.sync_mode || "per_order");
        setAutoPush(s.auto_push !== false);
        setSalesCode(s.sales_account_code || "200");
        setCashCode(s.cash_account_code || "090");
        setCardCode(s.card_account_code || "091");
        setTipsCode(s.tips_account_code || "260");
        setDiscountCode(s.discount_account_code || "400");
        setRoundingCode(s.rounding_account_code || "490");
        setVarianceCode(s.cash_variance_account_code || "480");
        setTaxMappings(s.tax_mappings || {});
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const getConnection = (provider: string) =>
    connections.find(c => c.provider === provider && c.status !== "disconnected");

  const disconnect = async (provider: string) => {
    await fetch(`/api/integrations/${provider}/disconnect`, { method: "POST" });
    load();
  };

  const loadXeroSettings = async () => {
    setLoadingSettings(true);
    try {
      const res = await fetch("/api/integrations/xero/settings");
      if (res.ok) {
        const data = await res.json();
        setXeroAccounts(data.xero_accounts || []);
        setXeroTaxRates(data.xero_tax_rates || []);
        setLocalTaxes(data.local_taxes || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoadingSettings(false); }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await fetch("/api/integrations/xero/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sync_mode: syncMode,
          auto_push: autoPush,
          sales_account_code: salesCode,
          cash_account_code: cashCode,
          card_account_code: cardCode,
          tips_account_code: tipsCode,
          discount_account_code: discountCode,
          rounding_account_code: roundingCode,
          cash_variance_account_code: varianceCode,
          tax_mappings: taxMappings,
        }),
      });
      setShowSettings(null);
      load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  if (loading && connections.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
        Loading integrations...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Integrations" }]} />
      {/* Flash messages */}
      {success === "xero" && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-green-600" />
          <p className="text-sm text-green-800 font-medium">Successfully connected to Xero!</p>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <XCircle size={20} className="text-red-600" />
          <p className="text-sm text-red-800 font-medium">
            {error === "denied" ? "Xero access was denied" :
             error === "no_org" ? "No Xero organisation found" :
             error === "token_failed" ? "Failed to connect to Xero" :
             `Connection error: ${error}`}
          </p>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Link2 size={28} className="text-indigo-500" />
          Integrations
        </h1>
        <p className="text-sm text-gray-500 mt-1">Connect your accounting and e-commerce tools</p>
      </div>

      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PROVIDERS.map(provider => {
          const conn = getConnection(provider.key);
          const isConnected = !!conn;
          const hasError = conn?.status === "error";

          return (
            <div key={provider.key} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
              provider.comingSoon ? "opacity-60" : ""
            } ${hasError ? "border-red-200" : "border-gray-100"}`}>
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${provider.color} flex items-center justify-center text-white font-bold text-sm`}>
                      {provider.logo}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{provider.name}</p>
                      {isConnected && conn.org_name && (
                        <p className="text-xs text-gray-500">{conn.org_name}</p>
                      )}
                    </div>
                  </div>
                  {isConnected ? (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      hasError ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                    }`}>
                      {hasError ? <AlertCircle size={12} /> : <CheckCircle size={12} />}
                      {hasError ? "Error" : "Connected"}
                    </span>
                  ) : provider.comingSoon ? (
                    <span className="text-xs text-gray-400 font-medium">Coming soon</span>
                  ) : null}
                </div>

                <p className="text-sm text-gray-500 mt-3">{provider.description}</p>

                {hasError && conn.error_message && (
                  <p className="text-xs text-red-600 mt-2 bg-red-50 rounded-lg px-3 py-1.5">{conn.error_message}</p>
                )}

                {isConnected && conn.last_sync_at && (
                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                    <Clock size={12} /> Last sync: {new Date(conn.last_sync_at).toLocaleString()}
                  </p>
                )}
              </div>

              {!provider.comingSoon && (
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                  {isConnected ? (
                    <>
                      <button
                        onClick={() => { setShowSettings(provider.key); loadXeroSettings(); }}
                        className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800"
                      >
                        <Settings size={14} /> Settings
                      </button>
                      <button
                        onClick={() => disconnect(provider.key)}
                        className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700"
                      >
                        <Unlink size={14} /> Disconnect
                      </button>
                    </>
                  ) : (
                    <a
                      href={`/api/integrations/${provider.key}/connect`}
                      className="flex items-center gap-2 px-4 py-2 bg-posterita-blue hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors w-full justify-center"
                    >
                      <ExternalLink size={14} /> Connect to {provider.name}
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Recent Events */}
      {events.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {events.map((e, i) => (
              <div key={i} className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    e.status === "sent" ? "bg-green-50 text-green-600" :
                    e.status === "failed" ? "bg-red-50 text-red-600" :
                    "bg-gray-50 text-gray-600"
                  }`}>
                    {e.status === "sent" ? <CheckCircle size={14} /> :
                     e.status === "failed" ? <XCircle size={14} /> :
                     <Send size={14} />}
                  </div>
                  <div>
                    <p className="text-sm text-gray-800">{e.event_type}</p>
                    {e.external_id && <p className="text-xs text-gray-400">ID: {e.external_id}</p>}
                  </div>
                </div>
                <span className="text-xs text-gray-400">{new Date(e.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Xero Settings Modal — Full Account Mapping */}
      {showSettings === "xero" && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-end md:items-center justify-center overflow-y-auto">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-2xl max-h-[90vh] overflow-y-auto p-6 my-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold">Xero Configuration</h2>
                <p className="text-sm text-gray-500">Map your POS accounts to Xero chart of accounts</p>
              </div>
              <button onClick={() => setShowSettings(null)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={20} />
              </button>
            </div>

            {loadingSettings && (
              <div className="text-center py-8 text-gray-400">
                <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
                <p className="text-sm">Loading Xero accounts...</p>
              </div>
            )}

            <div className="space-y-6">
              {/* Sync Mode */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Sync Mode</h3>
                <select value={syncMode} onChange={e => setSyncMode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white">
                  <option value="per_order">Per Order — push each sale as a separate invoice</option>
                  <option value="daily_summary">Daily Summary — one invoice per day (Z-report)</option>
                </select>
                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <button onClick={() => setAutoPush(!autoPush)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${autoPush ? "bg-green-500" : "bg-gray-300"}`}>
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${autoPush ? "translate-x-5" : ""}`} />
                  </button>
                  <span className="text-sm text-gray-700">Auto-push when orders sync from POS</span>
                </label>
              </div>

              {/* Account Mapping */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Account Mapping</h3>
                <p className="text-xs text-gray-500 mb-4">
                  {xeroAccounts.length > 0
                    ? `${xeroAccounts.length} accounts loaded from Xero`
                    : "Enter Xero account codes manually, or connect to load your chart of accounts"}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { label: "Sales Revenue", value: salesCode, setter: setSalesCode, hint: "Revenue from sales" },
                    { label: "Cash Account", value: cashCode, setter: setCashCode, hint: "Cash on hand" },
                    { label: "Card Clearing", value: cardCode, setter: setCardCode, hint: "Card payment clearing" },
                    { label: "Tips Income", value: tipsCode, setter: setTipsCode, hint: "Tips / gratuity" },
                    { label: "Discounts Given", value: discountCode, setter: setDiscountCode, hint: "Discount expense" },
                    { label: "Rounding", value: roundingCode, setter: setRoundingCode, hint: "Rounding adjustments" },
                    { label: "Cash Over/Short", value: varianceCode, setter: setVarianceCode, hint: "Till cash variance" },
                  ].map(({ label, value, setter, hint }) => (
                    <div key={label}>
                      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                      {xeroAccounts.length > 0 ? (
                        <select value={value} onChange={e => setter(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white">
                          <option value="">— Select —</option>
                          {xeroAccounts.map(a => (
                            <option key={a.code} value={a.code}>{a.code} — {a.name}</option>
                          ))}
                        </select>
                      ) : (
                        <input type="text" value={value} onChange={e => setter(e.target.value)}
                          placeholder={hint}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tax Mapping */}
              <div className="bg-amber-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Tax Mapping</h3>
                <p className="text-xs text-gray-500 mb-4">Map your POS tax rates to Xero tax types</p>
                {localTaxes.length > 0 ? (
                  <div className="space-y-2">
                    {localTaxes.map(tax => (
                      <div key={tax.tax_id} className="flex items-center gap-3">
                        <span className="text-sm text-gray-700 w-40 shrink-0">
                          {tax.name} ({tax.rate}%)
                        </span>
                        <span className="text-gray-400">→</span>
                        {xeroTaxRates.length > 0 ? (
                          <select
                            value={taxMappings[String(tax.tax_id)] || ""}
                            onChange={e => setTaxMappings(prev => ({ ...prev, [String(tax.tax_id)]: e.target.value }))}
                            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white">
                            <option value="">— No tax —</option>
                            {xeroTaxRates.map(xr => (
                              <option key={xr.taxType} value={xr.taxType}>
                                {xr.name} ({xr.rate}%)
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input type="text"
                            value={taxMappings[String(tax.tax_id)] || ""}
                            onChange={e => setTaxMappings(prev => ({ ...prev, [String(tax.tax_id)]: e.target.value }))}
                            placeholder="Xero TaxType (e.g., OUTPUT2)"
                            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No taxes configured in your POS. Add taxes first.</p>
                )}
              </div>

              {/* What gets pushed */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">What gets pushed to Xero</h3>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500" /> Sales → Invoices</div>
                  <div className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500" /> Cash/Card → Payments</div>
                  <div className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500" /> Discounts → Negative line items</div>
                  <div className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500" /> Tips → Separate line item</div>
                  <div className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500" /> Refunds → Credit Notes</div>
                  <div className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500" /> Cash variance → Journal Entry</div>
                  <div className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500" /> Tax → Mapped per line</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button onClick={() => setShowSettings(null)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={saveSettings} disabled={saving}
                className="px-6 py-2.5 bg-posterita-blue hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors disabled:opacity-50">
                {saving ? "Saving..." : "Save Configuration"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
