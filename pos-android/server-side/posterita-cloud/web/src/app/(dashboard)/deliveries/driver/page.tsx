"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Truck, MapPin, Phone, Navigation, Camera, PenTool,
  ChevronRight, CheckCircle, Clock, Banknote, Package,
  ArrowUpRight, ArrowDownLeft, ArrowLeftRight, RefreshCw,
  AlertCircle, ChevronDown, X,
} from "lucide-react";
import SignaturePad from "@/components/SignaturePad";
import PhotoUpload from "@/components/PhotoUpload";

interface Delivery {
  id: number;
  delivery_type: string;
  direction: string;
  destination_type: string;
  status: string;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string;
  delivery_city: string | null;
  delivery_notes: string | null;
  special_instructions: string | null;
  driver_name: string | null;
  vehicle_type: string | null;
  estimated_time: number | null;
  delivery_fee: number;
  payment_method: string;
  cod_amount: number;
  cod_collected: number;
  proof_type: string;
  proof_photos: string[] | null;
  proof_signature: string | null;
  proof_verified: boolean;
  items: any[] | null;
  created_at: string;
}

const TYPE_EMOJI: Record<string, string> = {
  food: "🍔", package: "📦", heavy: "🪑", transfer: "🔄",
  supplier_pickup: "🏭", return_pickup: "↩️", document: "📄", cash_collection: "💰",
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; next: string | null; nextLabel: string }> = {
  assigned:   { color: "text-blue-700", bg: "bg-blue-500", label: "Assigned", next: "picked_up", nextLabel: "I've Picked Up" },
  picked_up:  { color: "text-orange-700", bg: "bg-orange-500", label: "Picked Up", next: "in_transit", nextLabel: "Start Driving" },
  in_transit: { color: "text-purple-700", bg: "bg-purple-500", label: "In Transit", next: "delivered", nextLabel: "Arrived — Complete" },
  delivered:  { color: "text-green-700", bg: "bg-green-500", label: "Delivered", next: null, nextLabel: "" },
  failed:     { color: "text-red-700", bg: "bg-red-500", label: "Failed", next: null, nextLabel: "" },
};

