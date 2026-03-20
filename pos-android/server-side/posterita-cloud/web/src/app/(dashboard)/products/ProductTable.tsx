"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { Package, Pencil, X, Save, Trash2 } from "lucide-react";
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
  productcategory_id: number | null;
  productcategory: { name: string } | null;
}

interface Category {
  productcategory_id: number;
  name: string;
}

export default function ProductTable({
  products,
  categories,
}: {
  products: Product[];
  categories: Category[];
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
              <th>Status</th>
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
                  <div className="font-medium">{p.name}</div>
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

      {/* Edit Modal */}
      {editingProduct && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={closeEdit}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-product-title"
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                {editingProduct.image &&
                editingProduct.image.startsWith("http") ? (
                  <Image
                    src={editingProduct.image}
                    alt={editingProduct.name ?? ""}
                    width={48}
                    height={48}
                    className="rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                    <Package size={24} className="text-gray-400" />
                  </div>
                )}
                <div>
                  <h2 id="edit-product-title" className="text-lg font-semibold">Edit Product</h2>
                  <p className="text-sm text-gray-500">
                    ID: {editingProduct.product_id}
                  </p>
                </div>
              </div>
              <button
                onClick={closeEdit}
                className="text-gray-400 hover:text-gray-600 p-1"
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={form.name ?? ""}
                  onChange={(e) => updateField("name", e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={form.description ?? ""}
                  onChange={(e) => updateField("description", e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Selling Price *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.sellingprice ?? 0}
                    onChange={(e) =>
                      updateField("sellingprice", e.target.value)
                    }
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cost Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.costprice ?? 0}
                    onChange={(e) => updateField("costprice", e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={form.productcategory_id ?? ""}
                    onChange={(e) =>
                      updateField("productcategory_id", e.target.value)
                    }
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                  >
                    <option value="">No Category</option>
                    {categories.map((c) => (
                      <option
                        key={c.productcategory_id}
                        value={c.productcategory_id}
                      >
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    UPC / Barcode
                  </label>
                  <input
                    type="text"
                    value={form.upc ?? ""}
                    onChange={(e) => updateField("upc", e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={form.isactive ?? "Y"}
                  onChange={(e) => updateField("isactive", e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                >
                  <option value="Y">Active</option>
                  <option value="N">Inactive</option>
                </select>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setConfirmDeactivate(true)}
                className="flex items-center gap-2 text-red-600 hover:text-red-700 text-sm font-medium px-3 py-2 rounded-lg hover:bg-red-50 transition"
              >
                <Trash2 size={16} />
                {editingProduct.isactive === "Y" ? "Deactivate" : "Activate"}
              </button>
              <div className="flex gap-3">
                <button
                  onClick={closeEdit}
                  className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-200 transition text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.name?.trim()}
                  className="flex items-center gap-2 bg-posterita-blue text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50"
                >
                  <Save size={16} />
                  {saving ? "Saving..." : "Save Changes"}
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
