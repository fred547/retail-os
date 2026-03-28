"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Truck, MapPin, Phone, User, Clock, ArrowLeft, CheckCircle,
  Camera, PenTool, Banknote, AlertCircle, Package, ChevronRight,
} from "lucide-react";
import SignaturePad from "@/components/SignaturePad";
import PhotoUpload from "@/components/PhotoUpload";
import { logError } from "@/lib/error-logger";

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
  driver_notes: string | null;
  vehicle_type: string | null;
  vehicle_plate: string | null;
  estimated_time: number | null;
  delivery_fee: number;
  payment_method: string;
  cod_amount: number;
  cod_collected: number;
  proof_type: string;
  proof_photos: string[] | null;
  proof_signature: string | null;
  proof_pin: string | null;
  proof_verified: boolean;
  actual_delivery_at: string | null;
  assigned_at: string | null;
  picked_up_at: string | null;
  scheduled_at: string | null;
  items: any[] | null;
  order_id: number | null;
  created_at: string;
}

const statusSteps = ["pending", "assigned", "picked_up", "in_transit", "delivered"];
const statusLabels: Record<string, string> = {
  pending: "Pending", assigned: "Assigned", picked_up: "Picked Up",
  in_transit: "In Transit", delivered: "Delivered", failed: "Failed", cancelled: "Cancelled",
};

