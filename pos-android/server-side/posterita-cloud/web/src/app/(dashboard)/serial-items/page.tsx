import { createServerSupabaseAdmin } from "@/lib/supabase/server";
import { getSessionAccountId } from "@/lib/account-context";
import { redirect } from "next/navigation";
import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumb";
import SerialItemTable from "./SerialItemTable";

export const dynamic = "force-dynamic";

export default async function SerialItemsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    status?: string;
    product_id?: string;
    search?: string;
  }>;
}) {
  const accountId = await getSessionAccountId();
  if (!accountId) redirect("/manager/platform");

  const params = await searchParams;
  const supabase = await createServerSupabaseAdmin();
  const page = parseInt(params.page ?? "1");
  const perPage = 50;
  const offset = (page - 1) * perPage;

  let query = supabase
    .from("serial_item")
    .select("*", { count: "exact" })
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (params.status) query = query.eq("status", params.status);
  if (params.product_id) query = query.eq("product_id", parseInt(params.product_id));
  if (params.search) query = query.ilike("serial_number", `%${params.search}%`);

  // Run serial items, products, and stores queries in parallel
  const [itemsResult, productsResult, storesResult] = await Promise.all([
    query,
    supabase
      .from("product")
      .select("product_id, name, is_serialized")
      .eq("account_id", accountId)
      .eq("isactive", "Y"),
    supabase
      .from("store")
      .select("store_id, name")
      .eq("account_id", accountId),
  ]);

  const { data: rawItems, count } = itemsResult;
  const { data: products } = productsResult;
  const { data: stores } = storesResult;

  // Build lookup maps (no FK joins — rule 16)
  const productMap: Record<number, string> = {};
  for (const p of products ?? []) productMap[p.product_id] = p.name;

  const storeMap: Record<number, string> = {};
  for (const s of stores ?? []) storeMap[s.store_id] = s.name;

  const items = (rawItems ?? []).map((item: any) => ({
    ...item,
    product_name: productMap[item.product_id] || "Unknown Product",
    store_name: storeMap[item.store_id] || "Unknown Store",
  }));

  const totalPages = Math.ceil((count ?? 0) / perPage);

  // Build filter URL helper
  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { ...params, ...overrides };
    if (merged.status) p.set("status", merged.status);
    if (merged.product_id) p.set("product_id", merged.product_id);
    if (merged.search) p.set("search", merged.search);
    if (merged.page && merged.page !== "1") p.set("page", merged.page);
    const qs = p.toString();
    return `/customer/serial-items${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Serial Items" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Serial Items</h1>
          <p className="text-gray-500 mt-1">
            {count ?? 0} serialized items tracked (VIN, IMEI, serial numbers)
          </p>
        </div>
        <Link
          href="/customer/serial-items/new"
          className="bg-posterita-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
        >
          Receive Stock
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Status filters */}
        {[
          { label: "All", value: undefined },
          { label: "In Stock", value: "in_stock" },
          { label: "Sold", value: "sold" },
          { label: "Delivered", value: "delivered" },
          { label: "Returned", value: "returned" },
        ].map((f) => (
          <Link
            key={f.label}
            href={buildUrl({ status: f.value, page: undefined })}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              (params.status ?? undefined) === f.value
                ? "bg-posterita-blue text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </Link>
        ))}

        {/* Search */}
        <form action="/customer/serial-items" method="get" className="flex gap-2">
          {params.status && <input type="hidden" name="status" value={params.status} />}
          {params.product_id && <input type="hidden" name="product_id" value={params.product_id} />}
          <input
            type="text"
            name="search"
            defaultValue={params.search ?? ""}
            placeholder="Search serial number..."
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none w-56"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 text-sm"
          >
            Search
          </button>
        </form>
      </div>

      <SerialItemTable items={items} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-gray-500">
            Showing {offset + 1}&ndash;{Math.min(offset + perPage, count ?? 0)} of{" "}
            {count ?? 0} items
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
