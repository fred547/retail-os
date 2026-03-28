import { createServerSupabaseAdmin } from "@/lib/supabase/server";
import { getSessionAccountId } from "@/lib/account-context";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Search, Plus } from "lucide-react";
import CategoryFilter from "./CategoryFilter";
import ProductTable from "./ProductTable";
import Breadcrumb from "@/components/Breadcrumb";
import ApproveAllButton from "./ApproveAllButton";

// Revalidate product data every 60 seconds (ISR)
export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string; page?: string; filter?: string; status?: string }>;
}) {
  const accountId = await getSessionAccountId();
  if (!accountId) redirect("/manager/platform");

  const params = await searchParams;
  const supabase = await createServerSupabaseAdmin();
  const page = parseInt(params.page ?? "1");
  const perPage = 50;
  const offset = (page - 1) * perPage;

  // Determine which status tab is active (default: live)
  const statusTab = params.status ?? "live";

  // Build query — scoped to account (no FK join — FKs dropped for multi-tenant safety)
  let query = supabase
    .from("product")
    .select("*", { count: "exact" })
    .eq("account_id", accountId)
    .eq("isactive", "Y")
    .order("name")
    .range(offset, offset + perPage - 1);

  // Filter by product_status tab
  if (statusTab === "review") {
    query = query.eq("product_status", "review");
  } else if (statusTab === "draft") {
    query = query.eq("product_status", "draft");
  } else {
    // "live" tab — show live products (including null for legacy rows)
    query = query.or("product_status.eq.live,product_status.is.null");
  }

  // Filter: price_review shows only products needing owner approval
  if (params.filter === "price_review") {
    query = query.eq("needs_price_review", "Y");
  }

  if (params.search) {
    // Sanitize: strip PostgREST filter metacharacters to prevent injection into .or() string
    const safeSearch = params.search.replace(/[,.()"'\\]/g, "");
    if (safeSearch) {
      query = query.or(
        `name.ilike.%${safeSearch}%,upc.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%`
      );
    }
  }
  if (params.category) {
    const catIds = params.category.split(",").map(Number).filter(Boolean);
    if (catIds.length === 1) {
      query = query.eq("productcategory_id", catIds[0]);
    } else if (catIds.length > 1) {
      query = query.in("productcategory_id", catIds);
    }
  }

  // Run all queries in parallel for speed
  const [
    { data: products, count, error: queryError },
    { count: reviewCount },
    { count: draftCount },
    { data: categories },
    { data: tagGroups },
    { data: allTags },
    { data: productTags },
  ] = await Promise.all([
    query,
    supabase.from("product").select("product_id", { count: "exact", head: true })
      .eq("account_id", accountId).eq("isactive", "Y").eq("product_status", "review"),
    supabase.from("product").select("product_id", { count: "exact", head: true })
      .eq("account_id", accountId).eq("isactive", "Y").eq("product_status", "draft"),
    supabase.from("productcategory").select("productcategory_id, name, parent_category_id, level")
      .eq("account_id", accountId).eq("isactive", "Y").order("name"),
    supabase.from("tag_group").select("tag_group_id, name, color")
      .eq("account_id", accountId).eq("is_deleted", false).order("name"),
    supabase.from("tag").select("tag_id, tag_group_id, name, color")
      .eq("account_id", accountId).eq("is_deleted", false).order("position"),
    supabase.from("product_tag").select("product_id, tag_id")
      .eq("account_id", accountId),
  ]);
  if (queryError) console.error("[products] query error:", queryError.message);

  // Map category names onto products (since FK join was dropped)
  const catMap: Record<number, string> = {};
  for (const c of categories ?? []) catMap[c.productcategory_id] = c.name;
  const enrichedProducts = (products ?? []).map((p: any) => ({
    ...p,
    productcategory: p.productcategory ?? { name: catMap[p.productcategory_id] || null },
  }));

  const totalPages = Math.ceil((count ?? 0) / perPage);

  // Build URL helper preserving search/category params
  const tabUrl = (status: string) => {
    const p = new URLSearchParams();
    p.set("status", status);
    if (params.search) p.set("search", params.search);
    if (params.category) p.set("category", params.category);
    return `/customer/products?${p.toString()}`;
  };

  // Build pagination URL preserving all current params
  const buildUrl = ({ page: pg }: { page: number }) => {
    const p = new URLSearchParams();
    p.set("page", String(pg));
    p.set("status", statusTab);
    if (params.search) p.set("search", params.search);
    if (params.category) p.set("category", params.category);
    if (params.filter) p.set("filter", params.filter);
    return `/customer/products?${p.toString()}`;
  };

  // Build per-product tag ID set
  function buildProductTagMap(pts: any[]): Record<number, number[]> {
    const m: Record<number, number[]> = {};
    for (const pt of pts) {
      if (!m[pt.product_id]) m[pt.product_id] = [];
      m[pt.product_id].push(pt.tag_id);
    }
    return m;
  }

  // Collect product IDs for bulk approve (review tab only)
  const reviewProductIds = statusTab === "review" ? enrichedProducts.map((p: any) => p.product_id) : [];

  return (
    <div className="space-y-4">
      {params.filter === "price_review" && (
        <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-5 py-3">
          <p className="text-sm text-orange-700">
            Showing <strong>products needing price review</strong> &mdash; approve or adjust prices set by staff.
          </p>
          <Link href="/customer/products" className="text-sm text-orange-600 hover:text-orange-800 font-medium underline">
            Show all
          </Link>
        </div>
      )}

      {/* Compact header: count + action */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {count ?? 0} product{(count ?? 0) !== 1 ? "s" : ""}
        </p>
        <Link
          href="/customer/ai-import"
          className="flex items-center gap-2 bg-posterita-blue text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition text-sm"
        >
          <Plus size={16} />
          AI Import
        </Link>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        <Link
          href={tabUrl("live")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            statusTab === "live"
              ? "border-posterita-blue text-posterita-blue"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Live
        </Link>
        <Link
          href={tabUrl("review")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
            statusTab === "review"
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Pending Review
          {(reviewCount ?? 0) > 0 && (
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
              {reviewCount}
            </span>
          )}
        </Link>
        <Link
          href={tabUrl("draft")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
            statusTab === "draft"
              ? "border-gray-500 text-gray-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Drafts
          {(draftCount ?? 0) > 0 && (
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
              {draftCount}
            </span>
          )}
        </Link>

        {/* Bulk Approve button — shown on review tab when there are products */}
        {statusTab === "review" && reviewProductIds.length > 0 && (
          <div className="ml-auto pb-1">
            <ApproveAllButton productIds={reviewProductIds} />
          </div>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form className="flex-1 relative min-w-0">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            name="search"
            defaultValue={params.search}
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none text-sm"
          />
        </form>
        <CategoryFilter
          categories={categories ?? []}
          defaultValue={params.category}
        />
      </div>

      {/* Product Table */}
      <ProductTable
        products={enrichedProducts}
        categories={categories ?? []}
        showStatusColumn={statusTab === "review" || statusTab === "draft"}
        tagGroups={tagGroups ?? []}
        allTags={allTags ?? []}
        productTagMap={buildProductTagMap(productTags ?? [])}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {page > 1 && (
            <Link href={buildUrl({ page: page - 1 })} className="px-3 py-1.5 rounded-lg bg-gray-100 text-sm text-gray-600 hover:bg-gray-200">
              Previous
            </Link>
          )}
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link href={buildUrl({ page: page + 1 })} className="px-3 py-1.5 rounded-lg bg-gray-100 text-sm text-gray-600 hover:bg-gray-200">
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
