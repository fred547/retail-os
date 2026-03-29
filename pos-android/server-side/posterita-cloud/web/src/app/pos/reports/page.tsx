"use client";

import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, BarChart3, RefreshCw, ExternalLink, DollarSign, ShoppingCart, TrendingUp, Receipt } from "lucide-react";
import { getOfflineDb, getSyncMeta } from "@/lib/offline/db";
import { isSeeded } from "@/lib/offline/seed";
import type { Order, OrderLine, Payment } from "@/lib/offline/schema";
import Link from "next/link";
import { PosBottomNav } from "../home/page";

/**
 * Reports — basic sales analytics calculated from IndexedDB orders.
 * No API calls needed — everything computed locally from order data.
 */

type DateRange = "today" | "yesterday" | "7days" | "30days";

function getDateRange(range: DateRange): { start: Date; end: Date; label: string } {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);

  switch (range) {
    case "today":
      return { start: todayStart, end: todayEnd, label: "Today" };
    case "yesterday": {
      const ys = new Date(todayStart.getTime() - 86400000);
      return { start: ys, end: todayStart, label: "Yesterday" };
    }
    case "7days": {
      const s = new Date(todayStart.getTime() - 7 * 86400000);
      return { start: s, end: todayEnd, label: "Last 7 Days" };
    }
    case "30days": {
      const s = new Date(todayStart.getTime() - 30 * 86400000);
      return { start: s, end: todayEnd, label: "Last 30 Days" };
    }
  }
}

function formatCurrency(amount: number, currency?: string): string {
  const prefix = currency || "";
  return `${prefix}${prefix ? " " : ""}${amount.toFixed(2)}`;
}

