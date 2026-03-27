"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CategoryPicker from "@/components/CategoryPicker";

export default function CategoryFilter({
  categories,
  defaultValue,
}: {
  categories: { productcategory_id: number; name: string; parent_category_id?: number | null; level?: number }[];
  defaultValue?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState<number | null>(
    defaultValue ? Number(defaultValue) : null
  );

  const handleChange = (id: number | null) => {
    setValue(id);
    const newParams = new URLSearchParams(params.toString());
    if (id) {
      // Include this category + all descendants for filtering
      const descendantIds = getDescendantIds(id, categories);
      newParams.set("category", [id, ...descendantIds].join(","));
    } else {
      newParams.delete("category");
    }
    newParams.delete("page"); // reset pagination
    router.push(`?${newParams.toString()}`);
  };

  return (
    <div className="w-64">
      <CategoryPicker
        categories={categories.map((c) => ({
          productcategory_id: c.productcategory_id,
          name: c.name,
          parent_category_id: c.parent_category_id ?? null,
          level: c.level ?? 0,
        }))}
        value={value}
        onChange={handleChange}
        placeholder="All Categories"
        allowParentSelection
      />
    </div>
  );
}

function getDescendantIds(
  parentId: number,
  categories: { productcategory_id: number; parent_category_id?: number | null }[]
): number[] {
  const result: number[] = [];
  for (const c of categories) {
    if (c.parent_category_id === parentId) {
      result.push(c.productcategory_id);
      result.push(...getDescendantIds(c.productcategory_id, categories));
    }
  }
  return result;
}
