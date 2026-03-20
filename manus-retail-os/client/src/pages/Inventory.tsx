import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Layers, AlertTriangle } from "lucide-react";

export default function Inventory() {
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const { data, isLoading } = trpc.inventory.listInventoryLevels.useQuery({ lowStockOnly });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
        <p className="text-muted-foreground text-sm mt-1">Track stock levels across warehouses</p>
      </div>

      <div className="flex items-center gap-3">
        <Switch id="low-stock" checked={lowStockOnly} onCheckedChange={setLowStockOnly} />
        <Label htmlFor="low-stock" className="text-sm flex items-center gap-1">
          <AlertTriangle className="h-3.5 w-3.5 text-destructive" /> Show low stock only
        </Label>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /> Stock Levels</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : data && data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="text-left py-3 px-3">Product</th><th className="text-right py-3 px-3">Qty</th><th className="text-right py-3 px-3">Reorder Level</th><th className="text-center py-3 px-3">Status</th>
                </tr></thead>
                <tbody>
                  {data.map((row: any) => {
                    const isLow = row.inventory.quantity <= (row.inventory.reorderLevel ?? 10);
                    return (
                      <tr key={row.inventory.id} className="border-b border-border/40 hover:bg-secondary/30 transition-colors">
                        <td className="py-3 px-3 font-medium">{row.product?.name ?? `Product #${row.inventory.productId}`}</td>
                        <td className={`py-3 px-3 text-right font-mono ${isLow ? "text-destructive font-bold" : ""}`}>{row.inventory.quantity}</td>
                        <td className="py-3 px-3 text-right text-muted-foreground">{row.inventory.reorderLevel}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isLow ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}>
                            {isLow ? "Low Stock" : "OK"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No inventory data yet. Add products and stock to get started.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
