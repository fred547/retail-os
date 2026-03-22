"use client";

import { useEffect, useState } from "react";
import { dataQuery, dataInsert, dataUpdate, dataDelete } from "@/lib/supabase/data-client";
import {
  UtensilsCrossed,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Users,
} from "lucide-react";
import { SkeletonTable } from "@/components/Skeleton";
import Breadcrumb from "@/components/Breadcrumb";

interface RestaurantTable {
  table_id: number;
  table_name: string;
  seats: number;
  is_occupied: boolean;
  current_order_id: string | null;
  store_id: number;
  terminal_id: number;
  created: number;
  updated: number;
}

interface Store {
  store_id: number;
  name: string;
}

export default function TablesPage() {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [formName, setFormName] = useState("");
  const [formSeats, setFormSeats] = useState(4);
  const [formStoreId, setFormStoreId] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [tablesRes, storesRes] = await Promise.all([
      dataQuery<RestaurantTable>("restaurant_table", {
        order: { column: "table_name" },
      }),
      dataQuery<Store>("store", {
        select: "store_id, name",
        filters: [{ column: "isactive", op: "eq", value: "Y" }],
        order: { column: "name" },
      }),
    ]);
    setTables(tablesRes.data ?? []);
    setStores(storesRes.data ?? []);
    if (storesRes.data?.[0] && formStoreId === 0) {
      setFormStoreId(storesRes.data[0].store_id);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const storeNameMap = Object.fromEntries(
    stores.map((s) => [s.store_id, s.name])
  );

  const openAddForm = () => {
    setEditingTable(null);
    setFormName("");
    setFormSeats(4);
    if (stores[0]) setFormStoreId(stores[0].store_id);
    setShowForm(true);
  };

  const openEditForm = (table: RestaurantTable) => {
    setEditingTable(table);
    setFormName(table.table_name);
    setFormSeats(table.seats);
    setFormStoreId(table.store_id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);

    if (editingTable) {
      await dataUpdate("restaurant_table", { column: "table_id", value: editingTable.table_id }, {
        table_name: formName.trim(),
        seats: formSeats,
        store_id: formStoreId,
        updated: Date.now(),
      });
    } else {
      await dataInsert("restaurant_table", {
        table_name: formName.trim(),
        seats: formSeats,
        store_id: formStoreId,
        is_occupied: false,
        created: Date.now(),
        updated: Date.now(),
      });
    }

    setSaving(false);
    setShowForm(false);
    await fetchData();
  };

  const handleDelete = async (table: RestaurantTable) => {
    if (!confirm(`Delete table "${table.table_name}"?`)) return;
    await dataDelete("restaurant_table", { column: "table_id", value: table.table_id });
    await fetchData();
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Dashboard", href: "/customer" }, { label: "Tables" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tables</h1>
          <p className="text-gray-500 mt-1">
            Manage restaurant table layout
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 bg-gray-100 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
          <button
            onClick={openAddForm}
            className="flex items-center gap-2 bg-posterita-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={18} />
            Add Table
          </button>
        </div>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">
              {editingTable ? "Edit Table" : "Add Table"}
            </h3>
            <button
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Table Name
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Table 1, Patio A"
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                <Users size={14} />
                Seats
              </label>
              <input
                type="number"
                min={1}
                value={formSeats}
                onChange={(e) => setFormSeats(Number(e.target.value) || 1)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Store
              </label>
              <select
                value={formStoreId}
                onChange={(e) => setFormStoreId(Number(e.target.value))}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
              >
                {stores.map((s) => (
                  <option key={s.store_id} value={s.store_id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={handleSave}
              disabled={saving || !formName.trim()}
              className="flex items-center gap-2 bg-posterita-blue text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonTable rows={5} columns={5} />
      ) : tables.length === 0 ? (
        <div className="text-center py-16">
          <UtensilsCrossed className="mx-auto text-gray-400" size={64} />
          <h3 className="text-lg font-medium text-gray-700 mt-4">
            No tables configured
          </h3>
          <p className="text-gray-500 mt-1">
            Add tables to manage your restaurant floor plan
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Table Name</th>
                <th className="text-center">Seats</th>
                <th className="text-center">Status</th>
                <th>Store</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tables.map((t) => (
                <tr key={t.table_id}>
                  <td className="font-medium">{t.table_name}</td>
                  <td className="text-center">{t.seats}</td>
                  <td className="text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        t.is_occupied
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {t.is_occupied ? "Occupied" : "Free"}
                    </span>
                  </td>
                  <td className="text-gray-500 text-sm">
                    {storeNameMap[t.store_id] ?? `Store ${t.store_id}`}
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditForm(t)}
                        className="p-1.5 text-gray-400 hover:text-posterita-blue transition"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(t)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
