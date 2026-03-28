"use client";

import { useState } from "react";
import { X, CreditCard, Banknote, CheckCircle, Split, Tag } from "lucide-react";

export default function PaymentDialog({
  total,
  onComplete,
  onCancel,
}: {
  total: number;
  onComplete: (payments: { type: string; amount: number; tendered: number; change: number }[]) => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<"single" | "split">("single");
  const [method, setMethod] = useState<"CASH" | "CARD">("CASH");
  const [tendered, setTendered] = useState("");
  const [processing, setProcessing] = useState(false);

  // Split payment state
  const [cashAmount, setCashAmount] = useState("");
  const [cardAmount, setCardAmount] = useState("");
  const [cashTendered, setCashTendered] = useState("");

  // Coupon
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);

  const effectiveTotal = Math.max(0, total - couponDiscount);

  // Single payment
  const tenderedNum = parseFloat(tendered) || 0;
  const change = method === "CASH" ? Math.max(0, tenderedNum - effectiveTotal) : 0;
  const canPay = method === "CARD" || tenderedNum >= effectiveTotal;

  // Split payment
  const cashAmt = parseFloat(cashAmount) || 0;
  const cardAmt = parseFloat(cardAmount) || 0;
  const cashTend = parseFloat(cashTendered) || 0;
  const splitTotal = cashAmt + cardAmt;
  const splitChange = Math.max(0, cashTend - cashAmt);
  const canSplitPay = splitTotal >= effectiveTotal - 0.01 && cashTend >= cashAmt;

  const quickAmounts = [
    Math.ceil(effectiveTotal),
    Math.ceil(effectiveTotal / 10) * 10,
    Math.ceil(effectiveTotal / 50) * 50,
    Math.ceil(effectiveTotal / 100) * 100,
  ].filter((v, i, a) => a.indexOf(v) === i && v >= effectiveTotal).slice(0, 4);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    // TODO: validate coupon via API - for now just set a placeholder
    // In production: POST /api/promotions/validate { code, cart_total }
    setCouponApplied(true);
  };

  const handlePay = async () => {
    if (processing) return;
    setProcessing(true);

    if (mode === "split") {
      if (!canSplitPay) return;
      const payments = [];
      if (cashAmt > 0) {
        payments.push({ type: "CASH", amount: cashAmt, tendered: cashTend, change: splitChange });
      }
      if (cardAmt > 0) {
        payments.push({ type: "CARD", amount: cardAmt, tendered: cardAmt, change: 0 });
      }
      onComplete(payments);
    } else {
      if (!canPay) return;
      onComplete([{
        type: method,
        amount: effectiveTotal,
        tendered: method === "CARD" ? effectiveTotal : tenderedNum,
        change,
      }]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl border border-gray-700 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
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
          <p className="text-3xl font-bold text-white">{formatPrice(effectiveTotal)}</p>
          {couponDiscount > 0 && (
            <p className="text-xs text-green-400 mt-1">Coupon: -{formatPrice(couponDiscount)}</p>
          )}
        </div>

        {/* Mode tabs: Single / Split */}
        <div className="flex mx-5 mt-4 bg-gray-800 rounded-xl p-1">
          <button onClick={() => setMode("single")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              mode === "single" ? "bg-gray-600 text-white" : "text-gray-400"
            }`}>
            Single
          </button>
          <button onClick={() => setMode("split")}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-medium transition ${
              mode === "split" ? "bg-gray-600 text-white" : "text-gray-400"
            }`}>
            <Split size={14} /> Split
          </button>
        </div>

        {/* ── Single Payment ── */}
        {mode === "single" && (
          <>
            {/* Method tabs */}
            <div className="flex mx-5 mt-3 bg-gray-800 rounded-xl p-1">
              <button onClick={() => { setMethod("CASH"); setTendered(""); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${
                  method === "CASH" ? "bg-green-600 text-white" : "text-gray-400 hover:text-gray-200"
                }`}>
                <Banknote size={16} /> Cash
              </button>
              <button onClick={() => setMethod("CARD")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${
                  method === "CARD" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-200"
                }`}>
                <CreditCard size={16} /> Card
              </button>
            </div>

            {method === "CASH" && (
              <div className="px-5 py-4 space-y-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Amount Tendered</label>
                  <input type="number" step="0.01" value={tendered}
                    onChange={(e) => setTendered(e.target.value)} placeholder={effectiveTotal.toFixed(2)} autoFocus
                    className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-xl text-white text-center font-bold focus:border-blue-500 outline-none"
                    onKeyDown={(e) => { if (e.key === "Enter" && canPay) handlePay(); }} />
                </div>
                <div className="flex gap-2">
                  {quickAmounts.map((amt) => (
                    <button key={amt} onClick={() => setTendered(amt.toString())}
                      className="flex-1 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-300 hover:bg-gray-700 transition">
                      {formatPrice(amt)}
                    </button>
                  ))}
                </div>
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

            {method === "CARD" && (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">
                Process card payment on terminal, then confirm below.
              </div>
            )}
          </>
        )}

        {/* ── Split Payment ── */}
        {mode === "split" && (
          <div className="px-5 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                  <Banknote size={12} /> Cash portion
                </label>
                <input type="number" step="0.01" value={cashAmount}
                  onChange={(e) => {
                    setCashAmount(e.target.value);
                    const remaining = effectiveTotal - (parseFloat(e.target.value) || 0);
                    setCardAmount(Math.max(0, remaining).toFixed(2));
                  }} placeholder="0.00" autoFocus
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-center font-bold focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                  <CreditCard size={12} /> Card portion
                </label>
                <input type="number" step="0.01" value={cardAmount}
                  onChange={(e) => setCardAmount(e.target.value)} placeholder="0.00"
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-center font-bold focus:border-blue-500 outline-none" />
              </div>
            </div>

            {cashAmt > 0 && (
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Cash tendered</label>
                <input type="number" step="0.01" value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)} placeholder={cashAmt.toFixed(2)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-center font-bold focus:border-blue-500 outline-none"
                  onKeyDown={(e) => { if (e.key === "Enter" && canSplitPay) handlePay(); }} />
              </div>
            )}

            <div className="flex justify-between text-sm bg-gray-800 rounded-xl px-4 py-2.5">
              <span className="text-gray-400">Split total</span>
              <span className={`font-bold ${Math.abs(splitTotal - effectiveTotal) < 0.01 ? "text-green-400" : "text-amber-400"}`}>
                {formatPrice(splitTotal)} / {formatPrice(effectiveTotal)}
              </span>
            </div>

            {cashAmt > 0 && cashTend > 0 && splitChange > 0 && (
              <div className="flex justify-between text-sm bg-gray-800 rounded-xl px-4 py-2.5">
                <span className="text-gray-400">Cash change</span>
                <span className="font-bold text-green-400">{formatPrice(splitChange)}</span>
              </div>
            )}
          </div>
        )}

        {/* Coupon entry */}
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2">
            <Tag size={14} className="text-gray-500 flex-shrink-0" />
            <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value)}
              placeholder="Coupon code" disabled={couponApplied}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:border-blue-500 outline-none disabled:opacity-50" />
            {!couponApplied && couponCode.trim() && (
              <button onClick={handleApplyCoupon}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium">Apply</button>
            )}
            {couponApplied && (
              <span className="text-xs text-green-400">Applied</span>
            )}
          </div>
        </div>

        {/* Pay button */}
        <div className="px-5 pb-5">
          <button onClick={handlePay}
            disabled={mode === "single" ? (!canPay || processing) : (!canSplitPay || processing)}
            className="w-full flex items-center justify-center gap-2 py-4 bg-green-600 text-white rounded-xl text-lg font-bold hover:bg-green-700 transition disabled:opacity-40 disabled:cursor-not-allowed">
            <CheckCircle size={20} />
            {processing ? "Processing..." : `Pay ${formatPrice(effectiveTotal)}`}
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
