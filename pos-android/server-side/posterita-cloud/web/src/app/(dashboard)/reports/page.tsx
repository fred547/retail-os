"use client";

import { useEffect, useState } from "react";
import { dataQuery, dataQueryMulti } from "@/lib/supabase/data-client";
import { BarChart3, Calendar, Download, TrendingUp, FileText } from "lucide-react";
import Link from "next/link";
import { SkeletonStat, SkeletonTable } from "@/components/Skeleton";
import Breadcrumb from "@/components/Breadcrumb";
import { logError } from "@/lib/error-logger";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";

const COLORS = ["#1976D2", "#2E7D32", "#5E35B1", "#F57F17", "#00838F", "#E53935", "#FF6F00", "#AD1457"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState({ start: getLast30Days(), end: getToday() });
  const [salesData, setSalesData] = useState<any[]>([]);
  const [paymentData, setPaymentData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, [dateRange]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [sales, payments, products, hourly] = await dataQueryMulti([
        {
          table: "v_daily_sales",
          filters: [
            { column: "sale_date", op: "gte", value: dateRange.start },
            { column: "sale_date", op: "lte", value: dateRange.end },
          ],
          order: { column: "sale_date" },
        },
        {
          table: "v_payment_methods",
          filters: [
            { column: "payment_date", op: "gte", value: dateRange.start },
            { column: "payment_date", op: "lte", value: dateRange.end },
          ],
        },
        {
          table: "v_top_products",
          order: { column: "total_revenue", ascending: false },
          limit: 20,
        },
        {
          table: "v_hourly_sales",
        },
      ]);

      setSalesData(sales.data ?? []);
      setPaymentData(payments.data ?? []);
      setTopProducts(products.data ?? []);
      setHourlyData(hourly.data ?? []);
    } catch (e: any) {
      logError("Reports", `Failed to load reports: ${e.message}`);
    }
    setLoading(false);
  };

  // Aggregate stats
  const totalRevenue = salesData.reduce((s, d) => s + (d.total_revenue ?? 0), 0);
  const totalOrders = salesData.reduce((s, d) => s + (d.total_orders ?? 0), 0);
  const totalTax = salesData.reduce((s, d) => s + (d.total_tax ?? 0), 0);
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Payment method aggregation
  const paymentSummary: Record<string, number> = {};
  paymentData.forEach((p: any) => {
    const type = p.payment_type ?? "Unknown";
    paymentSummary[type] = (paymentSummary[type] ?? 0) + (p.total_amount ?? 0);
  });

  const exportCSV = () => {
    const headers = "Date,Orders,Revenue,Tax,Avg Order\n";
    const rows = salesData
      .map(
        (d: any) =>
          `${d.sale_date},${d.total_orders},${d.total_revenue?.toFixed(2)},${d.total_tax?.toFixed(2)},${d.avg_order_value?.toFixed(2)}`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report-${dateRange.start}-to-${dateRange.end}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Reports" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 mt-1">Sales analytics and insights</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3">
            <Calendar size={16} className="text-gray-400" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange({ ...dateRange, start: e.target.value })
              }
              className="py-2 text-sm outline-none"
            />
            <span className="text-gray-400">—</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange({ ...dateRange, end: e.target.value })
              }
              className="py-2 text-sm outline-none"
            />
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 bg-gray-100 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Quick links */}
      <div className="flex gap-3">
        <Link
          href="/customer/reports/z-report"
          className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2.5 hover:border-posterita-blue hover:bg-blue-50/50 transition text-sm"
        >
          <FileText size={16} className="text-posterita-blue" />
          <span className="font-medium">Z-Report</span>
          <span className="text-gray-400">End-of-day summary</span>
        </Link>
      </div>

      {loading ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonStat key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <SkeletonTable rows={8} columns={4} />
            <SkeletonTable rows={5} columns={2} />
          </div>
          <SkeletonTable rows={10} columns={5} />
        </>
      ) : (
        <>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <SummaryCard title="Total Revenue" value={formatCurrency(totalRevenue)} />
        <SummaryCard title="Total Orders" value={totalOrders.toString()} />
        <SummaryCard title="Total Tax" value={formatCurrency(totalTax)} />
        <SummaryCard title="Avg Order Value" value={formatCurrency(avgOrder)} />
      </div>

      {/* Revenue Chart (full width) */}
      {salesData.length >= 2 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-posterita-blue" />
            <h2 className="font-semibold">Daily Revenue</h2>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={salesData.map((d: any) => ({
              date: fmtDate(d.sale_date),
              revenue: d.total_revenue,
              orders: d.total_orders,
            }))} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="reportRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1976D2" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1976D2" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E6E2DA" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6C6F76" }} tickLine={false} axisLine={false}
                interval={Math.max(0, Math.floor(salesData.length / 8) - 1)} />
              <YAxis tick={{ fontSize: 11, fill: "#6C6F76" }} tickLine={false} axisLine={false}
                tickFormatter={fmtNum} width={50} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E6E2DA", fontSize: 13 }}
                formatter={(v: number, name: string) => [formatCurrency(v), name === "revenue" ? "Revenue" : "Orders"]} />
              <Area type="monotone" dataKey="revenue" stroke="#1976D2" strokeWidth={2.5}
                fill="url(#reportRevGrad)" dot={false}
                activeDot={{ r: 5, strokeWidth: 2, fill: "#fff", stroke: "#1976D2" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Payment Methods — Donut Chart */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-posterita-blue" />
            <h2 className="font-semibold">Payment Methods</h2>
          </div>
          {Object.keys(paymentSummary).length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={Object.entries(paymentSummary).map(([name, value]) => ({ name, value }))}
                    cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}
                    dataKey="value" stroke="none">
                    {Object.keys(paymentSummary).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E6E2DA", fontSize: 13 }}
                    formatter={(v: number) => [formatCurrency(v), "Amount"]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {Object.entries(paymentSummary).map(([type, amount], i) => {
                  const pct = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0;
                  return (
                    <div key={type} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="font-medium flex-1">{type}</span>
                      <span className="text-gray-500">{pct.toFixed(0)}%</span>
                      <span className="text-gray-400 w-24 text-right">{formatCurrency(amount)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-12">No payment data for selected period</p>
          )}
        </div>

        {/* Hourly Heatmap */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-posterita-blue" />
            <h2 className="font-semibold">Busiest Hours</h2>
          </div>
          {hourlyData.length > 0 ? (
            <HourlyHeatmap data={hourlyData} />
          ) : (
            <p className="text-center text-gray-500 py-12">No hourly data yet</p>
          )}
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold">Top 20 Products by Revenue</h2>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Product</th>
              <th className="text-right">Qty Sold</th>
              <th className="text-right">Orders</th>
              <th className="text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {topProducts.map((p: any, i: number) => (
              <tr key={p.product_id}>
                <td className="text-gray-500">{i + 1}</td>
                <td className="font-medium">{p.productname}</td>
                <td className="text-right text-gray-500">{p.total_qty}</td>
                <td className="text-right text-gray-500">{p.order_count}</td>
                <td className="text-right font-bold">{formatCurrency(p.total_revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="stat-card">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
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

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function getLast30Days(): string {
  return new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
}

function fmtDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtNum(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toFixed(0);
}

/**
 * 7×24 heatmap grid showing order volume by day-of-week × hour.
 * Darker blue = more orders. Hover shows exact count + revenue.
 */
function HourlyHeatmap({ data }: { data: any[] }) {
  // Build lookup: [day][hour] → { orders, revenue }
  const grid: Record<number, Record<number, { orders: number; revenue: number }>> = {};
  let maxOrders = 1;
  data.forEach((d: any) => {
    const day = d.day_of_week ?? 0;
    const hour = d.hour_of_day ?? 0;
    if (!grid[day]) grid[day] = {};
    grid[day][hour] = { orders: d.order_count ?? 0, revenue: d.total_revenue ?? 0 };
    if ((d.order_count ?? 0) > maxOrders) maxOrders = d.order_count;
  });

  // Show hours 6-23 (business hours)
  const hours = Array.from({ length: 18 }, (_, i) => i + 6);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[400px]">
        {/* Hour labels */}
        <div className="flex ml-10 mb-1">
          {hours.map((h) => (
            <div key={h} className="flex-1 text-center text-[10px] text-gray-400">
              {h === 6 ? "6a" : h === 12 ? "12p" : h === 18 ? "6p" : h % 3 === 0 ? `${h > 12 ? h - 12 : h}` : ""}
            </div>
          ))}
        </div>
        {/* Rows */}
        {[1, 2, 3, 4, 5, 6, 0].map((day) => (
          <div key={day} className="flex items-center gap-1 mb-1">
            <div className="w-9 text-right text-[11px] text-gray-500 font-medium pr-1">{DAYS[day]}</div>
            {hours.map((hour) => {
              const cell = grid[day]?.[hour];
              const orders = cell?.orders ?? 0;
              const intensity = orders / maxOrders;
              const bg = orders === 0
                ? "#F5F2EA"
                : `rgba(25, 118, 210, ${0.15 + intensity * 0.75})`;
              return (
                <div
                  key={hour}
                  className="flex-1 aspect-square rounded-sm cursor-default"
                  style={{ backgroundColor: bg, minWidth: 14, maxWidth: 22 }}
                  title={`${DAYS[day]} ${hour}:00 — ${orders} orders${cell ? `, ${formatCurrency(cell.revenue)}` : ""}`}
                />
              );
            })}
          </div>
        ))}
        {/* Legend */}
        <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-gray-400">
          <span>Less</span>
          {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
            <div key={i} className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: v === 0 ? "#F5F2EA" : `rgba(25, 118, 210, ${0.15 + v * 0.75})` }} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
