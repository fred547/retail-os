"use client";

import Image from "next/image";
import type { Product } from "@/lib/offline/schema";
import { Package } from "lucide-react";

export default function ProductGrid({
  products,
  qtyMap,
  onProductClick,
}: {
  products: Product[];
  qtyMap: Record<number, number>;
  onProductClick: (product: Product) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
      {products.map((p) => {
        const qty = qtyMap[p.product_id] ?? 0;
        const outOfStock = p.track_stock && p.quantity_on_hand <= 0;
        return (
          <button
            key={p.product_id}
            onClick={() => onProductClick(p)}
            className={`relative flex flex-col bg-gray-800 rounded-xl overflow-hidden hover:bg-gray-750 hover:ring-1 hover:ring-blue-500/50 transition text-left group ${
              outOfStock ? "opacity-60" : ""
            }`}
          >
            {/* Image */}
            <div className="aspect-square bg-gray-700 relative">
              {p.image && p.image.startsWith("http") ? (
                <Image
                  src={p.image}
                  alt={p.name ?? ""}
                  fill
                  sizes="150px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package size={28} className="text-gray-500" />
                </div>
              )}
              {/* Qty badge */}
              {qty > 0 && (
                <div className="absolute top-1 right-1 bg-blue-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow">
                  {qty}
                </div>
              )}
              {/* Stock bar */}
              {p.track_stock && (
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${
                  p.quantity_on_hand <= 0 ? "bg-red-500" :
                  p.quantity_on_hand <= (p.reorder_point || 5) ? "bg-amber-500" : "bg-green-500"
                }`} />
              )}
            </div>
            {/* Info */}
            <div className="p-2 flex-1 min-h-[3rem]">
              <p className="text-xs text-gray-200 font-medium leading-tight line-clamp-2">{p.name}</p>
              <p className="text-xs text-blue-400 font-semibold mt-0.5">
                {formatPrice(p.sellingprice)}
              </p>
            </div>
          </button>
        );
      })}
      {products.length === 0 && (
        <div className="col-span-full py-16 text-center text-gray-500 text-sm">
          No products found
        </div>
      )}
    </div>
  );
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount ?? 0);
}
