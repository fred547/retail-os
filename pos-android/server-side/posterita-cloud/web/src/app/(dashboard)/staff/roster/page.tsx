"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList, Settings2, RefreshCw, Save, Calendar, Users,
  Plus, X, Trash2, Edit2, Store, ChevronRight, Eye,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { logError } from "@/lib/error-logger";

interface LaborConfig {
  id: number;
  standard_weekly_hours: number;
  standard_daily_hours: number;
  weekday_multiplier: number;
  saturday_multiplier: number;
  sunday_multiplier: number;
  public_holiday_multiplier: number;
  overtime_multiplier: number;
  min_break_minutes: number;
}

interface TemplateSlot {
  id: number;
  store_id: number;
  name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  break_minutes: number;
  required_role: string | null;
  color: string | null;
}

interface StoreOption {
  store_id: number;
  name: string;
}

interface RosterPeriod {
  id: number;
  store_id: number;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  picking_deadline: string | null;
  approved_at: string | null;
  created_at: string;
}

type Tab = "templates" | "periods" | "labor";

const DOW_LABELS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DOW_FULL = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const ROLES = ["cashier", "supervisor", "admin", "staff"];
const SLOT_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16",
];

export default function RosterPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("templates");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Store selector (shared across tabs)
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [selectedStore, setSelectedStore] = useState<number>(0);

  // Periods
  const [periods, setPeriods] = useState<RosterPeriod[]>([]);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [periodName, setPeriodName] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [periodDeadline, setPeriodDeadline] = useState("");

  // Templates
  const [slots, setSlots] = useState<TemplateSlot[]>([]);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TemplateSlot | null>(null);
  const [slotName, setSlotName] = useState("");
  const [slotDow, setSlotDow] = useState(1);
  const [slotStart, setSlotStart] = useState("08:00");
  const [slotEnd, setSlotEnd] = useState("17:00");
  const [slotBreak, setSlotBreak] = useState(30);
  const [slotRole, setSlotRole] = useState("");
  const [slotColor, setSlotColor] = useState(SLOT_COLORS[0]);

  // Labor config
  const [config, setConfig] = useState<LaborConfig | null>(null);
  const [formWeekly, setFormWeekly] = useState(45);
  const [formDaily, setFormDaily] = useState(9);
  const [formWeekday, setFormWeekday] = useState(1.0);
  const [formSaturday, setFormSaturday] = useState(1.0);
  const [formSunday, setFormSunday] = useState(1.5);
  const [formHoliday, setFormHoliday] = useState(2.0);
  const [formOvertime, setFormOvertime] = useState(1.5);
  const [formBreak, setFormBreak] = useState(30);

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
      logError("Roster", `Failed to load stores: ${err.message}`);
    }
  }, []);

  const loadSlots = useCallback(async () => {
    if (!selectedStore) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/roster-slots?store_id=${selectedStore}`);
      const data = await res.json();
      setSlots(data.slots || []);
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      logError("Roster", `Failed to load slots: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [selectedStore]);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/staff/labor-config");
      const data = await res.json();
      const c = data.config;
      if (c) {
        setConfig(c);
        setFormWeekly(c.standard_weekly_hours);
        setFormDaily(c.standard_daily_hours);
        setFormWeekday(c.weekday_multiplier);
        setFormSaturday(c.saturday_multiplier);
        setFormSunday(c.sunday_multiplier);
        setFormHoliday(c.public_holiday_multiplier);
        setFormOvertime(c.overtime_multiplier);
        setFormBreak(c.min_break_minutes);
      }
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      logError("Roster", `Failed to load labor config: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPeriods = useCallback(async () => {
    if (!selectedStore) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/roster-periods?store_id=${selectedStore}`);
      const data = await res.json();
      setPeriods(data.periods || []);
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      logError("Roster", `Failed to load periods: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [selectedStore]);

  useEffect(() => { loadStores(); }, [loadStores]);

  useEffect(() => {
    if (tab === "templates" && selectedStore) loadSlots();
    else if (tab === "periods" && selectedStore) loadPeriods();
    else if (tab === "labor") loadConfig();
  }, [tab, selectedStore, loadSlots, loadPeriods, loadConfig]);

  // Period CRUD
  const openCreatePeriod = () => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    setPeriodName(`${nextMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}`);
    setPeriodStart(nextMonth.toISOString().slice(0, 10));
    setPeriodEnd(endOfMonth.toISOString().slice(0, 10));
    setPeriodDeadline("");
    setShowPeriodModal(true);
  };

  const handleCreatePeriod = async () => {
    if (!periodStart || !periodEnd) return;
    setSaving(true);
    try {
      const res = await fetch("/api/staff/roster-periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: selectedStore,
          name: periodName,
          start_date: periodStart,
          end_date: periodEnd,
          picking_deadline: periodDeadline || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create");
      }
      setShowPeriodModal(false);
      loadPeriods();
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      logError("Roster", `Period create failed: ${err.message}`);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTransition = async (periodId: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/staff/roster-periods/${periodId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Transition failed");
      }
      loadPeriods();
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      logError("Roster", `Transition failed: ${err.message}`);
      alert(err.message);
    }
  };

  const handleDeletePeriod = async (periodId: number) => {
    if (!confirm("Delete this roster period?")) return;
    try {
      await fetch(`/api/staff/roster-periods/${periodId}`, { method: "DELETE" });
      loadPeriods();
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      logError("Roster", `Period delete failed: ${err.message}`);
    }
  };

  // Template slot CRUD
  const openCreateSlot = () => {
    setEditingSlot(null);
    setSlotName("");
    setSlotDow(1);
    setSlotStart("08:00");
    setSlotEnd("17:00");
    setSlotBreak(30);
    setSlotRole("");
    setSlotColor(SLOT_COLORS[slots.length % SLOT_COLORS.length]);
    setShowSlotModal(true);
  };

  const openEditSlot = (slot: TemplateSlot) => {
    setEditingSlot(slot);
    setSlotName(slot.name);
    setSlotDow(slot.day_of_week);
    setSlotStart(slot.start_time.slice(0, 5));
    setSlotEnd(slot.end_time.slice(0, 5));
    setSlotBreak(slot.break_minutes);
    setSlotRole(slot.required_role || "");
    setSlotColor(slot.color || SLOT_COLORS[0]);
    setShowSlotModal(true);
  };

  const handleSaveSlot = async () => {
    if (!slotName || !slotStart || !slotEnd) return;
    setSaving(true);
    try {
      if (editingSlot) {
        const res = await fetch(`/api/staff/roster-slots/${editingSlot.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: slotName, day_of_week: slotDow, start_time: slotStart,
            end_time: slotEnd, break_minutes: slotBreak,
            required_role: slotRole || null, color: slotColor,
          }),
        });
        if (!res.ok) throw new Error("Failed to update");
      } else {
        const res = await fetch("/api/staff/roster-slots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            store_id: selectedStore, name: slotName, day_of_week: slotDow,
            start_time: slotStart, end_time: slotEnd, break_minutes: slotBreak,
            required_role: slotRole || null, color: slotColor,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to create");
        }
      }
      setShowSlotModal(false);
      loadSlots();
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      logError("Roster", `Slot save failed: ${err.message}`);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlot = async (id: number) => {
    if (!confirm("Delete this shift template?")) return;
    try {
      await fetch(`/api/staff/roster-slots/${id}`, { method: "DELETE" });
      loadSlots();
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      logError("Roster", `Slot delete failed: ${err.message}`);
    }
  };

  // Labor config save
  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/staff/labor-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          standard_weekly_hours: formWeekly, standard_daily_hours: formDaily,
          weekday_multiplier: formWeekday, saturday_multiplier: formSaturday,
          sunday_multiplier: formSunday, public_holiday_multiplier: formHoliday,
          overtime_multiplier: formOvertime, min_break_minutes: formBreak,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      setConfig(data.config);
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      logError("Roster", `Save config failed: ${err.message}`);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = config && (
    formWeekly !== config.standard_weekly_hours || formDaily !== config.standard_daily_hours ||
    formWeekday !== config.weekday_multiplier || formSaturday !== config.saturday_multiplier ||
    formSunday !== config.sunday_multiplier || formHoliday !== config.public_holiday_multiplier ||
    formOvertime !== config.overtime_multiplier || formBreak !== config.min_break_minutes
  );

  // Group slots by day_of_week for the weekly grid
  const slotsByDay: Record<number, TemplateSlot[]> = {};
  for (let d = 1; d <= 7; d++) slotsByDay[d] = [];
  for (const s of slots) {
    if (slotsByDay[s.day_of_week]) slotsByDay[s.day_of_week].push(s);
  }

  const calcHours = (start: string, end: string, breakMin: number) => {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    return Math.max(0, (eh * 60 + em - sh * 60 - sm - breakMin) / 60);
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Staff", href: "/staff" }, { label: "Roster" }]} />

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList size={28} className="text-posterita-blue" />
            Shift Roster
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage shift templates, roster periods, and labor rules
          </p>
        </div>
        {(tab === "templates" || tab === "periods") && (
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
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {([
          { key: "templates" as Tab, label: "Templates", icon: Calendar },
          { key: "periods" as Tab, label: "Periods", icon: Users },
          { key: "labor" as Tab, label: "Labor Config", icon: Settings2 },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Templates Tab */}
      {tab === "templates" && (
        loading ? (
          <div className="text-center py-16 text-gray-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
            Loading templates...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {slots.length} template{slots.length !== 1 ? "s" : ""} defined
              </p>
              <button
                onClick={openCreateSlot}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-posterita-blue text-white text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} /> Add Slot
              </button>
            </div>

            {/* Weekly grid */}
            <div className="grid grid-cols-7 gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map(d => (
                <div key={d}>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-center mb-2">
                    {DOW_LABELS[d]}
                  </div>
                  <div className="space-y-2 min-h-[80px]">
                    {slotsByDay[d].map(slot => (
                      <div
                        key={slot.id}
                        className="rounded-lg border border-gray-100 shadow-sm p-2.5 cursor-pointer hover:shadow-md transition-shadow"
                        style={{ borderLeftColor: slot.color || "#3b82f6", borderLeftWidth: 3 }}
                        onClick={() => openEditSlot(slot)}
                      >
                        <div className="text-xs font-semibold text-gray-900 truncate">{slot.name}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {slot.required_role && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-600 capitalize">
                              {slot.required_role}
                            </span>
                          )}
                          <span className="text-[9px] text-gray-400">
                            {calcHours(slot.start_time, slot.end_time, slot.break_minutes).toFixed(1)}h
                          </span>
                        </div>
                      </div>
                    ))}
                    {slotsByDay[d].length === 0 && (
                      <button
                        onClick={() => { setSlotDow(d); openCreateSlot(); }}
                        className="w-full h-20 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 hover:border-posterita-blue hover:text-posterita-blue transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            {slots.length > 0 && (
              <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Total slots/week:</span>
                    <span className="ml-1 font-semibold">{slots.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Total hours/week:</span>
                    <span className="ml-1 font-semibold">
                      {slots.reduce((sum, s) => sum + calcHours(s.start_time, s.end_time, s.break_minutes), 0).toFixed(1)}h
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Avg shift:</span>
                    <span className="ml-1 font-semibold">
                      {slots.length > 0
                        ? (slots.reduce((sum, s) => sum + calcHours(s.start_time, s.end_time, s.break_minutes), 0) / slots.length).toFixed(1)
                        : "0"}h
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Roles:</span>
                    <span className="ml-1 font-semibold">
                      {[...new Set(slots.map(s => s.required_role).filter(Boolean))].join(", ") || "Any"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* Periods Tab */}
      {tab === "periods" && (
        loading ? (
          <div className="text-center py-16 text-gray-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
            Loading periods...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {periods.length} period{periods.length !== 1 ? "s" : ""}
              </p>
              <button
                onClick={openCreatePeriod}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-posterita-blue text-white text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} /> New Period
              </button>
            </div>

            {periods.length > 0 ? (
              <div className="space-y-3">
                {periods.map(p => {
                  const statusColors: Record<string, string> = {
                    open: "bg-gray-100 text-gray-700",
                    picking: "bg-blue-100 text-blue-700",
                    review: "bg-amber-100 text-amber-700",
                    approved: "bg-green-100 text-green-700",
                    locked: "bg-purple-100 text-purple-700",
                  };
                  const nextAction: Record<string, { label: string; status: string; color: string }> = {
                    open: { label: "Open Picking", status: "picking", color: "bg-blue-50 text-blue-700 hover:bg-blue-100" },
                    picking: { label: "Close Picking", status: "review", color: "bg-amber-50 text-amber-700 hover:bg-amber-100" },
                    review: { label: "Approve All", status: "approved", color: "bg-green-50 text-green-700 hover:bg-green-100" },
                    approved: { label: "Lock", status: "locked", color: "bg-purple-50 text-purple-700 hover:bg-purple-100" },
                  };
                  const action = nextAction[p.status];
                  const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });

                  return (
                    <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-posterita-blue/10 flex items-center justify-center">
                            <Calendar size={20} className="text-posterita-blue" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{p.name}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-sm text-gray-500">{fmtDate(p.start_date)} – {fmtDate(p.end_date)}</span>
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${statusColors[p.status] || "bg-gray-100 text-gray-600"}`}>
                                {p.status}
                              </span>
                            </div>
                            {p.picking_deadline && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                Deadline: {new Date(p.picking_deadline).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {action && (
                            <button
                              onClick={() => handleTransition(p.id, action.status)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${action.color}`}
                            >
                              {action.label}
                            </button>
                          )}
                          <button
                            onClick={() => router.push(`/staff/roster/${p.id}`)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-700 text-xs font-medium hover:bg-gray-100 transition-colors"
                          >
                            <Eye size={12} /> View
                          </button>
                          {(p.status === "open") && (
                            <button
                              onClick={() => handleDeletePeriod(p.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-12 text-center">
                <Calendar size={40} className="mx-auto text-gray-300" />
                <h3 className="text-base font-medium text-gray-700 mt-3">No roster periods</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Create a period to start shift planning. Staff will pick their shifts once the period is open for picking.
                </p>
              </div>
            )}
          </div>
        )
      )}

      {/* Period Create Modal */}
      {showPeriodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowPeriodModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">New Roster Period</h3>
              <button onClick={() => setShowPeriodModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period Name</label>
                <input type="text" value={periodName} onChange={e => setPeriodName(e.target.value)} placeholder="e.g. April 2026" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Picking Deadline (optional)</label>
                <input type="datetime-local" value={periodDeadline} onChange={e => setPeriodDeadline(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20" />
                <p className="text-xs text-gray-400 mt-1">After this date, staff can no longer pick shifts</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowPeriodModal(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreatePeriod} disabled={saving || !periodStart || !periodEnd} className="px-4 py-2 rounded-lg bg-posterita-blue text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? "Creating..." : "Create Period"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Labor Config Tab */}
      {tab === "labor" && (
        loading ? (
          <div className="text-center py-16 text-gray-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
            Loading labor config...
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-semibold text-gray-900">Standard Hours</h3>
                <p className="text-xs text-gray-500 mt-0.5">Based on Mauritius Workers&apos; Rights Act 2019</p>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weekly Hours</label>
                  <input type="number" value={formWeekly} onChange={e => setFormWeekly(Number(e.target.value))} min={0} step={1} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20" />
                  <p className="text-xs text-gray-400 mt-1">Max hours before overtime</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Daily Hours</label>
                  <input type="number" value={formDaily} onChange={e => setFormDaily(Number(e.target.value))} min={0} step={1} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20" />
                  <p className="text-xs text-gray-400 mt-1">Standard shift length</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Break (minutes)</label>
                  <input type="number" value={formBreak} onChange={e => setFormBreak(Number(e.target.value))} min={0} step={5} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20" />
                  <p className="text-xs text-gray-400 mt-1">Mandatory break per shift</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-semibold text-gray-900">Hour Multipliers</h3>
                <p className="text-xs text-gray-500 mt-0.5">Effective hours = real hours x multiplier</p>
              </div>
              <div className="p-6 grid grid-cols-2 sm:grid-cols-5 gap-6">
                {([
                  { label: "Weekday", value: formWeekday, set: setFormWeekday, hint: "Mon-Fri" },
                  { label: "Saturday", value: formSaturday, set: setFormSaturday, hint: "Sat" },
                  { label: "Sunday", value: formSunday, set: setFormSunday, hint: "Sun" },
                  { label: "Public Holiday", value: formHoliday, set: setFormHoliday, hint: "Holiday" },
                  { label: "Overtime", value: formOvertime, set: setFormOvertime, hint: "Over weekly max" },
                ] as const).map(m => (
                  <div key={m.label}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{m.label}</label>
                    <div className="relative">
                      <input type="number" value={m.value} onChange={e => m.set(Number(e.target.value))} min={0} step={0.1} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">x</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{m.hint}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl border border-blue-100 p-5">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">Effective Hours Example</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-blue-800">
                <div><span className="font-medium">Weekday:</span> 9h x {formWeekday} = {(9 * formWeekday).toFixed(1)}h</div>
                <div><span className="font-medium">Sunday:</span> 9h x {formSunday} = {(9 * formSunday).toFixed(1)}h</div>
                <div><span className="font-medium">Holiday:</span> 9h x {formHoliday} = {(9 * formHoliday).toFixed(1)}h</div>
              </div>
            </div>

            <div className="flex justify-end">
              <button onClick={handleSaveConfig} disabled={saving || !hasChanges} className="flex items-center gap-1.5 px-6 py-2.5 rounded-lg bg-posterita-blue text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                <Save size={16} />
                {saving ? "Saving..." : "Save Configuration"}
              </button>
            </div>
          </div>
        )
      )}

      {/* Slot Create/Edit Modal */}
      {showSlotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowSlotModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingSlot ? "Edit Shift Template" : "Add Shift Template"}
              </h3>
              <button onClick={() => setShowSlotModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slot Name</label>
                <input
                  type="text"
                  value={slotName}
                  onChange={e => setSlotName(e.target.value)}
                  placeholder="e.g. Morning Cashier"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
                <select value={slotDow} onChange={e => setSlotDow(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20">
                  {[1, 2, 3, 4, 5, 6, 7].map(d => (
                    <option key={d} value={d}>{DOW_FULL[d]}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input type="time" value={slotStart} onChange={e => setSlotStart(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input type="time" value={slotEnd} onChange={e => setSlotEnd(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Break (minutes)</label>
                  <input type="number" value={slotBreak} onChange={e => setSlotBreak(Number(e.target.value))} min={0} step={5} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Required Role</label>
                  <select value={slotRole} onChange={e => setSlotRole(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20">
                    <option value="">Any role</option>
                    {ROLES.map(r => (
                      <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <div className="flex gap-2">
                  {SLOT_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setSlotColor(c)}
                      className={`w-8 h-8 rounded-lg transition-transform ${slotColor === c ? "ring-2 ring-offset-2 ring-posterita-blue scale-110" : "hover:scale-105"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              {/* Hours preview */}
              {slotStart && slotEnd && slotStart < slotEnd && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                  Net hours: <span className="font-semibold">{calcHours(slotStart, slotEnd, slotBreak).toFixed(1)}h</span>
                  <span className="text-gray-400 ml-1">({slotBreak}min break deducted)</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between mt-6">
              <div>
                {editingSlot && (
                  <button
                    onClick={() => { setShowSlotModal(false); handleDeleteSlot(editingSlot.id); }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-red-600 text-sm hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowSlotModal(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  onClick={handleSaveSlot}
                  disabled={saving || !slotName || !slotStart || !slotEnd || slotStart >= slotEnd}
                  className="px-4 py-2 rounded-lg bg-posterita-blue text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingSlot ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
