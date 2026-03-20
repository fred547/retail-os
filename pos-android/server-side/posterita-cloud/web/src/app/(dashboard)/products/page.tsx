import { createServerSupabaseAdmin } from "@/lib/supabase/server";
import Link from "next/link";
import { Search, Plus } from "lucide-react";
import CategoryFilter from "./CategoryFilter";
import ProductTable from "./ProductTable";
import Breadcrumb from "@/components/Breadcrumb";

// Revalidate product data every 60 seconds (ISR)
export const revalidate = 60;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string; page?: string; filter?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createServerSupabaseAdmin();
  const page = parseInt(params.page ?? "1");
  const perPage = 50;
  const offset = (page - 1) * perPage;

  // Build query
  let query = supabase
    .from("product")
    .select("*, productcategory(name)", { count: "exact" })
    .eq("isactive", "Y")
    .order("name")
    .range(offset, offset + perPage - 1);

  // Filter: price_review shows only products needing owner approval
  if (params.filter === "price_review") {
    query = query.eq("needs_price_review", "Y");
  }

  if (params.search) {
    query = query.or(
      `name.ilike.%${params.search}%,upc.ilike.%${params.search}%,description.ilike.%${params.search}%`
    );
  }
  if (params.category) {
    query = query.eq("productcategory_id", params.category);
  }

  const { data: products, count } = await query;

  // Get categories for filter
  const { data: categories } = await supabase
    .from("productcategory")
    .select("productcategory_id, name")
    .eq("isactive", "Y")
    .order("name");

  const totalPages = Math.ceil((count ?? 0) / perPage);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Dashboard", href: "/customer" }, { label: "Products" }]} />
      {params.filter === "price_review" && (
        <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-5 py-3">
          <p className="text-sm text-orange-700">
            Showing <strong>products needing price review</strong> &mdash; approve or adjust prices set by staff.
          </p>
          <Link href="/customer/products" className="text-sm text-orange-600 hover:text-orange-800 font-medium underline">
            Show all products
          </Link>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 mt-1">{count ?? 0} product{(count ?? 0) !== 1 ? "s" : ""}{params.filter === "price_review" ? " needing review" : ""}</p>
        </div>
        <Link
          href="/customer/ai-import"
          className="flex items-center gap-2 bg-posterita-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={18} />
          AI Import
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-4">
        <form className="flex-1 relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            name="search"
            defaultValue={params.search}
            placeholder="Search products by name, UPC, or description..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
          />
        </form>
        <CategoryFilter
          categories={categories ?? []}
          defaultValue={params.category}
        />
      </div>

      {/* Product Table */}
      <ProductTable products={products ?? []} categories={categories ?? []} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-gray-500">
            Showing {offset + 1}&ndash;{Math.min(offset + perPage, count ?? 0)} of {count ?? 0} products
          </p>
          <div className="flex gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/customer/products?page=${p}${
                params.search ? `&search=${params.search}` : ""
              }${params.category ? `&category=${params.category}` : ""}`}
              className={`px-3 py-2 rounded-lg text-sm ${
                p === page
                  ? "bg-posterita-blue text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {p}
            </Link>
          ))}
          </div>
        </div>
      )}
    </div>
  );
}
