import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Smartphone } from "lucide-react";

export default function Devices() {
  const { data: devices, isLoading } = trpc.device.list.useQuery();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Devices</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage POS terminals, tablets, and staff phones</p>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Smartphone className="h-4 w-4 text-primary" /> Registered Devices</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : devices && devices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="text-left py-3 px-3">Name</th><th className="text-left py-3 px-3">Type</th><th className="text-left py-3 px-3">Store</th><th className="text-center py-3 px-3">Status</th><th className="text-right py-3 px-3">Last Heartbeat</th>
                </tr></thead>
                <tbody>
                  {devices.map((d: any) => (
                    <tr key={d.id} className="border-b border-border/40 hover:bg-secondary/30 transition-colors">
                      <td className="py-3 px-3 font-medium">{d.deviceName}</td>
                      <td className="py-3 px-3"><span className="text-xs px-2 py-0.5 rounded-full bg-secondary">{d.deviceType}</span></td>
                      <td className="py-3 px-3 text-muted-foreground">Store #{d.storeId}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${d.status === 'active' ? 'bg-green-500/20 text-green-400' : d.status === 'revoked' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{d.status}</span>
                      </td>
                      <td className="py-3 px-3 text-right text-muted-foreground text-xs">{d.lastHeartbeat ? new Date(d.lastHeartbeat).toLocaleString() : "Never"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No devices registered. Use QR provisioning to add devices.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
