"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Clock, LogIn, LogOut, Users, Timer,
  RefreshCw, Calendar, ChevronRight,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";

interface Shift {
  id: number;
  user_id: number;
  user_name: string | null;
  clock_in: string;
  clock_out: string | null;
  break_minutes: number;
  hours_worked: number | null;
  status: string;
  store_id: number;
  notes: string | null;
}

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState({ total_hours: 0, active_shifts: 0 });

  const loadShifts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/shifts?from=${dateFilter}&to=${dateFilter}`);
      const data = await res.json();
      setShifts(data.shifts || []);
      setSummary(data.summary || { total_hours: 0, active_shifts: 0 });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => { loadShifts(); }, [loadShifts]);

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const formatDuration = (hours: number | null) => {
    if (hours == null) return "—";
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  if (loading && shifts.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
        Loading shifts...
      </div>
    );
  }

  const activeShifts = shifts.filter((s) => s.status === "active");
  const completedShifts = shifts.filter((s) => s.status === "completed");

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Shifts" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clock size={28} className="text-green-500" />
            Shift Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">Staff clock in/out and time tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-gray-400" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500">Active Now</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{summary.active_shifts}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500">Total Shifts</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{shifts.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500">Hours Worked</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{summary.total_hours}</p>
        </div>
      </div>

      {/* Active Shifts */}
      {activeShifts.length > 0 && (
        <div className="bg-white rounded-xl border border-green-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-green-100 bg-green-50">
            <h3 className="font-semibold text-green-800 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Currently Working ({activeShifts.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {activeShifts.map((s) => (
              <div key={s.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <LogIn size={18} className="text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{s.user_name || `User #${s.user_id}`}</p>
                    <p className="text-xs text-gray-500">Clocked in at {formatTime(s.clock_in)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Timer size={14} className="text-green-600" />
                  <span className="text-sm font-medium text-green-600">
                    {formatDuration((Date.now() - new Date(s.clock_in).getTime()) / 3600000)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Shifts */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-semibold text-gray-900">
            Completed Shifts ({completedShifts.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-50">
          {completedShifts.map((s) => (
            <div key={s.id} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <LogOut size={18} className="text-gray-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{s.user_name || `User #${s.user_id}`}</p>
                  <p className="text-xs text-gray-500">
                    {formatTime(s.clock_in)} – {s.clock_out ? formatTime(s.clock_out) : "—"}
                  </p>
                  {s.break_minutes > 0 && (
                    <p className="text-xs text-gray-400">{s.break_minutes}min break</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900">{formatDuration(s.hours_worked)}</p>
                {s.notes && <p className="text-xs text-gray-400 mt-0.5">{s.notes}</p>}
              </div>
            </div>
          ))}
          {completedShifts.length === 0 && (
            <div className="px-6 py-12 text-center">
              <Clock size={40} className="mx-auto text-gray-300" />
              <h3 className="text-base font-medium text-gray-700 mt-3">No completed shifts</h3>
              <p className="text-sm text-gray-500 mt-1">
                No staff members have clocked out for this date. Completed shifts will appear here once a shift ends.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
