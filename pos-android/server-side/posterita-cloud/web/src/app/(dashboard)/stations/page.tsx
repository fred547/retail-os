"use client";

import { useEffect, useState } from "react";
import { dataQuery, dataInsert, dataUpdate, dataDelete } from "@/lib/supabase/data-client";
import {
  ChefHat,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  GripVertical,
  Printer,
} from "lucide-react";
import { SkeletonTable } from "@/components/Skeleton";
import Breadcrumb from "@/components/Breadcrumb";

interface PreparationStation {
  station_id: number;
  account_id: string;
  store_id: number;
  name: string;
  station_type: string;
  printer_id: number | null;
  color: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CategoryStationMapping {
  id: number;
  account_id: string;
  category_id: number;
  station_id: number;
}

interface ProductCategory {
  category_id: number;
  name: string;
  isactive: string;
}

interface Store {
  store_id: number;
  name: string;
}

interface PrinterRecord {
  printer_id: number;
  name: string;
  role: string;
  station_id: number | null;
}

const STATION_TYPES = [
  { value: "kitchen", label: "Kitchen" },
  { value: "bar", label: "Bar" },
  { value: "dessert", label: "Dessert" },
  { value: "custom", label: "Custom" },
];

const TYPE_COLORS: Record<string, string> = {
  kitchen: "bg-orange-100 text-orange-700",
  bar: "bg-purple-100 text-purple-700",
  dessert: "bg-pink-100 text-pink-700",
  custom: "bg-gray-100 text-gray-600",
};

export default function StationsPage() {
  const [stations, setStations] = useState<PreparationStation[]>([]);
  const [mappings, setMappings] = useState<CategoryStationMapping[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [printers, setPrinters] = useState<PrinterRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingStation, setEditingStation] = useState<PreparationStation | null>(null);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("kitchen");
  const [formColor, setFormColor] = useState("#3B82F6");
  const [formStoreId, setFormStoreId] = useState<number>(0);
  const [formPrinterId, setFormPrinterId] = useState<number | null>(null);
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Category mapping state
  const [showMappingFor, setShowMappingFor] = useState<number | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Set<number>>(new Set());

  const fetchData = async () => {
    setLoading(true);
    const [stationsRes, mappingsRes, categoriesRes, storesRes, printersRes] = await Promise.all([
      dataQuery<PreparationStation>("preparation_station", {
        order: { column: "display_order" },
      }),
      dataQuery<CategoryStationMapping>("category_station_mapping"),
      dataQuery<ProductCategory>("productcategory", {
        select: "category_id, name, isactive",
        filters: [{ column: "isactive", op: "eq", value: "Y" }],
        order: { column: "name" },
      }),
      dataQuery<Store>("store", {
        select: "store_id, name",
        filters: [{ column: "isactive", op: "eq", value: "Y" }],
        order: { column: "name" },
      }),
      dataQuery<PrinterRecord>("printer", {
        select: "printer_id, name, role, station_id",
        order: { column: "name" },
      }),
    ]);
    setStations(stationsRes.data ?? []);
    setMappings(mappingsRes.data ?? []);
    setCategories(categoriesRes.data ?? []);
    setStores(storesRes.data ?? []);
    setPrinters(printersRes.data ?? []);
    if (storesRes.data?.[0] && formStoreId === 0) {
      setFormStoreId(storesRes.data[0].store_id);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const storeNameMap = Object.fromEntries(stores.map((s) => [s.store_id, s.name]));
  const printerNameMap = Object.fromEntries(printers.map((p) => [p.printer_id, p.name]));

  const getCategoryCountForStation = (stationId: number) =>
    mappings.filter((m) => m.station_id === stationId).length;

  const openAddForm = () => {
    setEditingStation(null);
    setFormName("");
    setFormType("kitchen");
    setFormColor("#3B82F6");
    setFormActive(true);
    setFormPrinterId(null);
    if (stores[0]) setFormStoreId(stores[0].store_id);
    setShowForm(true);
  };

  const openEditForm = (station: PreparationStation) => {
    setEditingStation(station);
    setFormName(station.name);
    setFormType(station.station_type);
    setFormColor(station.color);
    setFormStoreId(station.store_id);
    setFormPrinterId(station.printer_id);
    setFormActive(station.is_active);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);

    const record = {
      name: formName.trim(),
      station_type: formType,
      color: formColor,
      store_id: formStoreId,
      printer_id: formPrinterId,
      is_active: formActive,
      display_order: editingStation?.display_order ?? stations.length,
      updated_at: new Date().toISOString(),
    };

    if (editingStation) {
      await dataUpdate("preparation_station", { column: "station_id", value: editingStation.station_id }, record);
    } else {
      await dataInsert("preparation_station", record);
    }

    setSaving(false);
    setShowForm(false);
    await fetchData();
  };

  const handleDelete = async (station: PreparationStation) => {
    if (!confirm(`Delete station "${station.name}"? Category mappings for this station will also be removed.`)) return;
    // Delete mappings first
    const stationMappings = mappings.filter((m) => m.station_id === station.station_id);
    for (const m of stationMappings) {
      await dataDelete("category_station_mapping", { column: "id", value: m.id });
    }
    await dataDelete("preparation_station", { column: "station_id", value: station.station_id });
    await fetchData();
  };

  const openMappingPanel = (stationId: number) => {
    const mapped = new Set(mappings.filter((m) => m.station_id === stationId).map((m) => m.category_id));
    setSelectedCategories(mapped);
    setShowMappingFor(stationId);
  };

  const toggleCategory = (categoryId: number) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const saveMappings = async () => {
    if (showMappingFor === null) return;
    setSaving(true);
    const stationId = showMappingFor;

    // Delete all existing mappings for categories being reassigned to this station
    const existingForStation = mappings.filter((m) => m.station_id === stationId);
    for (const m of existingForStation) {
      await dataDelete("category_station_mapping", { column: "id", value: m.id });
    }

    // Also remove mappings from OTHER stations for newly selected categories
    // (unique constraint: one station per category)
    for (const catId of selectedCategories) {
      const otherMapping = mappings.find((m) => m.category_id === catId && m.station_id !== stationId);
      if (otherMapping) {
        await dataDelete("category_station_mapping", { column: "id", value: otherMapping.id });
      }
    }

    // Insert new mappings
    for (const catId of selectedCategories) {
      await dataInsert("category_station_mapping", {
        category_id: catId,
        station_id: stationId,
      });
    }

    setSaving(false);
    setShowMappingFor(null);
    await fetchData();
  };

  const kitchenPrinters = printers.filter(
    (p) => p.role === "kitchen" || p.role === "bar"
  );

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Stations" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Preparation Stations</h1>
          <p className="text-gray-500 mt-1">
            Route kitchen items to the right station and printer
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
            Add Station
          </button>
        </div>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">
              {editingStation ? "Edit Station" : "Add Station"}
            </h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Station Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Grill Station"
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Type</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
              >
                {STATION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Store</label>
              <select
                value={formStoreId}
                onChange={(e) => setFormStoreId(Number(e.target.value))}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
              >
                {stores.map((s) => (
                  <option key={s.store_id} value={s.store_id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                <Printer size={14} />
                Linked Printer
              </label>
              <select
                value={formPrinterId ?? ""}
                onChange={(e) => setFormPrinterId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
              >
                <option value="">None (use any kitchen printer)</option>
                {kitchenPrinters.map((p) => (
                  <option key={p.printer_id} value={p.printer_id}>
                    {p.name} ({p.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Color</label>
              <input
                type="color"
                value={formColor}
                onChange={(e) => setFormColor(e.target.value)}
                className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-posterita-blue focus:ring-posterita-blue"
              />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>
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

      {/* Category mapping panel */}
      {showMappingFor !== null && (
        <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">
              Map Categories to {stations.find((s) => s.station_id === showMappingFor)?.name}
            </h3>
            <button onClick={() => setShowMappingFor(null)} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-3">
            Items in selected categories will route to this station. Each category can only map to one station.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {categories.map((cat) => {
              const otherStation = mappings.find(
                (m) => m.category_id === cat.category_id && m.station_id !== showMappingFor
              );
              const otherStationName = otherStation
                ? stations.find((s) => s.station_id === otherStation.station_id)?.name
                : null;
              return (
                <label
                  key={cat.category_id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition ${
                    selectedCategories.has(cat.category_id)
                      ? "border-posterita-blue bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.has(cat.category_id)}
                    onChange={() => toggleCategory(cat.category_id)}
                    className="w-4 h-4 rounded border-gray-300 text-posterita-blue focus:ring-posterita-blue"
                  />
                  <div>
                    <span className="text-sm font-medium">{cat.name}</span>
                    {otherStationName && !selectedCategories.has(cat.category_id) && (
                      <span className="block text-xs text-gray-400">
                        Currently: {otherStationName}
                      </span>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={saveMappings}
              disabled={saving}
              className="flex items-center gap-2 bg-posterita-blue text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save Mappings"}
            </button>
          </div>
        </div>
      )}

      {/* Station list */}
      {loading ? (
        <SkeletonTable rows={4} columns={6} />
      ) : stations.length === 0 ? (
        <div className="text-center py-16">
          <ChefHat className="mx-auto text-gray-400" size={64} />
          <h3 className="text-lg font-medium text-gray-700 mt-4">No preparation stations</h3>
          <p className="text-gray-500 mt-1">
            Add stations to route kitchen items to the right printer
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}></th>
                <th>Station</th>
                <th>Type</th>
                <th>Store</th>
                <th>Printer</th>
                <th className="text-center">Categories</th>
                <th className="text-center">Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stations.map((s) => (
                <tr key={s.station_id} className={!s.is_active ? "opacity-50" : ""}>
                  <td>
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: s.color }} />
                  </td>
                  <td className="font-medium">{s.name}</td>
                  <td>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${TYPE_COLORS[s.station_type] ?? TYPE_COLORS.custom}`}>
                      {s.station_type}
                    </span>
                  </td>
                  <td className="text-gray-500 text-sm">
                    {storeNameMap[s.store_id] ?? `Store ${s.store_id}`}
                  </td>
                  <td className="text-gray-500 text-sm">
                    {s.printer_id ? (printerNameMap[s.printer_id] ?? `#${s.printer_id}`) : (
                      <span className="text-gray-400 italic">Any kitchen</span>
                    )}
                  </td>
                  <td className="text-center">
                    <button
                      onClick={() => openMappingPanel(s.station_id)}
                      className="text-posterita-blue hover:underline text-sm"
                    >
                      {getCategoryCountForStation(s.station_id)} mapped
                    </button>
                  </td>
                  <td className="text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      s.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {s.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditForm(s)}
                        className="p-1.5 text-gray-400 hover:text-posterita-blue transition"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(s)}
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
