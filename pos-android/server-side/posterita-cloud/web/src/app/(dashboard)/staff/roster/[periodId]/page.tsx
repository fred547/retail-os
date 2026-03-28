"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Calendar, Users, Clock, RefreshCw, CheckCircle2,
  XCircle, ChevronRight, Shield,
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
  approved_at: string | null;
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

interface StaffHour {
  user_id: number;
  picked: number;
  approved: number;
  total: number;
  target: number;
  pct: number;
}

interface UserOption {
  user_id: number;
  username: string;
  firstname: string | null;
}

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_COLORS: Record<string, string> = {
  open: "bg-gray-100 text-gray-700",
  picking: "bg-blue-100 text-blue-700",
  review: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  locked: "bg-purple-100 text-purple-700",
  picked: "bg-blue-100 text-blue-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function PeriodDetailPage() {
  const { periodId } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [staffHours, setStaffHours] = useState<StaffHour[]>([]);
  const [hoursData, setHoursData] = useState<{ weekly_target: number; period_target: number; period_weeks: number } | null>(null);
  const [approving, setApproving] = useState(false);

  const loadCoverage = useCallback(async () => {
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
      logError("RosterDetail", `Coverage load failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [periodId]);

  const loadHours = useCallback(async () => {
    if (!periodId) return;
    try {
      const res = await fetch(`/api/staff/roster-periods/${periodId}/hours`);
      const data = await res.json();
      setStaffHours(data.staff_hours || []);
      setHoursData({ weekly_target: data.weekly_target, period_target: data.period_target, period_weeks: data.period_weeks });
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      logError("RosterDetail", `Hours load failed: ${err.message}`);
    }
  }, [periodId]);

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "pos_user", select: "user_id, username, firstname", filters: [{ column: "isactive", op: "eq", value: "Y" }] }),
      });
      const data = await res.json();
      setUsers(data.data || []);
    } catch (_) {}
  }, []);

  useEffect(() => { loadCoverage(); loadHours(); loadUsers(); }, [loadCoverage, loadHours, loadUsers]);

  const handleApprove = async () => {
    if (!confirm("Approve all picks and generate staff schedules?")) return;
    setApproving(true);
    try {
      const res = await fetch(`/api/staff/roster-periods/${periodId}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approve failed");
      alert(`Approved ${data.approved_picks} picks, generated ${data.generated_schedules} schedule entries.`);
      loadCoverage();
      loadHours();
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      logError("RosterDetail", `Approve failed: ${err.message}`);
      alert(err.message);
    } finally {
      setApproving(false);
    }
  };

  const handleTransition = async (newStatus: string) => {
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
      loadCoverage();
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      logError("RosterDetail", `Transition failed: ${err.message}`);
      alert(err.message);
    }
  };

  const getUserName = (userId: number) => {
    const u = users.find(u => u.user_id === userId);
    return u?.firstname || u?.username || `User ${userId}`;
  };

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-400">
        <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
        Loading roster period...
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

  // Build dates array for the period
  const dates: string[] = [];
  const start = new Date(period.start_date + "T00:00:00");
  const end = new Date(period.end_date + "T00:00:00");
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }

  // Get unique users from picks
  const pickUserIds = [...new Set(picks.map(p => p.user_id))];

  // Build coverage matrix: for each date × slot, count picks
  const coverageByDateSlot: Record<string, Pick[]> = {};
  for (const pick of picks) {
    const key = `${pick.date}_${pick.slot_id}`;
    if (!coverageByDateSlot[key]) coverageByDateSlot[key] = [];
    coverageByDateSlot[key].push(pick);
  }

  const fmtDate = (d: string) => {
    const dt = new Date(d + "T00:00:00");
    return { day: dt.getDate(), dow: DOW_LABELS[dt.getDay()], isWeekend: dt.getDay() === 0 || dt.getDay() === 6 };
  };

  // Limit display to first 14 days for readability, with scroll
  const displayDates = dates;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Staff", href: "/staff" }, { label: "Roster", href: "/staff/roster" }, { label: period.name }]} />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/staff/roster")} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{period.name}</h1>
              <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[period.status] || "bg-gray-100"}`}>
                {period.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {new Date(period.start_date + "T00:00:00").toLocaleDateString(undefined, { month: "long", day: "numeric" })} – {new Date(period.end_date + "T00:00:00").toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
              {period.picking_deadline && (
                <span className="ml-2 text-gray-400">| Deadline: {new Date(period.picking_deadline).toLocaleDateString()}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {period.status === "open" && (
            <button onClick={() => handleTransition("picking")} className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors">
              Open Picking
            </button>
          )}
          {period.status === "picking" && (
            <button onClick={() => handleTransition("review")} className="px-4 py-2 rounded-lg bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100 transition-colors">
              Close Picking
            </button>
          )}
          {period.status === "review" && (
            <button onClick={handleApprove} disabled={approving} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-50 text-green-700 text-sm font-medium hover:bg-green-100 transition-colors disabled:opacity-50">
              <Shield size={14} />
              {approving ? "Approving..." : "Approve & Generate Schedule"}
            </button>
          )}
          {period.status === "approved" && (
            <button onClick={() => handleTransition("locked")} className="px-4 py-2 rounded-lg bg-purple-50 text-purple-700 text-sm font-medium hover:bg-purple-100 transition-colors">
              Lock Period
            </button>
          )}
          {(period.status === "picking" || period.status === "review") && (
            <button
              onClick={() => router.push(`/staff/roster/pick?period=${periodId}`)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-posterita-blue text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Pick Shifts <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Calendar size={14} /> Days</div>
          <div className="text-2xl font-bold text-gray-900">{dates.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Clock size={14} /> Slots</div>
          <div className="text-2xl font-bold text-gray-900">{slots.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Users size={14} /> Picks</div>
          <div className="text-2xl font-bold text-gray-900">{picks.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Users size={14} /> Staff</div>
          <div className="text-2xl font-bold text-gray-900">{pickUserIds.length}</div>
        </div>
      </div>

      {/* Coverage Matrix */}
      {slots.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-900">Coverage Matrix</h3>
            <p className="text-xs text-gray-500 mt-0.5">Slots vs picks by date. Numbers show pick count per slot.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="sticky left-0 bg-white px-3 py-2 text-left font-medium text-gray-600 min-w-[140px]">Slot</th>
                  {displayDates.map(d => {
                    const { day, dow, isWeekend } = fmtDate(d);
                    return (
                      <th key={d} className={`px-1.5 py-2 text-center font-medium min-w-[36px] ${isWeekend ? "bg-amber-50 text-amber-700" : "text-gray-500"}`}>
                        <div>{dow}</div>
                        <div className="text-[10px]">{day}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {slots.map(slot => (
                  <tr key={slot.id} className="border-b border-gray-50">
                    <td className="sticky left-0 bg-white px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: slot.color || "#3b82f6" }} />
                        <span className="font-medium text-gray-900 truncate">{slot.name}</span>
                      </div>
                      <div className="text-[10px] text-gray-400">{slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}</div>
                    </td>
                    {displayDates.map(d => {
                      const dateDow = new Date(d + "T00:00:00").getDay();
                      // ISO: slot.day_of_week 1=Mon..7=Sun. JS: 0=Sun,1=Mon..6=Sat
                      const slotJsDow = slot.day_of_week === 7 ? 0 : slot.day_of_week;
                      const applies = slotJsDow === dateDow;
                      const key = `${d}_${slot.id}`;
                      const cellPicks = coverageByDateSlot[key] || [];
                      const { isWeekend } = fmtDate(d);

                      return (
                        <td key={d} className={`px-1.5 py-2 text-center ${isWeekend ? "bg-amber-50/50" : ""}`}>
                          {applies ? (
                            cellPicks.length > 0 ? (
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${
                                cellPicks.some(p => p.status === "approved") ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                              }`}>
                                {cellPicks.length}
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-50 text-red-400 text-[10px]">0</span>
                            )
                          ) : (
                            <span className="text-gray-200">–</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Staff Hours Matrix */}
      {staffHours.length > 0 && hoursData && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-900">Hours Per Staff</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Target: {hoursData.weekly_target}h/week x {hoursData.period_weeks} weeks = {hoursData.period_target}h effective
            </p>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {staffHours.map(sh => (
                <div key={sh.user_id} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-posterita-blue shrink-0">
                    {getUserName(sh.user_id).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 truncate">{getUserName(sh.user_id)}</span>
                      <span className="text-xs text-gray-500 tabular-nums">{sh.total.toFixed(1)}h / {sh.target}h ({sh.pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${sh.pct >= 100 ? "bg-green-500" : sh.pct >= 75 ? "bg-blue-500" : sh.pct >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${Math.min(100, sh.pct)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Picks */}
      {picks.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-900">All Picks ({picks.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table text-sm">
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Date</th>
                  <th>Slot</th>
                  <th>Day Type</th>
                  <th className="text-right">Effective Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {picks.slice(0, 50).map(pick => {
                  const slot = slots.find(s => s.id === pick.slot_id);
                  return (
                    <tr key={pick.id}>
                      <td className="font-medium">{getUserName(pick.user_id)}</td>
                      <td>{new Date(pick.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: slot?.color || "#3b82f6" }} />
                          {slot?.name || `Slot ${pick.slot_id}`}
                        </div>
                      </td>
                      <td>
                        <span className="capitalize text-xs">{pick.day_type}</span>
                        {pick.multiplier !== 1.0 && <span className="text-xs text-gray-400 ml-1">({pick.multiplier}x)</span>}
                      </td>
                      <td className="text-right tabular-nums font-medium">{pick.effective_hours?.toFixed(1)}h</td>
                      <td>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${STATUS_COLORS[pick.status] || "bg-gray-100"}`}>
                          {pick.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
