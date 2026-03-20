import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, ShoppingCart, Heart, MessageSquare } from "lucide-react";
import { useLocation, useParams } from "wouter";

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const customerId = Number(id);
  const { data: customer, isLoading } = trpc.customer.get.useQuery({ id: customerId });
  const { data: loyaltyAccount } = trpc.loyalty.getAccount.useQuery({ customerId });

  if (isLoading) return <div className="space-y-4 p-6">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  if (!customer) return <div className="p-6"><p className="text-muted-foreground">Customer not found</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/customers")}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{customer.firstName} {customer.lastName ?? ""}</h1>
          <p className="text-muted-foreground text-sm">{customer.email ?? customer.phone ?? "No contact info"}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Spent</p><p className="text-2xl font-bold mt-1">Rs {Number(customer.totalSpent ?? 0).toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground uppercase tracking-wider">Orders</p><p className="text-2xl font-bold mt-1">{customer.totalOrders ?? 0}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground uppercase tracking-wider">Loyalty Points</p><p className="text-2xl font-bold mt-1 text-primary">{loyaltyAccount?.pointsBalance ?? 0}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile"><User className="h-3.5 w-3.5 mr-1" /> Profile</TabsTrigger>
          <TabsTrigger value="orders"><ShoppingCart className="h-3.5 w-3.5 mr-1" /> Orders</TabsTrigger>
          <TabsTrigger value="loyalty"><Heart className="h-3.5 w-3.5 mr-1" /> Loyalty</TabsTrigger>
          <TabsTrigger value="whatsapp"><MessageSquare className="h-3.5 w-3.5 mr-1" /> WhatsApp</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader><CardTitle className="text-base">Customer Information</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-3 text-sm">
                <div className="flex justify-between py-2 border-b border-border/40"><span className="text-muted-foreground">Name</span><span className="font-medium">{customer.firstName} {customer.lastName ?? ""}</span></div>
                <div className="flex justify-between py-2 border-b border-border/40"><span className="text-muted-foreground">Email</span><span>{customer.email ?? "—"}</span></div>
                <div className="flex justify-between py-2 border-b border-border/40"><span className="text-muted-foreground">Phone</span><span>{customer.phone ?? "—"}</span></div>
                <div className="flex justify-between py-2 border-b border-border/40"><span className="text-muted-foreground">WhatsApp</span><span>{customer.whatsappPhone ?? "—"}</span></div>
                <div className="flex justify-between py-2 border-b border-border/40"><span className="text-muted-foreground">Date of Birth</span><span>{customer.dateOfBirth ? new Date(customer.dateOfBirth).toLocaleDateString() : "—"}</span></div>
                <div className="flex justify-between py-2"><span className="text-muted-foreground">Member Since</span><span>{new Date(customer.createdAt).toLocaleDateString()}</span></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader><CardTitle className="text-base">Purchase History</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground text-center py-8">Order history will appear here once linked to this customer.</p></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loyalty">
          <Card>
            <CardHeader><CardTitle className="text-base">Loyalty Account</CardTitle></CardHeader>
            <CardContent>
              {loyaltyAccount ? (
                <div className="grid gap-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-border/40"><span className="text-muted-foreground">Points Balance</span><span className="font-bold text-primary">{loyaltyAccount.pointsBalance}</span></div>
                  <div className="flex justify-between py-2 border-b border-border/40"><span className="text-muted-foreground">Lifetime Points</span><span>{loyaltyAccount.lifetimePoints}</span></div>
                  <div className="flex justify-between py-2"><span className="text-muted-foreground">Status</span><span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Active</span></div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No loyalty account linked yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp">
          <Card>
            <CardHeader><CardTitle className="text-base">WhatsApp Messages</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground text-center py-8">WhatsApp conversation history will appear here.</p></CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
