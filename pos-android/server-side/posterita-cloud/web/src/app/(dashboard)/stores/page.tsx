"use client";

import { useEffect, useState, useCallback } from "react";
import { dataQuery, dataUpdate, dataInsert } from "@/lib/supabase/data-client";
import {
  Store,
  Plus,
  Pencil,
  Save,
  X,
  MapPin,
  Phone,
  Mail,
  Monitor,
  Users,
} from "lucide-react";
import { SkeletonCard } from "@/components/Skeleton";
import Breadcrumb from "@/components/Breadcrumb";

interface StoreInfo {
  store_id: number;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  currency: string | null;
  tax_number: string | null;
  isactive: string;
}

interface StoreStats {
  store_id: number;
  terminal_count: number;
  user_count: number;
}

export default function StoresPage() {
  const [stores, setStores] = useState<(StoreInfo & StoreStats)[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStore, setEditingStore] = useState<StoreInfo | null>(null);
  const [creatingStore, setCreatingStore] = useState(false);
  const [form, setForm] = useState<Partial<StoreInfo>>({});
  const [saving, setSaving] = useState(false);

  const fetchStores = async () => {
    setLoading(true);
    const { data: storeData } = await dataQuery<StoreInfo>("store", {
      select:
        "store_id, name, address, city, phone, email, currency, tax_number, isactive",
      order: { column: "name" },
    });

    // Get terminal counts per store
    const { data: terminals } = await dataQuery("terminal", {
      select: "terminal_id, store_id",
    });

    // Get user counts per store
    const { data: users } = await dataQuery("pos_user", {
      select: "user_id, store_id",
    });

    const terminalCounts: Record<number, number> = {};
    terminals?.forEach((t: any) => {
      terminalCounts[t.store_id] = (terminalCounts[t.store_id] || 0) + 1;
    });

    const userCounts: Record<number, number> = {};
    users?.forEach((u: any) => {
      userCounts[u.store_id] = (userCounts[u.store_id] || 0) + 1;
    });

    setStores(
      (storeData ?? []).map((s) => ({
        ...s,
        terminal_count: terminalCounts[s.store_id] || 0,
        user_count: userCounts[s.store_id] || 0,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const openEdit = (store: StoreInfo) => {
    setEditingStore(store);
    setForm({
      name: store.name,
      address: store.address,
      city: store.city,
      phone: store.phone,
      email: store.email,
      currency: store.currency,
      tax_number: store.tax_number,
      isactive: store.isactive,
    });
  };

  const closeEdit = () => {
    setEditingStore(null);
    setForm({});
  };

  const openCreate = () => {
    setCreatingStore(true);
    setForm({ isactive: "Y" });
  };

  const closeCreate = () => {
    setCreatingStore(false);
    setForm({});
  };

  const handleCreate = async () => {
    if (!form.name?.trim()) return;
    setSaving(true);
    await dataInsert("store", {
      name: form.name,
      address: form.address || null,
      city: form.city || null,
      phone: form.phone || null,
      email: form.email || null,
      currency: form.currency || null,
      tax_number: form.tax_number || null,
      isactive: "Y",
    });
    setSaving(false);
    closeCreate();
    await fetchStores();
  };

  // Escape key to close modals
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editingStore) closeEdit();
        if (creatingStore) closeCreate();
      }
    },
    [editingStore, creatingStore]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleSave = async () => {
    if (!editingStore) return;
    setSaving(true);
    await dataUpdate(
      "store",
      { column: "store_id", value: editingStore.store_id },
      {
        name: form.name,
        address: form.address || null,
        city: form.city || null,
        phone: form.phone || null,
        email: form.email || null,
        currency: form.currency || null,
        tax_number: form.tax_number || null,
        isactive: form.isactive,
      }
    );
    setSaving(false);
    closeEdit();
    await fetchStores();
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Stores" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stores</h1>
          <p className="text-gray-500 mt-1">
            Manage your store locations
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-posterita-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={18} />
          Add Store
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : stores.length === 0 ? (
        <div className="text-center py-16">
          <Store className="mx-auto text-gray-400" size={64} />
          <h3 className="text-lg font-medium text-gray-700 mt-4">
            No stores yet
          </h3>
          <p className="text-gray-500 mt-1">
            Stores will appear here once synced from the POS app
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stores.map((store) => (
            <div
              key={store.store_id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition cursor-pointer"
              onClick={() => openEdit(store)}
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 rounded-xl">
                      <Store size={24} className="text-posterita-blue" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{store.name}</h3>
                      {store.city && (
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <MapPin size={12} />
                          {store.city}
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      store.isactive === "Y"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {store.isactive === "Y" ? "Active" : "Inactive"}
                  </span>
                </div>

                {store.address && (
                  <p className="text-sm text-gray-500 mt-3">{store.address}</p>
                )}

                <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                  {store.phone && (
                    <div className="flex items-center gap-1">
                      <Phone size={14} />
                      {store.phone}
                    </div>
                  )}
                  {store.email && (
                    <div className="flex items-center gap-1">
                      <Mail size={14} />
                      {store.email}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 text-sm">
                    <Monitor size={14} className="text-gray-400" />
                    <span className="font-medium">{store.terminal_count}</span>
                    <span className="text-gray-500">terminals</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Users size={14} className="text-gray-400" />
                    <span className="font-medium">{store.user_count}</span>
                    <span className="text-gray-500">users</span>
                  </div>
                  {store.currency && (
                    <div className="text-sm text-gray-500 ml-auto">
                      {store.currency}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {creatingStore && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={closeCreate}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-store-title"
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-xl">
                  <Store size={24} className="text-posterita-blue" />
                </div>
                <div>
                  <h2 id="create-store-title" className="text-lg font-semibold">Add Store</h2>
                  <p className="text-sm text-gray-500">Create a new store location</p>
                </div>
              </div>
              <button
                onClick={closeCreate}
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
                  Store Name *
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
                  Address
                </label>
                <input
                  type="text"
                  value={form.address ?? ""}
                  onChange={(e) => updateField("address", e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={form.city ?? ""}
                    onChange={(e) => updateField("city", e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <input
                    type="text"
                    value={form.currency ?? ""}
                    onChange={(e) => updateField("currency", e.target.value)}
                    placeholder="e.g. MUR, USD"
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={form.phone ?? ""}
                    onChange={(e) => updateField("phone", e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email ?? ""}
                    onChange={(e) => updateField("email", e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax Registration Number
                </label>
                <input
                  type="text"
                  value={form.tax_number ?? ""}
                  onChange={(e) => updateField("tax_number", e.target.value)}
                  placeholder="VAT / TIN"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button
                onClick={closeCreate}
                className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-200 transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.name?.trim()}
                className="flex items-center gap-2 bg-posterita-blue text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? "Creating..." : "Create Store"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingStore && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={closeEdit}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-store-title"
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-xl">
                  <Store size={24} className="text-posterita-blue" />
                </div>
                <div>
                  <h2 id="edit-store-title" className="text-lg font-semibold">Edit Store</h2>
                  <p className="text-sm text-gray-500">
                    ID: {editingStore.store_id}
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
                  Store Name *
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
                  Address
                </label>
                <input
                  type="text"
                  value={form.address ?? ""}
                  onChange={(e) => updateField("address", e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={form.city ?? ""}
                    onChange={(e) => updateField("city", e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <input
                    type="text"
                    value={form.currency ?? ""}
                    onChange={(e) => updateField("currency", e.target.value)}
                    placeholder="e.g. MUR, USD"
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={form.phone ?? ""}
                    onChange={(e) => updateField("phone", e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email ?? ""}
                    onChange={(e) => updateField("email", e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax Registration Number
                  </label>
                  <input
                    type="text"
                    value={form.tax_number ?? ""}
                    onChange={(e) => updateField("tax_number", e.target.value)}
                    placeholder="VAT / TIN"
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                  />
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
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
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
      )}
    </div>
  );
}
