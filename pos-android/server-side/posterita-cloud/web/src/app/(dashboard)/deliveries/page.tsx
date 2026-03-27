"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Truck, Plus, MapPin, Phone, User, Clock, Package, Store,
  Check, X, AlertCircle, RefreshCw, ChevronRight, Bike,
  Car, ArrowDownLeft, ArrowUpRight, ArrowLeftRight,
  Camera, PenTool, KeyRound, ScanBarcode, CreditCard, Banknote,
} from "lucide-react";

interface Delivery {
  id: number;
  delivery_type: string;
  direction: string;
  destination_type: string;
  destination_store_id: number | null;
  origin_type: string;
  order_id: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string;
  delivery_city: string | null;
  delivery_notes: string | null;
  special_instructions: string | null;
  driver_name: string | null;
  driver_id: number | null;
  vehicle_type: string | null;
  status: string;
  estimated_time: number | null;
  delivery_fee: number;
  payment_method: string;
  cod_amount: number;
  cod_collected: number;
  proof_type: string;
  proof_verified: boolean;
  actual_delivery_at: string | null;
  scheduled_at: string | null;
  items: any[] | null;
  created_at: string;
}

interface StoreOption {
  store_id: number;
  name: string;
  address: string | null;
  city: string | null;
}

const DELIVERY_TYPES = [
  { id: "food", label: "Food", icon: "🍔", desc: "Scooter, photo proof" },
  { id: "package", label: "Package", icon: "📦", desc: "Car/van, signature" },
  { id: "heavy", label: "Heavy", icon: "🪑", desc: "Truck, signature + checklist" },
  { id: "transfer", label: "Store Transfer", icon: "🔄", desc: "Van, barcode scan" },
  { id: "supplier_pickup", label: "Supplier Pickup", icon: "🏭", desc: "Van, photo of goods" },
  { id: "return_pickup", label: "Return Pickup", icon: "↩️", desc: "Car, customer signature" },
  { id: "document", label: "Document", icon: "📄", desc: "Scooter, signature" },
  { id: "cash_collection", label: "Cash Collection", icon: "💰", desc: "Car, count verification" },
];

const statusConfig: Record<string, { color: string; label: string; bg: string }> = {
  pending: { color: "text-gray-600", label: "Pending", bg: "bg-gray-100" },
  assigned: { color: "text-blue-600", label: "Assigned", bg: "bg-blue-100" },
  picked_up: { color: "text-orange-600", label: "Picked Up", bg: "bg-orange-100" },
  in_transit: { color: "text-purple-600", label: "In Transit", bg: "bg-purple-100" },
  delivered: { color: "text-green-600", label: "Delivered", bg: "bg-green-100" },
  failed: { color: "text-red-600", label: "Failed", bg: "bg-red-100" },
  cancelled: { color: "text-gray-400", label: "Cancelled", bg: "bg-gray-50" },
  returned: { color: "text-amber-600", label: "Returned", bg: "bg-amber-100" },
};

const directionIcon = (d: string) => {
  if (d === "inbound") return ArrowDownLeft;
  if (d === "transfer") return ArrowLeftRight;
  return ArrowUpRight;
};

const proofIcon = (p: string) => {
  if (p === "photo") return Camera;
  if (p === "signature") return PenTool;
  if (p === "pin") return KeyRound;
  if (p === "barcode_scan") return ScanBarcode;
  return null;
};

