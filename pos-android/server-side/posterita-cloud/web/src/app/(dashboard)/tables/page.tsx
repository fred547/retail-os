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
  LayoutGrid,
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
  section_id: number | null;
  created_at: string;
  updated_at: string;
}

interface TableSection {
  section_id: number;
  account_id: string;
  store_id: number;
  name: string;
  display_order: number;
  color: string;
  is_active: boolean;
  is_takeaway: boolean;
}

interface Store {
  store_id: number;
  name: string;
}

export default function TablesPage() {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [sections, setSections] = useState<TableSection[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSection, setFilterSection] = useState<number | "all">("all");

  // Table form state
  const [showForm, setShowForm] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [formName, setFormName] = useState("");
  const [formSeats, setFormSeats] = useState(4);
  const [formStoreId, setFormStoreId] = useState<number>(0);
  const [formSectionId, setFormSectionId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Section form state
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [editingSection, setEditingSection] = useState<TableSection | null>(null);
  const [sectionName, setSectionName] = useState("");
  const [sectionColor, setSectionColor] = useState("#6B7280");
  const [sectionStoreId, setSectionStoreId] = useState<number>(0);
  const [sectionTakeaway, setSectionTakeaway] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [tablesRes, sectionsRes, storesRes] = await Promise.all([
      dataQuery<RestaurantTable>("restaurant_table", {
        order: { column: "table_name" },
      }),
      dataQuery<TableSection>("table_section", {
        order: { column: "display_order" },
      }),
      dataQuery<Store>("store", {
        select: "store_id, name",
        filters: [{ column: "isactive", op: "eq", value: "Y" }],
        order: { column: "name" },
      }),
    ]);
    setTables(tablesRes.data ?? []);
    setSections(sectionsRes.data ?? []);
    setStores(storesRes.data ?? []);
    if (storesRes.data?.[0] && formStoreId === 0) {
      setFormStoreId(storesRes.data[0].store_id);
      setSectionStoreId(storesRes.data[0].store_id);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const storeNameMap = Object.fromEntries(stores.map((s) => [s.store_id, s.name]));
  const sectionNameMap = Object.fromEntries(sections.map((s) => [s.section_id, s]));

  const filteredTables =
    filterSection === "all"
      ? tables
      : filterSection === 0
        ? tables.filter((t) => !t.section_id)
        : tables.filter((t) => t.section_id === filterSection);

  // ---------- Table CRUD ----------

  const openAddForm = () => {
    setEditingTable(null);
    setFormName("");
    setFormSeats(4);
    setFormSectionId(null);
    if (stores[0]) setFormStoreId(stores[0].store_id);
    setShowForm(true);
  };

  const openEditForm = (table: RestaurantTable) => {
    setEditingTable(table);
    setFormName(table.table_name);
    setFormSeats(table.seats);
    setFormStoreId(table.store_id);
    setFormSectionId(table.section_id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);

    const record: Record<string, any> = {
      table_name: formName.trim(),
      seats: formSeats,
      store_id: formStoreId,
      section_id: formSectionId,
      updated_at: new Date().toISOString(),
    };

    if (editingTable) {
      await dataUpdate("restaurant_table", { column: "table_id", value: editingTable.table_id }, record);
    } else {
      await dataInsert("restaurant_table", { ...record, is_occupied: false });
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

  // ---------- Section CRUD ----------

  const openAddSection = () => {
    setEditingSection(null);
    setSectionName("");
    setSectionColor("#6B7280");
    setSectionTakeaway(false);
    if (stores[0]) setSectionStoreId(stores[0].store_id);
    setShowSectionForm(true);
  };

  const openEditSection = (section: TableSection) => {
    setEditingSection(section);
    setSectionName(section.name);
    setSectionColor(section.color);
    setSectionStoreId(section.store_id);
    setSectionTakeaway(section.is_takeaway);
    setShowSectionForm(true);
  };

  const handleSaveSection = async () => {
    if (!sectionName.trim()) return;
    setSaving(true);

    const record = {
      name: sectionName.trim(),
      color: sectionColor,
      store_id: sectionStoreId,
      is_takeaway: sectionTakeaway,
      is_active: true,
      display_order: editingSection?.display_order ?? sections.length,
      updated_at: new Date().toISOString(),
    };

    if (editingSection) {
      await dataUpdate("table_section", { column: "section_id", value: editingSection.section_id }, record);
    } else {
      await dataInsert("table_section", record);
    }

    setSaving(false);
    setShowSectionForm(false);
    await fetchData();
  };

  const handleDeleteSection = async (section: TableSection) => {
    const count = tables.filter((t) => t.section_id === section.section_id).length;
    const msg = count > 0
      ? `Delete section "${section.name}"? ${count} table(s) will become unsectioned.`
      : `Delete section "${section.name}"?`;
    if (!confirm(msg)) return;
    // Nullify section_id on affected tables
    for (const t of tables.filter((t) => t.section_id === section.section_id)) {
      await dataUpdate("restaurant_table", { column: "table_id", value: t.table_id }, {
        section_id: null,
        updated_at: new Date().toISOString(),
      });
    }
    await dataDelete("table_section", { column: "section_id", value: section.section_id });
    await fetchData();
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Tables" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tables</h1>
          <p className="text-gray-500 mt-1">Manage restaurant table layout and sections</p>
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

      {/* Sections panel */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <LayoutGrid size={18} />
            Sections
          </h3>
          <button
            onClick={openAddSection}
            className="flex items-center gap-1.5 text-sm text-posterita-blue hover:text-blue-700 font-medium"
          >
            <Plus size={16} />
            Add Section
          </button>
        </div>
        {sections.length === 0 ? (
          <p className="text-sm text-gray-400">No sections yet. Tables will show in a flat list.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {sections.map((s) => (
              <div
                key={s.section_id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 group"
              >
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-sm font-medium">{s.name}</span>
                {s.is_takeaway && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">T/A</span>
                )}
                <span className="text-xs text-gray-400">
                  {tables.filter((t) => t.section_id === s.section_id).length} tables
                </span>
                <button
                  onClick={() => openEditSection(s)}
                  className="p-0.5 text-gray-400 hover:text-posterita-blue opacity-0 group-hover:opacity-100 transition"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => handleDeleteSection(s)}
                  className="p-0.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section add/edit form */}
      {showSectionForm && (
        <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">
              {editingSection ? "Edit Section" : "Add Section"}
            </h3>
            <button onClick={() => setShowSectionForm(false)} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Section Name</label>
              <input
                type="text"
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
                placeholder="e.g. Indoor, Patio"
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Store</label>
              <select
                value={sectionStoreId}
                onChange={(e) => setSectionStoreId(Number(e.target.value))}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
              >
                {stores.map((s) => (
                  <option key={s.store_id} value={s.store_id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Color</label>
                <input
                  type="color"
                  value={sectionColor}
                  onChange={(e) => setSectionColor(e.target.value)}
                  className="w-10 h-10 rounded border border-gray-200 cursor-pointer"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer pb-2">
                <input
                  type="checkbox"
                  checked={sectionTakeaway}
                  onChange={(e) => setSectionTakeaway(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-posterita-blue focus:ring-posterita-blue"
                />
                <span className="text-sm font-medium text-gray-700">Takeaway</span>
              </label>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSaveSection}
                disabled={saving || !sectionName.trim()}
                className="flex items-center gap-2 bg-posterita-blue text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section filter tabs */}
      {sections.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterSection("all")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
              filterSection === "all"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All ({tables.length})
          </button>
          {sections.map((s) => {
            const count = tables.filter((t) => t.section_id === s.section_id).length;
            return (
              <button
                key={s.section_id}
                onClick={() => setFilterSection(s.section_id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition flex items-center gap-1.5 ${
                  filterSection === s.section_id
                    ? "text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                style={filterSection === s.section_id ? { backgroundColor: s.color } : undefined}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.name} ({count})
              </button>
            );
          })}
          {tables.some((t) => !t.section_id) && (
            <button
              onClick={() => setFilterSection(0)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                filterSection === 0
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Unsectioned ({tables.filter((t) => !t.section_id).length})
            </button>
          )}
        </div>
      )}

      {/* Table add/edit form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">
              {editingTable ? "Edit Table" : "Add Table"}
            </h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Table Name</label>
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
                <Users size={14} /> Seats
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
              <label className="text-sm font-medium text-gray-700 mb-1 block">Section</label>
              <select
                value={formSectionId ?? ""}
                onChange={(e) => setFormSectionId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
              >
                <option value="">No section</option>
                {sections.map((s) => (
                  <option key={s.section_id} value={s.section_id}>{s.name}</option>
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

      {/* Table list */}
      {loading ? (
        <SkeletonTable rows={5} columns={6} />
      ) : tables.length === 0 ? (
        <div className="text-center py-16">
          <UtensilsCrossed className="mx-auto text-gray-400" size={64} />
          <h3 className="text-lg font-medium text-gray-700 mt-4">No tables configured</h3>
          <p className="text-gray-500 mt-1">Add tables to manage your restaurant floor plan</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Table Name</th>
                <th className="text-center">Seats</th>
                <th className="text-center">Status</th>
                <th>Section</th>
                <th>Store</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTables.map((t) => {
                const section = t.section_id ? sectionNameMap[t.section_id] : null;
                return (
                  <tr key={t.table_id}>
                    <td className="font-medium">{t.table_name}</td>
                    <td className="text-center">{t.seats}</td>
                    <td className="text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          t.is_occupied ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {t.is_occupied ? "Occupied" : "Free"}
                      </span>
                    </td>
                    <td>
                      {section ? (
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: section.color }} />
                          {section.name}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
