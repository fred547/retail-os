"use client";

import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";

interface DailySale {
  sale_date: string;
  total_revenue: number;
  total_orders: number;
}

interface TopProduct {
  product_id: number;
  productname: string;
  total_qty: number;
  total_revenue: number;
}

const COLORS = [
  "#1976D2", "#2E7D32", "#5E35B1", "#F57F17", "#00838F",
  "#E53935", "#FF6F00", "#AD1457", "#5D4037", "#546E7A",
];

function fmtCurrency(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toFixed(0);
}

function fmtDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function RevenueTrendChart({ data }: { data: DailySale[] }) {
  if (data.length < 2) return null;

  const chartData = data.map((d) => ({
    date: fmtDate(d.sale_date),
    revenue: d.total_revenue,
    orders: d.total_orders,
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h2 className="font-semibold text-gray-900 mb-4">Revenue Trend (30 days)</h2>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1976D2" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#1976D2" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E6E2DA" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#6C6F76" }}
            tickLine={false}
            axisLine={false}
            interval={Math.max(0, Math.floor(chartData.length / 7) - 1)}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#6C6F76" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={fmtCurrency}
            width={50}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 10,
              border: "1px solid #E6E2DA",
              fontSize: 13,
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
            formatter={(value: number) => [
              new Intl.NumberFormat("en-US", { style: "currency", currency: "MUR" }).format(value),
              "Revenue",
            ]}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#1976D2"
            strokeWidth={2.5}
            fill="url(#revGrad)"
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, fill: "#fff", stroke: "#1976D2" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopProductsChart({ data }: { data: TopProduct[] }) {
  if (data.length === 0) return null;

  const chartData = data.slice(0, 8).map((p) => ({
    name: (p.productname || "").length > 18
      ? p.productname.substring(0, 16) + "…"
      : p.productname,
    revenue: p.total_revenue,
    fullName: p.productname,
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h2 className="font-semibold text-gray-900 mb-4">Top Products by Revenue</h2>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E6E2DA" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "#6C6F76" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={fmtCurrency}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: "#141414" }}
            tickLine={false}
            axisLine={false}
            width={120}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 10,
              border: "1px solid #E6E2DA",
              fontSize: 13,
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
            formatter={(value: number) => [
              new Intl.NumberFormat("en-US", { style: "currency", currency: "MUR" }).format(value),
              "Revenue",
            ]}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ""}
          />
          <Bar dataKey="revenue" radius={[0, 6, 6, 0]} barSize={24}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
