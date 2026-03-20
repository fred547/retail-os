import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, TrendingUp, DollarSign, ShoppingCart } from "lucide-react";

export default function Analytics() {
  const { data, isLoading } = trpc.analytics.dashboard.useQuery();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Business intelligence and performance insights</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<DollarSign className="h-4 w-4" />} title="Revenue" value={isLoading ? undefined : `Rs ${Number(data?.sales?.totalRevenue ?? 0).toLocaleString()}`} />
        <StatCard icon={<ShoppingCart className="h-4 w-4" />} title="Orders" value={isLoading ? undefined : String(data?.sales?.totalOrders ?? 0)} />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} title="Avg Order" value={isLoading ? undefined : `Rs ${Number(data?.sales?.avgOrderValue ?? 0).toFixed(0)}`} />
        <StatCard icon={<BarChart3 className="h-4 w-4" />} title="Products" value={isLoading ? undefined : String(data?.productCount ?? 0)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Top Selling Products</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : data?.topProducts && data.topProducts.length > 0 ? (
              <div className="space-y-3">
                {data.topProducts.map((p: any, idx: number) => {
                  const maxRev = Math.max(...data.topProducts.map((x: any) => Number(x.totalRevenue)));
                  const pct = maxRev > 0 ? (Number(p.totalRevenue) / maxRev) * 100 : 0;
                  return (
                    <div key={p.productId}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium">{idx + 1}. {p.productName}</span>
                        <span className="text-muted-foreground">Rs {Number(p.totalRevenue).toLocaleString()}</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No sales data yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Customer Insights</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="p-4 rounded-lg bg-secondary/30">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Customers</p>
                <p className="text-3xl font-bold mt-1">{isLoading ? <Skeleton className="h-9 w-20 inline-block" /> : data?.customerCount ?? 0}</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Low Stock Items</p>
                <p className={`text-3xl font-bold mt-1 ${Number(data?.lowStockCount ?? 0) > 0 ? "text-destructive" : ""}`}>
                  {isLoading ? <Skeleton className="h-9 w-20 inline-block" /> : data?.lowStockCount ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value }: { icon: React.ReactNode; title: string; value?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{title}</p>
          <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
        </div>
        {value === undefined ? <Skeleton className="h-8 w-24 mt-2" /> : <p className="text-2xl font-bold mt-2">{value}</p>}
      </CardContent>
    </Card>
  );
}
