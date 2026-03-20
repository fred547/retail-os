"use client";

export default function CategoryFilter({
  categories,
  defaultValue,
}: {
  categories: { productcategory_id: number; name: string }[];
  defaultValue?: string;
}) {
  return (
    <form>
      <select
        name="category"
        defaultValue={defaultValue}
        className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm"
        onChange={(e: any) => e.target.form.submit()}
      >
        <option value="">All Categories</option>
        {categories?.map((c) => (
          <option key={c.productcategory_id} value={c.productcategory_id}>
            {c.name}
          </option>
        ))}
      </select>
    </form>
  );
}