export default function ReportsPage() {
  const [ready, setReady] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderlines, setOrderlines] = useState<OrderLine[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [currency, setCurrency] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("today");

  useEffect(() => {
    async function init() {
      try {
        const accountId = await getSyncMeta("account_id");
        if (!accountId) { setReady(true); return; }
        const seeded = await isSeeded(accountId);
        if (!seeded) { setReady(true); return; }

        const db = getOfflineDb();
        const [allOrders, allLines, allPayments, stores] = await Promise.all([
          db.order.toArray(),
          db.orderline.toArray(),
          db.payment.toArray(),
          db.store.toArray(),
        ]);

        setOrders(allOrders);
        setOrderlines(allLines);
        setPayments(allPayments);

        // Get currency from first store
        if (stores.length > 0 && stores[0].currency) {
          setCurrency(stores[0].currency);
        }

        setReady(true);
      } catch (e: unknown) {
        const err = e instanceof Error ? e : new Error(String(e));
        fetch("/api/errors/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tag: "POS_REPORTS",
            message: `Reports init crash: ${err.message}`,
            stack_trace: err.stack,
            severity: "ERROR",
          }),
        }).catch(() => {});
        setReady(true);
      }
    }
    init();
  }, []);

  // Filter orders by date range
  const { start, end } = getDateRange(dateRange);
  const filteredOrders = useMemo(
    () => orders.filter((o) => {
      if (!o.date_ordered) return false;
      const d = new Date(o.date_ordered);
      return d >= start && d < end;
    }),
    [orders, start, end],
  );

  const filteredOrderIds = useMemo(
    () => new Set(filteredOrders.map((o) => o.order_id)),
    [filteredOrders],
  );

  const filteredLines = useMemo(
    () => orderlines.filter((l) => filteredOrderIds.has(l.order_id)),
    [orderlines, filteredOrderIds],
  );

  const filteredPayments = useMemo(
    () => payments.filter((p) => filteredOrderIds.has(p.order_id)),
    [payments, filteredOrderIds],
  );

  // Summary stats
  const revenue = useMemo(
    () => filteredOrders.reduce((s, o) => s + (o.grand_total || 0), 0),
    [filteredOrders],
  );
  const orderCount = filteredOrders.length;
  const avgOrderValue = orderCount > 0 ? revenue / orderCount : 0;
  const taxTotal = useMemo(
    () => filteredOrders.reduce((s, o) => s + (o.tax_total || 0), 0),
    [filteredOrders],
  );

  // Top products
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const line of filteredLines) {
      const key = String(line.product_id);
      const existing = map.get(key);
      if (existing) {
        existing.qty += line.qtyentered || 0;
        existing.revenue += line.linenetamt || 0;
      } else {
        map.set(key, {
          name: line.productname || `Product #${line.product_id}`,
          qty: line.qtyentered || 0,
          revenue: line.linenetamt || 0,
        });
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);
  }, [filteredLines]);

  // Payment breakdown
  const paymentBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const p of filteredPayments) {
      const type = (p.payment_type || "other").toLowerCase();
      const label = type === "cash" ? "Cash" : type === "card" ? "Card" : type.charAt(0).toUpperCase() + type.slice(1);
      const existing = map.get(label);
      if (existing) {
        existing.count++;
        existing.total += p.amount || 0;
      } else {
        map.set(label, { count: 1, total: p.amount || 0 });
      }
    }
    return Array.from(map.entries())
      .map(([type, data]) => ({ type, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [filteredPayments]);

  // Hourly chart data (only for single-day ranges)
  const hourlyData = useMemo(() => {
    const isSingleDay = dateRange === "today" || dateRange === "yesterday";
    if (!isSingleDay) return null;

    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0, revenue: 0 }));
    for (const o of filteredOrders) {
      if (!o.date_ordered) continue;
      const h = new Date(o.date_ordered).getHours();
      hours[h].count++;
      hours[h].revenue += o.grand_total || 0;
    }
    return hours;
  }, [filteredOrders, dateRange]);

  const maxHourlyCount = hourlyData ? Math.max(...hourlyData.map((h) => h.count), 1) : 1;

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <RefreshCw size={32} className="text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
        <Link href="/pos/home" className="text-gray-400 hover:text-white p-1.5 hover:bg-gray-800 rounded-lg transition">
          <ArrowLeft size={18} />
        </Link>
        <BarChart3 size={18} className="text-blue-400" />
        <h1 className="text-sm font-semibold">Reports</h1>
        <div className="flex-1" />
        <span className="text-xs text-gray-500">{getDateRange(dateRange).label}</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4 pb-24">
        {/* Date range picker */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {([
            ["today", "Today"],
            ["yesterday", "Yesterday"],
            ["7days", "7 Days"],
            ["30days", "30 Days"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setDateRange(key)}
              className={`px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                dateRange === key
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-800/50 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-900/40 rounded-lg flex items-center justify-center">
                <DollarSign size={16} className="text-green-400" />
              </div>
              <span className="text-xs text-gray-400">Revenue</span>
            </div>
            <p className="text-xl font-bold">{formatCurrency(revenue, currency)}</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-900/40 rounded-lg flex items-center justify-center">
                <ShoppingCart size={16} className="text-blue-400" />
              </div>
              <span className="text-xs text-gray-400">Orders</span>
            </div>
            <p className="text-xl font-bold">{orderCount}</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-purple-900/40 rounded-lg flex items-center justify-center">
                <TrendingUp size={16} className="text-purple-400" />
              </div>
              <span className="text-xs text-gray-400">Avg. Order</span>
            </div>
            <p className="text-xl font-bold">{formatCurrency(avgOrderValue, currency)}</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-amber-900/40 rounded-lg flex items-center justify-center">
                <Receipt size={16} className="text-amber-400" />
              </div>
              <span className="text-xs text-gray-400">Tax Total</span>
            </div>
            <p className="text-xl font-bold">{formatCurrency(taxTotal, currency)}</p>
          </div>
        </div>

        {/* Top products */}
        <div className="bg-gray-800/50 border border-gray-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-3">Top Products</h2>
          {topProducts.length === 0 ? (
            <p className="text-xs text-gray-500 py-4 text-center">No sales data for this period</p>
          ) : (
            <div className="space-y-2">
              {topProducts.map((p, i) => {
                const maxQty = topProducts[0].qty || 1;
                const pct = Math.round((p.qty / maxQty) * 100);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-5 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-white truncate">{p.name}</span>
                        <span className="text-xs text-gray-400 ml-2 shrink-0">
                          {p.qty} sold
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 w-20 text-right shrink-0">
                      {formatCurrency(p.revenue, currency)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payment breakdown */}
        <div className="bg-gray-800/50 border border-gray-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-3">Payment Breakdown</h2>
          {paymentBreakdown.length === 0 ? (
            <p className="text-xs text-gray-500 py-4 text-center">No payments for this period</p>
          ) : (
            <div className="space-y-2">
              {paymentBreakdown.map((p) => {
                const totalPayments = paymentBreakdown.reduce((s, x) => s + x.total, 0) || 1;
                const pct = Math.round((p.total / totalPayments) * 100);
                return (
                  <div key={p.type} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-xs text-white w-16">{p.type}</span>
                      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: p.type === "Cash" ? "#22c55e" : p.type === "Card" ? "#3b82f6" : "#a855f7",
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      <span className="text-xs text-white">{formatCurrency(p.total, currency)}</span>
                      <span className="text-[10px] text-gray-500 ml-1">({p.count})</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Hourly chart (single-day only) */}
        {hourlyData && (
          <div className="bg-gray-800/50 border border-gray-800 rounded-xl p-4">
            <h2 className="text-sm font-semibold mb-3">Orders by Hour</h2>
            {filteredOrders.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">No orders for this period</p>
            ) : (
              <div className="flex items-end gap-[3px] h-32">
                {hourlyData.map((h) => {
                  const heightPct = maxHourlyCount > 0 ? (h.count / maxHourlyCount) * 100 : 0;
                  return (
                    <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="w-full flex flex-col items-center justify-end h-24">
                        <div
                          className="w-full bg-blue-500 rounded-t transition-all min-h-[2px]"
                          style={{ height: `${Math.max(heightPct, 2)}%` }}
                        />
                      </div>
                      {h.hour % 3 === 0 && (
                        <span className="text-[9px] text-gray-500">
                          {h.hour.toString().padStart(2, "0")}
                        </span>
                      )}
                      {/* Tooltip */}
                      {h.count > 0 && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-700 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-10">
                          {h.count} order{h.count !== 1 ? "s" : ""} — {formatCurrency(h.revenue, currency)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Multi-day note (show simple summary instead of hourly chart) */}
        {!hourlyData && filteredOrders.length > 0 && (
          <div className="bg-gray-800/50 border border-gray-800 rounded-xl p-4">
            <h2 className="text-sm font-semibold mb-3">Daily Summary</h2>
            <p className="text-xs text-gray-400">
              {orderCount} orders totaling {formatCurrency(revenue, currency)} over {getDateRange(dateRange).label.toLowerCase()}.
              Hourly breakdown is available for single-day views.
            </p>
          </div>
        )}

        {/* Banner */}
        <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-4 flex items-center gap-3">
          <BarChart3 size={16} className="text-gray-500 shrink-0" />
          <p className="text-xs text-gray-500 flex-1">
            This is a simplified offline report based on local data.
          </p>
          <a
            href="https://web.posterita.com/reports"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition shrink-0"
          >
            Full Analytics
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      <PosBottomNav current="reports" />
    </div>
  );
}
