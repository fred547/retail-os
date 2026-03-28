"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, ClipboardList, Play, CheckCircle, Clock, X, Users, RefreshCw } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { dataQuery } from "@/lib/supabase/data-client";
import { logError } from "@/lib/error-logger";

interface CountPlan {
  id: number;
  name: string;
  store_id: number;
  status: string;
  notes: string | null;
  created_at: string;
  assignments: { user_name: string; shelf_start: number; shelf_end: number }[];
}

interface StoreInfo { store_id: number; name: string }
interface UserInfo { user_id: number; firstname: string | null; username: string | null }

const STATUS_CONFIG: Record<string, { bg: string; text: string; icon: any }> = {
  draft: { bg: "bg-gray-100", text: "text-gray-600", icon: Clock },
  active: { bg: "bg-blue-100", text: "text-blue-700", icon: Play },
  completed: { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle },
  cancelled: { bg: "bg-red-100", text: "text-red-600", icon: X },
};

export default function StockCountListPage() {
  const [plans, setPlans] = useState<CountPlan[]>([]);
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Create form
  const [formName, setFormName] = useState("");
  const [formStore, setFormStore] = useState(0);
  const [formNotes, setFormNotes] = useState("");
  const [formAssignments, setFormAssignments] = useState<{ user_id: number; user_name: string; shelf_start: number; shelf_end: number; height_labels: string[] }[]>([]);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, storesRes, usersRes] = await Promise.all([
        fetch("/api/stock-count").then(r => r.json()),
        dataQuery<StoreInfo>("store", { select: "store_id, name", filters: [{ column: "isactive", op: "eq", value: "Y" }] }),
        dataQuery<UserInfo>("pos_user", { select: "user_id, firstname, username", filters: [{ column: "isactive", op: "eq", value: "Y" }] }),
      ]);
      setPlans(plansRes.plans || []);
      setStores(storesRes.data ?? []);
      setUsers(usersRes.data ?? []);
      if (storesRes.data?.length && !formStore) setFormStore(storesRes.data[0].store_id);
    } catch (e: any) { logError("StockCount", `Load failed: ${e.message}`); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const addAssignment = () => {
    if (!users.length) return;
    const u = users[0];
    setFormAssignments(prev => [...prev, {
      user_id: u.user_id,
      user_name: u.firstname || u.username || "Staff",
      shelf_start: 1,
      shelf_end: 10,
      height_labels: ["A", "B", "C", "D", "E", "F", "G"],
    }]);
  };

  const createPlan = async () => {
    if (!formName.trim() || !formStore) return;
    setSaving(true);
    try {
      await fetch("/api/stock-count", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName, store_id: formStore, notes: formNotes || null,
          assignments: formAssignments,
        }),
      });
      setShowCreate(false);
      setFormName(""); setFormNotes(""); setFormAssignments([]);
      loadData();
    } catch (e: any) { logError("StockCount", `Create failed: ${e.message}`); }
    finally { setSaving(false); }
  };

  const storeMap = Object.fromEntries(stores.map(s => [s.store_id, s.name]));

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Full Stock Count" }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList size={28} className="text-blue-500" /> Full Stock Count
          </h1>
          <p className="text-sm text-gray-500 mt-1">Plan, assign, count, and reconcile — shelf by shelf</p>
        </div>
        <button onClick={() => { setShowCreate(true); addAssignment(); }}
          className="flex items-center gap-2 px-4 py-2 bg-posterita-blue text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
          <Plus size={16} /> New Count Plan
        </button>
      </div>

      {/* Plan list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400"><RefreshCw size={24} className="animate-spin mx-auto" /></div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
          <ClipboardList size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No stock count plans yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map(p => {
            const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.draft;
            const Icon = sc.icon;
            return (
              <Link key={p.id} href={`/customer/stock-count/${p.id}`}
                className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 hover:border-blue-200 hover:shadow-md transition group">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <ClipboardList size={20} className="text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{p.name}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${sc.bg} ${sc.text}`}>
                      <Icon size={10} /> {p.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {storeMap[p.store_id] || "Store"} — {p.assignments.length} staff assigned
                  </p>
                </div>
                <p className="text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString()}</p>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Plan Sheet */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">New Count Plan</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name *</label>
                <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Q1 2026 Full Count"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-posterita-blue outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Store *</label>
                <select value={formStore} onChange={e => setFormStore(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-posterita-blue outline-none">
                  {stores.map(s => <option key={s.store_id} value={s.store_id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-posterita-blue outline-none resize-none" />
              </div>

              {/* Staff Assignments */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    <Users size={14} /> Staff Assignments
                  </label>
                  <button onClick={addAssignment} className="text-xs text-posterita-blue font-medium hover:underline">
                    + Add Staff
                  </button>
                </div>

                <div className="space-y-2">
                  {formAssignments.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
                      <select value={a.user_id} onChange={e => {
                        const u = users.find(u => u.user_id === Number(e.target.value));
                        setFormAssignments(prev => prev.map((x, j) => j === i ? { ...x, user_id: Number(e.target.value), user_name: u?.firstname || u?.username || "Staff" } : x));
                      }} className="flex-1 px-2 py-1.5 rounded border border-gray-200 text-sm">
                        {users.map(u => <option key={u.user_id} value={u.user_id}>{u.firstname || u.username}</option>)}
                      </select>
                      <span className="text-xs text-gray-400">Shelves</span>
                      <input type="number" value={a.shelf_start} onChange={e => setFormAssignments(prev => prev.map((x, j) => j === i ? { ...x, shelf_start: parseInt(e.target.value) || 1 } : x))}
                        className="w-14 px-2 py-1.5 rounded border border-gray-200 text-sm text-center" />
                      <span className="text-xs text-gray-400">–</span>
                      <input type="number" value={a.shelf_end} onChange={e => setFormAssignments(prev => prev.map((x, j) => j === i ? { ...x, shelf_end: parseInt(e.target.value) || 10 } : x))}
                        className="w-14 px-2 py-1.5 rounded border border-gray-200 text-sm text-center" />
                      <button onClick={() => setFormAssignments(prev => prev.filter((_, j) => j !== i))}
                        className="text-gray-400 hover:text-red-500 p-1"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={createPlan} disabled={saving || !formName.trim() || !formStore}
                className="px-6 py-2.5 bg-posterita-blue hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition disabled:opacity-50">
                {saving ? "Creating..." : "Create Plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
