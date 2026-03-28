"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Clock, Save, RefreshCw, Plus, X, Trash2, Store,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { logError } from "@/lib/error-logger";

interface StoreOption {
  store_id: number;
  name: string;
}

interface OperatingHours {
  id: number;
  store_id: number;
  day_type: string;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}

interface HoursOverride {
  id: number;
  store_id: number;
  date: string;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
  reason: string | null;
}

type Tab = "regular" | "overrides";

const DAY_TYPES = [
  { key: "weekday", label: "Weekday (Mon-Fri)", defaultOpen: "08:00", defaultClose: "18:00" },
  { key: "saturday", label: "Saturday", defaultOpen: "09:00", defaultClose: "17:00" },
  { key: "sunday", label: "Sunday", defaultOpen: "10:00", defaultClose: "16:00" },
  { key: "public_holiday", label: "Public Holiday", defaultOpen: "10:00", defaultClose: "16:00" },
];

export default function OperatingHoursPage() {
  const [tab, setTab] = useState<Tab>("regular");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [selectedStore, setSelectedStore] = useState<number>(0);

  // Regular hours
  const [hours, setHours] = useState<Record<string, { open_time: string; close_time: string; is_closed: boolean }>>({});

  // Overrides
  const [overrides, setOverrides] = useState<HoursOverride[]>([]);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideOpen, setOverrideOpen] = useState("10:00");
  const [overrideClose, setOverrideClose] = useState("16:00");
  const [overrideClosed, setOverrideClosed] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  const loadStores = useCallback(async () => {
    try {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "store", select: "store_id, name", filters: [{ column: "isactive", op: "eq", value: "Y" }] }),
      });
      const data = await res.json();
      const list: StoreOption[] = data.data || [];
      setStores(list);
      if (list.length > 0 && !selectedStore) setSelectedStore(list[0].store_id);
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      logError("OperatingHours", `Failed to load stores: ${err.message}`);
    }
  }, []);

  const loadHours = useCallback(async () => {
    if (!selectedStore) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/operating-hours?store_id=${selectedStore}`);
      const data = await res.json();
      const map: Record<string, { open_time: string; close_time: string; is_closed: boolean }> = {};
      for (const dt of DAY_TYPES) {
        const found: OperatingHours | undefined = (data.hours || []).find((h: OperatingHours) => h.day_type === dt.key);
        map[dt.key] = {
          open_time: found?.open_time?.slice(0, 5) || dt.defaultOpen,
          close_time: found?.close_time?.slice(0, 5) || dt.defaultClose,
          is_closed: found?.is_closed ?? false,
        };
      }
      setHours(map);
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      logError("OperatingHours", `Failed to load hours: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [selectedStore]);

  const loadOverrides = useCallback(async () => {
    if (!selectedStore) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/operating-hours/overrides?store_id=${selectedStore}`);
      const data = await res.json();
      setOverrides(data.overrides || []);
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      logError("OperatingHours", `Failed to load overrides: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [selectedStore]);

  useEffect(() => { loadStores(); }, [loadStores]);
  useEffect(() => {
    if (selectedStore) {
      if (tab === "regular") loadHours();
      else loadOverrides();
    }
  }, [selectedStore, tab, loadHours, loadOverrides]);

  const handleSaveHours = async () => {
    setSaving(true);
    try {
      const entries = DAY_TYPES.map(dt => ({
        store_id: selectedStore,
        day_type: dt.key,
        open_time: hours[dt.key]?.is_closed ? null : hours[dt.key]?.open_time,
        close_time: hours[dt.key]?.is_closed ? null : hours[dt.key]?.close_time,
        is_closed: hours[dt.key]?.is_closed ?? false,
      }));

      const res = await fetch("/api/staff/operating-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      if (!res.ok) throw new Error("Failed to save");
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      logError("OperatingHours", `Save failed: ${err.message}`);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateOverride = async () => {
    if (!overrideDate) return;
    setSaving(true);
    try {
      const res = await fetch("/api/staff/operating-hours/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: selectedStore,
          date: overrideDate,
          open_time: overrideClosed ? null : overrideOpen,
          close_time: overrideClosed ? null : overrideClose,
          is_closed: overrideClosed,
          reason: overrideReason || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to create");
      setShowOverrideModal(false);
      loadOverrides();
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      logError("OperatingHours", `Override create failed: ${err.message}`);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOverride = async (id: number) => {
    if (!confirm("Remove this override?")) return;
    try {
      await fetch(`/api/staff/operating-hours/overrides?id=${id}`, { method: "DELETE" });
      loadOverrides();
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      logError("OperatingHours", `Override delete failed: ${err.message}`);
    }
  };

  const updateHour = (dayType: string, field: string, value: string | boolean) => {
    setHours(prev => ({
      ...prev,
      [dayType]: { ...prev[dayType], [field]: value },
    }));
  };

  const formatDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Staff", href: "/staff" }, { label: "Operating Hours" }]} />

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clock size={28} className="text-green-600" />
            Store Operating Hours
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Set regular hours and date-specific overrides for shift planning
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Store size={16} className="text-gray-400" />
          <select
            value={selectedStore}
            onChange={e => setSelectedStore(Number(e.target.value))}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20"
          >
            {stores.map(s => (
              <option key={s.store_id} value={s.store_id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("regular")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "regular" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Regular Hours
        </button>
        <button
          onClick={() => setTab("overrides")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "overrides" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Date Overrides
        </button>
      </div>

      {/* Regular Hours */}
      {tab === "regular" && (
        loading ? (
          <div className="text-center py-16 text-gray-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
            Loading hours...
          </div>
        ) : (
          <div className="space-y-4">
            {DAY_TYPES.map(dt => {
              const h = hours[dt.key];
              if (!h) return null;
              return (
                <div key={dt.key} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="min-w-[180px]">
                      <h4 className="font-semibold text-gray-900">{dt.label}</h4>
                      {h.is_closed && (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-600">
                          Closed
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      {!h.is_closed && (
                        <>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Open</label>
                            <input
                              type="time"
                              value={h.open_time}
                              onChange={e => updateHour(dt.key, "open_time", e.target.value)}
                              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Close</label>
                            <input
                              type="time"
                              value={h.close_time}
                              onChange={e => updateHour(dt.key, "close_time", e.target.value)}
                              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20"
                            />
                          </div>
                        </>
                      )}
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`closed-${dt.key}`}
                          checked={h.is_closed}
                          onChange={e => updateHour(dt.key, "is_closed", e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-red-500 focus:ring-red-500/20"
                        />
                        <label htmlFor={`closed-${dt.key}`} className="text-sm text-gray-600">Closed</label>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="flex justify-end">
              <button
                onClick={handleSaveHours}
                disabled={saving}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-lg bg-posterita-blue text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Save size={16} />
                {saving ? "Saving..." : "Save Hours"}
              </button>
            </div>
          </div>
        )
      )}

      {/* Overrides */}
      {tab === "overrides" && (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => {
                setOverrideDate("");
                setOverrideOpen("10:00");
                setOverrideClose("16:00");
                setOverrideClosed(false);
                setOverrideReason("");
                setShowOverrideModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-posterita-blue text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} /> Add Override
            </button>
          </div>

          {loading ? (
            <div className="text-center py-16 text-gray-400">
              <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
              Loading overrides...
            </div>
          ) : overrides.length > 0 ? (
            <div className="space-y-2">
              {overrides.map(o => (
                <div key={o.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center">
                      <span className="text-sm font-bold text-amber-600">
                        {new Date(o.date + "T00:00:00").getDate()}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{formatDate(o.date)}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        {o.is_closed ? (
                          <span className="text-sm text-red-600 font-medium">Closed</span>
                        ) : (
                          <span className="text-sm text-gray-500">
                            {o.open_time?.slice(0, 5)} – {o.close_time?.slice(0, 5)}
                          </span>
                        )}
                        {o.reason && (
                          <span className="text-xs text-gray-400">— {o.reason}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteOverride(o.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-12 text-center">
              <Clock size={40} className="mx-auto text-gray-300" />
              <h3 className="text-base font-medium text-gray-700 mt-3">No overrides</h3>
              <p className="text-sm text-gray-500 mt-1">
                Add date-specific exceptions like Christmas closures or renovation days.
              </p>
            </div>
          )}
        </>
      )}

      {/* Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowOverrideModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Date Override</h3>
              <button onClick={() => setShowOverrideModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={overrideDate}
                  onChange={e => setOverrideDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="overrideClosed"
                  checked={overrideClosed}
                  onChange={e => setOverrideClosed(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-red-500 focus:ring-red-500/20"
                />
                <label htmlFor="overrideClosed" className="text-sm text-gray-700">Closed all day</label>
              </div>
              {!overrideClosed && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Open</label>
                    <input
                      type="time"
                      value={overrideOpen}
                      onChange={e => setOverrideOpen(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Close</label>
                    <input
                      type="time"
                      value={overrideClose}
                      onChange={e => setOverrideClose(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <input
                  type="text"
                  value={overrideReason}
                  onChange={e => setOverrideReason(e.target.value)}
                  placeholder="e.g. Christmas, Renovation"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowOverrideModal(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleCreateOverride}
                disabled={saving || !overrideDate}
                className="px-4 py-2 rounded-lg bg-posterita-blue text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Add Override"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
