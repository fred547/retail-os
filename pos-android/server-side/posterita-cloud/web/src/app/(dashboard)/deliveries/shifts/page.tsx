"use client";

import { useEffect, useState, useCallback } from "react";
import { Clock, Plus, CheckCircle, AlertTriangle, Banknote, User, X, RefreshCw } from "lucide-react";

interface DriverShift {
  id: number;
  driver_id: number;
  driver_name: string | null;
  opening_float: number;
  closing_float: number | null;
  total_cod_expected: number;
  total_cod_collected: number;
  total_deliveries: number;
  total_delivered: number;
  total_failed: number;
  cash_returned: number | null;
  variance: number | null;
  reconciled_by: number | null;
  reconciliation_notes: string | null;
  status: string;
  started_at: string;
  ended_at: string | null;
}

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<DriverShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStart, setShowStart] = useState(false);
  const [showReconcile, setShowReconcile] = useState<DriverShift | null>(null);

  // Start form
  const [formDriverId, setFormDriverId] = useState("");
  const [formDriverName, setFormDriverName] = useState("");
  const [formFloat, setFormFloat] = useState(0);
  const [saving, setSaving] = useState(false);

  // Reconcile form
  const [reconCash, setReconCash] = useState("");
  const [reconNotes, setReconNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/deliveries/shifts");
      const data = await res.json();
      setShifts(data.shifts || []);
    } catch (_) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const startShift = async () => {
    if (!formDriverName.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/deliveries/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driver_id: parseInt(formDriverId) || 1,
          driver_name: formDriverName,
          opening_float: formFloat,
        }),
      });
      setShowStart(false);
      setFormDriverId(""); setFormDriverName(""); setFormFloat(0);
      load();
    } catch (_) {}
    finally { setSaving(false); }
  };

  const endShift = async (shiftId: number) => {
    await fetch("/api/deliveries/shifts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shift_id: shiftId, action: "end" }),
    });
    load();
  };

  const reconcile = async () => {
    if (!showReconcile) return;
    setSaving(true);
    try {
      await fetch("/api/deliveries/shifts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shift_id: showReconcile.id,
          action: "reconcile",
          cash_returned: parseFloat(reconCash) || 0,
          reconciliation_notes: reconNotes || null,
        }),
      });
      setShowReconcile(null);
      setReconCash(""); setReconNotes("");
      load();
    } catch (_) {}
    finally { setSaving(false); }
  };

  const statusColor = (s: string) =>
    s === "active" ? "bg-green-100 text-green-700" :
    s === "ended" ? "bg-orange-100 text-orange-700" :
    "bg-blue-100 text-blue-700";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clock size={28} className="text-blue-500" /> Driver Shifts
          </h1>
          <p className="text-sm text-gray-500 mt-1">Cash float, COD reconciliation</p>
        </div>
        <button onClick={() => setShowStart(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium">
          <Plus size={16} /> Start Shift
        </button>
      </div>

      {loading && <div className="text-center py-12 text-gray-400"><RefreshCw size={20} className="animate-spin inline" /></div>}

      {/* Shift Cards */}
      <div className="space-y-3">
        {shifts.map((s) => {
          const expectedCash = s.opening_float + s.total_cod_collected;
          return (
            <div key={s.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-gray-400" />
                    <p className="font-semibold text-gray-900">{s.driver_name || `Driver #${s.driver_id}`}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(s.status)}`}>{s.status}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Started: {new Date(s.started_at).toLocaleString()}</p>
                  {s.ended_at && <p className="text-xs text-gray-400">Ended: {new Date(s.ended_at).toLocaleString()}</p>}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-3 mt-4 text-center">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-400">Float</p>
                  <p className="text-sm font-bold">{s.opening_float.toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-400">Deliveries</p>
                  <p className="text-sm font-bold">{s.total_delivered}/{s.total_deliveries}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-400">COD Collected</p>
                  <p className="text-sm font-bold text-orange-600">{s.total_cod_collected.toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-400">Expected Cash</p>
                  <p className="text-sm font-bold">{expectedCash.toFixed(2)}</p>
                </div>
              </div>

              {/* Variance (if reconciled) */}
              {s.status === "reconciled" && (
                <div className={`mt-3 p-3 rounded-lg ${
                  s.variance === 0 ? "bg-green-50" : (s.variance ?? 0) < 0 ? "bg-red-50" : "bg-blue-50"
                }`}>
                  <div className="flex items-center justify-between text-sm">
                    <span>Cash Returned: <strong>{(s.cash_returned ?? 0).toFixed(2)}</strong></span>
                    <span className={`font-bold ${
                      s.variance === 0 ? "text-green-600" : (s.variance ?? 0) < 0 ? "text-red-600" : "text-blue-600"
                    }`}>
                      {s.variance === 0 ? "Exact" : `${(s.variance ?? 0) > 0 ? "+" : ""}${(s.variance ?? 0).toFixed(2)}`}
                    </span>
                  </div>
                  {s.reconciliation_notes && <p className="text-xs text-gray-500 mt-1">{s.reconciliation_notes}</p>}
                </div>
              )}

              {/* Actions */}
              <div className="mt-3 flex gap-2">
                {s.status === "active" && (
                  <button onClick={() => endShift(s.id)} className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg text-xs font-medium hover:bg-orange-200">
                    End Shift
                  </button>
                )}
                {s.status === "ended" && (
                  <button onClick={() => {
                    setShowReconcile(s);
                    setReconCash(expectedCash.toFixed(2));
                  }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
                    <Banknote size={12} className="inline mr-1" /> Reconcile Cash
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {shifts.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-400">
          <Clock size={40} className="mx-auto mb-3 text-gray-300" />
          <p>No driver shifts yet</p>
        </div>
      )}

      {/* Start Shift Modal */}
      {showStart && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Start Driver Shift</h2>
              <button onClick={() => setShowStart(false)} className="text-gray-400"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name *</label>
                <input type="text" value={formDriverName} onChange={(e) => setFormDriverName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" placeholder="John" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Opening Cash Float</label>
                <input type="number" value={formFloat} onChange={(e) => setFormFloat(parseFloat(e.target.value) || 0)}
                  step="0.01" min="0" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowStart(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={startShift} disabled={saving || !formDriverName.trim()}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                {saving ? "Starting..." : "Start Shift"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reconcile Modal */}
      {showReconcile && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Reconcile Cash — {showReconcile.driver_name}</h2>
              <button onClick={() => setShowReconcile(null)} className="text-gray-400"><X size={20} /></button>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 mb-4 text-sm">
              <div className="flex justify-between"><span>Opening Float</span><strong>{showReconcile.opening_float.toFixed(2)}</strong></div>
              <div className="flex justify-between mt-1"><span>COD Collected</span><strong className="text-orange-600">{showReconcile.total_cod_collected.toFixed(2)}</strong></div>
              <div className="flex justify-between mt-1 pt-1 border-t border-gray-200"><span>Expected Total</span><strong>{(showReconcile.opening_float + showReconcile.total_cod_collected).toFixed(2)}</strong></div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cash Returned by Driver</label>
                <input type="number" value={reconCash} onChange={(e) => setReconCash(e.target.value)}
                  step="0.01" min="0" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={reconNotes} onChange={(e) => setReconNotes(e.target.value)} rows={2}
                  placeholder="Any discrepancies..." className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowReconcile(null)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={reconcile} disabled={saving}
                className="px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                {saving ? "Saving..." : "Reconcile"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
