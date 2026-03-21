import { createServerSupabase, createServerSupabaseAdmin } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isSuperAdmin } from "@/lib/super-admin";
import { getSessionAccountId } from "@/lib/account-context";
import Link from "next/link";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
  Monitor,
  Loader2,
  RefreshCw,
  ArrowRight,
} from "lucide-react";

// Revalidate dashboard data every 60 seconds (ISR)
export const dynamic = "force-dynamic";

async function getDashboardData(accountId: string) {
  const supabase = await createServerSupabaseAdmin();

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000)
    .toISOString()
    .split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
    .toISOString()
    .split("T")[0];
  const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000)
    .toISOString()
    .split("T")[0];

  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

  // Run all queries in parallel — all scoped to account_id
  const [
    { data: todaySales },
    { data: yesterdaySales },
    { data: prevMonthlySales },
    { data: monthlySales },
    { count: priceReviewCount },
    { count: unsyncedCount },
    { data: conflictProducts },
    { data: staleTerminals },
    { data: topProducts },
    { data: recentOrders },
    { count: pendingReviewCount },
    { count: intakeReadyCount },
  ] = await Promise.all([
    supabase.from("v_daily_sales").select("*").eq("account_id", accountId).eq("sale_date", today),
    supabase.from("v_daily_sales").select("*").eq("account_id", accountId).eq("sale_date", yesterday),
    supabase.from("v_daily_sales").select("*").eq("account_id", accountId).gte("sale_date", sixtyDaysAgo).lt("sale_date", thirtyDaysAgo),
    supabase.from("v_daily_sales").select("*").eq("account_id", accountId).gte("sale_date", thirtyDaysAgo).order("sale_date", { ascending: true }),
    supabase.from("product").select("product_id", { count: "exact", head: true }).eq("account_id", accountId).eq("needs_price_review", "Y").eq("isactive", "Y"),
    supabase.from("orders").select("order_id", { count: "exact", head: true }).eq("account_id", accountId).eq("is_sync", false),
    supabase.from("product").select("product_id, name, sellingprice, needs_price_review, price_set_by").eq("account_id", accountId).eq("needs_price_review", "Y").eq("isactive", "Y").limit(5),
    supabase.from("terminal").select("terminal_id, name, store_id").eq("account_id", accountId).lt("updated_at", oneHourAgo).eq("isactive", "Y"),
    supabase.from("v_top_products").select("*").eq("account_id", accountId).order("total_revenue", { ascending: false }).limit(10),
    supabase.from("orders").select("order_id, document_no, grand_total, date_ordered, order_type, is_paid").eq("account_id", accountId).order("date_ordered", { ascending: false }).limit(10),
    supabase.from("product").select("product_id", { count: "exact", head: true }).eq("account_id", accountId).eq("product_status", "review").eq("isactive", "Y"),
    supabase.from("intake_batch").select("batch_id", { count: "exact", head: true }).eq("account_id", accountId).or("status.eq.ready,status.eq.in_review"),
  ]);

  return {
    todaySales: todaySales ?? [],
    yesterdaySales: yesterdaySales ?? [],
    monthlySales: monthlySales ?? [],
    prevMonthlySales: prevMonthlySales ?? [],
    priceReviewCount: priceReviewCount ?? 0,
    unsyncedCount: unsyncedCount ?? 0,
    conflictProducts: conflictProducts ?? [],
    staleTerminals: staleTerminals ?? [],
    topProducts: topProducts ?? [],
    recentOrders: recentOrders ?? [],
    pendingReviewCount: pendingReviewCount ?? 0,
    intakeReadyCount: intakeReadyCount ?? 0,
  };
}