export default function DeliveriesPage() {
  const router = useRouter();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [directionFilter, setDirectionFilter] = useState("");
  const [summary, setSummary] = useState({ pending: 0, in_transit: 0, delivered: 0, outbound: 0, inbound: 0, transfers: 0 });
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  // Create form
  const [formType, setFormType] = useState("package");
  const [formDestType, setFormDestType] = useState<"customer" | "store">("customer");
  const [formDestStoreId, setFormDestStoreId] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formCustomerName, setFormCustomerName] = useState("");
  const [formCustomerPhone, setFormCustomerPhone] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formSpecialInstructions, setFormSpecialInstructions] = useState("");
  const [formEstTime, setFormEstTime] = useState(30);
  const [formFee, setFormFee] = useState(0);
  const [formCodAmount, setFormCodAmount] = useState(0);
  const [formPayment, setFormPayment] = useState("prepaid");

  const loadDeliveries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (directionFilter) params.set("direction", directionFilter);
      const res = await fetch(`/api/deliveries?${params}`);
      const data = await res.json();
      setDeliveries(data.deliveries || []);
      setSummary(data.summary || { pending: 0, in_transit: 0, delivered: 0, outbound: 0, inbound: 0, transfers: 0 });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [statusFilter, directionFilter]);

  const loadStores = useCallback(async () => {
    try {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "store", select: "store_id, name, address, city" }),
      });
      const data = await res.json();
      setStores(data.data || []);
    } catch (_) {}
  }, []);

  useEffect(() => { loadDeliveries(); loadStores(); }, [loadDeliveries, loadStores]);

  // Auto-set direction based on type
  useEffect(() => {
    const type = DELIVERY_TYPES.find(t => t.id === formType);
    if (formType === "transfer") {
      setFormDestType("store");
    } else if (["supplier_pickup", "return_pickup", "cash_collection"].includes(formType)) {
      setFormDestType("customer"); // destination is our store (pickup brings it here)
    } else {
      setFormDestType("customer");
    }
    // Auto-set payment for COD types
    if (["food", "cash_collection"].includes(formType)) setFormPayment("cod_cash");
    else setFormPayment("prepaid");
  }, [formType]);

  const resetForm = () => {
    setFormType("package"); setFormDestType("customer"); setFormDestStoreId("");
    setFormAddress(""); setFormCity(""); setFormCustomerName(""); setFormCustomerPhone("");
    setFormNotes(""); setFormSpecialInstructions(""); setFormEstTime(30);
    setFormFee(0); setFormCodAmount(0); setFormPayment("prepaid");
  };

  const createDelivery = async () => {
    setSaving(true);
    try {
      await fetch("/api/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delivery_type: formType,
          destination_type: formDestType,
          destination_store_id: formDestType === "store" ? parseInt(formDestStoreId) || null : null,
          delivery_address: formAddress,
          delivery_city: formCity,
          customer_name: formCustomerName,
          customer_phone: formCustomerPhone,
          delivery_notes: formNotes,
          special_instructions: formSpecialInstructions,
          estimated_time: formEstTime,
          delivery_fee: formFee,
          payment_method: formPayment,
          cod_amount: formCodAmount,
        }),
      });
      setShowCreate(false);
      resetForm();
      loadDeliveries();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id: number, newStatus: string) => {
    await fetch(`/api/deliveries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    loadDeliveries();
  };

  const isInbound = ["supplier_pickup", "return_pickup", "cash_collection"].includes(formType);
  const isTransfer = formType === "transfer";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Truck size={28} className="text-purple-500" /> Deliveries
          </h1>
          <p className="text-sm text-gray-500 mt-1">{deliveries.length} total</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => router.push("/deliveries/shifts")}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-medium transition-colors">
            <Clock size={14} /> Shifts
          </button>
          <button onClick={() => router.push("/deliveries/driver")}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-medium transition-colors">
            <Truck size={14} /> Driver
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors">
            <Plus size={16} /> New
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{summary.pending}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500">In Transit</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{summary.in_transit}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500">Delivered</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{summary.delivered}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500">Outbound</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{summary.outbound}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500">Pickups</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{summary.inbound}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500">Transfers</p>
          <p className="text-2xl font-bold text-gray-600 mt-1">{summary.transfers}</p>
        </div>
      </div>

      {/* Direction tabs + Status filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "", label: "All" },
          { id: "outbound", label: "Outbound" },
          { id: "inbound", label: "Pickups" },
          { id: "transfer", label: "Transfers" },
        ].map((d) => (
          <button key={d.id} onClick={() => setDirectionFilter(d.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              directionFilter === d.id ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>{d.label}</button>
        ))}
        <span className="text-gray-300 mx-1">|</span>
        {["", "pending", "assigned", "in_transit", "delivered", "failed"].map((s) => (
          <button key={s || "all-s"} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s ? "bg-gray-800 text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
            }`}>{s ? statusConfig[s]?.label || s : "All Status"}</button>
        ))}
      </div>

      {/* Loading */}
      {loading && deliveries.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <RefreshCw size={24} className="animate-spin mx-auto mb-3" /> Loading...
        </div>
      )}

      {/* Delivery Cards */}
      <div className="space-y-3">
        {deliveries.map((d) => {
          const sc = statusConfig[d.status] || statusConfig.pending;
          const DirIcon = directionIcon(d.direction);
          const ProofIcon = proofIcon(d.proof_type);
          const typeInfo = DELIVERY_TYPES.find(t => t.id === d.delivery_type);
          return (
            <div key={d.id} onClick={() => router.push(`/deliveries/${d.id}`)} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${sc.bg}`}>
                    {typeInfo ? <span className="text-lg">{typeInfo.icon}</span> : <Truck size={18} className={sc.color} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">
                        {d.customer_name || (d.destination_type === "store" ? "Store Transfer" : `Delivery #${d.id}`)}
                      </p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.color}`}>
                        {sc.label}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-500">
                        <DirIcon size={10} /> {d.direction}
                      </span>
                      {typeInfo && (
                        <span className="text-xs text-gray-400">{typeInfo.label}</span>
                      )}
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
                        <User size={12} /> {d.driver_name} {d.vehicle_type && `(${d.vehicle_type})`}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right text-xs text-gray-400 space-y-0.5">
                  {d.estimated_time && <p><Clock size={12} className="inline" /> ~{d.estimated_time}min</p>}
                  {d.delivery_fee > 0 && <p className="font-medium text-gray-600">{d.delivery_fee.toFixed(2)} fee</p>}
                  {d.cod_amount > 0 && <p className="text-orange-600"><Banknote size={12} className="inline" /> COD {d.cod_amount.toFixed(2)}</p>}
                  {ProofIcon && <p><ProofIcon size={12} className="inline" /> {d.proof_type}{d.proof_verified ? " ✓" : ""}</p>}
                  {d.order_id && <p>Order #{d.order_id}</p>}
                </div>
              </div>
              {(d.delivery_notes || d.special_instructions) && (
                <p className="mt-2 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-1.5">
                  {d.delivery_notes}{d.special_instructions ? ` | ${d.special_instructions}` : ""}
                </p>
              )}
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-gray-400">{new Date(d.created_at).toLocaleString()}</span>
                <div className="flex gap-2">
                  {d.status === "pending" && <button onClick={() => updateStatus(d.id, "assigned")} className="text-blue-600 hover:text-blue-700 font-medium">Assign</button>}
                  {d.status === "assigned" && <button onClick={() => updateStatus(d.id, "picked_up")} className="text-orange-600 hover:text-orange-700 font-medium">Picked Up</button>}
                  {["picked_up", "assigned"].includes(d.status) && <button onClick={() => updateStatus(d.id, "in_transit")} className="text-purple-600 hover:text-purple-700 font-medium">In Transit</button>}
                  {d.status === "in_transit" && <button onClick={() => updateStatus(d.id, "delivered")} className="text-green-600 hover:text-green-700 font-medium">Delivered</button>}
                  {!["delivered", "cancelled", "failed", "returned"].includes(d.status) && <button onClick={() => updateStatus(d.id, "cancelled")} className="text-red-600 hover:text-red-700 font-medium">Cancel</button>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {deliveries.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-400">
          <Truck size={40} className="mx-auto mb-3 text-gray-300" />
          <p>No deliveries yet</p>
        </div>
      )}

      {/* ─── Create Sheet ─── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">New Delivery</h2>
              <button onClick={() => { setShowCreate(false); resetForm(); }} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            {/* Step 1: Type */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <div className="grid grid-cols-4 gap-2">
                {DELIVERY_TYPES.map((t) => (
                  <button key={t.id} onClick={() => setFormType(t.id)}
                    className={`p-2 rounded-lg border-2 text-center transition ${
                      formType === t.id ? "border-purple-500 bg-purple-50" : "border-gray-200 hover:border-gray-300"
                    }`}>
                    <span className="text-lg">{t.icon}</span>
                    <p className="text-[10px] font-medium text-gray-700 mt-1">{t.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Destination */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isInbound ? "Pickup From" : isTransfer ? "Transfer To" : "Deliver To"}
              </label>
              <div className="flex gap-2 mb-3">
                <button onClick={() => setFormDestType("customer")}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition ${
                    formDestType === "customer" ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-600"
                  }`}>
                  <User size={14} className="inline mr-1" /> {isInbound ? "Address" : "Customer"}
                </button>
                <button onClick={() => setFormDestType("store")}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition ${
                    formDestType === "store" ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-600"
                  }`}>
                  <Store size={14} className="inline mr-1" /> Store
                </button>
              </div>

              {formDestType === "store" ? (
                <select value={formDestStoreId} onChange={(e) => setFormDestStoreId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20">
                  <option value="">Select store...</option>
                  {stores.map((s) => (
                    <option key={s.store_id} value={s.store_id}>{s.name}{s.city ? ` — ${s.city}` : ""}</option>
                  ))}
                </select>
              ) : (
                <div className="space-y-3">
                  <input type="text" value={formAddress} onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="Address *" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" value={formCity} onChange={(e) => setFormCity(e.target.value)}
                      placeholder="City" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                    <input type="text" value={formCustomerPhone} onChange={(e) => setFormCustomerPhone(e.target.value)}
                      placeholder="Phone" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                  </div>
                  <input type="text" value={formCustomerName} onChange={(e) => setFormCustomerName(e.target.value)}
                    placeholder="Contact name" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                </div>
              )}
            </div>

            {/* Step 3: Details */}
            <div className="space-y-3 mb-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Est. Time</label>
                  <input type="number" value={formEstTime} onChange={(e) => setFormEstTime(parseInt(e.target.value) || 0)} min={0}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Fee</label>
                  <input type="number" value={formFee} onChange={(e) => setFormFee(parseFloat(e.target.value) || 0)} step="0.01" min={0}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">COD Amount</label>
                  <input type="number" value={formCodAmount} onChange={(e) => setFormCodAmount(parseFloat(e.target.value) || 0)} step="0.01" min={0}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Payment</label>
                <div className="flex gap-2">
                  {["prepaid", "cod_cash", "cod_card", "none"].map((p) => (
                    <button key={p} onClick={() => setFormPayment(p)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition ${
                        formPayment === p ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-500"
                      }`}>
                      {p === "prepaid" ? "Prepaid" : p === "cod_cash" ? "COD Cash" : p === "cod_card" ? "COD Card" : "None"}
                    </button>
                  ))}
                </div>
              </div>
              <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2}
                placeholder="Delivery notes..." className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
              {["heavy", "document"].includes(formType) && (
                <textarea value={formSpecialInstructions} onChange={(e) => setFormSpecialInstructions(e.target.value)} rows={2}
                  placeholder="Special handling instructions..." className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button onClick={() => { setShowCreate(false); resetForm(); }} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={createDelivery} disabled={saving || (formDestType === "customer" && !formAddress.trim()) || (formDestType === "store" && !formDestStoreId)}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors disabled:opacity-50">
                {saving ? "Creating..." : "Create Delivery"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
