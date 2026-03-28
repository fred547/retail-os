import { createServerSupabaseAdmin } from "@/lib/supabase/server";
import { getSessionAccountId } from "@/lib/account-context";
import { redirect } from "next/navigation";
import Link from "next/link";
import OrderTable from "./OrderTable";
import OrderFilters from "./OrderFilters";
import Breadcrumb from "@/components/Breadcrumb";

export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    status?: string;
    search?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const accountId = await getSessionAccountId();
  if (!accountId) redirect("/manager/platform");

  const params = await searchParams;
  const supabase = await createServerSupabaseAdmin();
  const page = parseInt(params.page ?? "1");
  const perPage = 50;
  const offset = (page - 1) * perPage;

  // Default date range: last 30 days
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const defaultFrom = thirtyDaysAgo.toISOString().split("T")[0];
  const defaultTo = today.toISOString().split("T")[0];

  const fromDate = params.from ?? defaultFrom;
  const toDate = params.to ?? defaultTo;

  // No FK join on store — FKs dropped for multi-tenant safety
  let query = supabase
    .from("orders")
    .select("*", { count: "exact" })
    .eq("account_id", accountId)
    .order("date_ordered", { ascending: false })
    .range(offset, offset + perPage - 1);

  // Status filter
  if (params.status === "paid") query = query.eq("is_paid", true);
  if (params.status === "unpaid") query = query.eq("is_paid", false);

  // Date range filter
  query = query.gte("date_ordered", fromDate);
  query = query.lte("date_ordered", `${toDate}T23:59:59`);

  // Search filter — document_no or customer name
  if (params.search) {
    const safeSearch = params.search.replace(/[,.()"'\\]/g, "");
    if (safeSearch) {
      query = query.or(
        `document_no.ilike.%${safeSearch}%,customer_name.ilike.%${safeSearch}%`
      );
    }
  }

  // Run orders + stores queries in parallel
  const [ordersResult, storesResult] = await Promise.all([
    query,
    supabase.from("store").select("store_id, name").eq("account_id", accountId),
  ]);
  const { data: rawOrders, count } = ordersResult;
  const { data: stores } = storesResult;
  const storeMap: Record<number, string> = {};
  for (const s of stores ?? []) storeMap[s.store_id] = s.name;
  const orders = (rawOrders ?? []).map((o: any) => ({
    ...o,
    store: o.store ?? { name: storeMap[o.store_id] || null },
  }));
  const totalPages = Math.ceil((count ?? 0) / perPage);

  // Build URL helper preserving all filter params
  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { status: params.status, search: params.search, from: params.from, to: params.to, ...overrides };
    for (const [key, val] of Object.entries(merged)) {
      if (val) p.set(key, val);
    }
    return `/customer/orders?${p.toString()}`;
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Orders" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-500 mt-1">
            {count ?? 0} total orders — click any order to view line items
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href={buildUrl({ status: undefined })}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              !params.status
                ? "bg-posterita-blue text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            All
          </Link>
          <Link
            href={buildUrl({ status: "paid" })}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              params.status === "paid"
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            Paid
          </Link>
          <Link
            href={buildUrl({ status: "unpaid" })}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              params.status === "unpaid"
                ? "bg-yellow-600 text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            Unpaid
          </Link>
        </div>
      </div>

      <OrderFilters
        defaultSearch={params.search}
        defaultFrom={params.from ?? defaultFrom}
        defaultTo={params.to ?? defaultTo}
      />

      <OrderTable orders={orders ?? []} />

      {totalPages > 1 && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-gray-500">
            Showing {offset + 1}&ndash;{Math.min(offset + perPage, count ?? 0)} of {count ?? 0} orders
          </p>
          <div className="flex gap-2">
          {Array.from(
            { length: Math.min(totalPages, 10) },
            (_, i) => i + 1
          ).map((p) => (
            <Link
              key={p}
              href={buildUrl({ page: String(p) })}
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
