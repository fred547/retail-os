"use client";

import { useState, useEffect } from "react";
import { X, ShoppingCart, RotateCcw, Clock, ChevronRight } from "lucide-react";
import { getOfflineDb } from "@/lib/offline/db";
import type { Order } from "@/lib/offline/schema";

export default function OrderHistory({
  onClose,
  onRefund,
}: {
  onClose: () => void;
  onRefund: (orderId: number) => void;
}) {
  const [orders, setOrders] = useState<(Order & { lineCount?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<(Order & { lines?: any[] }) | null>(null);

  useEffect(() => {
    async function load() {
      const db = getOfflineDb();
      const all = await db.order.orderBy("order_id").reverse().limit(50).toArray();
      // Count lines per order
      const withCounts = await Promise.all(all.map(async (o) => {
        const count = await db.orderline.where("order_id").equals(o.order_id).count();
        return { ...o, lineCount: count };
      }));
      setOrders(withCounts);
      setLoading(false);
    }
    load();
  }, []);

  const loadOrderDetail = async (order: Order) => {
    const db = getOfflineDb();
    const lines = await db.orderline.where("order_id").equals(order.order_id).toArray();
    setSelected({ ...order, lines });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl border border-gray-700 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-blue-400" />
            <h2 className="text-lg font-bold text-white">
              {selected ? `Order #${selected.order_id}` : "Order History"}
            </h2>
          </div>
          <button onClick={selected ? () => setSelected(null) : onClose} className="text-gray-400 hover:text-gray-200 p-1">
            <X size={20} />
          </button>
        </div>

        {/* Detail view */}
        {selected ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <InfoCard label="Date" value={fmtDate(selected.date_ordered)} />
              <InfoCard label="Status" value={selected.is_sync ? "Synced" : "Pending"} color={selected.is_sync ? "text-green-400" : "text-amber-400"} />
              <InfoCard label="Total" value={fmtPrice(selected.grand_total)} />
              <InfoCard label="Items" value={`${selected.lines?.length || 0} lines`} />
            </div>

            {/* Lines */}
            <div className="space-y-1 mt-3">
              {selected.lines?.map((line: any, i: number) => (
                <div key={i} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-200 truncate">{line.productname || `Product ${line.product_id}`}</p>
                    <p className="text-xs text-gray-500">{line.qtyentered} x {fmtPrice(line.priceentered)}</p>
                  </div>
                  <p className="font-medium text-white">{fmtPrice(line.lineamt)}</p>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-gray-700 pt-3 space-y-1">
              <div className="flex justify-between text-sm text-gray-400">
                <span>Subtotal</span><span>{fmtPrice(selected.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-400">
                <span>Tax</span><span>{fmtPrice(selected.tax_total)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-white pt-1 border-t border-gray-700">
                <span>Total</span><span>{fmtPrice(selected.grand_total)}</span>
              </div>
            </div>

            {selected.note && (
              <p className="text-xs text-gray-500 italic">{selected.note}</p>
            )}

            {/* Refund action */}
            {selected.grand_total > 0 && (
              <button onClick={() => { onRefund(selected.order_id); onClose(); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-900/30 text-red-400 rounded-xl text-sm font-medium hover:bg-red-900/50 transition">
                <RotateCcw size={14} /> Refund This Order
              </button>
            )}
          </div>
        ) : (
          /* Order list */
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {loading && <div className="text-center py-12 text-gray-500 text-sm">Loading...</div>}
            {!loading && orders.length === 0 && (
              <div className="text-center py-12 text-gray-500 text-sm">No orders yet</div>
            )}
            {orders.map((o) => (
              <button key={o.order_id} onClick={() => loadOrderDetail(o)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-800 transition text-left group">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  o.is_sync ? "bg-green-500" : "bg-amber-500"
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">#{o.order_id}</span>
                    {o.order_type === "refund" && (
                      <span className="text-[10px] bg-red-900/50 text-red-400 px-1.5 py-0.5 rounded">Refund</span>
                    )}
                    <span className="text-xs text-gray-500">{o.lineCount} items</span>
                  </div>
                  <p className="text-xs text-gray-500">{fmtDate(o.date_ordered)}</p>
                </div>
                <span className={`text-sm font-bold ${o.grand_total < 0 ? "text-red-400" : "text-white"}`}>
                  {fmtPrice(o.grand_total)}
                </span>
                <ChevronRight size={14} className="text-gray-600 group-hover:text-gray-400" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-gray-800 rounded-lg px-3 py-2">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-medium ${color || "text-white"}`}>{value}</p>
    </div>
  );
}

function fmtPrice(n: number): string {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);
}
function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
}
