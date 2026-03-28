"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Calendar, ChevronLeft, ChevronRight, Plus, X,
  RefreshCw, Copy, Clock, Users,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { logError } from "@/lib/error-logger";

interface ScheduleShift {
  id: number;
  user_id: number;
  user_name: string;
  date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  notes: string | null;
  status: string;
}

interface StoreOption {
  store_id: number;
  name: string;
}

interface UserOption {
  user_id: number;
  username: string;
  firstname: string | null;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

export default function SchedulePage() {
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState<ScheduleShift[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedStore, setSelectedStore] = useState<number | null>(null);
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [editingShift, setEditingShift] = useState<ScheduleShift | null>(null);
  const [saving, setSaving] = useState(false);

  // Create form state
  const [formUserId, setFormUserId] = useState<number>(0);
  const [formDate, setFormDate] = useState("");
  const [formStart, setFormStart] = useState("09:00");
  const [formEnd, setFormEnd] = useState("17:00");
  const [formBreak, setFormBreak] = useState(30);
  const [formNotes, setFormNotes] = useState("");

  // Copy week state
  const [copySource, setCopySource] = useState("");
  const [copyTarget, setCopyTarget] = useState("");

  const weekEnd = addDays(weekStart, 6);

  const loadStores = useCallback(async () => {
    try {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "store", select: "store_id, name", filters: [{ column: "isactive", op: "eq", value: "Y" }] }),
      });
      const data = await res.json();
      const storeList = data.data || [];
      setStores(storeList);
      if (storeList.length > 0 && !selectedStore) {
        setSelectedStore(storeList[0].store_id);
      }
    } catch (e: any) {
      logError("Schedule", `Failed to load stores: ${e.message}`);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "pos_user", select: "user_id, username, firstname", filters: [{ column: "isactive", op: "eq", value: "Y" }] }),
      });
      const data = await res.json();
      setUsers(data.data || []);
    } catch (e: any) {
      logError("Schedule", `Failed to load users: ${e.message}`);
    }
  }, []);

  const loadSchedule = useCallback(async () => {
    if (!selectedStore) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/staff/schedule?store_id=${selectedStore}&start_date=${formatDate(weekStart)}&end_date=${formatDate(weekEnd)}`
      );
      const data = await res.json();
      setShifts(data.shifts || []);
    } catch (e: any) {
      logError("Schedule", `Failed to load schedule: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [selectedStore, weekStart]);

  useEffect(() => { loadStores(); loadUsers(); }, [loadStores, loadUsers]);
  useEffect(() => { if (selectedStore) loadSchedule(); }, [loadSchedule, selectedStore]);

  const navigateWeek = (dir: number) => {
    setWeekStart(prev => addDays(prev, dir * 7));
  };

  const goToThisWeek = () => {
    setWeekStart(getMonday(new Date()));
  };

  const openCreate = (date?: string) => {
    setEditingShift(null);
    setFormUserId(users[0]?.user_id || 0);
    setFormDate(date || formatDate(weekStart));
    setFormStart("09:00");
    setFormEnd("17:00");
    setFormBreak(30);
    setFormNotes("");
    setShowCreateModal(true);
  };

  const openEdit = (shift: ScheduleShift) => {
    setEditingShift(shift);
    setFormUserId(shift.user_id);
    setFormDate(shift.date);
    setFormStart(shift.start_time);
    setFormEnd(shift.end_time);
    setFormBreak(shift.break_minutes);
    setFormNotes(shift.notes || "");
    setShowCreateModal(true);
  };

  const handleSaveShift = async () => {
    setSaving(true);
    try {
      const payload = {
        user_id: formUserId,
        date: formDate,
        start_time: formStart,
        end_time: formEnd,
        break_minutes: formBreak,
        notes: formNotes || null,
        store_id: selectedStore,
      };

      const url = editingShift
        ? `/api/staff/schedule?id=${editingShift.id}`
        : "/api/staff/schedule";

      const res = await fetch(url, {
        method: editingShift ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save shift");
      }

      setShowCreateModal(false);
      loadSchedule();
    } catch (e: any) {
      logError("Schedule", `Failed to save shift: ${e.message}`);
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteShift = async (id: number) => {
    if (!confirm("Cancel this scheduled shift?")) return;
    try {
      await fetch(`/api/staff/schedule?id=${id}`, { method: "DELETE" });
      loadSchedule();
    } catch (e: any) {
      logError("Schedule", `Failed to delete shift: ${e.message}`);
    }
  };

  const handleCopyWeek = async () => {
    if (!copySource || !copyTarget) return;
    setSaving(true);
    try {
      const res = await fetch("/api/staff/schedule/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: selectedStore,
          source_week_start: copySource,
          target_week_start: copyTarget,
        }),
      });
      if (!res.ok) throw new Error("Failed to copy week");
      setShowCopyModal(false);
      loadSchedule();
    } catch (e: any) {
      logError("Schedule", `Failed to copy week: ${e.message}`);
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Group shifts by user for the grid
  const uniqueUserIds = [...new Set(shifts.map(s => s.user_id))];
  const staffRows = uniqueUserIds.map(uid => {
    const userShifts = shifts.filter(s => s.user_id === uid);
    const name = userShifts[0]?.user_name || `User #${uid}`;
    return { user_id: uid, name, shifts: userShifts };
  });

  // If no shifts, show all users
  const allRows = staffRows.length > 0 ? staffRows : users.map(u => ({
    user_id: u.user_id,
    name: u.firstname || u.username,
    shifts: [] as ScheduleShift[],
  }));

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Staff", href: "/staff" }, { label: "Schedule" }]} />

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar size={28} className="text-posterita-blue" />
            Weekly Schedule
          </h1>
          <p className="text-sm text-gray-500 mt-1">Plan and manage staff shifts</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCopyModal(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <Copy size={14} /> Copy Week
          </button>
          <button onClick={() => openCreate()} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-posterita-blue text-white text-sm font-medium hover:bg-blue-700 transition-colors">
            <Plus size={16} /> Add Shift
          </button>
        </div>
      </div>

      {/* Controls Row */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          {stores.length > 1 && (
            <select
              value={selectedStore || ""}
              onChange={(e) => setSelectedStore(Number(e.target.value))}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20"
            >
              {stores.map(s => (
                <option key={s.store_id} value={s.store_id}>{s.name}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigateWeek(-1)} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button onClick={goToThisWeek} className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors">
            This Week
          </button>
          <button onClick={() => navigateWeek(1)} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <ChevronRight size={16} />
          </button>
          <span className="text-sm text-gray-600 ml-2">
            {weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – {weekEnd.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>
      </div>

      {/* Schedule Grid */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">
          <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
          Loading schedule...
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-40">Staff</th>
                {weekDates.map((d, i) => {
                  const isToday = formatDate(d) === formatDate(new Date());
                  return (
                    <th key={i} className={`px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider ${isToday ? "text-posterita-blue bg-blue-50/50" : "text-gray-500"}`}>
                      <div>{DAYS[i]}</div>
                      <div className="text-[11px] font-normal mt-0.5">{d.getDate()}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {allRows.map(row => (
                <tr key={row.user_id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-posterita-blue">
                        {(row.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-900 truncate">{row.name}</span>
                    </div>
                  </td>
                  {weekDates.map((d, i) => {
                    const dateStr = formatDate(d);
                    const dayShifts = row.shifts.filter(s => s.date === dateStr);
                    const isToday = dateStr === formatDate(new Date());
                    return (
                      <td key={i} className={`px-1 py-2 text-center ${isToday ? "bg-blue-50/30" : ""}`}>
                        {dayShifts.length > 0 ? (
                          dayShifts.map(s => (
                            <button
                              key={s.id}
                              onClick={() => openEdit(s)}
                              className="block w-full px-2 py-1.5 rounded-lg text-xs font-medium bg-posterita-blue/10 text-posterita-blue hover:bg-posterita-blue/20 transition-colors mb-1"
                            >
                              {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                            </button>
                          ))
                        ) : (
                          <button
                            onClick={() => openCreate(dateStr)}
                            className="w-full px-2 py-1.5 rounded-lg text-xs text-gray-300 hover:bg-gray-100 hover:text-gray-500 transition-colors"
                          >
                            +
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {allRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <Users size={40} className="mx-auto text-gray-300" />
                    <h3 className="text-base font-medium text-gray-700 mt-3">No staff members</h3>
                    <p className="text-sm text-gray-500 mt-1">Add users in the Users page to start scheduling shifts.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Shift Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingShift ? "Edit Shift" : "Add Shift"}
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member</label>
                <select value={formUserId} onChange={e => setFormUserId(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20">
                  {users.map(u => (
                    <option key={u.user_id} value={u.user_id}>{u.firstname || u.username}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input type="time" value={formStart} onChange={e => setFormStart(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input type="time" value={formEnd} onChange={e => setFormEnd(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Break (minutes)</label>
                <input type="number" value={formBreak} onChange={e => setFormBreak(Number(e.target.value))} min={0} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20 resize-none" placeholder="Optional notes..." />
              </div>
            </div>
            <div className="flex items-center justify-between mt-6">
              {editingShift ? (
                <button onClick={() => { handleDeleteShift(editingShift.id); setShowCreateModal(false); }} className="text-sm text-red-500 hover:text-red-700">
                  Cancel Shift
                </button>
              ) : <div />}
              <div className="flex gap-2">
                <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                  Close
                </button>
                <button onClick={handleSaveShift} disabled={saving || !formUserId} className="px-4 py-2 rounded-lg bg-posterita-blue text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {saving ? "Saving..." : editingShift ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Copy Week Modal */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCopyModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Copy Week</h3>
              <button onClick={() => setShowCopyModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source Week (Monday)</label>
                <input type="date" value={copySource} onChange={e => setCopySource(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Week (Monday)</label>
                <input type="date" value={copyTarget} onChange={e => setCopyTarget(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowCopyModal(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleCopyWeek} disabled={saving || !copySource || !copyTarget} className="px-4 py-2 rounded-lg bg-posterita-blue text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? "Copying..." : "Copy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