export default function DeliveryDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSignature, setShowSignature] = useState(false);
  const [showCodForm, setShowCodForm] = useState(false);
  const [codInput, setCodInput] = useState("");
  const [driverNotes, setDriverNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/deliveries/${id}`);
      const data = await res.json();
      setDelivery(data.delivery);
      setDriverNotes(data.delivery?.driver_notes || "");
    } catch (e: any) { logError("DeliveryDetail", `Failed to load delivery ${id}: ${e.message}`); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const patch = async (body: any) => {
    setSaving(true);
    try {
      await fetch(`/api/deliveries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await load();
    } catch (e: any) { logError("DeliveryDetail", `Failed to patch delivery ${id}: ${e.message}`); }
    finally { setSaving(false); }
  };

  const handlePhotoUpload = (url: string) => {
    const current = delivery?.proof_photos || [];
    patch({ proof_photos: [...current, url] });
  };

  const handlePhotoRemove = (url: string) => {
    const current = delivery?.proof_photos || [];
    patch({ proof_photos: current.filter(u => u !== url) });
  };

  const handleSignature = (dataUrl: string) => {
    patch({ proof_signature: dataUrl, status: delivery?.status === "in_transit" ? "delivered" : undefined });
    setShowSignature(false);
  };

  const handleCodSubmit = () => {
    const amount = parseFloat(codInput) || 0;
    patch({ cod_collected: amount });
    setShowCodForm(false);
  };

  const handleDriverNotes = () => {
    patch({ driver_notes: driverNotes });
  };

  if (loading) return <div className="text-center py-16 text-gray-400">Loading...</div>;
  if (!delivery) return <div className="text-center py-16 text-gray-400">Delivery not found</div>;

  const d = delivery;
  const currentStep = statusSteps.indexOf(d.status);
  const isTerminal = ["delivered", "failed", "cancelled", "returned"].includes(d.status);
  const needsCod = d.payment_method.startsWith("cod") && d.cod_amount > 0;
  const codVariance = d.cod_collected - d.cod_amount;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <button onClick={() => router.push("/deliveries")} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={16} /> Back to deliveries
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {d.customer_name || `Delivery #${d.id}`}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {d.delivery_type.replace("_", " ")} &middot; {d.direction} &middot; {d.destination_type}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          d.status === "delivered" ? "bg-green-100 text-green-700" :
          d.status === "failed" ? "bg-red-100 text-red-700" :
          d.status === "in_transit" ? "bg-purple-100 text-purple-700" :
          "bg-gray-100 text-gray-600"
        }`}>{statusLabels[d.status] || d.status}</span>
      </div>

      {/* Status Timeline */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between">
          {statusSteps.map((step, i) => {
            const done = i <= currentStep && !isTerminal ? true : (d.status === "delivered" && i <= 4);
            const active = d.status === step;
            return (
              <div key={step} className="flex items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  done ? "bg-green-500 text-white" : active ? "bg-purple-500 text-white" : "bg-gray-200 text-gray-500"
                }`}>
                  {done ? <CheckCircle size={14} /> : i + 1}
                </div>
                {i < statusSteps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 ${done ? "bg-green-400" : "bg-gray-200"}`} />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2">
          {statusSteps.map((step) => (
            <p key={step} className="text-[10px] text-gray-400 text-center flex-1">{statusLabels[step]}</p>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      {!isTerminal && (
        <div className="flex gap-2 flex-wrap">
          {d.status === "pending" && <button onClick={() => patch({ status: "assigned" })} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">Assign</button>}
          {d.status === "assigned" && <button onClick={() => patch({ status: "picked_up" })} disabled={saving} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50">Mark Picked Up</button>}
          {["assigned", "picked_up"].includes(d.status) && <button onClick={() => patch({ status: "in_transit" })} disabled={saving} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">In Transit</button>}
          {d.status === "in_transit" && <button onClick={() => patch({ status: "delivered" })} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">Mark Delivered</button>}
          <button onClick={() => patch({ status: "failed" })} disabled={saving} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 disabled:opacity-50">Failed</button>
        </div>
      )}

      {/* Details Card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Details</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-400">Address</span><p className="font-medium">{d.delivery_address}{d.delivery_city ? `, ${d.delivery_city}` : ""}</p></div>
          {d.customer_phone && <div><span className="text-gray-400">Phone</span><p className="font-medium">{d.customer_phone}</p></div>}
          {d.driver_name && <div><span className="text-gray-400">Driver</span><p className="font-medium">{d.driver_name} {d.vehicle_type && `(${d.vehicle_type})`} {d.vehicle_plate && `— ${d.vehicle_plate}`}</p></div>}
          {d.estimated_time && <div><span className="text-gray-400">Est. Time</span><p className="font-medium">{d.estimated_time} min</p></div>}
          {d.delivery_fee > 0 && <div><span className="text-gray-400">Fee</span><p className="font-medium">{d.delivery_fee.toFixed(2)}</p></div>}
          {d.order_id && <div><span className="text-gray-400">Order</span><p className="font-medium">#{d.order_id}</p></div>}
          <div><span className="text-gray-400">Created</span><p className="font-medium">{new Date(d.created_at).toLocaleString()}</p></div>
          {d.actual_delivery_at && <div><span className="text-gray-400">Delivered</span><p className="font-medium">{new Date(d.actual_delivery_at).toLocaleString()}</p></div>}
        </div>
        {d.delivery_notes && <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">{d.delivery_notes}</div>}
        {d.special_instructions && <div className="bg-amber-50 rounded-lg p-3 text-sm text-amber-700"><AlertCircle size={14} className="inline mr-1" />{d.special_instructions}</div>}
        {d.items && d.items.length > 0 && (
          <div>
            <p className="text-sm text-gray-400 mb-2">Items</p>
            <div className="space-y-1">
              {d.items.map((item: any, i: number) => (
                <div key={i} className="flex justify-between text-sm bg-gray-50 rounded-lg px-3 py-1.5">
                  <span>{item.name || `Item ${i + 1}`}</span>
                  <span className="text-gray-500">x{item.qty || 1}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Proof of Delivery */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Proof of Delivery</h2>
          {d.proof_verified && <span className="flex items-center gap-1 text-green-600 text-sm font-medium"><CheckCircle size={14} /> Verified</span>}
        </div>

        {/* Photos */}
        {(d.proof_type === "photo" || d.proof_type === "signature") && (
          <div>
            <p className="text-sm text-gray-500 mb-2"><Camera size={14} className="inline mr-1" />Photos</p>
            <PhotoUpload
              existingPhotos={d.proof_photos || []}
              onUpload={handlePhotoUpload}
              onRemove={handlePhotoRemove}
              folder={`posterita/deliveries/${d.id}`}
            />
          </div>
        )}

        {/* Signature */}
        {d.proof_type === "signature" && (
          <div>
            <p className="text-sm text-gray-500 mb-2"><PenTool size={14} className="inline mr-1" />Signature</p>
            {d.proof_signature ? (
              <div className="border rounded-xl p-3 bg-gray-50">
                <img src={d.proof_signature} alt="Signature" className="max-h-24 mx-auto" />
                <p className="text-xs text-center text-green-600 mt-2">Signature captured</p>
              </div>
            ) : showSignature ? (
              <SignaturePad onSave={handleSignature} onCancel={() => setShowSignature(false)} />
            ) : (
              <button onClick={() => setShowSignature(true)}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-purple-400 hover:text-purple-600 transition">
                <PenTool size={16} className="inline mr-1" /> Capture Signature
              </button>
            )}
          </div>
        )}

        {/* PIN */}
        {d.proof_type === "pin" && (
          <div>
            <p className="text-sm text-gray-500 mb-2">PIN: {d.proof_pin ? `****` : "Not set"}</p>
            {d.proof_verified ? (
              <p className="text-green-600 text-sm font-medium">PIN verified</p>
            ) : (
              <div className="flex gap-2">
                <input type="text" placeholder="Enter customer PIN" maxLength={6}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                <button onClick={() => {
                  const input = document.querySelector<HTMLInputElement>('input[placeholder="Enter customer PIN"]');
                  if (input) patch({ verify_pin: input.value });
                }} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium">Verify</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* COD Cash Reconciliation */}
      {needsCod && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Banknote size={18} className="text-orange-500" /> Cash on Delivery
          </h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-400">Expected</p>
              <p className="text-lg font-bold text-gray-900">{d.cod_amount.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Collected</p>
              <p className={`text-lg font-bold ${d.cod_collected > 0 ? "text-green-600" : "text-gray-400"}`}>
                {d.cod_collected > 0 ? d.cod_collected.toFixed(2) : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Variance</p>
              <p className={`text-lg font-bold ${
                d.cod_collected === 0 ? "text-gray-400" :
                codVariance === 0 ? "text-green-600" :
                codVariance > 0 ? "text-blue-600" : "text-red-600"
              }`}>
                {d.cod_collected === 0 ? "—" : codVariance === 0 ? "OK" : `${codVariance > 0 ? "+" : ""}${codVariance.toFixed(2)}`}
              </p>
            </div>
          </div>

          {d.cod_collected === 0 && !showCodForm && (
            <button onClick={() => { setShowCodForm(true); setCodInput(d.cod_amount.toFixed(2)); }}
              className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium">
              Record Cash Collected
            </button>
          )}
          {showCodForm && (
            <div className="flex gap-2">
              <input type="number" value={codInput} onChange={(e) => setCodInput(e.target.value)}
                step="0.01" min="0" className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" />
              <button onClick={handleCodSubmit} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium">Save</button>
              <button onClick={() => setShowCodForm(false)} className="px-3 py-2 text-gray-500 text-sm">Cancel</button>
            </div>
          )}
        </div>
      )}

      {/* Driver Notes */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
        <h2 className="font-semibold text-gray-900">Driver Notes</h2>
        <textarea value={driverNotes} onChange={(e) => setDriverNotes(e.target.value)} rows={3}
          placeholder="Notes from the driver (visible after delivery)..."
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
        <button onClick={handleDriverNotes} disabled={saving || driverNotes === (d.driver_notes || "")}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50">
          Save Notes
        </button>
      </div>
    </div>
  );
}
