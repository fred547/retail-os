"use client";

import { useEffect, useState, useMemo } from "react";
import { dataQuery, dataUpdate, dataInsert } from "@/lib/supabase/data-client";
import { FolderTree, Plus, Pencil, Search, X } from "lucide-react";
import { SkeletonTable } from "@/components/Skeleton";
import ConfirmDialog from "@/components/ConfirmDialog";
import Breadcrumb from "@/components/Breadcrumb";
import SortableHeader from "@/components/SortableHeader";

interface Category {
  productcategory_id: number;
  name: string;
  description: string | null;
  isactive: string;
  product_count?: number;
}

interface CategoryFormData {
  name: string;
  description: string;
}

const emptyForm: CategoryFormData = { name: "", description: "" };

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Toggle active confirmation
  const [confirmToggle, setConfirmToggle] = useState<Category | null>(null);

  const fetchCategories = async () => {
    setLoading(true);
    const { data } = await dataQuery<Category>("productcategory", {
      select: "productcategory_id, name, description, isactive",
      order: { column: "name" },
    });

    // Get product counts per category
    const { data: products } = await dataQuery("product", {
      select: "productcategory_id",
      filters: [{ column: "isactive", op: "eq", value: "Y" }],
    });

    const counts: Record<number, number> = {};
    products?.forEach((p: any) => {
      counts[p.productcategory_id] = (counts[p.productcategory_id] || 0) + 1;
    });

    setCategories(
      (data ?? []).map((c) => ({
        ...c,
        product_count: counts[c.productcategory_id] || 0,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // --- Modal helpers ---

  const openCreateModal = () => {
    setForm(emptyForm);
    setEditingCategory(null);
    setModalMode("create");
    setModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setForm({ name: cat.name, description: cat.description ?? "" });
    setEditingCategory(cat);
    setModalMode("edit");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingCategory(null);
    setForm(emptyForm);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);

    if (modalMode === "create") {
      await dataInsert("productcategory", {
        name: form.name.trim(),
        description: form.description.trim() || null,
        isactive: "Y",
      });
    } else if (editingCategory) {
      await dataUpdate(
        "productcategory",
        { column: "productcategory_id", value: editingCategory.productcategory_id },
        {
          name: form.name.trim(),
          description: form.description.trim() || null,
        }
      );
    }

    setSaving(false);
    closeModal();
    await fetchCategories();
  };

  const toggleActive = async (cat: Category) => {
    await dataUpdate(
      "productcategory",
      { column: "productcategory_id", value: cat.productcategory_id },
      { isactive: cat.isactive === "Y" ? "N" : "Y" }
    );
    setConfirmToggle(null);
    await fetchCategories();
  };

  // --- Client-side search ---
  const filtered = search
    ? categories.filter(
        (c) =>
          c.name?.toLowerCase().includes(search.toLowerCase()) ||
          c.description?.toLowerCase().includes(search.toLowerCase())
      )
    : categories;

  const handleSort = (key: string) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return null;
    });
  };

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    return [...filtered].sort((a, b) => {
      let aVal: any;
      let bVal: any;
      switch (sort.key) {
        case "name":
          aVal = a.name?.toLowerCase() ?? "";
          bVal = b.name?.toLowerCase() ?? "";
          break;
        case "product_count":
          aVal = a.product_count ?? 0;
          bVal = b.product_count ?? 0;
          break;
        case "status":
          aVal = a.isactive ?? "";
          bVal = b.isactive ?? "";
          break;
        default:
          return 0;
      }
      if (aVal < bVal) return sort.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sort.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sort]);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Dashboard", href: "/customer" }, { label: "Categories" }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-500 mt-1">
            {categories.length} {categories.length === 1 ? "category" : "categories"}
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-posterita-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={18} />
          Add Category
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={18}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search categories by name or description..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
        />
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonTable rows={6} columns={5} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <FolderTree className="mx-auto text-gray-400" size={64} />
          <h3 className="text-lg font-medium text-gray-700 mt-4">
            {search ? "No categories match your search" : "No categories yet"}
          </h3>
          <p className="text-gray-500 mt-1">
            {search
              ? "Try a different search term"
              : "Create your first product category"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <SortableHeader label="Name" sortKey="name" currentSort={sort} onSort={handleSort} />
                <th>Description</th>
                <SortableHeader label="Products" sortKey="product_count" currentSort={sort} onSort={handleSort} />
                <SortableHeader label="Status" sortKey="status" currentSort={sort} onSort={handleSort} />
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => (
                <tr
                  key={c.productcategory_id}
                  className="cursor-pointer hover:bg-gray-50 transition"
                  onClick={() => openEditModal(c)}
                >
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <FolderTree size={16} className="text-posterita-blue" />
                      </div>
                      <span className="font-medium">{c.name}</span>
                    </div>
                  </td>
                  <td>
                    <span className="text-sm text-gray-500 max-w-xs truncate block">
                      {c.description || "\u2014"}
                    </span>
                  </td>
                  <td className="text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      {c.product_count}
                    </span>
                  </td>
                  <td className="text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmToggle(c);
                      }}
                      aria-label={
                        c.isactive === "Y"
                          ? `Deactivate category ${c.name}`
                          : `Activate category ${c.name}`
                      }
                    >
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                          c.isactive === "Y"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {c.isactive === "Y" ? "Active" : "Inactive"}
                      </span>
                    </button>
                  </td>
                  <td className="text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(c);
                      }}
                      className="text-gray-400 hover:text-posterita-blue p-1"
                      aria-label={`Edit category ${c.name}`}
                    >
                      <Pencil size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-modal-title"
            className="bg-white rounded-xl shadow-lg w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") closeModal();
            }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              <h2
                id="category-modal-title"
                className="text-lg font-semibold text-gray-900"
              >
                {modalMode === "create" ? "Add Category" : "Edit Category"}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 p-1"
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-4 space-y-4">
              <div>
                <label
                  htmlFor="cat-name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="cat-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Beverages"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && form.name.trim()) handleSubmit();
                  }}
                />
              </div>
              <div>
                <label
                  htmlFor="cat-desc"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Description
                </label>
                <textarea
                  id="cat-desc"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Optional description..."
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.metaKey && form.name.trim())
                      handleSubmit();
                  }}
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 pb-6">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.name.trim() || saving}
                className="px-4 py-2 rounded-lg bg-posterita-blue text-white hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving
                  ? "Saving..."
                  : modalMode === "create"
                  ? "Create Category"
                  : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Toggle Active Dialog */}
      <ConfirmDialog
        open={!!confirmToggle}
        title={
          confirmToggle?.isactive === "Y"
            ? "Deactivate Category"
            : "Activate Category"
        }
        message={
          confirmToggle?.isactive === "Y"
            ? `Are you sure you want to deactivate "${confirmToggle?.name}"? Products in this category will not be affected.`
            : `Are you sure you want to activate "${confirmToggle?.name}"?`
        }
        confirmText={
          confirmToggle?.isactive === "Y" ? "Deactivate" : "Activate"
        }
        confirmVariant={
          confirmToggle?.isactive === "Y" ? "danger" : "primary"
        }
        onConfirm={() => {
          if (confirmToggle) toggleActive(confirmToggle);
        }}
        onCancel={() => setConfirmToggle(null)}
      />
    </div>
  );
}
