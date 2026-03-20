import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Package } from "lucide-react";
import { toast } from "sonner";

export default function Products() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const searchInput = useMemo(() => search, [search]);
  const { data: products, isLoading, refetch } = trpc.inventory.listProducts.useQuery({ search: searchInput, limit: 100 });
  const createProduct = trpc.inventory.createProduct.useMutation({
    onSuccess: () => { toast.success("Product created"); setDialogOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState({ sku: "", name: "", price: "", costPrice: "", barcode: "", description: "", taxRate: "15.00", unit: "each" });
  const handleCreate = () => {
    if (!form.sku || !form.name || !form.price) { toast.error("SKU, name, and price are required"); return; }
    createProduct.mutate({ ...form, costPrice: form.costPrice || undefined, barcode: form.barcode || undefined, description: form.description || undefined });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your product catalog</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Product</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Product</DialogTitle></DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>SKU *</Label><Input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="PRD-001" /></div>
                <div><Label>Barcode</Label><Input value={form.barcode} onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))} placeholder="1234567890" /></div>
              </div>
              <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Product name" /></div>
              <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Price *</Label><Input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" /></div>
                <div><Label>Cost Price</Label><Input value={form.costPrice} onChange={e => setForm(f => ({ ...f, costPrice: e.target.value }))} placeholder="0.00" /></div>
                <div><Label>Tax Rate %</Label><Input value={form.taxRate} onChange={e => setForm(f => ({ ...f, taxRate: e.target.value }))} /></div>
              </div>
              <Button onClick={handleCreate} disabled={createProduct.isPending}>{createProduct.isPending ? "Creating..." : "Create Product"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> Product Catalog</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : products && products.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="text-left py-3 px-3">SKU</th><th className="text-left py-3 px-3">Name</th><th className="text-right py-3 px-3">Price</th><th className="text-right py-3 px-3">Cost</th><th className="text-center py-3 px-3">Status</th>
                </tr></thead>
                <tbody>
                  {products.map((p: any) => (
                    <tr key={p.id} className="border-b border-border/40 hover:bg-secondary/30 transition-colors">
                      <td className="py-3 px-3 font-mono text-xs">{p.sku}</td>
                      <td className="py-3 px-3 font-medium">{p.name}</td>
                      <td className="py-3 px-3 text-right">Rs {Number(p.price).toLocaleString()}</td>
                      <td className="py-3 px-3 text-right text-muted-foreground">{p.costPrice ? `Rs ${Number(p.costPrice).toLocaleString()}` : "—"}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${p.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                          {p.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No products found. Add your first product to get started.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
