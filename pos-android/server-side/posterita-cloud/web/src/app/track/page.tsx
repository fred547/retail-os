"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Truck, CheckCircle, Clock, MapPin, Package, AlertCircle } from "lucide-react";

const STEPS = ["pending", "assigned", "picked_up", "in_transit", "delivered"];
const LABELS: Record<string, string> = {
  pending: "Order Received", assigned: "Driver Assigned", picked_up: "Picked Up",
  in_transit: "On the Way", delivered: "Delivered",
};
const COLORS: Record<string, string> = {
  pending: "bg-gray-400", assigned: "bg-blue-500", picked_up: "bg-orange-500",
  in_transit: "bg-purple-500", delivered: "bg-green-500", failed: "bg-red-500",
};

interface TrackingData {
  id: number;
  status: string;
  delivery_type: string;
  vehicle_type: string | null;
  driver_name: string | null;
  estimated_time: number | null;
  created_at: string;
  assigned_at: string | null;
  picked_up_at: string | null;
  actual_delivery_at: string | null;
  proof_verified: boolean;
}

function TrackPageInner() {
  const params = useSearchParams();
  const token = params.get("token");
  const [data, setData] = useState<TrackingData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setError("No tracking token"); setLoading(false); return; }
    (async () => {
      try {
        const res = await fetch(`/api/deliveries/track?token=${token}`);
        if (!res.ok) { setError("Delivery not found"); return; }
        const json = await res.json();
        setData(json.delivery);
      } catch (_) { setError("Failed to load"); }
      finally { setLoading(false); }
    })();
  }, [token]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Clock className="animate-pulse text-purple-500" size={32} /></div>;
  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <AlertCircle size={48} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">{error || "Delivery not found"}</p>
      </div>
    </div>
  );

  const currentStep = STEPS.indexOf(data.status);
  const isFailed = data.status === "failed";
  const isDelivered = data.status === "delivered";

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto space-y-6 pt-8">
        {/* Header */}
        <div className="text-center">
          <div className={`w-16 h-16 rounded-2xl ${COLORS[data.status] || "bg-gray-400"} mx-auto flex items-center justify-center mb-4`}>
            {isDelivered ? <CheckCircle size={32} className="text-white" /> : <Truck size={32} className="text-white" />}
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            {isFailed ? "Delivery Failed" : isDelivered ? "Delivered!" : "Your Delivery"}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            #{data.id} &middot; {data.delivery_type.replace("_", " ")}
          </p>
        </div>

        {/* Status Timeline */}
        {!isFailed && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="space-y-4">
              {STEPS.map((step, i) => {
                const done = i <= currentStep;
                const active = data.status === step;
                const timestamp = step === "pending" ? data.created_at :
                  step === "assigned" ? data.assigned_at :
                  step === "picked_up" ? data.picked_up_at :
                  step === "delivered" ? data.actual_delivery_at : null;

                return (
                  <div key={step} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        done ? "bg-green-500 text-white" : active ? "bg-purple-500 text-white" : "bg-gray-200 text-gray-400"
                      }`}>
                        {done ? <CheckCircle size={14} /> : <span className="text-xs font-bold">{i + 1}</span>}
                      </div>
                      {i < STEPS.length - 1 && (
                        <div className={`w-0.5 h-8 ${done ? "bg-green-400" : "bg-gray-200"}`} />
                      )}
                    </div>
                    <div className="pt-1">
                      <p className={`text-sm font-medium ${done ? "text-gray-900" : "text-gray-400"}`}>{LABELS[step]}</p>
                      {timestamp && <p className="text-xs text-gray-400 mt-0.5">{new Date(timestamp).toLocaleString()}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Failed state */}
        {isFailed && (
          <div className="bg-red-50 rounded-2xl p-6 text-center">
            <AlertCircle size={32} className="mx-auto text-red-400 mb-2" />
            <p className="text-red-700 font-medium">We couldn&apos;t complete this delivery</p>
            <p className="text-red-500 text-sm mt-1">Please contact the store for assistance</p>
          </div>
        )}

        {/* Info */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
          {data.driver_name && (
            <div className="flex items-center gap-2 text-sm">
              <Truck size={14} className="text-gray-400" />
              <span className="text-gray-600">Driver: <strong>{data.driver_name}</strong></span>
              {data.vehicle_type && <span className="text-gray-400">({data.vehicle_type})</span>}
            </div>
          )}
          {data.estimated_time && !isDelivered && (
            <div className="flex items-center gap-2 text-sm">
              <Clock size={14} className="text-gray-400" />
              <span className="text-gray-600">Estimated: ~{data.estimated_time} minutes</span>
            </div>
          )}
          {data.proof_verified && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle size={14} />
              <span>Proof of delivery confirmed</span>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-300">Powered by Posterita</p>
      </div>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>}>
      <TrackPageInner />
    </Suspense>
  );
}
