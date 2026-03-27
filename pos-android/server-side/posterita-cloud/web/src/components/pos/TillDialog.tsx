"use client";

import { useState, useEffect } from "react";
import { X, DollarSign, Lock } from "lucide-react";
import { openTill, closeTill, getActiveTill, calcDiscrepancy } from "@/lib/pos/till-service";
import type { Till } from "@/lib/offline/schema";

export default function TillDialog({
  onClose,
  onTillChanged,
}: {
  onClose: () => void;
  onTillChanged: () => void;
}) {
  const [activeTill, setActiveTill] = useState<Till | null>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getActiveTill().then((till) => {
      setActiveTill(till);
      setLoading(false);
    });
  }, []);

  const handleOpen = async () => {
    const openAmt = parseFloat(amount) || 0;
    setSaving(true);
    try {
      await openTill(openAmt);
      onTillChanged();
      onClose();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async () => {
    const closeAmt = parseFloat(amount) || 0;
    setSaving(true);
    try {
      await closeTill(closeAmt);
      onTillChanged();
      onClose();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  const isOpen = activeTill !== null;
  const discrepancy = isOpen && amount
    ? calcDiscrepancy(activeTill!, parseFloat(amount) || 0)
    : 0;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white">
            {isOpen ? "Close Till" : "Open Till"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 p-1">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-5 space-y-4">
          {isOpen && (
            <div className="bg-gray-800 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Opened</span>
                <span className="text-gray-200">
                  {activeTill!.date_opened ? new Date(activeTill!.date_opened).toLocaleString() : "—"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Opening Amount</span>
                <span className="text-white font-medium">{formatPrice(activeTill!.opening_amt)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Cash Sales</span>
                <span className="text-white font-medium">{formatPrice(activeTill!.cash_amt)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Card Sales</span>
                <span className="text-white font-medium">{formatPrice(activeTill!.card_amt)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2 border-t border-gray-700">
                <span className="text-gray-300">Total Sales</span>
                <span className="text-white">{formatPrice(activeTill!.grand_total)}</span>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1.5">
              {isOpen ? "Cash Counted in Drawer" : "Opening Float"}
            </label>
            <div className="relative">
              <DollarSign size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                placeholder="0.00"
                className="w-full bg-gray-800 border border-gray-600 rounded-xl pl-10 pr-4 py-3 text-xl text-white text-center font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter") isOpen ? handleClose() : handleOpen();
                }}
              />
            </div>
          </div>

          {/* Discrepancy (close mode only) */}
          {isOpen && amount && (
            <div className={`flex justify-between text-sm rounded-xl px-4 py-2.5 ${
              discrepancy === 0 ? "bg-green-900/30 text-green-400" :
              discrepancy > 0 ? "bg-blue-900/30 text-blue-400" :
              "bg-red-900/30 text-red-400"
            }`}>
              <span>Discrepancy</span>
              <span className="font-bold">
                {discrepancy > 0 ? "+" : ""}{formatPrice(discrepancy)}
                {discrepancy === 0 && " (exact)"}
              </span>
            </div>
          )}
        </div>

        {/* Action */}
        <div className="px-5 pb-5">
          <button
            onClick={isOpen ? handleClose : handleOpen}
            disabled={saving}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition disabled:opacity-40 ${
              isOpen
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {isOpen ? <Lock size={16} /> : <DollarSign size={16} />}
            {saving ? "Processing..." : isOpen ? "Close Till" : "Open Till"}
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
