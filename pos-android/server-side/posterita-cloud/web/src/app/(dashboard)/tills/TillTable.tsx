"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  CreditCard,
  Banknote,
  ShoppingCart,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";

interface Till {
  till_id: number;
  store_id: number;
  terminal_id: number;
  documentno: string;
  uuid: string;
  open_by: number;
  close_by: number;
  opening_amt: number;
  closing_amt: number;
  cash_amt: number;
  card_amt: number;
  grand_total: number;
  subtotal: number;
  tax_total: number;
  adjustment_total: number;
  date_opened: string;
  date_closed: string | null;
  is_deleted: boolean;
  is_sync: boolean;
  store_name: string;
  terminal_name: string;
  opened_by_name: string;
  closed_by_name: string;
  order_count: number;
}

interface Store { store_id: number; name: string }
interface Terminal { terminal_id: number; name: string }

function formatCurrency(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function duration(opened: string, closed: string | null) {
  if (!closed) return "Open";
  const ms = new Date(closed).getTime() - new Date(opened).getTime();
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export default function TillTable({
  tills,
  stores,
  terminals,
  currency,
  page,
  totalPages,
  filters,
}: {
  tills: Till[];
  stores: Store[];
  terminals: Terminal[];
  currency: string;
  page: number;
  totalPages: number;
  filters: { store?: string; terminal?: string; from?: string; to?: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const navigate = (params: Record<string, string>) => {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(params)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    router.push(`/tills?${sp.toString()}`);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filters.store ?? ""}
          onChange={(e) => navigate({ store: e.target.value, page: "1" })}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
        >
          <option value="">All Stores</option>
          {stores.map((s) => (
            <option key={s.store_id} value={s.store_id}>{s.name}</option>
          ))}
        </select>
        <select
          value={filters.terminal ?? ""}
          onChange={(e) => navigate({ terminal: e.target.value, page: "1" })}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
        >
          <option value="">All Terminals</option>
          {terminals.map((t) => (
            <option key={t.terminal_id} value={t.terminal_id}>{t.name}</option>
          ))}
        </select>
        <input
          type="date"
          value={filters.from ?? ""}
          onChange={(e) => navigate({ from: e.target.value, page: "1" })}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
          placeholder="From"
        />
        <input
          type="date"
          value={filters.to ?? ""}
          onChange={(e) => navigate({ to: e.target.value, page: "1" })}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
          placeholder="To"
        />
        {(filters.store || filters.terminal || filters.from || filters.to) && (
          <button
            onClick={() => navigate({ store: "", terminal: "", from: "", to: "", page: "1" })}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      {tills.length === 0 ? (
        <div className="text-center py-16">
          <Clock className="mx-auto text-gray-400" size={64} />
          <h3 className="text-lg font-medium text-gray-700 mt-4">No till sessions found</h3>
          <p className="text-gray-500 mt-1">Till sessions will appear here once closed and synced from the POS</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 32 }}></th>
                <th>Document No</th>
                <th>Store</th>
                <th>Terminal</th>
                <th>Opened</th>
                <th>Duration</th>
                <th className="text-center">Orders</th>
                <th className="text-right">Grand Total</th>
                <th className="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {tills.map((t) => {
                const isExpanded = expandedId === t.till_id;
                const discrepancy = t.closing_amt - (t.opening_amt + t.cash_amt + t.adjustment_total);
                const hasDiscrepancy = t.date_closed && Math.abs(discrepancy) > 0.01;

                return (
                  <>
                    <tr
                      key={t.till_id}
                      className={`cursor-pointer hover:bg-gray-50 transition ${t.is_deleted ? "opacity-40 line-through" : ""}`}
                      onClick={() => setExpandedId(isExpanded ? null : t.till_id)}
                    >
                      <td>
                        {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                      </td>
                      <td className="font-mono text-sm font-medium">{t.documentno || "—"}</td>
                      <td className="text-sm text-gray-600">{t.store_name}</td>
                      <td className="text-sm text-gray-600">{t.terminal_name}</td>
                      <td className="text-sm text-gray-500">{formatDate(t.date_opened)}</td>
                      <td className="text-sm text-gray-500">{duration(t.date_opened, t.date_closed)}</td>
                      <td className="text-center">
                        <span className="inline-flex items-center gap-1 text-sm">
                          <ShoppingCart size={13} className="text-gray-400" />
                          {t.order_count}
                        </span>
                      </td>
                      <td className="text-right font-semibold text-sm">{formatCurrency(t.grand_total, currency)}</td>
                      <td className="text-center">
                        {t.is_deleted ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">Deleted</span>
                        ) : !t.date_closed ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Open</span>
                        ) : hasDiscrepancy ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 flex items-center gap-1">
                            <AlertTriangle size={11} />
                            Discrepancy
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Closed</span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${t.till_id}-detail`}>
                        <td colSpan={9} className="bg-gray-50 px-6 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white rounded-lg p-3 border border-gray-100">
                              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                                <Banknote size={13} />
                                Opening
                              </div>
                              <p className="font-semibold">{formatCurrency(t.opening_amt, currency)}</p>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-gray-100">
                              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                                <Banknote size={13} />
                                Cash Collected
                              </div>
                              <p className="font-semibold">{formatCurrency(t.cash_amt, currency)}</p>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-gray-100">
                              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                                <CreditCard size={13} />
                                Card
                              </div>
                              <p className="font-semibold">{formatCurrency(t.card_amt, currency)}</p>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-gray-100">
                              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                                <DollarSign size={13} />
                                Closing
                              </div>
                              <p className="font-semibold">{formatCurrency(t.closing_amt, currency)}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                            <div className="text-sm">
                              <span className="text-gray-500">Subtotal:</span>{" "}
                              <span className="font-medium">{formatCurrency(t.subtotal, currency)}</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-gray-500">Tax:</span>{" "}
                              <span className="font-medium">{formatCurrency(t.tax_total, currency)}</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-gray-500">Adjustments:</span>{" "}
                              <span className="font-medium">{formatCurrency(t.adjustment_total, currency)}</span>
                            </div>
                            {hasDiscrepancy && (
                              <div className="text-sm">
                                <span className="text-gray-500">Discrepancy:</span>{" "}
                                <span className={`font-medium ${discrepancy > 0 ? "text-green-600" : "text-red-600"}`}>
                                  {discrepancy > 0 ? "+" : ""}{formatCurrency(discrepancy, currency)}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-6 mt-3 text-sm text-gray-500">
                            <span>Opened by: <strong className="text-gray-700">{t.opened_by_name}</strong></span>
                            <span>Closed by: <strong className="text-gray-700">{t.closed_by_name}</strong></span>
                            {t.date_closed && <span>Closed: <strong className="text-gray-700">{formatDate(t.date_closed)}</strong></span>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button
              onClick={() => navigate({ page: String(page - 1) })}
              disabled={page <= 1}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => navigate({ page: String(page + 1) })}
              disabled={page >= totalPages}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
