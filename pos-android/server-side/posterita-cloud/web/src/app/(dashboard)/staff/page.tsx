"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users, Clock, CalendarDays, TrendingUp,
  RefreshCw, ChevronRight, Award, Calendar,
  ClipboardList, CalendarOff,
} from "lucide-react";
import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumb";
import { logError } from "@/lib/error-logger";

interface StaffPerformance {
  user_id: number;
  username: string;
  firstname: string | null;
  role: string;
  order_count: number;
  total_revenue: number;
  avg_order_value: number;
}

type DateRange = "7" | "30" | "90";

export default function StaffHubPage() {
  const [loading, setLoading] = useState(true);
  const [totalStaff, setTotalStaff] = useState(0);
  const [onShift, setOnShift] = useState(0);
  const [hoursThisWeek, setHoursThisWeek] = useState(0);
  const [pendingLeave, setPendingLeave] = useState(0);
  const [leaderboard, setLeaderboard] = useState<StaffPerformance[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>("30");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [staffRes, shiftRes, perfRes, leaveRes] = await Promise.all([
        fetch("/api/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table: "pos_user", select: "user_id", filters: [{ column: "isactive", op: "eq", value: "Y" }] }),
        }),
        fetch("/api/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table: "shift", select: "id, user_id, clock_in, hours_worked", filters: [{ column: "status", op: "eq", value: "active" }] }),
        }),
        fetch("/api/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table: "v_staff_performance", select: "user_id, username, firstname, role, order_count, total_revenue, avg_order_value", order: [{ column: "total_revenue", ascending: false }], limit: 10 }),
        }),
        fetch("/api/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table: "leave_request", select: "id", filters: [{ column: "status", op: "eq", value: "pending" }] }),
        }),
      ]);

      const staffData = await staffRes.json();
      const shiftData = await shiftRes.json();
      const perfData = await perfRes.json();
      const leaveData = await leaveRes.json();

      setTotalStaff(staffData.data?.length ?? 0);
      const activeShifts = shiftData.data || [];
      setOnShift(activeShifts.length);

      // Sum hours from active shifts this week
      const totalHrs = activeShifts.reduce((sum: number, s: any) => sum + (s.hours_worked || 0), 0);
      setHoursThisWeek(Math.round(totalHrs * 10) / 10);

      setPendingLeave(leaveData.data?.length ?? 0);
      setLeaderboard(perfData.data || []);
    } catch (e: any) {
      logError("StaffHub", `Failed to load staff data: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => { loadData(); }, [loadData]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: "MUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);

  if (loading && totalStaff === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
        Loading staff data...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Staff & Workforce" }]} />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users size={28} className="text-posterita-blue" />
          Staff & Workforce
        </h1>
        <p className="text-sm text-gray-500 mt-1">Manage your team, schedules, timesheets, and leave</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users size={16} className="text-posterita-blue" />
            </div>
          </div>
          <p className="text-sm text-gray-500">Total Staff</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{totalStaff}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
              <Clock size={16} className="text-green-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500">On Shift Now</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{onShift}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
              <TrendingUp size={16} className="text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500">Hours This Week</p>
          <p className="text-3xl font-bold text-purple-600 mt-1">{hoursThisWeek}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <CalendarOff size={16} className="text-amber-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500">Pending Leave</p>
          <p className="text-3xl font-bold text-amber-600 mt-1">{pendingLeave}</p>
        </div>
      </div>

      {/* Performance Leaderboard */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Award size={18} className="text-amber-500" />
            Performance Leaderboard
          </h3>
          <div className="flex gap-1">
            {(["7", "30", "90"] as DateRange[]).map((d) => (
              <button
                key={d}
                onClick={() => setDateRange(d)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  dateRange === d
                    ? "bg-posterita-blue text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        {leaderboard.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Name</th>
                <th>Role</th>
                <th className="text-right">Orders</th>
                <th className="text-right">Revenue</th>
                <th className="text-right">Avg Order</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((staff, idx) => (
                <tr key={staff.user_id}>
                  <td>
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      idx === 0 ? "bg-amber-100 text-amber-700" :
                      idx === 1 ? "bg-gray-200 text-gray-700" :
                      idx === 2 ? "bg-orange-100 text-orange-700" :
                      "bg-gray-50 text-gray-500"
                    }`}>
                      {idx + 1}
                    </span>
                  </td>
                  <td className="font-medium text-gray-900">
                    {staff.firstname || staff.username}
                  </td>
                  <td>
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 capitalize">
                      {staff.role}
                    </span>
                  </td>
                  <td className="text-right tabular-nums">{staff.order_count}</td>
                  <td className="text-right tabular-nums font-medium">{formatCurrency(staff.total_revenue)}</td>
                  <td className="text-right tabular-nums">{formatCurrency(staff.avg_order_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-12 text-center">
            <TrendingUp size={40} className="mx-auto text-gray-300" />
            <h3 className="text-base font-medium text-gray-700 mt-3">No performance data yet</h3>
            <p className="text-sm text-gray-500 mt-1">Staff performance will appear here once orders are processed.</p>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/staff/schedule" prefetch={true} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:border-posterita-blue/30 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Calendar size={20} className="text-posterita-blue" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Schedule</h4>
                <p className="text-xs text-gray-500">Weekly shift planner</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-300 group-hover:text-posterita-blue transition-colors" />
          </div>
        </Link>
        <Link href="/staff/timesheets" prefetch={true} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:border-posterita-blue/30 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <ClipboardList size={20} className="text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Timesheets</h4>
                <p className="text-xs text-gray-500">Hours & payroll reports</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-300 group-hover:text-green-600 transition-colors" />
          </div>
        </Link>
        <Link href="/staff/leave" prefetch={true} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:border-posterita-blue/30 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <CalendarOff size={20} className="text-amber-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Leave</h4>
                <p className="text-xs text-gray-500">Requests & balances</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-300 group-hover:text-amber-600 transition-colors" />
          </div>
        </Link>
      </div>
    </div>
  );
}