export default function DriverModePage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showSignatureFor, setShowSignatureFor] = useState<number | null>(null);
  const [showCodFor, setShowCodFor] = useState<number | null>(null);
  const [codInput, setCodInput] = useState("");
  const [driverNotes, setDriverNotes] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      // Load active deliveries (assigned to any driver, not yet delivered)
      const res = await fetch("/api/deliveries?status=assigned");
      const d1 = await res.json();
      const res2 = await fetch("/api/deliveries?status=picked_up");
      const d2 = await res2.json();
      const res3 = await fetch("/api/deliveries?status=in_transit");
      const d3 = await res3.json();

      const all = [...(d1.deliveries || []), ...(d2.deliveries || []), ...(d3.deliveries || [])];
      // Sort: in_transit first, then picked_up, then assigned
      const order: Record<string, number> = { in_transit: 0, picked_up: 1, assigned: 2 };
      all.sort((a: Delivery, b: Delivery) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
      setDeliveries(all);
    } catch (_) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const patch = async (id: number, body: any) => {
    setSaving(id);
    try {
      await fetch(`/api/deliveries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await load();
    } catch (_) {}
    finally { setSaving(null); }
  };

  const openMaps = (address: string, city?: string | null) => {
    const q = encodeURIComponent(`${address}${city ? `, ${city}` : ""}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank");
  };

  const handlePhotoUpload = (id: number, url: string) => {
    const d = deliveries.find(d => d.id === id);
    const current = d?.proof_photos || [];
    patch(id, { proof_photos: [...current, url], append_photos: false });
  };

  const handleSignature = (id: number, dataUrl: string) => {
    patch(id, { proof_signature: dataUrl });
    setShowSignatureFor(null);
  };

  const handleCod = (id: number) => {
    const amount = parseFloat(codInput) || 0;
    patch(id, { cod_collected: amount });
    setShowCodFor(null);
    setCodInput("");
  };

  const handleComplete = async (d: Delivery) => {
    // For deliveries needing proof, check before allowing completion
    if (d.proof_type === "signature" && !d.proof_signature) {
      setExpandedId(d.id);
      setShowSignatureFor(d.id);
      return;
    }
    if (d.payment_method.startsWith("cod") && d.cod_amount > 0 && d.cod_collected === 0) {
      setExpandedId(d.id);
      setShowCodFor(d.id);
      setCodInput(d.cod_amount.toFixed(2));
      return;
    }
    await patch(d.id, { status: "delivered" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw size={24} className="animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between sticky top-0 bg-white z-10 py-3 border-b border-gray-100 -mx-4 px-4">
        <div className="flex items-center gap-2">
          <Truck size={22} className="text-purple-500" />
          <h1 className="text-lg font-bold text-gray-900">Driver Mode</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
            {deliveries.length} active
          </span>
          <button onClick={load} className="p-2 text-gray-400 hover:text-gray-600">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {deliveries.length === 0 && (
        <div className="text-center py-16">
          <CheckCircle size={48} className="mx-auto text-green-400 mb-3" />
          <p className="text-gray-500 font-medium">All done!</p>
          <p className="text-gray-400 text-sm mt-1">No active deliveries</p>
        </div>
      )}

      {/* Delivery Cards */}
      {deliveries.map((d) => {
        const config = STATUS_CONFIG[d.status] || STATUS_CONFIG.assigned;
        const expanded = expandedId === d.id;
        const needsCod = d.payment_method.startsWith("cod") && d.cod_amount > 0;
        const isLoading = saving === d.id;

        return (
          <div key={d.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Status bar */}
            <div className={`h-1.5 ${config.bg}`} />

            {/* Main card content */}
            <div className="p-4">
              {/* Top row: type + name + status */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{TYPE_EMOJI[d.delivery_type] || "📦"}</span>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      {d.customer_name || `#${d.id}`}
                    </p>
                    <p className="text-xs text-gray-400">{d.delivery_type.replace("_", " ")}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} text-white`}>
                  {config.label}
                </span>
              </div>

              {/* Address + navigate */}
              <div className="mt-3 flex items-center justify-between bg-gray-50 rounded-xl p-3">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <MapPin size={16} className="text-gray-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{d.delivery_address}</p>
                    {d.delivery_city && <p className="text-xs text-gray-400">{d.delivery_city}</p>}
                  </div>
                </div>
                <button onClick={() => openMaps(d.delivery_address, d.delivery_city)}
                  className="ml-2 shrink-0 w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700">
                  <Navigation size={18} />
                </button>
              </div>

              {/* Quick info row */}
              <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
                {d.customer_phone && (
                  <a href={`tel:${d.customer_phone}`} className="flex items-center gap-1 text-blue-600">
                    <Phone size={12} /> {d.customer_phone}
                  </a>
                )}
                {d.estimated_time && <span className="flex items-center gap-1"><Clock size={12} /> {d.estimated_time}min</span>}
                {needsCod && (
                  <span className="flex items-center gap-1 text-orange-600 font-medium">
                    <Banknote size={12} /> COD {d.cod_amount.toFixed(2)}
                    {d.cod_collected > 0 && <CheckCircle size={10} className="text-green-500" />}
                  </span>
                )}
              </div>

              {/* Special instructions */}
              {d.special_instructions && (
                <div className="mt-2 bg-amber-50 rounded-lg px-3 py-2 text-xs text-amber-700 flex items-start gap-1">
                  <AlertCircle size={12} className="shrink-0 mt-0.5" /> {d.special_instructions}
                </div>
              )}

              {/* Expand toggle */}
              <button onClick={() => setExpandedId(expanded ? null : d.id)}
                className="mt-3 w-full text-center text-xs text-gray-400 hover:text-gray-600">
                <ChevronDown size={14} className={`inline transition-transform ${expanded ? "rotate-180" : ""}`} />
                {expanded ? " Less" : " More details"}
              </button>

              {/* Expanded section */}
              {expanded && (
                <div className="mt-3 space-y-4 pt-3 border-t border-gray-100">
                  {/* Items */}
                  {d.items && d.items.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Items</p>
                      {d.items.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between text-xs bg-gray-50 rounded-lg px-3 py-1.5 mb-1">
                          <span>{item.name || `Item ${i + 1}`}</span>
                          <span className="text-gray-500">x{item.qty || 1}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {d.delivery_notes && (
                    <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600">{d.delivery_notes}</div>
                  )}

                  {/* Photo proof */}
                  {(d.proof_type === "photo" || d.proof_type === "signature") && (
                    <div>
                      <p className="text-xs text-gray-400 mb-2"><Camera size={12} className="inline mr-1" />Delivery Photos</p>
                      <PhotoUpload
                        existingPhotos={d.proof_photos || []}
                        onUpload={(url) => handlePhotoUpload(d.id, url)}
                        folder={`posterita/deliveries/${d.id}`}
                        maxPhotos={5}
                      />
                    </div>
                  )}

                  {/* Signature */}
                  {d.proof_type === "signature" && (
                    <div>
                      {d.proof_signature ? (
                        <div className="border rounded-xl p-3 bg-gray-50">
                          <img src={d.proof_signature} alt="Signature" className="max-h-16 mx-auto" />
                          <p className="text-xs text-center text-green-600 mt-1">Signed</p>
                        </div>
                      ) : showSignatureFor === d.id ? (
                        <SignaturePad
                          onSave={(dataUrl) => handleSignature(d.id, dataUrl)}
                          onCancel={() => setShowSignatureFor(null)}
                          height={160}
                        />
                      ) : (
                        <button onClick={() => setShowSignatureFor(d.id)}
                          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-purple-400">
                          <PenTool size={14} className="inline mr-1" /> Get Customer Signature
                        </button>
                      )}
                    </div>
                  )}

                  {/* COD */}
                  {needsCod && d.cod_collected === 0 && (
                    showCodFor === d.id ? (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500">Expected: <strong>{d.cod_amount.toFixed(2)}</strong></p>
                        <div className="flex gap-2">
                          <input type="number" value={codInput} onChange={(e) => setCodInput(e.target.value)}
                            step="0.01" placeholder="Amount collected"
                            className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 text-sm" />
                          <button onClick={() => handleCod(d.id)}
                            className="px-4 py-2.5 bg-orange-600 text-white rounded-lg text-sm font-medium">
                            Confirm
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setShowCodFor(d.id); setCodInput(d.cod_amount.toFixed(2)); }}
                        className="w-full py-2.5 bg-orange-100 text-orange-700 rounded-xl text-sm font-medium">
                        <Banknote size={14} className="inline mr-1" /> Collect {d.cod_amount.toFixed(2)} Cash
                      </button>
                    )
                  )}

                  {/* Driver notes */}
                  <div>
                    <textarea
                      value={driverNotes[d.id] ?? ""}
                      onChange={(e) => setDriverNotes(prev => ({ ...prev, [d.id]: e.target.value }))}
                      placeholder="Add notes..."
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs"
                    />
                    {driverNotes[d.id] && (
                      <button onClick={() => patch(d.id, { driver_notes: driverNotes[d.id] })}
                        className="mt-1 text-xs text-purple-600 font-medium">Save notes</button>
                    )}
                  </div>
                </div>
              )}

              {/* Primary action button */}
              {config.next && (
                <button
                  onClick={() => config.next === "delivered" ? handleComplete(d) : patch(d.id, { status: config.next })}
                  disabled={isLoading}
                  className={`mt-4 w-full py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 ${
                    config.next === "delivered" ? "bg-green-600 hover:bg-green-700" :
                    config.next === "in_transit" ? "bg-purple-600 hover:bg-purple-700" :
                    "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {isLoading ? <RefreshCw size={16} className="animate-spin inline" /> : config.nextLabel}
                </button>
              )}

              {/* Fail button */}
              {!["delivered", "failed", "cancelled"].includes(d.status) && (
                <button onClick={() => patch(d.id, { status: "failed" })}
                  className="mt-2 w-full py-2 text-xs text-red-500 hover:text-red-700 font-medium">
                  Report Failed Delivery
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
