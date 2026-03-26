"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { Package, Pencil, X, Save, Trash2, CheckCircle } from "lucide-react";
import { dataUpdate } from "@/lib/supabase/data-client";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ConfirmDialog";
import SortableHeader from "@/components/SortableHeader";

interface Product {
  product_id: number;
  name: string;
  description: string | null;
  upc: string | null;
  costprice: number;
  sellingprice: number;
  isactive: string;
  image: string | null;
  needs_price_review: string | null;
  product_status: string | null;
  source: string | null;
  productcategory_id: number | null;
  productcategory: { name: string } | null;
  is_serialized: string | null;
  quantity_on_hand: number | null;
  reorder_point: number | null;
  track_stock: boolean | null;
}

interface Category {
  productcategory_id: number;
  name: string;
}

export default function ProductTable({
  products,
  categories,
  showStatusColumn = false,
}: {
  products: Product[];
  categories: Category[];
  showStatusColumn?: boolean;
}) {
  const router = useRouter();
  const [sort, setSort] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<Partial<Product>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  // Escape key to close edit modal
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && editingProduct && !confirmDeactivate) {
        closeEdit();
      }
    },
    [editingProduct, confirmDeactivate]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setForm({
      name: p.name,
      description: p.description,
      upc: p.upc,
      costprice: p.costprice,
      sellingprice: p.sellingprice,
      productcategory_id: p.productcategory_id,
      isactive: p.isactive,
    });
  };

  const closeEdit = () => {
    setEditingProduct(null);
    setForm({});
  };

  const handleSave = async () => {
    if (!editingProduct) return;
    setSaving(true);
    await dataUpdate(
      "product",
      { column: "product_id", value: editingProduct.product_id },
      {
        name: form.name,
        description: form.description || null,
        upc: form.upc || null,
        costprice: Number(form.costprice) || 0,
        sellingprice: Number(form.sellingprice) || 0,
        productcategory_id: form.productcategory_id
          ? Number(form.productcategory_id)
          : null,
        isactive: form.isactive,
      }
    );
    setSaving(false);
    closeEdit();
    router.refresh();
  };

  const handleDeactivate = async () => {
    if (!editingProduct) return;
    setSaving(true);
    await dataUpdate(
      "product",
      { column: "product_id", value: editingProduct.product_id },
      { isactive: editingProduct.isactive === "Y" ? "N" : "Y" }
    );
    setSaving(false);
    setConfirmDeactivate(false);
    closeEdit();
    router.refresh();
  };

  const updateField = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleApprove = async (productId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await dataUpdate("product", { column: "product_id", value: productId }, {
      product_status: "live",
      needs_price_review: null,
    });
    router.refresh();
  };

  const handleSort = (key: string) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return null;
    });
  };

  const sortedProducts = useMemo(() => {
    if (!sort) return products;
    const sorted = [...products].sort((a, b) => {
      let aVal: any;
      let bVal: any;
      switch (sort.key) {
        case "name":
          aVal = a.name?.toLowerCase() ?? "";
          bVal = b.name?.toLowerCase() ?? "";
          break;
        case "upc":
          aVal = a.upc?.toLowerCase() ?? "";
          bVal = b.upc?.toLowerCase() ?? "";
          break;
        case "sellingprice":
          aVal = a.sellingprice ?? 0;
          bVal = b.sellingprice ?? 0;
          break;
        case "category":
          aVal = a.productcategory?.name?.toLowerCase() ?? "";
          bVal = b.productcategory?.name?.toLowerCase() ?? "";
          break;
        case "stock":
          aVal = a.quantity_on_hand ?? 0;
          bVal = b.quantity_on_hand ?? 0;
          break;
        default:
          return 0;
      }
      if (aVal < bVal) return sort.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sort.direction === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [products, sort]);

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-16">Image</th>
              <SortableHeader label="Name" sortKey="name" currentSort={sort} onSort={handleSort} />
              <SortableHeader label="Category" sortKey="category" currentSort={sort} onSort={handleSort} />
              <SortableHeader label="UPC" sortKey="upc" currentSort={sort} onSort={handleSort} />
              <th className="text-right">Cost</th>
              <SortableHeader label="Price" sortKey="sellingprice" currentSort={sort} onSort={handleSort} />
              <SortableHeader label="Stock" sortKey="stock" currentSort={sort} onSort={handleSort} />
              <th>Status</th>
              {showStatusColumn && <th>Source</th>}
              {showStatusColumn && <th className="w-24"></th>}
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {sortedProducts?.map((p: any) => (
              <tr
                key={p.product_id}
                className="cursor-pointer hover:bg-blue-50/50 transition"
                onClick={() => openEdit(p)}
              >
                <td>
                  {p.image && p.image.startsWith("http") ? (
                    <Image
                      src={p.image}
                      alt={p.name ?? ""}
                      width={40}
                      height={40}
                      className="rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Package size={18} className="text-gray-400" />
                    </div>
                  )}
                </td>
                <td>
                  <div className="font-medium">
                    {p.name}
                    {p.is_serialized === "Y" && (
                      <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-indigo-100 text-indigo-700">
                        Serial
                      </span>
                    )}
                  </div>
                  {p.description && (
                    <div className="text-xs text-gray-500 truncate max-w-xs">
                      {p.description}
                    </div>
                  )}
                </td>
                <td className="text-gray-500">
                  {p.productcategory?.name ?? "—"}
                </td>
                <td className="text-gray-500 font-mono text-xs">
                  {p.upc ?? "—"}
                </td>
                <td className="text-right text-gray-500">
                  {formatCurrency(p.costprice)}
                </td>
                <td className="text-right font-medium">
                  {formatCurrency(p.sellingprice)}
                  {p.needs_price_review === "Y" && (
                    <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700">
                      Review
                    </span>
                  )}
                </td>
                <td className="text-right">
                  {p.track_stock !== false ? (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      (p.quantity_on_hand ?? 0) <= 0
                        ? "bg-red-100 text-red-700"
                        : (p.quantity_on_hand ?? 0) <= (p.reorder_point ?? 0)
                          ? "bg-amber-100 text-amber-700"
                          : "bg-green-100 text-green-700"
                    }`}>
                      {p.quantity_on_hand ?? 0}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.isactive === "Y"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {p.isactive === "Y" ? "Active" : "Inactive"}
                  </span>
                </td>
                {showStatusColumn && (
                  <td>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      {p.source === "ai_import" ? "AI Import" : p.source === "quotation" ? "Quotation" : p.source === "supplier_catalog" ? "Supplier" : "Manual"}
                    </span>
                  </td>
                )}
                {showStatusColumn && (
                  <td>
                    {(p.product_status === "review" || p.product_status === "draft") && (
                      <button
                        onClick={(e) => handleApprove(p.product_id, e)}
                        className="flex items-center gap-1 text-green-600 hover:text-green-700 text-xs font-medium px-2 py-1 rounded-lg hover:bg-green-50 transition"
                      >
                        <CheckCircle size={14} />
                        Approve
                      </button>
                    )}
                  </td>
                )}
                <td>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(p);
                    }}
                    className="text-gray-400 hover:text-posterita-blue p-1"
                    aria-label={`Edit product ${p.name}`}
                  >
                    <Pencil size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Bottom Sheet */}
      {editingProduct && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center"
          onClick={closeEdit}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-product-title"
            className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar (mobile) */}
            <div className="flex justify-center pt-2 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>

            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100">
              {editingProduct.image && editingProduct.image.startsWith("http") ? (
                <Image src={editingProduct.image} alt={editingProduct.name ?? ""} width={40} height={40} className="rounded-lg object-cover" />
              ) : (
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center"><Package size={20} className="text-gray-400" /></div>
              )}
              <div className="flex-1 min-w-0">
                <h2 id="edit-product-title" className="font-semibold text-gray-900 truncate">{editingProduct.name}</h2>
                <p className="text-xs text-gray-400">ID {editingProduct.product_id}</p>
              </div>
              <button onClick={closeEdit} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
            </div>

            {/* Section Cards */}
            <div className="px-5 py-4 space-y-3">

              {/* Section: Basic Info */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">Basic Info</div>
                <div className="p-4 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Name</label>
                    <input type="text" value={form.name ?? ""} onChange={(e) => updateField("name", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Description</label>
                    <textarea value={form.description ?? ""} onChange={(e) => updateField("description", e.target.value)} rows={2}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none text-sm resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Category</label>
                      <select value={form.productcategory_id ?? ""} onChange={(e) => updateField("productcategory_id", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none text-sm">
                        <option value="">None</option>
                        {categories.map((c) => (<option key={c.productcategory_id} value={c.productcategory_id}>{c.name}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">UPC / Barcode</label>
                      <input type="text" value={form.upc ?? ""} onChange={(e) => updateField("upc", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none text-sm font-mono" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: Pricing */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pricing</div>
                <div className="p-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Selling Price</label>
                    <input type="number" step="0.01" value={form.sellingprice ?? 0} onChange={(e) => updateField("sellingprice", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Cost Price</label>
                    <input type="number" step="0.01" value={form.costprice ?? 0} onChange={(e) => updateField("costprice", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none text-sm" />
                  </div>
                </div>
              </div>

              {/* Section: Status */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Active</span>
                    <button
                      onClick={() => updateField("isactive", form.isactive === "Y" ? "N" : "Y")}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isactive === "Y" ? "bg-green-500" : "bg-gray-300"}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.isactive === "Y" ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50 sm:rounded-b-2xl">
              <button onClick={() => setConfirmDeactivate(true)}
                className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition">
                {editingProduct.isactive === "Y" ? "Deactivate" : "Activate"}
              </button>
              <div className="flex gap-2">
                <button onClick={closeEdit} className="px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-200 transition text-sm">Cancel</button>
                <button onClick={handleSave} disabled={saving || !form.name?.trim()}
                  className="flex items-center gap-1.5 bg-posterita-blue text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50">
                  <Save size={14} /> {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Deactivate/Activate Dialog */}
      <ConfirmDialog
        open={confirmDeactivate}
        title={
          editingProduct?.isactive === "Y"
            ? "Deactivate Product"
            : "Activate Product"
        }
        message={
          editingProduct?.isactive === "Y"
            ? `Are you sure you want to deactivate "${editingProduct?.name}"? It will no longer appear in the POS.`
            : `Are you sure you want to activate "${editingProduct?.name}"? It will become available in the POS.`
        }
        confirmText={
          editingProduct?.isactive === "Y" ? "Deactivate" : "Activate"
        }
        confirmVariant={
          editingProduct?.isactive === "Y" ? "danger" : "primary"
        }
        onConfirm={handleDeactivate}
        onCancel={() => setConfirmDeactivate(false)}
      />
    </>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "MUR",
    minimumFractionDigits: 2,
  }).format(amount ?? 0);
}
