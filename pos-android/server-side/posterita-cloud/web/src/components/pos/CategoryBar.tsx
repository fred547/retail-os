"use client";

import type { ProductCategory } from "@/lib/offline/schema";

export default function CategoryBar({
  categories,
  selected,
  onSelect,
}: {
  categories: ProductCategory[];
  selected: number | null;
  onSelect: (id: number | null) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
      <button
        onClick={() => onSelect(null)}
        className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
          selected === null
            ? "bg-blue-600 text-white"
            : "bg-gray-800 text-gray-300 hover:bg-gray-700"
        }`}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat.productcategory_id}
          onClick={() => onSelect(cat.productcategory_id)}
          className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
            selected === cat.productcategory_id
              ? "bg-blue-600 text-white"
              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
