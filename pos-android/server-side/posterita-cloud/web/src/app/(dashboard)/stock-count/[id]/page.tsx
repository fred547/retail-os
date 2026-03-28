"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Play, CheckCircle, RefreshCw, AlertTriangle,
  HelpCircle, Users, BarChart3,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { logError } from "@/lib/error-logger";

export default function StockCountDashboardPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      const res = await fetch(`/api/stock-count/${id}/dashboard`);
      const d = await res.json();
      setData(d);
    } catch (e: any) { logError("StockCountDash", e.message); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const startCount = async () => {
    await fetch(`/api/stock-count/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" }),
    });
    loadDashboard();
  };

  const completeCount = async () => {
    if (!confirm("Mark this count as completed?")) return;
    await fetch(`/api/stock-count/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    loadDashboard();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-32"><RefreshCw size={24} className="animate-spin text-gray-400" /></div>;
  }

  if (!data?.plan) {
    return <div className="text-center py-32 text-gray-500">Count plan not found</div>;
  }

  const { plan, assignments, shelf_map, conflicts, unknowns, staff_progress, summary } = data;

  // Build heatmap grid
  const allShelves = new Set<number>();
  const allHeights = new Set<string>();
  for (const a of assignments ?? []) {
    for (let s = a.shelf_start; s <= a.shelf_end; s++) allShelves.add(s);
    for (const h of a.height_labels ?? []) allHeights.add(h);
  }
  // Also from scans
  for (const s of shelf_map ?? []) {
    allShelves.add(s.shelf);
    allHeights.add(s.height);
  }

  const shelvesArr = [...allShelves].sort((a, b) => a - b);
  const heightsArr = [...allHeights].sort().reverse(); // G, F, E, D, C, B, A (top to bottom)

  const scanLookup: Record<string, any> = {};
  for (const s of shelf_map ?? []) {
    scanLookup[`${s.shelf}-${s.height}`] = s;
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: "Stock Count", href: "/customer/stock-count" },
        { label: plan.name },
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{plan.name}</h1>
          <p className="text-sm text-gray-500">
            {plan.status === "active" ? "Live count in progress" : plan.status === "completed" ? "Completed" : "Draft — start when ready"}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadDashboard} className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200 transition">
            <RefreshCw size={16} />
          </button>
          {plan.status === "draft" && (
            <button onClick={startCount} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
              <Play size={16} /> Start Count
            </button>
          )}
          {plan.status === "active" && (
            <button onClick={completeCount} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition">
              <CheckCircle size={16} /> Complete
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard label="Progress" value={`${summary.progress_percent}%`} color="text-blue-600" />
        <SummaryCard label="Locations" value={`${summary.total_locations_counted}/${summary.total_expected_locations}`} color="text-gray-900" />
        <SummaryCard label="Items Scanned" value={summary.total_items.toString()} color="text-green-600" />
        <SummaryCard label="Conflicts" value={summary.conflict_count.toString()} color={summary.conflict_count > 0 ? "text-red-600" : "text-gray-400"} />
        <SummaryCard label="Unknown Items" value={summary.unknown_count.toString()} color={summary.unknown_count > 0 ? "text-amber-600" : "text-gray-400"} />
      </div>

      {/* Shelf Heatmap */}
      {shelvesArr.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-blue-500" /> Shelf Map
          </h3>
          <div className="overflow-x-auto">
            <div className="inline-grid gap-1" style={{ gridTemplateColumns: `40px repeat(${shelvesArr.length}, 1fr)` }}>
              {/* Header row: shelf numbers */}
              <div />
              {shelvesArr.map(s => (
                <div key={s} className="text-center text-[10px] text-gray-400 font-mono pb-1">{s}</div>
              ))}

              {/* Height rows */}
              {heightsArr.map(h => (
                <>
                  <div key={`label-${h}`} className="text-right text-[10px] text-gray-400 font-mono pr-2 flex items-center justify-end">{h}</div>
                  {shelvesArr.map(s => {
                    const cell = scanLookup[`${s}-${h}`];
                    let bg = "bg-gray-100"; // not counted
                    let title = `Shelf ${s}, Height ${h}: Not counted`;
                    if (cell) {
                      if (cell.status === "conflict") {
                        bg = "bg-red-400";
                        title = `CONFLICT — ${cell.staff.map((st: any) => `${st.user_name}: ${st.quantity}`).join(" vs ")}`;
                      } else if (cell.status === "unknown") {
                        bg = "bg-amber-400";
                        title = `${cell.total_qty} items (${cell.staff.length} unknown)`;
                      } else {
                        bg = "bg-green-400";
                        title = `${cell.total_qty} items by ${cell.staff.map((st: any) => st.user_name).join(", ")}`;
                      }
                    }
                    return (
                      <div key={`${s}-${h}`} className={`${bg} rounded-sm min-w-[24px] min-h-[24px] cursor-pointer hover:ring-2 hover:ring-blue-500 transition`}
                        title={title} />
                    );
                  })}
                </>
              ))}
            </div>
          </div>
          <div className="flex gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-green-400" /> Counted</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-red-400" /> Conflict</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-amber-400" /> Unknown</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-gray-100" /> Not counted</span>
          </div>
        </div>
      )}

      {/* Staff Progress */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Users size={18} className="text-purple-500" /> Staff Progress
        </h3>
        {staff_progress?.length > 0 ? (
          <div className="space-y-2">
            {staff_progress.map((sp: any, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-700">
                  {(sp.user_name || "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{sp.user_name}</p>
                  <p className="text-xs text-gray-500">{sp.locations} locations, {sp.items} items</p>
                </div>
                <div className="w-24 bg-gray-100 rounded-full h-2">
                  <div className="bg-blue-500 rounded-full h-2" style={{ width: `${Math.min(100, (sp.locations / Math.max(1, summary.total_expected_locations / Math.max(1, summary.staff_count))) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No scans yet — waiting for staff to start counting</p>
        )}
      </div>

      {/* Conflicts */}
      {conflicts?.length > 0 && (
        <div className="bg-white rounded-xl border border-red-200 shadow-sm p-5">
          <h3 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
            <AlertTriangle size={18} /> Conflicts ({conflicts.length})
          </h3>
          <div className="space-y-3">
            {conflicts.map((c: any, i: number) => (
              <div key={i} className="bg-red-50 rounded-lg p-3">
                <p className="text-sm font-medium text-red-800">
                  Shelf {c.shelf}-{c.height}: {c.product_name}
                </p>
                <div className="flex gap-3 mt-1">
                  {c.counts.map((ct: any, j: number) => (
                    <span key={j} className="text-xs text-red-600">
                      {ct.user_name}: <strong>{ct.quantity}</strong>
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-red-400 mt-1">Assign a verifier to recount this location</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unknown Items */}
      {unknowns?.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-5">
          <h3 className="font-semibold text-amber-700 mb-3 flex items-center gap-2">
            <HelpCircle size={18} /> Unknown Items ({summary.unknown_count})
          </h3>
          <div className="space-y-2">
            {unknowns.map((u: any, i: number) => (
              <div key={i} className="flex items-center justify-between bg-amber-50 rounded-lg px-3 py-2">
                <span className="text-sm text-amber-800">
                  Shelf {u.shelf}-{u.height}: {u.count} item{u.count !== 1 ? "s" : ""} without barcode
                </span>
                <span className="text-xs text-amber-600">
                  Scanned by {u.scanned_by.join(", ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assignments */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Zone Assignments</h3>
        {assignments?.length > 0 ? (
          <div className="space-y-2">
            {assignments.map((a: any) => (
              <div key={a.id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-sm font-medium text-gray-900 w-32">{a.user_name || `User ${a.user_id}`}</span>
                <span className="text-sm text-gray-500">Shelves {a.shelf_start}–{a.shelf_end}</span>
                <span className="text-xs text-gray-400">Heights: {(a.height_labels || []).join(", ")}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No staff assigned</p>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
