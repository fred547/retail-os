import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Customers() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [, setLocation] = useLocation();
  const searchInput = useMemo(() => search, [search]);
  const { data: customers, isLoading, refetch } = trpc.customer.list.useQuery({ search: searchInput, limit: 100 });
  const createCustomer = trpc.customer.create.useMutation({
    onSuccess: () => { toast.success("Customer created"); setDialogOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", whatsappPhone: "" });
  const handleCreate = () => {
    if (!form.firstName) { toast.error("First name is required"); return; }
    createCustomer.mutate({ ...form, lastName: form.lastName || undefined, email: form.email || undefined, phone: form.phone || undefined, whatsappPhone: form.whatsappPhone || undefined });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage customer profiles and relationships</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Customer</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Customer</DialogTitle></DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>First Name *</Label><Input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} /></div>
                <div><Label>Last Name</Label><Input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} /></div>
              </div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div><Label>WhatsApp</Label><Input value={form.whatsappPhone} onChange={e => setForm(f => ({ ...f, whatsappPhone: e.target.value }))} /></div>
              </div>
              <Button onClick={handleCreate} disabled={createCustomer.isPending}>{createCustomer.isPending ? "Creating..." : "Create Customer"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Customer Directory</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : customers && customers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="text-left py-3 px-3">Name</th><th className="text-left py-3 px-3">Contact</th><th className="text-right py-3 px-3">Total Spent</th><th className="text-right py-3 px-3">Orders</th>
                </tr></thead>
                <tbody>
                  {customers.map((c: any) => (
                    <tr key={c.id} className="border-b border-border/40 hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => setLocation(`/customers/${c.id}`)}>
                      <td className="py-3 px-3 font-medium">{c.firstName} {c.lastName ?? ""}</td>
                      <td className="py-3 px-3 text-muted-foreground text-xs">{c.phone || c.email || "—"}</td>
                      <td className="py-3 px-3 text-right">Rs {Number(c.totalSpent ?? 0).toLocaleString()}</td>
                      <td className="py-3 px-3 text-right">{c.totalOrders ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No customers found</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
