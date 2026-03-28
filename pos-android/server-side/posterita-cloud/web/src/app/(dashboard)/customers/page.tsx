import { createServerSupabaseAdmin } from "@/lib/supabase/server";
import { getSessionAccountId } from "@/lib/account-context";
import { redirect } from "next/navigation";
import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumb";
import CustomerFilters from "./CustomerFilters";
import CustomerTable from "./CustomerTable";

// Revalidate customer data every 60 seconds (ISR)
export const revalidate = 60;

const PER_PAGE = 50;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  const accountId = await getSessionAccountId();
  if (!accountId) redirect("/manager/platform");

  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const status = params.status || "";
  const offset = (page - 1) * PER_PAGE;

  const supabase = await createServerSupabaseAdmin();

  // Build query — scoped to account
  let query = supabase
    .from("customer")
    .select(
      "customer_id, name, email, phone1, phone2, address1, address2, city, state, zip, country, isactive, loyaltypoints",
      { count: "exact" }
    )
    .eq("account_id", accountId)
    .order("name")
    .range(offset, offset + PER_PAGE - 1);

  // Server-side search across name, phone, email
  if (search) {
    const safeSearch = search.replace(/[,.()"'\\]/g, "");
    if (safeSearch) {
      query = query.or(
        `name.ilike.%${safeSearch}%,phone1.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`
      );
    }
  }

  // Filter by active status
  if (status) {
    query = query.eq("isactive", status);
  }

  const { data: customers, count, error } = await query;
  if (error) console.error("[customers] query error:", error.message);

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PER_PAGE));

  // Build pagination URL preserving all current params
  const buildUrl = (pg: number) => {
    const p = new URLSearchParams();
    p.set("page", String(pg));
    if (search) p.set("search", search);
    if (status) p.set("status", status);
    return `/customer/customers?${p.toString()}`;
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Customers" }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 mt-1">
            {totalCount} customer{totalCount !== 1 ? "s" : ""}
            {search && (
              <span>
                {" "}
                matching &ldquo;{search}&rdquo;
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Search + Status Filter */}
      <CustomerFilters defaultSearch={search} defaultStatus={status} />

      {/* Customer Table */}
      <CustomerTable customers={customers ?? []} search={search} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {offset + 1}&ndash;
            {Math.min(offset + PER_PAGE, totalCount)} of {totalCount}
          </p>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Link
                href={buildUrl(page - 1)}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
              >
                Previous
              </Link>
            )}
            <span className="text-sm text-gray-600 px-2">
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={buildUrl(page + 1)}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
