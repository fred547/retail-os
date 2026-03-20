import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList } from "lucide-react";

export default function TillSessions() {
  const { data, isLoading } = trpc.order.listTillSessions.useQuery({ limit: 50 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Till Sessions</h1>
        <p className="text-muted-foreground text-sm mt-1">Cash register sessions and reconciliation</p>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" /> Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : data && data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="text-left py-3 px-3">ID</th><th className="text-right py-3 px-3">Opening</th><th className="text-right py-3 px-3">Closing</th><th className="text-right py-3 px-3">Discrepancy</th><th className="text-center py-3 px-3">Status</th><th className="text-right py-3 px-3">Opened</th>
                </tr></thead>
                <tbody>
                  {data.map((s: any) => (
                    <tr key={s.id} className="border-b border-border/40 hover:bg-secondary/30 transition-colors">
                      <td className="py-3 px-3 font-mono text-xs">#{s.id}</td>
                      <td className="py-3 px-3 text-right">Rs {Number(s.openingBalance).toLocaleString()}</td>
                      <td className="py-3 px-3 text-right">{s.closingBalance ? `Rs ${Number(s.closingBalance).toLocaleString()}` : "—"}</td>
                      <td className={`py-3 px-3 text-right ${Number(s.discrepancy ?? 0) !== 0 ? "text-destructive font-bold" : ""}`}>{s.discrepancy ? `Rs ${Number(s.discrepancy).toLocaleString()}` : "—"}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${s.status === 'open' ? 'bg-green-500/20 text-green-400' : s.status === 'closed' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}`}>{s.status}</span>
                      </td>
                      <td className="py-3 px-3 text-right text-muted-foreground text-xs">{new Date(s.openedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No till sessions yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
