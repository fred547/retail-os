"use client";

import { useState } from "react";
import { X, Search, RotateCcw, Check, AlertTriangle } from "lucide-react";
import { getOfflineDb } from "@/lib/offline/db";
import { completeOrder } from "@/lib/pos/complete-order";
import type { Order, OrderLine } from "@/lib/offline/schema";

interface RefundItem extends OrderLine {
  selected: boolean;
  refund_qty: number;
}

export default function RefundDialog({
  onClose,
  onRefunded,
}: {
  onClose: () => void;
  onRefunded: (orderId: number) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [lines, setLines] = useState<RefundItem[]>([]);
  const [reason, setReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"search" | "select" | "confirm">("search");

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setError("");
    const db = getOfflineDb();

    // Search by UUID, document_no, or order_id
    const q = searchQuery.trim();
    let found: Order | undefined;

    // Try UUID
    found = await db.order.where("uuid").equals(q).first();
    // Try order_id
    if (!found && !isNaN(Number(q))) {
      found = await db.order.get(Number(q));
    }

    if (!found) {
      setError("Order not found. Try the order number or UUID.");
      return;
    }

    setOrder(found);
    const orderLines = await db.orderline.where("order_id").equals(found.order_id).toArray();
    setLines(orderLines.map((l) => ({ ...l, selected: true, refund_qty: l.qtyentered })));
    setStep("select");
  };

  const toggleItem = (idx: number) => {
    setLines((prev) => prev.map((l, i) => i === idx ? { ...l, selected: !l.selected } : l));
  };

  const updateRefundQty = (idx: number, qty: number) => {
    setLines((prev) => prev.map((l, i) =>
      i === idx ? { ...l, refund_qty: Math.min(Math.max(0, qty), l.qtyentered) } : l
    ));
  };

  const selectedLines = lines.filter((l) => l.selected && l.refund_qty > 0);
  const refundTotal = selectedLines.reduce((sum, l) => {
    const linePrice = l.priceentered * l.refund_qty;
    return sum + linePrice;
  }, 0);

  const handleRefund = async () => {
    if (selectedLines.length === 0 || !order) return;
    setProcessing(true);

    try {
      // Create a negative order (refund) — mirrors Android negateForRefund()
      const { addProduct, clearCart, setNote, setCustomer, getCart } = await import("@/lib/pos/cart-store");
      const { getOfflineDb: getDb, getSyncMeta } = await import("@/lib/offline/db");

      clearCart();
      if (order.customer_id) setCustomer(order.customer_id, null);
      setNote(`Refund of order #${order.order_id}. Reason: ${reason || "Not specified"}`);

      // Add items with negative quantities
      const db = getDb();
      for (const line of selectedLines) {
        // Build a fake product for the cart-store addProduct
        const refundOrder: any = {
          order_id: 0,
          account_id: await getSyncMeta("account_id") || "",
          customer_id: order.customer_id || 0,
          sales_rep_id: 0,
          till_id: 0,
          till_uuid: await getSyncMeta("active_till_uuid") || null,
          terminal_id: parseInt(await getSyncMeta("terminal_id") || "0"),
          store_id: parseInt(await getSyncMeta("store_id") || "0"),
          order_type: "refund",
          document_no: null,
          doc_status: "CO",
          is_paid: true,
          subtotal: -refundTotal,
          tax_total: 0,
          grand_total: -refundTotal,
          qty_total: -selectedLines.reduce((s, l) => s + l.refund_qty, 0),
          date_ordered: new Date().toISOString(),
          json_data: { original_order_id: order.order_id, refund_reason: reason },
          is_sync: false,
          sync_error_message: null,
          uuid: crypto.randomUUID(),
          currency: order.currency,
          tips: 0,
          note: `Refund of #${order.order_id}. ${reason}`,
          couponids: null,
        };

        await db.order.add(refundOrder);
        const refundOrderId = refundOrder.order_id;

        // Add negative order lines
        const refundLines = selectedLines.map((l) => ({
          orderline_id: 0,
          order_id: refundOrderId,
          product_id: l.product_id,
          productcategory_id: l.productcategory_id,
          tax_id: l.tax_id,
          qtyentered: -l.refund_qty,
          lineamt: -(l.priceentered * l.refund_qty),
          linenetamt: -(l.priceentered * l.refund_qty),
          priceentered: l.priceentered,
          costamt: 0,
          productname: l.productname,
          productdescription: `Refund`,
          serial_item_id: null,
        }));

        await db.orderline.bulkAdd(refundLines);

        // Add refund payment
        await db.payment.add({
          payment_id: 0,
          order_id: refundOrderId,
          document_no: null,
          tendered: -refundTotal,
          amount: -refundTotal,
          change: 0,
          payment_type: "REFUND",
          date_paid: new Date().toISOString(),
          pay_amt: -refundTotal,
          status: "completed",
          checknumber: null,
          extra_info: null,
        });

        clearCart();

        // Trigger sync
        const { pushNow } = await import("@/lib/offline/sync-worker");
        pushNow().catch(() => {});

        onRefunded(refundOrderId);
        onClose();
        return;
      }
    } catch (e: any) {
      setError(e.message || "Refund failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-700 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <RotateCcw size={18} className="text-red-400" />
            <h2 className="text-lg font-bold text-white">Refund</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 p-1">
            <X size={20} />
          </button>
        </div>

        {/* Step 1: Search */}
        {step === "search" && (
          <div className="p-5 space-y-4">
            <p className="text-sm text-gray-400">Enter the order number or scan the receipt QR code.</p>
            <div className="flex gap-2">
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Order # or UUID" autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                className="flex-1 bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 outline-none" />
              <button onClick={handleSearch}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">
                <Search size={16} />
              </button>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertTriangle size={14} /> {error}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select items */}
        {step === "select" && order && (
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <div className="bg-gray-800 rounded-xl p-3 text-sm">
              <p className="text-white font-medium">Order #{order.order_id}</p>
              <p className="text-gray-400 text-xs">{order.date_ordered ? new Date(order.date_ordered).toLocaleString() : ""} — {formatPrice(order.grand_total)}</p>
            </div>

            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Select items to refund</p>

            {lines.map((line, i) => (
              <button key={i} onClick={() => toggleItem(i)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition ${
                  line.selected ? "border-red-500/50 bg-red-900/10" : "border-gray-700 bg-gray-800"
                }`}>
                <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${
                  line.selected ? "bg-red-500" : "bg-gray-700"
                }`}>
                  {line.selected && <Check size={12} className="text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{line.productname}</p>
                  <p className="text-xs text-gray-500">{line.qtyentered} x {formatPrice(line.priceentered)}</p>
                </div>
                {line.selected && (
                  <input type="number" value={line.refund_qty}
                    onChange={(e) => updateRefundQty(i, parseFloat(e.target.value) || 0)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-14 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white text-center"
                    min={0} max={line.qtyentered} />
                )}
                <p className="text-sm font-medium text-white w-16 text-right">
                  {formatPrice(line.priceentered * (line.selected ? line.refund_qty : 0))}
                </p>
              </button>
            ))}

            <div>
              <label className="text-xs text-gray-400 block mb-1">Reason (optional)</label>
              <input type="text" value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Customer returned item"
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" />
            </div>

            <div className="flex justify-between text-sm pt-2 border-t border-gray-700">
              <span className="text-gray-400">Refund total</span>
              <span className="font-bold text-red-400">-{formatPrice(refundTotal)}</span>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertTriangle size={14} /> {error}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {step === "select" && (
          <div className="flex gap-2 px-5 pb-5">
            <button onClick={() => { setStep("search"); setOrder(null); setLines([]); }}
              className="flex-1 py-3 bg-gray-700 text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-600 transition">
              Back
            </button>
            <button onClick={handleRefund} disabled={selectedLines.length === 0 || processing}
              className="flex-[2] py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition disabled:opacity-40 flex items-center justify-center gap-2">
              <RotateCcw size={14} />
              {processing ? "Processing..." : `Refund ${formatPrice(refundTotal)}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(amount ?? 0));
}
