"use client";

import { useEffect, useState } from "react";
import { dataQuery, dataQueryMulti } from "@/lib/supabase/data-client";
import { BarChart3, Calendar, Download, TrendingUp } from "lucide-react";
import { SkeletonStat, SkeletonTable } from "@/components/Skeleton";
import Breadcrumb from "@/components/Breadcrumb";

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState({ start: getLast30Days(), end: getToday() });
  const [salesData, setSalesData] = useState<any[]>([]);
  const [paymentData, setPaymentData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, [dateRange]);

  const fetchReports = async () => {
    setLoading(true);

    const [sales, payments, products] = await dataQueryMulti([
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
    ]);

    setSalesData(sales.data ?? []);
    setPaymentData(payments.data ?? []);
    setTopProducts(products.data ?? []);
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Daily Sales */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <TrendingUp size={18} className="text-posterita-blue" />
            <h2 className="font-semibold">Daily Sales</h2>
          </div>
          <div className="p-0 max-h-96 overflow-y-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th className="text-right">Orders</th>
                  <th className="text-right">Revenue</th>
                  <th className="text-right">Avg</th>
                </tr>
              </thead>
              <tbody>
                {salesData.map((d: any, i: number) => (
                  <tr key={i}>
                    <td>{d.sale_date}</td>
                    <td className="text-right text-gray-500">{d.total_orders}</td>
                    <td className="text-right font-medium">{formatCurrency(d.total_revenue)}</td>
                    <td className="text-right text-gray-500">{formatCurrency(d.avg_order_value)}</td>
                  </tr>
                ))}
                {salesData.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-gray-500 py-8">
                      No data for selected period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <BarChart3 size={18} className="text-posterita-blue" />
            <h2 className="font-semibold">Payment Methods</h2>
          </div>
          <div className="p-6 space-y-4">
            {Object.entries(paymentSummary).map(([type, amount]) => {
              const pct = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0;
              return (
                <div key={type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{type}</span>
                    <span className="text-gray-500">
                      {formatCurrency(amount)} ({pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-posterita-blue rounded-full h-2 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {Object.keys(paymentSummary).length === 0 && (
              <p className="text-center text-gray-500 py-8">
                No payment data for selected period
              </p>
            )}
          </div>
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
