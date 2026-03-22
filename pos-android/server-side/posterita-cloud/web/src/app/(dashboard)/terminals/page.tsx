"use client";

import { useEffect, useState } from "react";
import { dataQuery, dataUpdate } from "@/lib/supabase/data-client";
import {
  Monitor,
  Wifi,
  WifiOff,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Clock,
  ShoppingCart,
  DollarSign,
  Save,
  X,
  Settings,
  Hash,
  MapPin,
  Banknote,
  ListOrdered,
} from "lucide-react";
import { SkeletonCard, SkeletonTable } from "@/components/Skeleton";
import Breadcrumb from "@/components/Breadcrumb";

interface TerminalStatus {
  terminal_id: number;
  store_name: string;
  terminal_name: string;
  isactive: string;
  current_till_id: number | null;
  till_opened: string | null;
  till_total: number | null;
  unsynced_orders: number;
}

interface TerminalSettings {
  terminal_id: number;
  name: string;
  prefix: string | null;
  floatamt: number | null;
  areacode: string | null;
  isactive: string;
  sequence: number | null;
  store_id: number | null;
  tax_id: number | null;
  cash_up_sequence: number | null;
  last_std_invoice_no: number | null;
  last_crn_invoice_no: number | null;
}

interface RecentOrder {
  order_id: number;
  ordernumber: string;
  grandtotal: number;
  created_at: string;
  status: string;
  is_synced: string;
}

