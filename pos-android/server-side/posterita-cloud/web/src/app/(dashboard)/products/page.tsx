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

  // Build query — scoped to account
  let query = supabase
    .from("product")
    .select("*, productcategory(name)", { count: "exact" })
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
    query = query.or(
      `name.ilike.%${params.search}%,upc.ilike.%${params.search}%,description.ilike.%${params.search}%`
    );
  }
  if (params.category) {
    query = query.eq("productcategory_id", params.category);
  }

  const { data: products, count } = await query;

  // Get counts for each status tab
  const [
    { count: reviewCount },
    { count: draftCount },
  ] = await Promise.all([
    supabase
      .from("product")
      .select("product_id", { count: "exact", head: true })
      .eq("account_id", accountId)
      .eq("isactive", "Y")
      .eq("product_status", "review"),
    supabase
      .from("product")
      .select("product_id", { count: "exact", head: true })
      .eq("account_id", accountId)
      .eq("isactive", "Y")
      .eq("product_status", "draft"),
  ]);

  // Get categories for filter (scoped to this account)
  const { data: categories } = await supabase
    .from("productcategory")
    .select("productcategory_id, name")
    .eq("account_id", accountId)
    .eq("isactive", "Y")
    .order("name");

  const totalPages = Math.ceil((count ?? 0) / perPage);

  // Build URL helper preserving search/category params
  const tabUrl = (status: string) => {
    const p = new URLSearchParams();
    p.set("status", status);
    if (params.search) p.set("search", params.search);
    if (params.category) p.set("category", params.category);
    return `/customer/products?${p.toString()}`;
  };

  // Collect product IDs for bulk approve (review tab only)
  const reviewProductIds = statusTab === "review" ? (products ?? []).map((p: any) => p.product_id) : [];

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
          <p className="text-gray-500 mt-1">
            {count ?? 0} product{(count ?? 0) !== 1 ? "s" : ""}
            {statusTab === "review" ? " pending review" : statusTab === "draft" ? " in draft" : ""}
            {params.filter === "price_review" ? " needing price review" : ""}
          </p>
        </div>
        <Link
          href="/customer/ai-import"
          className="flex items-center gap-2 bg-posterita-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={18} />
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
      <ProductTable products={products ?? []} categories={categories ?? []} showStatusColumn={statusTab === "review" || statusTab === "draft"} />

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
              href={`/customer/products?page=${p}&status=${statusTab}${
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
