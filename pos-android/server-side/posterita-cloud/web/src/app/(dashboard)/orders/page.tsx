import { createServerSupabaseAdmin } from "@/lib/supabase/server";
import { getSessionAccountId } from "@/lib/account-context";
import { redirect } from "next/navigation";
import Link from "next/link";
import OrderTable from "./OrderTable";
import Breadcrumb from "@/components/Breadcrumb";

// Revalidate order data every 60 seconds (ISR)
export const revalidate = 60;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; date?: string }>;
}) {
  const accountId = await getSessionAccountId();
  if (!accountId) redirect("/manager/platform");

  const params = await searchParams;
  const supabase = await createServerSupabaseAdmin();
  const page = parseInt(params.page ?? "1");
  const perPage = 50;
  const offset = (page - 1) * perPage;

  let query = supabase
    .from("orders")
    .select("*, store(name)", { count: "exact" })
    .eq("account_id", accountId)
    .order("date_ordered", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (params.status === "paid") query = query.eq("is_paid", true);
  if (params.status === "unpaid") query = query.eq("is_paid", false);
  if (params.date) query = query.gte("date_ordered", params.date);

  const { data: orders, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / perPage);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Dashboard", href: "/customer" }, { label: "Orders" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-500 mt-1">
            {count ?? 0} total orders — click any order to view line items
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/customer/orders"
            className={`px-3 py-1.5 rounded-lg text-sm ${
              !params.status
                ? "bg-posterita-blue text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            All
          </Link>
          <Link
            href="/customer/orders?status=paid"
            className={`px-3 py-1.5 rounded-lg text-sm ${
              params.status === "paid"
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            Paid
          </Link>
          <Link
            href="/customer/orders?status=unpaid"
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
              href={`/customer/orders?page=${p}${
                params.status ? `&status=${params.status}` : ""
              }`}
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
