"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef } from "react";
import { Search } from "lucide-react";

export default function OrderFilters({
  defaultSearch,
  defaultFrom,
  defaultTo,
}: {
  defaultSearch?: string;
  defaultFrom?: string;
  defaultTo?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateParams = (updates: Record<string, string | undefined>) => {
    const newParams = new URLSearchParams(params.toString());
    for (const [key, val] of Object.entries(updates)) {
      if (val) {
        newParams.set(key, val);
      } else {
        newParams.delete(key);
      }
    }
    newParams.delete("page"); // reset pagination on filter change
    router.push(`?${newParams.toString()}`);
  };

  const handleSearch = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParams({ search: value || undefined });
    }, 300);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search input */}
      <div className="flex-1 relative min-w-0">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={18}
        />
        <input
          type="text"
          defaultValue={defaultSearch}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by order # or customer..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none text-sm"
        />
      </div>

      {/* Date range */}
      <div className="flex gap-2 items-center">
        <label className="text-sm text-gray-500 whitespace-nowrap">From</label>
        <input
          type="date"
          defaultValue={defaultFrom}
          onChange={(e) => updateParams({ from: e.target.value || undefined })}
          className="px-3 py-2.5 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none text-sm"
        />
        <label className="text-sm text-gray-500 whitespace-nowrap">To</label>
        <input
          type="date"
          defaultValue={defaultTo}
          onChange={(e) => updateParams({ to: e.target.value || undefined })}
          className="px-3 py-2.5 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none text-sm"
        />
      </div>
    </div>
  );
}