export default function TerminalsPage() {
  const [terminals, setTerminals] = useState<TerminalStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Settings editing
  const [editingSettings, setEditingSettings] =
    useState<TerminalSettings | null>(null);
  const [settingsForm, setSettingsForm] = useState<Partial<TerminalSettings>>(
    {}
  );
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchTerminals = async () => {
    setLoading(true);
    const { data } = await dataQuery<TerminalStatus>("v_terminal_status", {
      order: { column: "store_name" },
    });
    setTerminals(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTerminals();
    const interval = setInterval(fetchTerminals, 30000);
    return () => clearInterval(interval);
  }, []);

  const toggleExpand = async (terminalId: number) => {
    if (expandedId === terminalId) {
      setExpandedId(null);
      setEditingSettings(null);
      return;
    }
    setExpandedId(terminalId);
    setOrdersLoading(true);

    // Fetch recent orders
    const { data: orders } = await dataQuery<RecentOrder>("orders", {
      select:
        "order_id, ordernumber, grandtotal, created_at, status, is_synced",
      filters: [{ column: "terminal_id", op: "eq", value: terminalId }],
      order: { column: "created_at", ascending: false },
      limit: 10,
    });
    setRecentOrders(orders ?? []);
    setOrdersLoading(false);

    // Fetch terminal settings
    const { data: settings } = await dataQuery<TerminalSettings>("terminal", {
      select:
        "terminal_id, name, prefix, floatamt, areacode, isactive, sequence, store_id, tax_id, cash_up_sequence, last_std_invoice_no, last_crn_invoice_no",
      filters: [{ column: "terminal_id", op: "eq", value: terminalId }],
      limit: 1,
    });

    if (settings?.[0]) {
      setEditingSettings(settings[0]);
      setSettingsForm({ ...settings[0] });
    }
  };

  const updateSettingsField = (field: string, value: string | number) => {
    setSettingsForm((prev) => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
  };

  const saveSettings = async () => {
    if (!editingSettings) return;
    setSaving(true);
    await dataUpdate(
      "terminal",
      { column: "terminal_id", value: editingSettings.terminal_id },
      {
        name: settingsForm.name,
        prefix: settingsForm.prefix || null,
        floatamt: Number(settingsForm.floatamt) || 0,
        areacode: settingsForm.areacode || null,
        isactive: settingsForm.isactive,
        sequence: Number(settingsForm.sequence) || 0,
      }
    );
    setSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
    await fetchTerminals();
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Terminals" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Terminals</h1>
          <p className="text-gray-500 mt-1">
            Monitor and configure POS terminals
          </p>
        </div>
        <button
          onClick={fetchTerminals}
          className="flex items-center gap-2 bg-gray-100 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : terminals.length === 0 ? (
        <div className="text-center py-16">
          <Monitor className="mx-auto text-gray-400" size={64} />
          <h3 className="text-lg font-medium text-gray-700 mt-4">
            No terminals registered
          </h3>
          <p className="text-gray-500 mt-1">
            Terminals will appear here once they sync with the cloud
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {terminals.map((t) => {
            const isExpanded = expandedId === t.terminal_id;
            return (
              <div
                key={t.terminal_id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
              >
                {/* Clickable header */}
                <button
                  onClick={() => toggleExpand(t.terminal_id)}
                  className="w-full p-6 text-left hover:bg-gray-50 transition cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-2.5 rounded-xl ${
                          t.current_till_id ? "bg-green-50" : "bg-gray-50"
                        }`}
                      >
                        <Monitor
                          size={24}
                          className={
                            t.current_till_id
                              ? "text-green-600"
                              : "text-gray-400"
                          }
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">
                          {t.terminal_name}
                        </h3>
                        <p className="text-sm text-gray-500">{t.store_name}</p>
                      </div>
                      <span
                        className={`ml-4 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          t.current_till_id
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {t.current_till_id ? "Till Open" : "Closed"}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          t.isactive === "Y"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {t.isactive === "Y" ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          {t.current_till_id ? (
                            <Wifi size={16} className="text-green-500" />
                          ) : (
                            <WifiOff size={16} className="text-gray-400" />
                          )}
                          <span>
                            Unsynced:{" "}
                            <span
                              className={`font-medium ${
                                t.unsynced_orders > 0
                                  ? "text-orange-600"
                                  : "text-green-600"
                              }`}
                            >
                              {t.unsynced_orders}
                            </span>
                          </span>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp size={20} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={20} className="text-gray-400" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {/* Stats row */}
                    <div className="grid grid-cols-3 divide-x divide-gray-100 bg-gray-50">
                      <div className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-gray-500 text-sm mb-1">
                          <Clock size={14} />
                          Till Opened
                        </div>
                        <div className="font-medium">
                          {t.till_opened
                            ? new Date(t.till_opened).toLocaleString()
                            : "—"}
                        </div>
                      </div>
                      <div className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-gray-500 text-sm mb-1">
                          <DollarSign size={14} />
                          Till Total
                        </div>
                        <div className="font-semibold text-lg">
                          {t.till_total != null
                            ? formatCurrency(t.till_total)
                            : "—"}
                        </div>
                      </div>
                      <div className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-gray-500 text-sm mb-1">
                          <ShoppingCart size={14} />
                          Unsynced
                        </div>
                        <div
                          className={`font-semibold text-lg ${
                            t.unsynced_orders > 0
                              ? "text-orange-600"
                              : "text-green-600"
                          }`}
                        >
                          {t.unsynced_orders}
                        </div>
                      </div>
                    </div>

                    {/* Terminal Settings */}
                    {editingSettings && (
                      <div className="p-6 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Settings size={18} className="text-gray-500" />
                            <h4 className="font-medium text-gray-700">
                              Terminal Settings
                            </h4>
                          </div>
                          <button
                            onClick={saveSettings}
                            disabled={saving}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                              saveSuccess
                                ? "bg-green-600 text-white"
                                : "bg-posterita-blue text-white hover:bg-blue-700"
                            } disabled:opacity-50`}
                          >
                            <Save size={16} />
                            {saveSuccess
                              ? "Saved!"
                              : saving
                              ? "Saving..."
                              : "Save Settings"}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {/* Name */}
                          <div>
                            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                              <Monitor size={14} />
                              Terminal Name
                            </label>
                            <input
                              type="text"
                              value={settingsForm.name ?? ""}
                              onChange={(e) =>
                                updateSettingsField("name", e.target.value)
                              }
                              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                            />
                          </div>

                          {/* Prefix */}
                          <div>
                            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                              <Hash size={14} />
                              Invoice Prefix
                            </label>
                            <input
                              type="text"
                              value={settingsForm.prefix ?? ""}
                              onChange={(e) =>
                                updateSettingsField("prefix", e.target.value)
                              }
                              placeholder="e.g. INV, T1"
                              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                            />
                          </div>

                          {/* Float Amount */}
                          <div>
                            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                              <Banknote size={14} />
                              Float Amount
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={settingsForm.floatamt ?? 0}
                              onChange={(e) =>
                                updateSettingsField("floatamt", e.target.value)
                              }
                              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                            />
                          </div>

                          {/* Area Code */}
                          <div>
                            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                              <MapPin size={14} />
                              Area Code
                            </label>
                            <input
                              type="text"
                              value={settingsForm.areacode ?? ""}
                              onChange={(e) =>
                                updateSettingsField("areacode", e.target.value)
                              }
                              placeholder="e.g. A1, MAIN"
                              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                            />
                          </div>

                          {/* Sequence */}
                          <div>
                            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                              <ListOrdered size={14} />
                              Sequence
                            </label>
                            <input
                              type="number"
                              value={settingsForm.sequence ?? 0}
                              onChange={(e) =>
                                updateSettingsField("sequence", e.target.value)
                              }
                              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                            />
                          </div>

                          {/* Status */}
                          <div>
                            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                              Status
                            </label>
                            <select
                              value={settingsForm.isactive ?? "Y"}
                              onChange={(e) =>
                                updateSettingsField("isactive", e.target.value)
                              }
                              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                            >
                              <option value="Y">Active</option>
                              <option value="N">Inactive</option>
                            </select>
                          </div>
                        </div>

                        {/* Read-only info */}
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">
                            System Info (read-only)
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div className="bg-gray-50 rounded-lg px-3 py-2">
                              <span className="text-gray-500 text-xs">
                                Terminal ID
                              </span>
                              <p className="font-mono font-medium">
                                {editingSettings.terminal_id}
                              </p>
                            </div>
                            <div className="bg-gray-50 rounded-lg px-3 py-2">
                              <span className="text-gray-500 text-xs">
                                Cash Up Seq
                              </span>
                              <p className="font-mono font-medium">
                                {editingSettings.cash_up_sequence ?? "—"}
                              </p>
                            </div>
                            <div className="bg-gray-50 rounded-lg px-3 py-2">
                              <span className="text-gray-500 text-xs">
                                Last Std Invoice
                              </span>
                              <p className="font-mono font-medium">
                                {editingSettings.last_std_invoice_no ?? "—"}
                              </p>
                            </div>
                            <div className="bg-gray-50 rounded-lg px-3 py-2">
                              <span className="text-gray-500 text-xs">
                                Last CRN Invoice
                              </span>
                              <p className="font-mono font-medium">
                                {editingSettings.last_crn_invoice_no ?? "—"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Recent Orders */}
                    <div className="p-6 border-t border-gray-100">
                      <h4 className="font-medium text-gray-700 mb-3">
                        Recent Orders
                      </h4>
                      {ordersLoading ? (
                        <SkeletonTable rows={3} columns={5} />
                      ) : recentOrders.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          No orders found for this terminal
                        </div>
                      ) : (
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Order #</th>
                              <th>Date</th>
                              <th className="text-right">Total</th>
                              <th className="text-center">Status</th>
                              <th className="text-center">Sync</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recentOrders.map((o) => (
                              <tr key={o.order_id}>
                                <td className="font-mono text-xs">
                                  {o.ordernumber}
                                </td>
                                <td className="text-gray-500 text-sm">
                                  {new Date(o.created_at).toLocaleString()}
                                </td>
                                <td className="text-right font-medium">
                                  {formatCurrency(o.grandtotal)}
                                </td>
                                <td className="text-center">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                    {o.status ?? "Paid"}
                                  </span>
                                </td>
                                <td className="text-center">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                      o.is_synced === "Y"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-orange-100 text-orange-700"
                                    }`}
                                  >
                                    {o.is_synced === "Y"
                                      ? "Synced"
                                      : "Pending"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "MUR",
    minimumFractionDigits: 2,
  }).format(amount ?? 0);
}
