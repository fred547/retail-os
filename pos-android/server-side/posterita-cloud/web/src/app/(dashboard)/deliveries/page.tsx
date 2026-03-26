"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Truck, Plus, MapPin, Phone, User, Clock, Package,
  Check, X, AlertCircle, RefreshCw, ChevronRight,
} from "lucide-react";

interface Delivery {
  id: number;
  order_id: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string;
  delivery_city: string | null;
  delivery_notes: string | null;
  driver_name: string | null;
  driver_id: number | null;
  status: string;
  estimated_time: number | null;
  delivery_fee: number;
  actual_delivery_at: string | null;
  created_at: string;
}

const statusConfig: Record<string, { color: string; label: string; bg: string }> = {
  pending: { color: "text-gray-600", label: "Pending", bg: "bg-gray-100" },
  assigned: { color: "text-blue-600", label: "Assigned", bg: "bg-blue-100" },
  picked_up: { color: "text-orange-600", label: "Picked Up", bg: "bg-orange-100" },
  in_transit: { color: "text-purple-600", label: "In Transit", bg: "bg-purple-100" },
  delivered: { color: "text-green-600", label: "Delivered", bg: "bg-green-100" },
  failed: { color: "text-red-600", label: "Failed", bg: "bg-red-100" },
  cancelled: { color: "text-gray-400", label: "Cancelled", bg: "bg-gray-50" },
};

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [summary, setSummary] = useState({ pending: 0, in_transit: 0, delivered: 0 });
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  // Create form
  const [formAddress, setFormAddress] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formCustomerName, setFormCustomerName] = useState("");
  const [formCustomerPhone, setFormCustomerPhone] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formEstTime, setFormEstTime] = useState(30);
  const [formFee, setFormFee] = useState(0);

  const loadDeliveries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/deliveries?${params}`);
      const data = await res.json();
      setDeliveries(data.deliveries || []);
      setSummary(data.summary || { pending: 0, in_transit: 0, delivered: 0 });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { loadDeliveries(); }, [loadDeliveries]);

  const createDelivery = async () => {
    if (!formAddress.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delivery_address: formAddress,
          delivery_city: formCity,
          customer_name: formCustomerName,
          customer_phone: formCustomerPhone,
          delivery_notes: formNotes,
          estimated_time: formEstTime,
          delivery_fee: formFee,
        }),
      });
      setShowCreate(false);
      setFormAddress(""); setFormCity(""); setFormCustomerName("");
      setFormCustomerPhone(""); setFormNotes(""); setFormEstTime(30); setFormFee(0);
      loadDeliveries();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: number, newStatus: string) => {
    await fetch(`/api/deliveries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    loadDeliveries();
  };

  const statuses = ["", "pending", "assigned", "picked_up", "in_transit", "delivered", "failed", "cancelled"];

  if (loading && deliveries.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
        Loading deliveries...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Truck size={28} className="text-purple-500" />
            Deliveries
          </h1>
          <p className="text-sm text-gray-500 mt-1">{deliveries.length} delivery order{deliveries.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors">
          <Plus size={16} /> New Delivery
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-3xl font-bold text-yellow-600 mt-1">{summary.pending}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500">In Transit</p>
          <p className="text-3xl font-bold text-purple-600 mt-1">{summary.in_transit}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500">Delivered</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{summary.delivered}</p>
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex gap-2 flex-wrap">
        {statuses.map((s) => (
          <button key={s || "all"} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            {s ? statusConfig[s]?.label || s : "All"}
          </button>
        ))}
      </div>

      {/* Delivery Cards */}
      <div className="space-y-3">
        {deliveries.map((d) => {
          const sc = statusConfig[d.status] || statusConfig.pending;
          return (
            <div key={d.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${sc.bg}`}>
                    <Truck size={18} className={sc.color} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">
                        {d.customer_name || `Delivery #${d.id}`}
                      </p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.color}`}>
                        {sc.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                      <MapPin size={12} /> {d.delivery_address}{d.delivery_city ? `, ${d.delivery_city}` : ""}
                    </div>
                    {d.customer_phone && (
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
                        <Phone size={12} /> {d.customer_phone}
                      </div>
                    )}
                    {d.driver_name && (
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
                        <User size={12} /> Driver: {d.driver_name}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right text-xs text-gray-400">
                  {d.estimated_time && <p><Clock size={12} className="inline" /> ~{d.estimated_time}min</p>}
                  {d.delivery_fee > 0 && <p className="font-medium text-gray-600">{d.delivery_fee.toFixed(2)} fee</p>}
                  {d.order_id && <p>Order #{d.order_id}</p>}
                </div>
              </div>
              {d.delivery_notes && (
                <p className="mt-2 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-1.5">{d.delivery_notes}</p>
              )}
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-gray-400">{new Date(d.created_at).toLocaleString()}</span>
                <div className="flex gap-2">
                  {d.status === "pending" && (
                    <button onClick={() => updateStatus(d.id, "assigned")} className="text-blue-600 hover:text-blue-700 font-medium">Assign</button>
                  )}
                  {d.status === "assigned" && (
                    <button onClick={() => updateStatus(d.id, "picked_up")} className="text-orange-600 hover:text-orange-700 font-medium">Picked Up</button>
                  )}
                  {(d.status === "picked_up" || d.status === "assigned") && (
                    <button onClick={() => updateStatus(d.id, "in_transit")} className="text-purple-600 hover:text-purple-700 font-medium">In Transit</button>
                  )}
                  {d.status === "in_transit" && (
                    <button onClick={() => updateStatus(d.id, "delivered")} className="text-green-600 hover:text-green-700 font-medium">Delivered</button>
                  )}
                  {!["delivered", "cancelled", "failed"].includes(d.status) && (
                    <button onClick={() => updateStatus(d.id, "cancelled")} className="text-red-600 hover:text-red-700 font-medium">Cancel</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {deliveries.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-400">
          <Truck size={40} className="mx-auto mb-3 text-gray-300" />
          <p>No deliveries yet. Create one to start tracking.</p>
        </div>
      )}

      {/* Create Sheet */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-md max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">New Delivery</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address *</label>
                <input type="text" value={formAddress} onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input type="text" value={formCity} onChange={(e) => setFormCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                  <input type="text" value={formCustomerName} onChange={(e) => setFormCustomerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="text" value={formCustomerPhone} onChange={(e) => setFormCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Est. Time (min)</label>
                  <input type="number" value={formEstTime} onChange={(e) => setFormEstTime(parseInt(e.target.value) || 0)} min={0}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Fee</label>
                  <input type="number" value={formFee} onChange={(e) => setFormFee(parseFloat(e.target.value) || 0)} step="0.01" min={0}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={createDelivery} disabled={saving || !formAddress.trim()}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors disabled:opacity-50">
                {saving ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
