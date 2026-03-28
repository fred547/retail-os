"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Clock, Plus, Sun, Sunset, Moon, Coffee,
  X, Trash2, Edit2, RefreshCw, ToggleLeft, ToggleRight,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";

interface Schedule {
  id: number;
  name: string;
  description: string | null;
  store_id: number;
  category_ids: number[];
  start_time: string;
  end_time: string;
  days_of_week: number[];
  priority: number;
  is_active: boolean;
}

const DAY_LABELS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIME_ICONS: Record<string, any> = {
  morning: Sun,
  afternoon: Sunset,
  evening: Moon,
  default: Coffee,
};

function getTimeIcon(start: string) {
  const hour = parseInt(start.split(":")[0] || "0");
  if (hour >= 5 && hour < 12) return TIME_ICONS.morning;
  if (hour >= 12 && hour < 17) return TIME_ICONS.afternoon;
  if (hour >= 17 || hour < 5) return TIME_ICONS.evening;
  return TIME_ICONS.default;
}

function getTimeColor(start: string) {
  const hour = parseInt(start.split(":")[0] || "0");
  if (hour >= 5 && hour < 12) return "bg-yellow-50 text-yellow-600";
  if (hour >= 12 && hour < 17) return "bg-orange-50 text-orange-600";
  return "bg-indigo-50 text-indigo-600";
}

export default function MenuSchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);

  // Form
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formStart, setFormStart] = useState("06:00");
  const [formEnd, setFormEnd] = useState("11:00");
  const [formDays, setFormDays] = useState([1, 2, 3, 4, 5, 6, 7]);
  const [formPriority, setFormPriority] = useState(0);
  const [saving, setSaving] = useState(false);

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/menu-schedules");
      const data = await res.json();
      setSchedules(data.schedules || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSchedules(); }, [loadSchedules]);

  const resetForm = () => {
    setFormName(""); setFormDesc(""); setFormStart("06:00"); setFormEnd("11:00");
    setFormDays([1, 2, 3, 4, 5, 6, 7]); setFormPriority(0);
  };

  const openCreate = () => { resetForm(); setEditing(null); setShowCreate(true); };
  const openEdit = (s: Schedule) => {
    setFormName(s.name); setFormDesc(s.description || "");
    setFormStart(s.start_time); setFormEnd(s.end_time);
    setFormDays(s.days_of_week); setFormPriority(s.priority);
    setEditing(s); setShowCreate(true);
  };

  const toggleDay = (day: number) => {
    setFormDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort());
  };

  const saveSchedule = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: formName, description: formDesc, start_time: formStart,
        end_time: formEnd, days_of_week: formDays, priority: formPriority,
      };
      if (editing) {
        await fetch(`/api/menu-schedules/${editing.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/menu-schedules", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setShowCreate(false);
      loadSchedules();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: number, current: boolean) => {
    await fetch(`/api/menu-schedules/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !current }),
    });
    loadSchedules();
  };

  const deleteSchedule = async (id: number) => {
    await fetch(`/api/menu-schedules/${id}`, { method: "DELETE" });
    loadSchedules();
  };

  if (loading && schedules.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
        Loading menu schedules...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Menu Schedules" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clock size={28} className="text-orange-500" />
            Menu Schedules
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Control which categories appear on POS by time of day
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors"
        >
          <Plus size={16} /> Add Schedule
        </button>
      </div>

      {/* Timeline visualization */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Today&apos;s Timeline</h3>
        <div className="relative h-12 bg-gray-100 rounded-full overflow-hidden">
          {schedules.filter((s) => s.is_active).map((s) => {
            const startHour = parseInt(s.start_time.split(":")[0]) + parseInt(s.start_time.split(":")[1]) / 60;
            const endHour = parseInt(s.end_time.split(":")[0]) + parseInt(s.end_time.split(":")[1]) / 60;
            const left = (startHour / 24) * 100;
            const width = ((endHour > startHour ? endHour - startHour : 24 - startHour + endHour) / 24) * 100;
            return (
              <div
                key={s.id}
                className={`absolute top-1 bottom-1 rounded-full ${getTimeColor(s.start_time)} flex items-center justify-center text-xs font-medium`}
                style={{ left: `${left}%`, width: `${Math.max(width, 4)}%` }}
                title={`${s.name}: ${s.start_time}–${s.end_time}`}
              >
                {width > 8 ? s.name : ""}
              </div>
            );
          })}
          {/* Time markers */}
          {[0, 6, 12, 18].map((h) => (
            <div key={h} className="absolute top-0 bottom-0 border-l border-gray-300" style={{ left: `${(h / 24) * 100}%` }}>
              <span className="absolute -bottom-5 -left-2 text-[10px] text-gray-400">{h}:00</span>
            </div>
          ))}
        </div>
      </div>

      {/* Schedule Cards */}
      <div className="space-y-3">
        {schedules.map((s) => {
          const Icon = getTimeIcon(s.start_time);
          const color = getTimeColor(s.start_time);
          return (
            <div key={s.id} className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 ${!s.is_active ? "opacity-60" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{s.name}</p>
                    <p className="text-sm text-gray-500">
                      {s.start_time} – {s.end_time}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleActive(s.id, s.is_active)} className="text-gray-400 hover:text-gray-600">
                    {s.is_active ? <ToggleRight size={24} className="text-green-500" /> : <ToggleLeft size={24} />}
                  </button>
                  <button onClick={() => openEdit(s)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => deleteSchedule(s.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <span
                    key={d}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                      s.days_of_week.includes(d)
                        ? "bg-orange-100 text-orange-700"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {DAY_LABELS[d]}
                  </span>
                ))}
                {s.category_ids.length > 0 && (
                  <span className="ml-2 text-xs text-gray-400">
                    {s.category_ids.length} categories
                  </span>
                )}
                {s.priority > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">
                    Priority: {s.priority}
                  </span>
                )}
              </div>
              {s.description && (
                <p className="mt-2 text-xs text-gray-400">{s.description}</p>
              )}
            </div>
          );
        })}
      </div>

      {schedules.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-400">
          <Clock size={40} className="mx-auto mb-3 text-gray-300" />
          <p>No menu schedules yet. Create schedules to show different menus by time of day.</p>
        </div>
      )}

      {/* Create/Edit Sheet */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editing ? "Edit Schedule" : "New Schedule"}</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g., Breakfast Menu"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input type="text" value={formDesc} onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                  <input type="time" value={formStart} onChange={(e) => setFormStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
                  <input type="time" value={formEnd} onChange={(e) => setFormEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Days</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                    <button
                      key={d}
                      onClick={() => toggleDay(d)}
                      className={`w-10 h-10 rounded-full text-xs font-medium transition-colors ${
                        formDays.includes(d)
                          ? "bg-orange-500 text-white"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {DAY_LABELS[d]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <input type="number" value={formPriority} onChange={(e) => setFormPriority(parseInt(e.target.value) || 0)} min={0}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
                <p className="text-xs text-gray-400 mt-1">Higher priority takes precedence when schedules overlap</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={saveSchedule} disabled={saving || !formName.trim()}
                className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors disabled:opacity-50">
                {saving ? "Saving..." : editing ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
