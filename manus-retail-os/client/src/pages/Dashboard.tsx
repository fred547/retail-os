import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Package, Users, AlertTriangle, ShoppingCart, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const { data, isLoading } = trpc.analytics.dashboard.useQuery();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of your retail operations</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Revenue"
          value={isLoading ? undefined : `Rs ${Number(data?.sales?.totalRevenue ?? 0).toLocaleString()}`}
          icon={<DollarSign className="h-4 w-4" />}
          subtitle="Completed orders"
        />
        <KpiCard
          title="Total Orders"
          value={isLoading ? undefined : String(data?.sales?.totalOrders ?? 0)}
          icon={<ShoppingCart className="h-4 w-4" />}
          subtitle="All time"
        />
        <KpiCard
          title="Customers"
          value={isLoading ? undefined : String(data?.customerCount ?? 0)}
          icon={<Users className="h-4 w-4" />}
          subtitle="Registered customers"
        />
        <KpiCard
          title="Low Stock Alerts"
          value={isLoading ? undefined : String(data?.lowStockCount ?? 0)}
          icon={<AlertTriangle className="h-4 w-4" />}
          subtitle="Items below reorder level"
          alert={Number(data?.lowStockCount ?? 0) > 0}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Orders */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              Recent Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : data?.recentOrders && data.recentOrders.length > 0 ? (
              <div className="space-y-2">
                {data.recentOrders.map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30">
                    <div>
                      <p className="text-sm font-medium">{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">Rs {Number(order.totalAmount).toLocaleString()}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${order.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No orders yet</p>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Top Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : data?.topProducts && data.topProducts.length > 0 ? (
              <div className="space-y-2">
                {data.topProducts.map((p: any, idx: number) => (
                  <div key={p.productId} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-5">#{idx + 1}</span>
                      <p className="text-sm font-medium">{p.productName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">Rs {Number(p.totalRevenue).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{p.totalQuantity} sold</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No sales data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <KpiCard
          title="Active Products"
          value={isLoading ? undefined : String(data?.productCount ?? 0)}
          icon={<Package className="h-4 w-4" />}
          subtitle="In catalog"
        />
        <KpiCard
          title="Avg Order Value"
          value={isLoading ? undefined : `Rs ${Number(data?.sales?.avgOrderValue ?? 0).toFixed(0)}`}
          icon={<TrendingUp className="h-4 w-4" />}
          subtitle="Completed orders"
        />
      </div>
    </div>
  );
}

function KpiCard({ title, value, icon, subtitle, alert }: { title: string; value?: string; icon: React.ReactNode; subtitle: string; alert?: boolean }) {
  return (
    <Card className={alert ? "border-destructive/40" : ""}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`p-2 rounded-lg ${alert ? "bg-destructive/20 text-destructive" : "bg-primary/10 text-primary"}`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        {value === undefined ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className="text-2xl font-bold">{value}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
