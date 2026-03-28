"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CalendarOff, Plus, X, Check, XCircle,
  RefreshCw, Calendar, Users, Clock,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { logError } from "@/lib/error-logger";

interface LeaveRequest {
  id: number;
  user_id: number;
  user_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  half_day: boolean;
  days: number;
  status: string;
  reason: string | null;
  created_at: string;
}

interface LeaveBalance {
  user_id: number;
  user_name: string;
  leave_type: string;
  total_days: number;
  used_days: number;
  remaining_days: number;
}

interface UserOption {
  user_id: number;
  username: string;
  firstname: string | null;
}

type Tab = "requests" | "balances";
type StatusFilter = "all" | "pending" | "approved" | "rejected";

const LEAVE_TYPE_COLORS: Record<string, string> = {
  annual: "bg-blue-100 text-blue-700",
  sick: "bg-red-100 text-red-700",
  personal: "bg-purple-100 text-purple-700",
  maternity: "bg-pink-100 text-pink-700",
  paternity: "bg-indigo-100 text-indigo-700",
  unpaid: "bg-gray-100 text-gray-700",
  compassionate: "bg-amber-100 text-amber-700",
  other: "bg-gray-100 text-gray-600",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const LEAVE_TYPES = ["annual", "sick", "personal", "maternity", "paternity", "unpaid", "compassionate", "other"];

export default function LeavePage() {
  const [tab, setTab] = useState<Tab>("requests");
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formUserId, setFormUserId] = useState<number>(0);
  const [formType, setFormType] = useState("annual");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formHalfDay, setFormHalfDay] = useState(false);
  const [formReason, setFormReason] = useState("");

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "pos_user", select: "user_id, username, firstname", filters: [{ column: "isactive", op: "eq", value: "Y" }] }),
      });
      const data = await res.json();
      const userList = data.data || [];
      setUsers(userList);
      if (userList.length > 0 && !formUserId) {
        setFormUserId(userList[0].user_id);
      }
    } catch (e: any) {
      logError("Leave", `Failed to load users: ${e.message}`);
    }
  }, []);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/staff/leave?${params}`);
      const data = await res.json();
      setRequests(data.requests || []);
    } catch (e: any) {
      logError("Leave", `Failed to load leave requests: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const loadBalances = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/staff/leave/balances");
      const data = await res.json();
      setBalances(data.balances || []);
    } catch (e: any) {
      logError("Leave", `Failed to load leave balances: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => {
    if (tab === "requests") loadRequests();
    else loadBalances();
  }, [tab, loadRequests, loadBalances]);

  const handleApprove = async (id: number) => {
    try {
      const res = await fetch(`/api/staff/leave?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      if (!res.ok) throw new Error("Failed to approve");
      loadRequests();
    } catch (e: any) {
      logError("Leave", `Failed to approve request: ${e.message}`);
    }
  };

  const handleReject = async (id: number) => {
    try {
      const res = await fetch(`/api/staff/leave?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });
      if (!res.ok) throw new Error("Failed to reject");
      loadRequests();
    } catch (e: any) {
      logError("Leave", `Failed to reject request: ${e.message}`);
    }
  };

  const handleCreate = async () => {
    if (!formUserId || !formStart || !formEnd) return;
    setSaving(true);
    try {
      const res = await fetch("/api/staff/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: formUserId,
          leave_type: formType,
          start_date: formStart,
          end_date: formEnd,
          half_day: formHalfDay,
          reason: formReason || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create leave request");
      }
      setShowCreateModal(false);
      setFormReason("");
      setFormHalfDay(false);
      loadRequests();
    } catch (e: any) {
      logError("Leave", `Failed to create leave request: ${e.message}`);
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  // Group balances by user
  const balancesByUser = balances.reduce<Record<number, { name: string; items: LeaveBalance[] }>>((acc, b) => {
    if (!acc[b.user_id]) acc[b.user_id] = { name: b.user_name, items: [] };
    acc[b.user_id].items.push(b);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Staff", href: "/staff" }, { label: "Leave" }]} />

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarOff size={28} className="text-amber-600" />
            Leave Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage leave requests and balances</p>
        </div>
        <button
          onClick={() => {
            setFormStart("");
            setFormEnd("");
            setFormType("annual");
            setFormHalfDay(false);
            setFormReason("");
            setShowCreateModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-posterita-blue text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> New Request
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("requests")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "requests" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Requests
        </button>
        <button
          onClick={() => setTab("balances")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "balances" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Balances
        </button>
      </div>

      {/* Requests Tab */}
      {tab === "requests" && (
        <>
          {/* Status Filter Chips */}
          <div className="flex gap-2">
            {(["all", "pending", "approved", "rejected"] as StatusFilter[]).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize ${
                  statusFilter === s
                    ? "bg-posterita-blue text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-16 text-gray-400">
              <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
              Loading requests...
            </div>
          ) : requests.length > 0 ? (
            <div className="space-y-3">
              {requests.map(req => (
                <div key={req.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-posterita-blue mt-0.5">
                        {req.user_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{req.user_name}</h4>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${LEAVE_TYPE_COLORS[req.leave_type] || LEAVE_TYPE_COLORS.other}`}>
                            {req.leave_type}
                          </span>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[req.status] || "bg-gray-100 text-gray-600"}`}>
                            {req.status}
                          </span>
                          {req.half_day && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-purple-50 text-purple-600">
                              Half Day
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {formatDate(req.start_date)} – {formatDate(req.end_date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {req.days} day{req.days !== 1 ? "s" : ""}
                          </span>
                        </div>
                        {req.reason && (
                          <p className="text-sm text-gray-600 mt-2 italic">&ldquo;{req.reason}&rdquo;</p>
                        )}
                      </div>
                    </div>
                    {req.status === "pending" && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleApprove(req.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors"
                        >
                          <Check size={14} /> Approve
                        </button>
                        <button
                          onClick={() => handleReject(req.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 transition-colors"
                        >
                          <XCircle size={14} /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-12 text-center">
              <CalendarOff size={40} className="mx-auto text-gray-300" />
              <h3 className="text-base font-medium text-gray-700 mt-3">No leave requests</h3>
              <p className="text-sm text-gray-500 mt-1">
                {statusFilter !== "all" ? `No ${statusFilter} requests found.` : "No leave requests have been submitted yet."}
              </p>
            </div>
          )}
        </>
      )}

      {/* Balances Tab */}
      {tab === "balances" && (
        loading ? (
          <div className="text-center py-16 text-gray-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
            Loading balances...
          </div>
        ) : Object.keys(balancesByUser).length > 0 ? (
          <div className="space-y-4">
            {Object.entries(balancesByUser).map(([userId, group]) => (
              <div key={userId} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-posterita-blue">
                      {group.name.charAt(0).toUpperCase()}
                    </div>
                    <h4 className="font-semibold text-gray-900">{group.name}</h4>
                  </div>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Leave Type</th>
                      <th className="text-right">Total Days</th>
                      <th className="text-right">Used</th>
                      <th className="text-right">Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((b, i) => (
                      <tr key={i}>
                        <td>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${LEAVE_TYPE_COLORS[b.leave_type] || LEAVE_TYPE_COLORS.other}`}>
                            {b.leave_type}
                          </span>
                        </td>
                        <td className="text-right tabular-nums">{b.total_days}</td>
                        <td className="text-right tabular-nums">{b.used_days}</td>
                        <td className="text-right tabular-nums font-semibold">
                          <span className={b.remaining_days <= 2 ? "text-red-600" : "text-green-600"}>
                            {b.remaining_days}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-12 text-center">
            <Users size={40} className="mx-auto text-gray-300" />
            <h3 className="text-base font-medium text-gray-700 mt-3">No leave balances</h3>
            <p className="text-sm text-gray-500 mt-1">Leave balances will appear once configured for staff members.</p>
          </div>
        )
      )}

      {/* Create Leave Request Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">New Leave Request</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                <select value={formUserId} onChange={e => setFormUserId(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20">
                  {users.map(u => (
                    <option key={u.user_id} value={u.user_id}>{u.firstname || u.username}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                <select value={formType} onChange={e => setFormType(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20">
                  {LEAVE_TYPES.map(t => (
                    <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input type="date" value={formStart} onChange={e => setFormStart(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input type="date" value={formEnd} onChange={e => setFormEnd(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="halfDay"
                  checked={formHalfDay}
                  onChange={e => setFormHalfDay(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-posterita-blue focus:ring-posterita-blue/20"
                />
                <label htmlFor="halfDay" className="text-sm text-gray-700">Half day</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea value={formReason} onChange={e => setFormReason(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-posterita-blue/20 resize-none" placeholder="Reason for leave..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={saving || !formUserId || !formStart || !formEnd} className="px-4 py-2 rounded-lg bg-posterita-blue text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
