"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Clock, Download, RefreshCw, Users, Calendar,
  Timer, AlertTriangle, Filter,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { logError } from "@/lib/error-logger";

interface TimesheetRow {
  user_id: number;
  user_name: string;
  days_worked: number;
  regular_hours: number;
  overtime_hours: number;
  break_hours: number;
  net_hours: number;
  late_count: number;
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

export default function TimesheetsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TimesheetRow[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [exporting, setExporting] = useState(false);

  // Filters
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [startDate, setStartDate] = useState(firstOfMonth.toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(today.toISOString().slice(0, 10));
  const [storeFilter, setStoreFilter] = useState<number | "">("");
  const [userFilter, setUserFilter] = useState<number | "">("");

  // Summary
  const totalHours = rows.reduce((s, r) => s + r.net_hours, 0);
  const totalOvertime = rows.reduce((s, r) => s + r.overtime_hours, 0);
  const totalBreak = rows.reduce((s, r) => s + r.break_hours, 0);
  const staffCount = rows.length;

  const loadFilters = useCallback(async () => {
    try {
      const [storeRes, userRes] = await Promise.all([
        fetch("/api/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table: "store", select: "store_id, name", filters: [{ column: "isactive", op: "eq", value: "Y" }] }),
        }),
        fetch("/api/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table: "pos_user", select: "user_id, username, firstname", filters: [{ column: "isactive", op: "eq", value: "Y" }] }),
        }),
      ]);
      const storeData = await storeRes.json();
      const userData = await userRes.json();
      setStores(storeData.data || []);
      setUsers(userData.data || []);
    } catch (e: any) {
      logError("Timesheets", `Failed to load filters: ${e.message}`);
    }
  }, []);

  const loadTimesheets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
      if (storeFilter) params.set("store_id", String(storeFilter));
      if (userFilter) params.set("user_id", String(userFilter));

      const res = await fetch(`/api/staff/timesheets?${params}`);
      const data = await res.json();
      setRows(data.timesheets || []);
    } catch (e: any) {
      logError("Timesheets", `Failed to load timesheets: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, storeFilter, userFilter]);

  useEffect(() => { loadFilters(); }, [loadFilters]);
  useEffect(() => { loadTimesheets(); }, [loadTimesheets]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
      if (storeFilter) params.set("store_id", String(storeFilter));
      if (userFilter) params.set("user_id", String(userFilter));

      const res = await fetch(`/api/staff/payroll-export?${params}`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `timesheet-${startDate}-to-${endDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      logError("Timesheets", `Failed to export: ${e.message}`);
      alert("Failed to export timesheet data.");
    } finally {
      setExporting(false);
    }
  };

  const formatHours = (h: number) => {
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    return `${hrs}h ${mins}m`;
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Staff", href: "/staff" }, { label: "Timesheets" }]} />

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clock size={28} className="text-green-600" />
            Timesheets
          </h1>
          <p className="text-sm text-gray-500 mt-1">Staff hours, overtime, and payroll reports</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || rows.length === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-posterita-blue text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Download size={16} />
          {exporting ? "Exporting..." : "Export CSV"}
        </button>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter size={16} className="text-gray-400" />
          <div className="flex items-center gap-2">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20" />
            <span className="text-gray-400 text-sm">to</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20" />
          </div>
          {stores.length > 1 && (
            <select value={storeFilter} onChange={e => setStoreFilter(e.target.value ? Number(e.target.value) : "")} className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20">
              <option value="">All Stores</option>
              {stores.map(s => <option key={s.store_id} value={s.store_id}>{s.name}</option>)}
            </select>
          )}
          <select value={userFilter} onChange={e => setUserFilter(e.target.value ? Number(e.target.value) : "")} className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20">
            <option value="">All Staff</option>
            {users.map(u => <option key={u.user_id} value={u.user_id}>{u.firstname || u.username}</option>)}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500">Total Hours</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{formatHours(totalHours)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500">Total Overtime</p>
          <p className="text-3xl font-bold text-amber-600 mt-1">{formatHours(totalOvertime)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500">Total Break Time</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{formatHours(totalBreak)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500">Staff Count</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{staffCount}</p>
        </div>
      </div>

      {/* Timesheets Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
            Loading timesheets...
          </div>
        ) : rows.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th className="text-right">Days Worked</th>
                <th className="text-right">Regular Hours</th>
                <th className="text-right">Overtime</th>
                <th className="text-right">Break Hours</th>
                <th className="text-right">Net Hours</th>
                <th className="text-right">Late Count</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.user_id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-posterita-blue">
                        {(row.user_name || "?").charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{row.user_name}</span>
                    </div>
                  </td>
                  <td className="text-right tabular-nums">{row.days_worked}</td>
                  <td className="text-right tabular-nums">{formatHours(row.regular_hours)}</td>
                  <td className="text-right tabular-nums">
                    {row.overtime_hours > 0 ? (
                      <span className="text-amber-600 font-medium">{formatHours(row.overtime_hours)}</span>
                    ) : "0h 0m"}
                  </td>
                  <td className="text-right tabular-nums">{formatHours(row.break_hours)}</td>
                  <td className="text-right tabular-nums font-semibold">{formatHours(row.net_hours)}</td>
                  <td className="text-right">
                    {row.late_count > 0 ? (
                      <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                        <AlertTriangle size={12} /> {row.late_count}
                      </span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-12 text-center">
            <Timer size={40} className="mx-auto text-gray-300" />
            <h3 className="text-base font-medium text-gray-700 mt-3">No timesheet data</h3>
            <p className="text-sm text-gray-500 mt-1">
              No shifts found for the selected date range. Try adjusting your filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
