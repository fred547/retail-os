"use client";

import { useEffect, useState, useCallback } from "react";
import { Calendar, Plus, X, Trash2, RefreshCw, Sparkles } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { logError } from "@/lib/error-logger";

interface Holiday {
  id: number;
  date: string;
  name: string;
  country_code: string;
  is_recurring: boolean;
  created_at: string;
}

export default function HolidaysPage() {
  const [loading, setLoading] = useState(true);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Form
  const [formDate, setFormDate] = useState("");
  const [formName, setFormName] = useState("");
  const [formRecurring, setFormRecurring] = useState(false);

  const loadHolidays = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/holidays?year=${year}`);
      const data = await res.json();
      setHolidays(data.holidays || []);
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      logError("Holidays", `Failed to load: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { loadHolidays(); }, [loadHolidays]);

  const handleCreate = async () => {
    if (!formDate || !formName) return;
    setSaving(true);
    try {
      const res = await fetch("/api/staff/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: formDate, name: formName, is_recurring: formRecurring }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create");
      }
      setShowCreate(false);
      setFormDate("");
      setFormName("");
      setFormRecurring(false);
      loadHolidays();
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      logError("Holidays", `Create failed: ${err.message}`);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this holiday?")) return;
    try {
      const res = await fetch(`/api/staff/holidays?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      loadHolidays();
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      logError("Holidays", `Delete failed: ${err.message}`);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/staff/holidays/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country_code: "MU", year }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Seed failed");
      loadHolidays();
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      logError("Holidays", `Seed failed: ${err.message}`);
      alert(err.message);
    } finally {
      setSeeding(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString(undefined, {
      weekday: "short", month: "short", day: "numeric",
    });

  // Group by month
  const byMonth: Record<string, Holiday[]> = {};
  for (const h of holidays) {
    const month = new Date(h.date + "T00:00:00").toLocaleDateString(undefined, { month: "long" });
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month].push(h);
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Staff", href: "/staff" }, { label: "Holidays" }]} />

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar size={28} className="text-red-600" />
            Public Holidays
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Holidays affect shift multipliers — public holiday hours count at 2x by default
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20"
          >
            {[2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100 transition-colors disabled:opacity-50"
          >
            <Sparkles size={16} />
            {seeding ? "Seeding..." : "Seed Mauritius"}
          </button>
          <button
            onClick={() => {
              setFormDate("");
              setFormName("");
              setFormRecurring(false);
              setShowCreate(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-posterita-blue text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} /> Add Holiday
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">
          <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
          Loading holidays...
        </div>
      ) : holidays.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(byMonth).map(([month, items]) => (
            <div key={month}>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{month}</h3>
              <div className="space-y-2">
                {items.map(h => (
                  <div key={h.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center">
                        <span className="text-sm font-bold text-red-600">
                          {new Date(h.date + "T00:00:00").getDate()}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{h.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-sm text-gray-500">{formatDate(h.date)}</span>
                          {h.is_recurring && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-600">
                              Recurring
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(h.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-12 text-center">
          <Calendar size={40} className="mx-auto text-gray-300" />
          <h3 className="text-base font-medium text-gray-700 mt-3">No holidays for {year}</h3>
          <p className="text-sm text-gray-500 mt-1">
            Click &ldquo;Seed Mauritius&rdquo; to add the 14 public holidays, or add them manually.
          </p>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Public Holiday</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Holiday Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. National Day"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={formRecurring}
                  onChange={e => setFormRecurring(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-posterita-blue focus:ring-posterita-blue/20"
                />
                <label htmlFor="recurring" className="text-sm text-gray-700">
                  Recurring (same date every year)
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !formDate || !formName}
                className="px-4 py-2 rounded-lg bg-posterita-blue text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Add Holiday"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
