import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart } from "lucide-react";

export default function Orders() {
  const { data: orders, isLoading } = trpc.order.list.useQuery({ limit: 50 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
        <p className="text-muted-foreground text-sm mt-1">View and manage all transactions</p>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-primary" /> Order History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : orders && orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="text-left py-3 px-3">Order #</th><th className="text-left py-3 px-3">Channel</th><th className="text-right py-3 px-3">Total</th><th className="text-center py-3 px-3">Status</th><th className="text-right py-3 px-3">Date</th>
                </tr></thead>
                <tbody>
                  {orders.map((o: any) => (
                    <tr key={o.id} className="border-b border-border/40 hover:bg-secondary/30 transition-colors">
                      <td className="py-3 px-3 font-mono text-xs">{o.orderNumber}</td>
                      <td className="py-3 px-3"><span className="text-xs px-2 py-0.5 rounded-full bg-secondary">{o.channel}</span></td>
                      <td className="py-3 px-3 text-right font-medium">Rs {Number(o.totalAmount).toLocaleString()}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${o.status === 'completed' ? 'bg-green-500/20 text-green-400' : o.status === 'refunded' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{o.status}</span>
                      </td>
                      <td className="py-3 px-3 text-right text-muted-foreground text-xs">{new Date(o.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No orders yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
