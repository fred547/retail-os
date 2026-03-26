"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ClipboardList, Plus, Search, Package, Truck,
  Check, Clock, X, AlertCircle, RefreshCw,
  ChevronRight, FileText,
} from "lucide-react";

interface PO {
  po_id: number;
  po_number: string;
  supplier_name: string;
  supplier_id: number;
  status: string;
  grand_total: number;
  order_date: string;
  expected_date: string | null;
  received_date: string | null;
  notes: string | null;
}

interface Supplier {
  supplier_id: number;
  name: string;
}

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  draft: { color: "bg-gray-100 text-gray-700", icon: FileText, label: "Draft" },
  sent: { color: "bg-blue-100 text-blue-700", icon: Truck, label: "Sent" },
  partial: { color: "bg-yellow-100 text-yellow-700", icon: Clock, label: "Partial" },
  received: { color: "bg-green-100 text-green-700", icon: Check, label: "Received" },
  cancelled: { color: "bg-red-100 text-red-700", icon: X, label: "Cancelled" },
};

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PO[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  // Create form
  const [formSupplierId, setFormSupplierId] = useState(0);
  const [formNotes, setFormNotes] = useState("");
  const [formLines, setFormLines] = useState<{ product_name: string; quantity_ordered: number; unit_cost: number }[]>([
    { product_name: "", quantity_ordered: 1, unit_cost: 0 },
  ]);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);

      const [poRes, supRes] = await Promise.all([
        fetch(`/api/purchase-orders?${params}`),
        fetch("/api/suppliers"),
      ]);
      const poData = await poRes.json();
      const supData = await supRes.json();
      setOrders(poData.orders || []);
      setSuppliers(supData.suppliers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const addLine = () => setFormLines([...formLines, { product_name: "", quantity_ordered: 1, unit_cost: 0 }]);
  const removeLine = (i: number) => setFormLines(formLines.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: string, value: any) => {
    const updated = [...formLines];
    (updated[i] as any)[field] = value;
    setFormLines(updated);
  };

  const createPO = async () => {
    if (!formSupplierId || formLines.every(l => !l.product_name)) return;
    setSaving(true);
    try {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_id: formSupplierId,
          notes: formNotes,
          lines: formLines.filter(l => l.product_name).map(l => ({
            product_id: 0,
            product_name: l.product_name,
            quantity_ordered: l.quantity_ordered,
            unit_cost: l.unit_cost,
          })),
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setFormSupplierId(0);
        setFormNotes("");
        setFormLines([{ product_name: "", quantity_ordered: 1, unit_cost: 0 }]);
        loadData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (poId: number, newStatus: string) => {
    try {
      await fetch(`/api/purchase-orders/${poId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const formTotal = formLines.reduce((sum, l) => sum + l.quantity_ordered * l.unit_cost, 0);

  if (loading && orders.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
        Loading purchase orders...
      </div>
    );
  }

  const statuses = ["", "draft", "sent", "partial", "received", "cancelled"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList size={28} className="text-indigo-500" />
            Purchase Orders
          </h1>
          <p className="text-sm text-gray-500 mt-1">{orders.length} order{orders.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors"
        >
          <Plus size={16} /> New PO
        </button>
      </div>

      {/* Status Filters */}
      <div className="flex gap-2 flex-wrap">
        {statuses.map((s) => (
          <button
            key={s || "all"}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s ? statusConfig[s]?.label || s : "All"}
          </button>
        ))}
      </div>

      {/* PO List */}
      <div className="space-y-3">
        {orders.map((po) => {
          const sc = statusConfig[po.status] || statusConfig.draft;
          const Icon = sc.icon;
          return (
            <div key={po.po_id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <Icon size={18} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{po.po_number}</p>
                    <p className="text-xs text-gray-500">{po.supplier_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">
                    {po.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>
                    {sc.label}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                <span>Ordered: {new Date(po.order_date).toLocaleDateString()}</span>
                <div className="flex gap-2">
                  {po.status === "draft" && (
                    <button onClick={() => updateStatus(po.po_id, "sent")} className="text-blue-600 hover:text-blue-700 font-medium">
                      Mark Sent
                    </button>
                  )}
                  {(po.status === "sent" || po.status === "partial") && (
                    <button onClick={() => updateStatus(po.po_id, "received")} className="text-green-600 hover:text-green-700 font-medium">
                      Mark Received
                    </button>
                  )}
                  {po.status !== "cancelled" && po.status !== "received" && (
                    <button onClick={() => updateStatus(po.po_id, "cancelled")} className="text-red-600 hover:text-red-700 font-medium">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {orders.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-400">
          <ClipboardList size={40} className="mx-auto mb-3 text-gray-300" />
          <p>No purchase orders yet. Create your first PO to track supplier orders.</p>
        </div>
      )}

      {/* Create PO Bottom Sheet */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-lg max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Create Purchase Order</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                <select
                  value={formSupplierId}
                  onChange={(e) => setFormSupplierId(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value={0}>Select supplier...</option>
                  {suppliers.map((s) => (
                    <option key={s.supplier_id} value={s.supplier_id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Line Items</label>
                {formLines.map((line, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Product name"
                      value={line.product_name}
                      onChange={(e) => updateLine(i, "product_name", e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={line.quantity_ordered}
                      onChange={(e) => updateLine(i, "quantity_ordered", parseFloat(e.target.value) || 0)}
                      className="w-20 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      min="1"
                    />
                    <input
                      type="number"
                      placeholder="Cost"
                      value={line.unit_cost}
                      onChange={(e) => updateLine(i, "unit_cost", parseFloat(e.target.value) || 0)}
                      className="w-24 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      step="0.01"
                      min="0"
                    />
                    {formLines.length > 1 && (
                      <button onClick={() => removeLine(i)} className="text-red-400 hover:text-red-600">
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={addLine} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                  + Add line
                </button>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-right">
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-xl font-bold text-gray-900">
                  {formTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                Cancel
              </button>
              <button
                onClick={createPO}
                disabled={saving || !formSupplierId}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create PO"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
