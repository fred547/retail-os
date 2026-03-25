import { createServerSupabaseAdmin } from "@/lib/supabase/server";
import { getSessionAccountId } from "@/lib/account-context";
import { redirect } from "next/navigation";
import TillTable from "./TillTable";
import Breadcrumb from "@/components/Breadcrumb";

export const dynamic = "force-dynamic";

export default async function TillsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; store?: string; terminal?: string; from?: string; to?: string }>;
}) {
  const accountId = await getSessionAccountId();
  if (!accountId) redirect("/manager/platform");

  const params = await searchParams;
  const supabase = await createServerSupabaseAdmin();
  const page = parseInt(params.page ?? "1");
  const perPage = 50;
  const offset = (page - 1) * perPage;

  let query = supabase
    .from("till")
    .select("*", { count: "exact" })
    .eq("account_id", accountId)
    .order("date_opened", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (params.store) query = query.eq("store_id", Number(params.store));
  if (params.terminal) query = query.eq("terminal_id", Number(params.terminal));
  if (params.from) query = query.gte("date_opened", params.from);
  if (params.to) query = query.lte("date_opened", params.to + "T23:59:59");

  // Run tills + stores + terminals + users + order counts in parallel
  const [tillsResult, storesResult, terminalsResult, usersResult] = await Promise.all([
    query,
    supabase.from("store").select("store_id, name").eq("account_id", accountId).eq("isactive", "Y"),
    supabase.from("terminal").select("terminal_id, name").eq("account_id", accountId).eq("isactive", "Y"),
    supabase.from("pos_user").select("user_id, username, firstname").eq("account_id", accountId),
  ]);

  const { data: tills, count } = tillsResult;
  const { data: stores } = storesResult;
  const { data: terminals } = terminalsResult;
  const { data: users } = usersResult;

  const storeMap: Record<number, string> = {};
  for (const s of stores ?? []) storeMap[s.store_id] = s.name;

  const terminalMap: Record<number, string> = {};
  for (const t of terminals ?? []) terminalMap[t.terminal_id] = t.name;

  const userMap: Record<number, string> = {};
  for (const u of users ?? []) userMap[u.user_id] = u.firstname || u.username;

  // Get order counts per till (for tills on this page)
  const tillIds = (tills ?? []).map((t: any) => t.till_id);
  let orderCountMap: Record<number, number> = {};
  if (tillIds.length > 0) {
    const { data: orderCounts } = await supabase
      .from("orders")
      .select("till_id")
      .eq("account_id", accountId)
      .in("till_id", tillIds);

    for (const o of orderCounts ?? []) {
      orderCountMap[o.till_id] = (orderCountMap[o.till_id] ?? 0) + 1;
    }
  }

  // Also count orphaned orders (have till_uuid but no till_id)
  const { count: orphanedCount } = await supabase
    .from("orders")
    .select("order_id", { count: "exact", head: true })
    .eq("account_id", accountId)
    .is("till_id", null)
    .not("till_uuid", "is", null);

  const totalPages = Math.ceil((count ?? 0) / perPage);

  // Get account currency
  const { data: account } = await supabase
    .from("account")
    .select("currency")
    .eq("account_id", accountId)
    .single();

  const currency = account?.currency ?? "MUR";

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Tills" }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Till History</h1>
          <p className="text-gray-500 mt-1">
            {count ?? 0} till session{(count ?? 0) !== 1 ? "s" : ""} recorded
          </p>
        </div>
      </div>

      {(orphanedCount ?? 0) > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
          <p className="text-sm text-amber-700">
            <strong>{orphanedCount}</strong> order{orphanedCount !== 1 ? "s" : ""} pending till reconciliation.
            These orders have a till UUID but the till hasn&apos;t synced yet. They will be linked automatically on the next sync.
          </p>
        </div>
      )}

      <TillTable
        tills={(tills ?? []).map((t: any) => ({
          ...t,
          store_name: storeMap[t.store_id] ?? `Store ${t.store_id}`,
          terminal_name: terminalMap[t.terminal_id] ?? `Terminal ${t.terminal_id}`,
          opened_by_name: userMap[t.open_by] ?? (t.open_by ? `User ${t.open_by}` : "—"),
          closed_by_name: userMap[t.close_by] ?? (t.close_by ? `User ${t.close_by}` : "—"),
          order_count: orderCountMap[t.till_id] ?? 0,
        }))}
        stores={stores ?? []}
        terminals={terminals ?? []}
        currency={currency}
        page={page}
        totalPages={totalPages}
        filters={params}
      />
    </div>
  );
}
