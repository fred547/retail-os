"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef } from "react";
import { Search } from "lucide-react";

export default function CustomerFilters({
  defaultSearch,
  defaultStatus,
}: {
  defaultSearch?: string;
  defaultStatus?: string;
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

  const statusOptions = [
    { value: "", label: "All" },
    { value: "Y", label: "Active" },
    { value: "N", label: "Inactive" },
  ];

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
          placeholder="Search customers by name, email, or phone..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none text-sm"
        />
      </div>

      {/* Status pills */}
      <div className="flex items-center gap-1">
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => updateParams({ status: opt.value || undefined })}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
              (defaultStatus || "") === opt.value
                ? "bg-posterita-blue text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
