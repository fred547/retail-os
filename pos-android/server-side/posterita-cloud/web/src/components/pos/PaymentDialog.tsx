"use client";

import { useState } from "react";
import { X, CreditCard, Banknote, CheckCircle } from "lucide-react";

export default function PaymentDialog({
  total,
  onComplete,
  onCancel,
}: {
  total: number;
  onComplete: (payments: { type: string; amount: number; tendered: number; change: number }[]) => void;
  onCancel: () => void;
}) {
  const [method, setMethod] = useState<"CASH" | "CARD">("CASH");
  const [tendered, setTendered] = useState("");
  const [processing, setProcessing] = useState(false);

  const tenderedNum = parseFloat(tendered) || 0;
  const change = method === "CASH" ? Math.max(0, tenderedNum - total) : 0;
  const canPay = method === "CARD" || tenderedNum >= total;

  const quickAmounts = [
    Math.ceil(total),
    Math.ceil(total / 10) * 10,
    Math.ceil(total / 50) * 50,
    Math.ceil(total / 100) * 100,
  ].filter((v, i, a) => a.indexOf(v) === i && v >= total).slice(0, 4);

  const handlePay = async () => {
    if (!canPay || processing) return;
    setProcessing(true);

    onComplete([{
      type: method,
      amount: total,
      tendered: method === "CARD" ? total : tenderedNum,
      change,
    }]);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div
        className="bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white">Payment</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-200 p-1">
            <X size={20} />
          </button>
        </div>

        {/* Total */}
        <div className="px-5 py-4 text-center border-b border-gray-800">
          <p className="text-sm text-gray-400">Total Due</p>
          <p className="text-3xl font-bold text-white">{formatPrice(total)}</p>
        </div>

        {/* Method tabs */}
        <div className="flex mx-5 mt-4 bg-gray-800 rounded-xl p-1">
          <button
            onClick={() => { setMethod("CASH"); setTendered(""); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${
              method === "CASH" ? "bg-green-600 text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <Banknote size={16} /> Cash
          </button>
          <button
            onClick={() => setMethod("CARD")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${
              method === "CARD" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <CreditCard size={16} /> Card
          </button>
        </div>

        {/* Cash input */}
        {method === "CASH" && (
          <div className="px-5 py-4 space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Amount Tendered</label>
              <input
                type="number"
                step="0.01"
                value={tendered}
                onChange={(e) => setTendered(e.target.value)}
                placeholder={total.toFixed(2)}
                autoFocus
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-xl text-white text-center font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                onKeyDown={(e) => { if (e.key === "Enter" && canPay) handlePay(); }}
              />
            </div>

            {/* Quick amounts */}
            <div className="flex gap-2">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setTendered(amt.toString())}
                  className="flex-1 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-300 hover:bg-gray-700 hover:border-gray-500 transition"
                >
                  {formatPrice(amt)}
                </button>
              ))}
            </div>

            {/* Change */}
            {tenderedNum > 0 && (
              <div className="flex justify-between text-sm bg-gray-800 rounded-xl px-4 py-2.5">
                <span className="text-gray-400">Change</span>
                <span className={`font-bold ${change > 0 ? "text-green-400" : "text-gray-400"}`}>
                  {formatPrice(change)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Card message */}
        {method === "CARD" && (
          <div className="px-5 py-8 text-center text-gray-400 text-sm">
            Process card payment on terminal, then confirm below.
          </div>
        )}

        {/* Pay button */}
        <div className="px-5 pb-5">
          <button
            onClick={handlePay}
            disabled={!canPay || processing}
            className="w-full flex items-center justify-center gap-2 py-4 bg-green-600 text-white rounded-xl text-lg font-bold hover:bg-green-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CheckCircle size={20} />
            {processing ? "Processing..." : `Pay ${formatPrice(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount ?? 0);
}