export default async function DashboardPage() {
  // Super admins without impersonation should go to /platform
  const superAdmin = await isSuperAdmin();
  if (superAdmin) {
    // Check if they have an active impersonation session
    const supabaseCheck = await createServerSupabase();
    const { data: { user } } = await supabaseCheck.auth.getUser();
    if (user) {
      const { createServerSupabaseAdmin } = await import("@/lib/supabase/server");
      const admin = await createServerSupabaseAdmin();
      const { data: sa } = await admin
        .from("super_admin")
        .select("id")
        .eq("auth_uid", user.id)
        .single();
      if (sa) {
        const { data: session } = await admin
          .from("super_admin_session")
          .select("account_id")
          .eq("super_admin_id", sa.id)
          .limit(1)
          .single();
        if (!session) {
          redirect("/manager/platform");
        }
      }
    }
  }

  const accountId = await getSessionAccountId();
  if (!accountId) redirect("/manager/platform");

  const data = await getDashboardData(accountId);

  // Aggregate today's totals across stores
  const todayRevenue = data.todaySales.reduce(
    (sum: number, s: any) => sum + (s.total_revenue ?? 0),
    0
  );
  const todayOrders = data.todaySales.reduce(
    (sum: number, s: any) => sum + (s.total_orders ?? 0),
    0
  );
  const todayItems = data.todaySales.reduce(
    (sum: number, s: any) => sum + (s.total_items ?? 0),
    0
  );
  const avgOrderValue = todayOrders > 0 ? todayRevenue / todayOrders : 0;

  // Yesterday's aggregates (for trend comparison)
  const yesterdayRevenue = data.yesterdaySales.reduce(
    (sum: number, s: any) => sum + (s.total_revenue ?? 0),
    0
  );
  const yesterdayOrders = data.yesterdaySales.reduce(
    (sum: number, s: any) => sum + (s.total_orders ?? 0),
    0
  );
  const yesterdayAvgOrder =
    yesterdayOrders > 0 ? yesterdayRevenue / yesterdayOrders : 0;

  // Monthly total
  const monthlyRevenue = data.monthlySales.reduce(
    (sum: number, s: any) => sum + (s.total_revenue ?? 0),
    0
  );

  // Previous 30-day total (for monthly trend)
  const prevMonthlyRevenue = data.prevMonthlySales.reduce(
    (sum: number, s: any) => sum + (s.total_revenue ?? 0),
    0
  );

  // Calculate trends
  const revenueTrend = calcTrend(todayRevenue, yesterdayRevenue, data.yesterdaySales.length > 0);
  const ordersTrend = calcTrend(todayOrders, yesterdayOrders, data.yesterdaySales.length > 0);
  const avgOrderTrend = calcTrend(avgOrderValue, yesterdayAvgOrder, yesterdayOrders > 0);
  const monthlyTrend = calcTrend(monthlyRevenue, prevMonthlyRevenue, data.prevMonthlySales.length > 0);

  // Check if this is a fresh account with no data yet
  const hasData =
    data.todaySales.length > 0 ||
    data.monthlySales.length > 0 ||
    data.recentOrders.length > 0 ||
    data.topProducts.length > 0;

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="bg-blue-50 p-6 rounded-full mb-6">
          <Loader2 size={48} className="text-posterita-blue animate-spin" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          Waiting for your first sync
        </h1>
        <p className="text-gray-500 mt-3 max-w-md">
          Your dashboard will come alive once your POS terminals start syncing
          data. Open the Posterita app on your Android device and complete a sale
          to get started.
        </p>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="font-semibold text-gray-800">1. Open POS App</div>
            <p className="text-gray-500 mt-1">Launch Posterita on your device</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="font-semibold text-gray-800">2. Make a Sale</div>
            <p className="text-gray-500 mt-1">Process your first transaction</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="font-semibold text-gray-800">3. Auto-Sync</div>
            <p className="text-gray-500 mt-1">Data syncs every 5 minutes</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Overview of your POS performance
        </p>
      </div>

      {/* Alerts — actionable notifications with links to resolve */}
      {(data.intakeReadyCount > 0 || data.pendingReviewCount > 0 || data.priceReviewCount > 0 || data.unsyncedCount > 0 || data.conflictProducts.length > 0 || data.staleTerminals.length > 0) && (
        <div className="space-y-3">
          {data.intakeReadyCount > 0 && (
            <Link href="/customer/intake" className="block">
              <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-4 text-sm text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={20} />
                  <div>
                    <span className="font-semibold">{data.intakeReadyCount} intake batch{data.intakeReadyCount !== 1 ? "es" : ""} ready for review</span>
                    <p className="text-indigo-600 text-xs mt-0.5">Imported products need your review before going live on the POS</p>
                  </div>
                </div>
                <ArrowRight size={18} className="text-indigo-400" />
              </div>
            </Link>
          )}

          {data.pendingReviewCount > 0 && (
            <Link href="/customer/products?status=review" className="block">
              <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-xl px-5 py-4 text-sm text-purple-700 hover:bg-purple-100 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={20} />
                  <div>
                    <span className="font-semibold">{data.pendingReviewCount} product{data.pendingReviewCount !== 1 ? "s" : ""} waiting for review</span>
                    <p className="text-purple-600 text-xs mt-0.5">AI-imported products need your approval before they appear on the POS</p>
                  </div>
                </div>
                <ArrowRight size={18} className="text-purple-400" />
              </div>
            </Link>
          )}

          {data.priceReviewCount > 0 && (
            <Link href="/customer/products?filter=price_review" className="block">
              <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-5 py-4 text-sm text-orange-700 hover:bg-orange-100 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={20} />
                  <div>
                    <span className="font-semibold">{data.priceReviewCount} product{data.priceReviewCount !== 1 ? "s" : ""} need price review</span>
                    <p className="text-orange-600 text-xs mt-0.5">Staff-set prices awaiting owner approval</p>
                  </div>
                </div>
                <ArrowRight size={18} className="text-orange-400" />
              </div>
            </Link>
          )}

          {data.conflictProducts.length > 0 && (
            <Link href="/products?filter=price_review" className="block">
              <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700 hover:bg-red-100 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <RefreshCw size={20} />
                  <div>
                    <span className="font-semibold">Sync conflicts detected</span>
                    <p className="text-red-600 text-xs mt-0.5">
                      {data.conflictProducts.slice(0, 3).map((p: any) => p.name).join(", ")}
                      {data.conflictProducts.length > 3 ? ` and ${data.conflictProducts.length - 3} more` : ""}
                    </p>
                  </div>
                </div>
                <ArrowRight size={18} className="text-red-400" />
              </div>
            </Link>
          )}

          {data.unsyncedCount > 0 && (
            <Link href="/customer/orders" className="block">
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 text-sm text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <Monitor size={20} />
                  <div>
                    <span className="font-semibold">{data.unsyncedCount} order{data.unsyncedCount !== 1 ? "s" : ""} pending sync</span>
                    <p className="text-blue-600 text-xs mt-0.5">These orders have not been confirmed by the POS terminal</p>
                  </div>
                </div>
                <ArrowRight size={18} className="text-blue-400" />
              </div>
            </Link>
          )}

          {data.staleTerminals.length > 0 && (
            <Link href="/customer/terminals" className="block">
              <div className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-4 text-sm text-yellow-700 hover:bg-yellow-100 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={20} />
                  <div>
                    <span className="font-semibold">{data.staleTerminals.length} terminal{data.staleTerminals.length !== 1 ? "s" : ""} not syncing</span>
                    <p className="text-yellow-600 text-xs mt-0.5">
                      {data.staleTerminals.slice(0, 3).map((t: any) => t.name || `Terminal ${t.terminal_id}`).join(", ")}
                      {" "}&mdash; last sync over 1 hour ago
                    </p>
                  </div>
                </div>
                <ArrowRight size={18} className="text-yellow-400" />
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Today's Revenue"
          value={formatCurrency(todayRevenue)}
          icon={<DollarSign className="text-green-600" size={24} />}
          bgColor="bg-green-50"
          trend={revenueTrend}
          trendLabel="vs yesterday"
        />
        <StatCard
          title="Today's Orders"
          value={todayOrders.toString()}
          icon={<ShoppingCart className="text-blue-600" size={24} />}
          bgColor="bg-blue-50"
          trend={ordersTrend}
          trendLabel="vs yesterday"
        />
        <StatCard
          title="Avg Order Value"
          value={formatCurrency(avgOrderValue)}
          icon={<TrendingUp className="text-purple-600" size={24} />}
          bgColor="bg-purple-50"
          trend={avgOrderTrend}
          trendLabel="vs yesterday"
        />
        <StatCard
          title="30-Day Revenue"
          value={formatCurrency(monthlyRevenue)}
          icon={<Users className="text-orange-600" size={24} />}
          bgColor="bg-orange-50"
          trend={monthlyTrend}
          trendLabel="vs prev 30 days"
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Products */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Top Products</h2>
          </div>
          <div className="p-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="text-right">Qty Sold</th>
                  <th className="text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.topProducts.map((p: any) => (
                  <tr key={p.product_id}>
                    <td className="font-medium">{p.productname}</td>
                    <td className="text-right text-gray-500">
                      {p.total_qty}
                    </td>
                    <td className="text-right font-medium">
                      {formatCurrency(p.total_revenue)}
                    </td>
                  </tr>
                ))}
                {data.topProducts.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-gray-500 py-8">
                      No sales data yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Orders</h2>
          </div>
          <div className="p-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Type</th>
                  <th className="text-right">Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((o: any) => (
                  <tr key={o.order_id}>
                    <td className="font-medium">
                      {o.document_no || `#${o.order_id}`}
                    </td>
                    <td className="text-gray-500">{o.order_type ?? "Sale"}</td>
                    <td className="text-right font-medium">
                      {formatCurrency(o.grand_total)}
                    </td>
                    <td>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          o.is_paid
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {o.is_paid ? "Paid" : "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
                {data.recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-gray-500 py-8">
                      No orders yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

type Trend = {
  value: number;
  direction: "up" | "down" | "neutral";
  isNew?: boolean;
} | null;

function calcTrend(
  current: number,
  previous: number,
  hasPreviousData: boolean
): Trend {
  if (!hasPreviousData) return null;
  if (previous === 0 && current > 0) return { value: 0, direction: "up", isNew: true };
  if (previous === 0 && current === 0) return { value: 0, direction: "neutral" };
  const pct = ((current - previous) / previous) * 100;
  const direction = pct > 0 ? "up" : pct < 0 ? "down" : "neutral";
  return { value: Math.abs(pct), direction };
}

function StatCard({
  title,
  value,
  icon,
  bgColor,
  trend,
  trendLabel,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  bgColor: string;
  trend?: Trend;
  trendLabel?: string;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-1.5">
              {trend.isNew ? (
                <span className="text-xs font-medium text-green-600">New</span>
              ) : trend.direction === "neutral" ? (
                <span className="text-xs text-gray-400">0%</span>
              ) : (
                <>
                  {trend.direction === "up" ? (
                    <TrendingUp size={14} className="text-green-600" />
                  ) : (
                    <TrendingDown size={14} className="text-red-600" />
                  )}
                  <span
                    className={`text-xs font-medium ${
                      trend.direction === "up"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {trend.direction === "up" ? "+" : "-"}
                    {trend.value.toFixed(1)}%
                  </span>
                </>
              )}
              {trendLabel && (
                <span className="text-xs text-gray-400 ml-0.5">
                  {trendLabel}
                </span>
              )}
            </div>
          )}
        </div>
        <div className={`${bgColor} p-3 rounded-xl`}>{icon}</div>
      </div>
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "MUR",
    minimumFractionDigits: 2,
  }).format(amount);
}
