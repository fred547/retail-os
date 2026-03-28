"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Calendar, Clock, RefreshCw, Check, X, ArrowLeft, CheckCircle2,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { logError } from "@/lib/error-logger";

interface Period {
  id: number;
  store_id: number;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  picking_deadline: string | null;
}

interface Slot {
  id: number;
  name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  break_minutes: number;
  required_role: string | null;
  color: string | null;
}

interface Pick {
  id: number;
  slot_id: number;
  user_id: number;
  date: string;
  status: string;
  effective_hours: number;
  day_type: string;
  multiplier: number;
}

interface UserOption {
  user_id: number;
  username: string;
  firstname: string | null;
  role: string | null;
}

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ShiftPickPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const periodId = searchParams.get("period");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [period, setPeriod] = useState<Period | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUser, setSelectedUser] = useState<number>(0);

  // Track pending picks before submitting
  const [pendingPicks, setPendingPicks] = useState<Set<string>>(new Set()); // "date_slotId"

  const loadData = useCallback(async () => {
    if (!periodId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/roster-periods/${periodId}/coverage`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setPeriod(data.period);
      setSlots(data.slots || []);
      setPicks(data.picks || []);
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      logError("ShiftPick", `Load failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [periodId]);

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "pos_user", select: "user_id, username, firstname, role", filters: [{ column: "isactive", op: "eq", value: "Y" }] }),
      });
      const data = await res.json();
      const list: UserOption[] = data.data || [];
      setUsers(list);
      if (list.length > 0 && !selectedUser) setSelectedUser(list[0].user_id);
    } catch (_) {}
  }, []);

  useEffect(() => { loadData(); loadUsers(); }, [loadData, loadUsers]);

  const togglePick = (date: string, slotId: number) => {
    const key = `${date}_${slotId}`;
    setPendingPicks(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isAlreadyPicked = (date: string, slotId: number) => {
    return picks.some(p => p.date === date && p.slot_id === slotId && p.user_id === selectedUser && p.status !== "cancelled");
  };

  const handleSubmitPicks = async () => {
    if (pendingPicks.size === 0 || !selectedUser || !periodId) return;
    setSaving(true);
    try {
      const pickArray = [...pendingPicks].map(key => {
        const [date, slotId] = key.split("_");
        return {
          roster_period_id: parseInt(periodId),
          slot_id: parseInt(slotId),
          user_id: selectedUser,
          date,
        };
      });

      const res = await fetch("/api/staff/picks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ picks: pickArray }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");

      setPendingPicks(new Set());
      loadData();
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      logError("ShiftPick", `Submit failed: ${err.message}`);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelPick = async (pickId: number) => {
    try {
      await fetch(`/api/staff/picks/${pickId}`, { method: "DELETE" });
      loadData();
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      logError("ShiftPick", `Cancel failed: ${err.message}`);
    }
  };

  if (!periodId) {
    return (
      <div className="text-center py-16">
        <h3 className="text-gray-700 font-medium">No period selected</h3>
        <button onClick={() => router.push("/staff/roster")} className="mt-4 text-posterita-blue hover:underline text-sm">Back to Roster</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-400">
        <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
        Loading shift picker...
      </div>
    );
  }

  if (!period) {
    return (
      <div className="text-center py-16">
        <h3 className="text-gray-700 font-medium">Period not found</h3>
        <button onClick={() => router.push("/staff/roster")} className="mt-4 text-posterita-blue hover:underline text-sm">Back to Roster</button>
      </div>
    );
  }

  const isPicking = period.status === "picking";

  // Build weeks of dates
  const allDates: string[] = [];
  const start = new Date(period.start_date + "T00:00:00");
  const end = new Date(period.end_date + "T00:00:00");
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    allDates.push(d.toISOString().slice(0, 10));
  }

  // Group into weeks (Mon-Sun)
  const weeks: string[][] = [];
  let currentWeek: string[] = [];
  for (const date of allDates) {
    const dow = new Date(date + "T00:00:00").getDay();
    if (dow === 1 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(date);
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  // My existing picks
  const myPicks = picks.filter(p => p.user_id === selectedUser && p.status !== "cancelled");
  const myTotalEffective = myPicks.reduce((sum, p) => sum + (p.effective_hours || 0), 0);

  const calcHours = (start: string, end: string, brk: number) => {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    return Math.max(0, (eh * 60 + em - sh * 60 - sm - brk) / 60);
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: "Staff", href: "/staff" },
        { label: "Roster", href: "/staff/roster" },
        { label: period.name, href: `/staff/roster/${periodId}` },
        { label: "Pick Shifts" },
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push(`/staff/roster/${periodId}`)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pick Your Shifts</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {period.name} — tap available slots to pick them
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedUser}
            onChange={e => { setSelectedUser(Number(e.target.value)); setPendingPicks(new Set()); }}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20"
          >
            {users.map(u => (
              <option key={u.user_id} value={u.user_id}>
                {u.firstname || u.username} {u.role ? `(${u.role})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!isPicking && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          This period is currently <strong>{period.status}</strong> — picking is not available.
        </div>
      )}

      {/* My picks summary */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 size={16} className="text-green-600" />
              <span className="font-medium">{myPicks.length} shifts picked</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock size={16} className="text-blue-600" />
              <span className="font-medium">{myTotalEffective.toFixed(1)}h effective</span>
            </div>
            {pendingPicks.size > 0 && (
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <Calendar size={16} />
                <span className="font-medium">{pendingPicks.size} pending selection{pendingPicks.size !== 1 ? "s" : ""}</span>
              </div>
            )}
          </div>
          {pendingPicks.size > 0 && isPicking && (
            <button
              onClick={handleSubmitPicks}
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-posterita-blue text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Check size={16} />
              {saving ? "Submitting..." : `Submit ${pendingPicks.size} Pick${pendingPicks.size !== 1 ? "s" : ""}`}
            </button>
          )}
        </div>
      </div>

      {/* Weekly calendar */}
      {weeks.map((week, wi) => (
        <div key={wi} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Week {wi + 1}: {new Date(week[0] + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })} – {new Date(week[week.length - 1] + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          </div>
          <div className="grid grid-cols-7 divide-x divide-gray-100">
            {/* Pad beginning of first week if needed */}
            {(() => {
              const firstDow = new Date(week[0] + "T00:00:00").getDay();
              const pad = firstDow === 0 ? 6 : firstDow - 1; // Mon=0 pad
              const cells = [];
              for (let i = 0; i < pad; i++) {
                cells.push(<div key={`pad-${i}`} className="min-h-[100px] bg-gray-50/50" />);
              }
              return cells;
            })()}
            {week.map(date => {
              const dt = new Date(date + "T00:00:00");
              const dow = dt.getDay();
              const isWeekend = dow === 0 || dow === 6;
              // Slots that apply to this day: convert ISO dow (1=Mon..7=Sun) to JS dow (0=Sun)
              const applicableSlots = slots.filter(s => {
                const jsDow = s.day_of_week === 7 ? 0 : s.day_of_week;
                return jsDow === dow;
              });

              return (
                <div key={date} className={`min-h-[100px] p-2 ${isWeekend ? "bg-amber-50/30" : ""}`}>
                  <div className={`text-xs font-semibold mb-1.5 ${isWeekend ? "text-amber-700" : "text-gray-500"}`}>
                    {DOW_LABELS[dow]} {dt.getDate()}
                  </div>
                  <div className="space-y-1">
                    {applicableSlots.map(slot => {
                      const already = isAlreadyPicked(date, slot.id);
                      const isPending = pendingPicks.has(`${date}_${slot.id}`);
                      const existingPick = myPicks.find(p => p.date === date && p.slot_id === slot.id);

                      if (already && existingPick) {
                        return (
                          <div
                            key={slot.id}
                            className="rounded-md p-1.5 text-[10px] border cursor-pointer"
                            style={{
                              backgroundColor: (slot.color || "#3b82f6") + "20",
                              borderColor: slot.color || "#3b82f6",
                            }}
                            onClick={() => { if (isPicking && existingPick.status === "picked") handleCancelPick(existingPick.id); }}
                            title={existingPick.status === "picked" ? "Click to cancel" : existingPick.status}
                          >
                            <div className="font-semibold truncate" style={{ color: slot.color || "#3b82f6" }}>{slot.name}</div>
                            <div className="text-gray-500">{slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}</div>
                            <div className="flex items-center gap-0.5 mt-0.5">
                              {existingPick.status === "approved" ? (
                                <CheckCircle2 size={10} className="text-green-600" />
                              ) : (
                                <Check size={10} className="text-blue-600" />
                              )}
                              <span className="capitalize text-gray-500">{existingPick.status}</span>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <button
                          key={slot.id}
                          onClick={() => { if (isPicking) togglePick(date, slot.id); }}
                          disabled={!isPicking}
                          className={`w-full rounded-md p-1.5 text-[10px] text-left border transition-all ${
                            isPending
                              ? "border-posterita-blue bg-blue-50 ring-1 ring-posterita-blue"
                              : "border-gray-200 bg-white hover:border-gray-300"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <div className={`font-semibold truncate ${isPending ? "text-posterita-blue" : "text-gray-700"}`}>
                            {slot.name}
                          </div>
                          <div className="text-gray-400">{slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}</div>
                          <div className="text-gray-400">{calcHours(slot.start_time, slot.end_time, slot.break_minutes).toFixed(1)}h</div>
                        </button>
                      );
                    })}
                    {applicableSlots.length === 0 && (
                      <div className="text-[10px] text-gray-300 text-center py-2">—</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
