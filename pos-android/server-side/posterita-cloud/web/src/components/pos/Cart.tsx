"use client";

import { Minus, Plus, Trash2, User, FileText } from "lucide-react";
import { useCart } from "@/lib/pos/use-cart";
import { updateItemQty, removeItem, clearCart } from "@/lib/pos/cart-store";

export default function Cart({
  onPay,
  onHold,
  onQuote,
}: {
  onPay: () => void;
  onHold: () => void;
  onQuote?: () => void;
}) {
  const cart = useCart();

  return (
    <div className="flex flex-col h-full bg-gray-850">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {cart.customer_name ? (
              <span className="flex items-center gap-1.5 text-sm text-blue-400">
                <User size={14} /> {cart.customer_name}
              </span>
            ) : (
              <span className="text-sm text-gray-500">No customer</span>
            )}
          </div>
          {cart.order_type && (
            <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
              {cart.order_type === "dine_in" ? "Dine In" : cart.order_type === "takeaway" ? "Takeaway" : "Delivery"}
            </span>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {cart.items.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-600 text-sm">
            Scan or tap a product to add
          </div>
        )}
        {cart.items.map((item) => (
          <div
            key={item.product_id}
            className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2 group"
          >
            {/* Qty controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => updateItemQty(item.product_id, item.qty - 1)}
                className="w-7 h-7 rounded-md bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-gray-300 transition"
              >
                <Minus size={14} />
              </button>
              <span className="w-8 text-center text-sm font-bold text-white">{item.qty}</span>
              <button
                onClick={() => updateItemQty(item.product_id, item.qty + 1)}
                className="w-7 h-7 rounded-md bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-gray-300 transition"
              >
                <Plus size={14} />
              </button>
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-200 truncate">{item.name}</p>
              <p className="text-xs text-gray-500">{formatPrice(item.price)} ea</p>
            </div>

            {/* Line total */}
            <p className="text-sm font-semibold text-white w-20 text-right">
              {formatPrice(item.line_total)}
            </p>

            {/* Remove */}
            <button
              onClick={() => removeItem(item.product_id)}
              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition p-1"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Totals */}
      {cart.items.length > 0 && (
        <div className="border-t border-gray-700 px-4 py-3 space-y-1">
          <div className="flex justify-between text-sm text-gray-400">
            <span>Subtotal</span>
            <span>{formatPrice(cart.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-400">
            <span>Tax</span>
            <span>{formatPrice(cart.tax_total)}</span>
          </div>
          {cart.tips > 0 && (
            <div className="flex justify-between text-sm text-gray-400">
              <span>Tips</span>
              <span>{formatPrice(cart.tips)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold text-white pt-1 border-t border-gray-700">
            <span>TOTAL</span>
            <span>{formatPrice(cart.grand_total)}</span>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="px-3 pb-3 pt-1 flex gap-2">
        {cart.items.length > 0 && (
          <>
            <button
              onClick={onHold}
              className="flex-1 py-3 bg-gray-700 text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-600 transition"
            >
              Hold
            </button>
            {onQuote && (
              <button
                onClick={onQuote}
                className="flex-1 py-3 bg-amber-700 text-amber-100 rounded-xl text-sm font-medium hover:bg-amber-600 transition flex items-center justify-center gap-1.5"
              >
                <FileText size={14} /> Quote
              </button>
            )}
            <button
              onClick={onPay}
              className="flex-[2] py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition"
            >
              Pay {formatPrice(cart.grand_total)}
            </button>
          </>
        )}
        {cart.items.length > 0 && (
          <button
            onClick={clearCart}
            className="py-3 px-3 bg-gray-800 text-red-400 rounded-xl text-sm hover:bg-red-900/30 transition"
          >
            <Trash2 size={16} />
          </button>
        )}
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
