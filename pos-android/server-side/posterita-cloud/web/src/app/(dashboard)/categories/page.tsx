"use client";

import { useEffect, useState, useMemo } from "react";
import { dataQuery, dataUpdate, dataInsert } from "@/lib/supabase/data-client";
import { FolderTree, Plus, Pencil, Search, X, ChevronRight, AlertTriangle, GripVertical } from "lucide-react";
import { SkeletonTable } from "@/components/Skeleton";
import ConfirmDialog from "@/components/ConfirmDialog";
import Breadcrumb from "@/components/Breadcrumb";

interface Category {
  productcategory_id: number;
  name: string;
  isactive: string;
  position: number;
  tax_id: number | null;
  parent_category_id: number | null;
  level: number;
  product_count?: number;
  tax_name?: string;
  station_name?: string;
  children?: Category[];
  path?: string[];
}

interface Tax {
  tax_id: number;
  name: string;
  rate: number;
}

interface CategoryFormData {
  name: string;
  tax_id: number | null;
  parent_category_id: number | null;
}

const emptyForm: CategoryFormData = { name: "", tax_id: null, parent_category_id: null };

// Build tree from flat list, returns roots + sets children + path on each node
function buildTreeAndFlatten(cats: Category[]): Category[] {
  const map = new Map<number, Category>();
  for (const c of cats) {
    map.set(c.productcategory_id, { ...c, children: [], path: [c.name] });
  }
  const roots: Category[] = [];
  for (const c of map.values()) {
    if (c.parent_category_id && map.has(c.parent_category_id)) {
      map.get(c.parent_category_id)!.children!.push(c);
    } else {
      roots.push(c);
    }
  }
  // Set paths and sort
  function setPaths(nodes: Category[], parentPath: string[]) {
    nodes.sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.name.localeCompare(b.name));
    for (const n of nodes) {
      n.path = [...parentPath, n.name];
      setPaths(n.children ?? [], n.path);
    }
  }
  setPaths(roots, []);
  // Flatten in tree order
  const flat: Category[] = [];
  function walk(nodes: Category[]) {
    for (const n of nodes) {
      flat.push(n);
      walk(n.children ?? []);
    }
  }
  walk(roots);
  return flat;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState<Category | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const fetchCategories = async () => {
    setLoading(true);

    const { data: taxData } = await dataQuery<Tax>("tax", {
      select: "tax_id, name, rate",
      order: { column: "name" },
    });
    setTaxes(taxData ?? []);
    const taxMap: Record<number, string> = {};
    (taxData ?? []).forEach((t) => { taxMap[t.tax_id] = `${t.name} (${t.rate}%)`; });

    const { data } = await dataQuery<Category>("productcategory", {
      select: "productcategory_id, name, isactive, position, tax_id, parent_category_id, level",
      order: { column: "name" },
    });

    const { data: products } = await dataQuery("product", {
      select: "productcategory_id",
      filters: [{ column: "isactive", op: "eq", value: "Y" }],
    });
    const counts: Record<number, number> = {};
    products?.forEach((p: any) => {
      counts[p.productcategory_id] = (counts[p.productcategory_id] || 0) + 1;
    });

    const { data: mappings } = await dataQuery("category_station_mapping", { select: "category_id, station_id" });
    const { data: stations } = await dataQuery("preparation_station", { select: "station_id, name" });
    const stationNameMap: Record<number, string> = {};
    (stations ?? []).forEach((s: any) => { stationNameMap[s.station_id] = s.name; });
    const categoryStationMap: Record<number, string> = {};
    (mappings ?? []).forEach((m: any) => {
      categoryStationMap[m.category_id] = stationNameMap[m.station_id] ?? `Station ${m.station_id}`;
    });

    const enriched = (data ?? []).map((c) => ({
      ...c,
      parent_category_id: c.parent_category_id ?? null,
      level: c.level ?? 0,
      product_count: counts[c.productcategory_id] || 0,
      tax_name: c.tax_id ? taxMap[c.tax_id] ?? "—" : "—",
      station_name: categoryStationMap[c.productcategory_id],
    }));

    setCategories(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  // Tree-ordered categories
  const treeFlat = useMemo(() => buildTreeAndFlatten(categories), [categories]);

  // Filtered (search matches + their ancestors)
  const filtered = useMemo(() => {
    if (!search.trim()) return treeFlat;
    const q = search.toLowerCase();
    const matchIds = new Set<number>();
    for (const c of treeFlat) {
      if (c.name.toLowerCase().includes(q)) {
        matchIds.add(c.productcategory_id);
        // Show ancestors
        let pid = c.parent_category_id;
        while (pid) {
          matchIds.add(pid);
          const parent = treeFlat.find((x) => x.productcategory_id === pid);
          pid = parent?.parent_category_id ?? null;
        }
      }
    }
    return treeFlat.filter((c) => matchIds.has(c.productcategory_id));
  }, [treeFlat, search]);

  // Stats
  const mainCount = categories.filter((c) => c.level === 0).length;
  const subCount = categories.filter((c) => c.level === 1).length;
  const subSubCount = categories.filter((c) => c.level === 2).length;

  // Available parents for create/edit (level 0 or 1, exclude self and descendants when editing)
  const availableParents = useMemo(() => {
    const editId = editingCategory?.productcategory_id;
    // Collect IDs of self + all descendants to exclude
    const excludeIds = new Set<number>();
    if (editId) {
      excludeIds.add(editId);
      function collectDescendants(parentId: number) {
        for (const c of categories) {
          if (c.parent_category_id === parentId) {
            excludeIds.add(c.productcategory_id);
            collectDescendants(c.productcategory_id);
          }
        }
      }
      collectDescendants(editId);
    }
    return treeFlat.filter(
      (c) => c.level < 2 && !excludeIds.has(c.productcategory_id)
    );
  }, [categories, treeFlat, editingCategory]);

  const openCreateModal = (parentId?: number | null) => {
    setForm({ ...emptyForm, parent_category_id: parentId ?? null });
    setEditingCategory(null);
    setModalMode("create");
    setModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setForm({ name: cat.name, tax_id: cat.tax_id, parent_category_id: cat.parent_category_id });
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

    // Compute level from parent
    let level = 0;
    if (form.parent_category_id) {
      const parent = categories.find((c) => c.productcategory_id === form.parent_category_id);
      level = (parent?.level ?? 0) + 1;
    }

    if (modalMode === "create") {
      await dataInsert("productcategory", {
        name: form.name.trim(),
        isactive: "Y",
        tax_id: form.tax_id,
        parent_category_id: form.parent_category_id,
        level,
      });
    } else if (editingCategory) {
      await dataUpdate(
        "productcategory",
        { column: "productcategory_id", value: editingCategory.productcategory_id },
        {
          name: form.name.trim(),
          tax_id: form.tax_id,
          parent_category_id: form.parent_category_id,
          level,
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

  const handleReorder = async () => {
    if (dragIndex === null || dragOverIndex === null || dragIndex === dragOverIndex) return;

    const reordered = [...filtered];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dragOverIndex, 0, moved);

    for (let i = 0; i < reordered.length; i++) {
      if (reordered[i].position !== i) {
        await dataUpdate("productcategory",
          { column: "productcategory_id", value: reordered[i].productcategory_id },
          { position: i }
        );
      }
    }

    fetchCategories();
  };

  const levelColors = [
    "text-posterita-blue bg-blue-50",
    "text-purple-600 bg-purple-50",
    "text-teal-600 bg-teal-50",
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Categories" }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-500 mt-1">
            {mainCount} main{mainCount !== 1 ? "s" : ""}
            {subCount > 0 && <> &middot; {subCount} sub</>}
            {subSubCount > 0 && <> &middot; {subSubCount} sub-sub</>}
          </p>
        </div>
        <button
          onClick={() => openCreateModal()}
          className="flex items-center gap-2 bg-posterita-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={18} />
          Add Category
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search categories..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
        />
      </div>

      {/* Tree list */}
      {loading ? (
        <SkeletonTable rows={6} columns={5} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <FolderTree className="mx-auto text-gray-400" size={64} />
          <h3 className="text-lg font-medium text-gray-700 mt-4">
            {search ? "No categories match your search" : "No categories yet"}
          </h3>
          <p className="text-gray-500 mt-1">
            {search ? "Try a different search term" : "Create your first product category"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-[24px_1fr_100px_100px_80px_80px_40px] gap-2 px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wide">
            <div />
            <div>Name</div>
            <div>Tax</div>
            <div>Station</div>
            <div className="text-center">Products</div>
            <div className="text-center">Status</div>
            <div />
          </div>

          {/* Category rows */}
          {filtered.map((c, index) => {
            const hasChildren = (c.children ?? []).length > 0;
            return (
              <div
                key={c.productcategory_id}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => { e.preventDefault(); setDragOverIndex(index); }}
                onDragEnd={() => { handleReorder(); setDragIndex(null); setDragOverIndex(null); }}
                className={`group grid grid-cols-[24px_1fr_100px_100px_80px_80px_40px] gap-2 px-5 py-2.5 border-b border-gray-50 hover:bg-gray-50/50 transition cursor-pointer items-center ${dragOverIndex === index ? "border-t-2 border-posterita-blue" : ""} ${dragIndex === index ? "opacity-40" : ""}`}
                onClick={() => openEditModal(c)}
              >
                {/* Drag handle */}
                <div className="flex items-center justify-center">
                  <GripVertical size={16} className="text-gray-300 opacity-0 group-hover:opacity-100 cursor-grab" />
                </div>
                {/* Name with tree indentation */}
                <div className="flex items-center gap-2 min-w-0" style={{ paddingLeft: `${c.level * 24}px` }}>
                  {c.level > 0 && (
                    <span className="text-gray-300 text-xs font-mono flex-shrink-0 w-4">
                      {c.level === 1 ? "├─" : "└─"}
                    </span>
                  )}
                  <div className={`p-1.5 rounded-lg flex-shrink-0 ${levelColors[c.level] ?? levelColors[0]}`}>
                    <FolderTree size={14} />
                  </div>
                  <span className={`truncate ${c.level === 0 ? "font-semibold text-gray-900" : c.level === 1 ? "font-medium text-gray-700" : "text-gray-600"}`}>
                    {c.name}
                  </span>
                  {hasChildren && (
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">
                      {c.children!.length}
                    </span>
                  )}
                  {/* Quick add sub-category button */}
                  {c.level < 2 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openCreateModal(c.productcategory_id); }}
                      className="text-gray-300 hover:text-posterita-blue p-0.5 opacity-0 group-hover:opacity-100 flex-shrink-0"
                      title={`Add sub-category under ${c.name}`}
                    >
                      <Plus size={12} />
                    </button>
                  )}
                </div>

                {/* Tax */}
                <div className="text-gray-500 text-xs truncate">{c.tax_name ?? "—"}</div>

                {/* Station */}
                <div>
                  {c.station_name ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 text-orange-700 truncate">
                      {c.station_name}
                    </span>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </div>

                {/* Product count */}
                <div className="text-center">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    {c.product_count}
                  </span>
                </div>

                {/* Status */}
                <div className="text-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmToggle(c); }}
                    aria-label={c.isactive === "Y" ? `Deactivate ${c.name}` : `Activate ${c.name}`}
                  >
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium cursor-pointer ${
                      c.isactive === "Y" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {c.isactive === "Y" ? "Active" : "Off"}
                    </span>
                  </button>
                </div>

                {/* Edit */}
                <div className="text-right">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditModal(c); }}
                    className="text-gray-400 hover:text-posterita-blue p-1"
                    aria-label={`Edit ${c.name}`}
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end md:items-center justify-center p-4" onClick={closeModal}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-modal-title"
            className="bg-white rounded-t-2xl md:rounded-2xl shadow-lg w-full max-w-md max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => { if (e.key === "Escape") closeModal(); }}
          >
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4 md:hidden" />
            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              <h2 id="category-modal-title" className="text-lg font-semibold text-gray-900">
                {modalMode === "create" ? "Add Category" : "Edit Category"}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Parent category */}
              <div>
                <label htmlFor="cat-parent" className="block text-sm font-medium text-gray-700 mb-1">
                  Parent Category
                </label>
                <select
                  id="cat-parent"
                  value={form.parent_category_id ?? ""}
                  onChange={(e) => setForm({ ...form, parent_category_id: e.target.value ? Number(e.target.value) : null })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                >
                  <option value="">None (top-level)</option>
                  {availableParents.map((p) => (
                    <option key={p.productcategory_id} value={p.productcategory_id}>
                      {"  ".repeat(p.level)}{p.level > 0 ? "└ " : ""}{p.name}
                    </option>
                  ))}
                </select>
                {form.parent_category_id && (() => {
                  const parent = categories.find((c) => c.productcategory_id === form.parent_category_id);
                  const parentLevel = (parent?.level ?? 0) + 1;
                  const parentProductCount = parent?.product_count ?? 0;
                  // Check if parent currently has no children (this would be its first sub-category)
                  const parentHasNoChildren = !categories.some((c) => c.parent_category_id === form.parent_category_id);
                  return (
                    <>
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <ChevronRight size={10} />
                        Will be created as {parentLevel === 1 ? "sub-category" : "sub-sub-category"}
                      </p>
                      {modalMode === "create" && parentHasNoChildren && parentProductCount > 0 && (
                        <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          <AlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-amber-700">
                            <strong>{parent?.name}</strong> has {parentProductCount} product{parentProductCount !== 1 ? "s" : ""} directly assigned.
                            These will remain under {parent?.name} until manually re-categorized to a sub-category.
                          </p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Name */}
              <div>
                <label htmlFor="cat-name" className="block text-sm font-medium text-gray-700 mb-1">
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
                  onKeyDown={(e) => { if (e.key === "Enter" && form.name.trim()) handleSubmit(); }}
                />
              </div>

              {/* Tax */}
              <div>
                <label htmlFor="cat-tax" className="block text-sm font-medium text-gray-700 mb-1">Tax</label>
                <select
                  id="cat-tax"
                  value={form.tax_id ?? ""}
                  onChange={(e) => setForm({ ...form, tax_id: e.target.value ? Number(e.target.value) : null })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                >
                  <option value="">No tax</option>
                  {taxes.map((t) => (
                    <option key={t.tax_id} value={t.tax_id}>{t.name} ({t.rate}%)</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 pb-6">
              <button onClick={closeModal} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition text-sm font-medium">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.name.trim() || saving}
                className="px-4 py-2 rounded-lg bg-posterita-blue text-white hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : modalMode === "create" ? "Create Category" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmToggle}
        title={confirmToggle?.isactive === "Y" ? "Deactivate Category" : "Activate Category"}
        message={
          confirmToggle?.isactive === "Y"
            ? `Are you sure you want to deactivate "${confirmToggle?.name}"? Products in this category will not be affected.`
            : `Are you sure you want to activate "${confirmToggle?.name}"?`
        }
        confirmText={confirmToggle?.isactive === "Y" ? "Deactivate" : "Activate"}
        confirmVariant={confirmToggle?.isactive === "Y" ? "danger" : "primary"}
        onConfirm={() => { if (confirmToggle) toggleActive(confirmToggle); }}
        onCancel={() => setConfirmToggle(null)}
      />
    </div>
  );
}
