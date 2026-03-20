import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Store } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Stores() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: stores, isLoading, refetch } = trpc.store.list.useQuery();
  const createStore = trpc.store.create.useMutation({
    onSuccess: () => { toast.success("Store created"); setDialogOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const [form, setForm] = useState({ name: "", code: "", address: "", phone: "", email: "" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stores</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your retail locations</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Store</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Store</DialogTitle></DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div><Label>Code *</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="STR-01" /></div>
              </div>
              <div><Label>Address</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              </div>
              <Button onClick={() => { if (!form.name || !form.code) { toast.error("Name and code required"); return; } createStore.mutate({ ...form, address: form.address || undefined, phone: form.phone || undefined, email: form.email || undefined }); }} disabled={createStore.isPending}>{createStore.isPending ? "Creating..." : "Create Store"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Store className="h-4 w-4 text-primary" /> Locations</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : stores && stores.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {stores.map((s: any) => (
                <div key={s.id} className="p-4 rounded-lg bg-secondary/30 border border-border/40">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{s.name}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${s.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{s.isActive ? "Active" : "Inactive"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">{s.code}</p>
                  {s.address && <p className="text-xs text-muted-foreground mt-1">{s.address}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No stores configured yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
