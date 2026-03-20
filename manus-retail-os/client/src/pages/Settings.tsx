import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import { Settings, User, Store, Bell } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">System configuration and preferences</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Account</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 text-sm">
              <div className="flex justify-between py-2 border-b border-border/40"><span className="text-muted-foreground">Name</span><span className="font-medium">{user?.name ?? "—"}</span></div>
              <div className="flex justify-between py-2 border-b border-border/40"><span className="text-muted-foreground">Email</span><span>{user?.email ?? "—"}</span></div>
              <div className="flex justify-between py-2"><span className="text-muted-foreground">Role</span><span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">{user?.role ?? "user"}</span></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Store className="h-4 w-4 text-primary" /> General</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 text-sm">
              <div className="flex justify-between py-2 border-b border-border/40"><span className="text-muted-foreground">Currency</span><span className="font-medium">MUR (Rs)</span></div>
              <div className="flex justify-between py-2 border-b border-border/40"><span className="text-muted-foreground">Timezone</span><span>Indian/Mauritius (UTC+4)</span></div>
              <div className="flex justify-between py-2"><span className="text-muted-foreground">Tax Rate</span><span>15% VAT</span></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /> Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Configure low-stock alerts, loyalty milestone notifications, and WhatsApp automation triggers.</p>
            <p className="text-xs text-muted-foreground mt-3 italic">Feature coming soon</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Settings className="h-4 w-4 text-primary" /> Integrations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Manage WhatsApp Business API, payment gateways, and third-party integrations.</p>
            <p className="text-xs text-muted-foreground mt-3 italic">Feature coming soon</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
