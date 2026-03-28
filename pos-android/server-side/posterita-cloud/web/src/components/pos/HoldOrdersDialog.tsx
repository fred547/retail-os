"use client";

import { useState, useEffect } from "react";
import { X, Pause, Play, Trash2, ShoppingCart, Clock } from "lucide-react";
import { listHeldOrders, recallHeldOrder, deleteHeldOrder, type HeldOrder } from "@/lib/pos/cart-store";

export default function HoldOrdersDialog({
  onClose,
  onRecalled,
}: {
  onClose: () => void;
  onRecalled: () => void;
}) {
  const [orders, setOrders] = useState<HeldOrder[]>([]);

  useEffect(() => {
    setOrders(listHeldOrders());
  }, []);

  const handleRecall = (id: string) => {
    recallHeldOrder(id);
    onRecalled();
    onClose();
  };

  const handleDelete = (id: string) => {
    deleteHeldOrder(id);
    setOrders(listHeldOrders());
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-700 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Pause size={18} className="text-amber-400" />
            <h2 className="text-lg font-bold text-white">Held Orders</h2>
            <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">{orders.length}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 p-1">
            <X size={20} />
          </button>
        </div>

        {/* Orders list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {orders.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Pause size={32} className="mx-auto mb-3 text-gray-600" />
              <p className="text-sm">No held orders</p>
            </div>
          )}

          {orders.map((order) => {
            const total = order.items.reduce((sum, i) => sum + i.qty * i.price * (1 - (i.discount_percent || 0) / 100), 0);
            const itemCount = order.items.reduce((sum, i) => sum + i.qty, 0);
            const timeAgo = getTimeAgo(order.held_at);

            return (
              <div key={order.id} className="bg-gray-800 rounded-xl p-4 group">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShoppingCart size={14} className="text-gray-400" />
                      <span className="text-sm font-medium text-white">
                        {itemCount} item{itemCount !== 1 ? "s" : ""}
                      </span>
                      <span className="text-sm font-bold text-blue-400">{total.toFixed(2)}</span>
                    </div>
                    {order.customer_name && (
                      <p className="text-xs text-gray-400 mt-0.5">{order.customer_name}</p>
                    )}
                    {order.note && (
                      <p className="text-xs text-gray-500 mt-0.5 italic">{order.note}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock size={10} />
                    {timeAgo}
                  </div>
                </div>

                {/* Item preview */}
                <div className="text-xs text-gray-400 mb-3 space-y-0.5">
                  {order.items.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="truncate flex-1">{item.qty}x {item.name}</span>
                      <span className="ml-2">{(item.qty * item.price).toFixed(2)}</span>
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <div className="text-gray-600">+{order.items.length - 3} more</div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button onClick={() => handleRecall(order.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                    <Play size={14} /> Recall
                  </button>
                  <button onClick={() => handleDelete(order.id)}
                    className="py-2 px-3 bg-gray-700 text-red-400 rounded-lg text-sm hover:bg-red-900/30 transition">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}
