import { createServerSupabaseAdmin } from "@/lib/supabase/server";
import { getSessionAccountId } from "@/lib/account-context";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, ClipboardList, Clock, PlayCircle, CheckCircle, XCircle, Package } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";

export const dynamic = "force-dynamic";

const STATUS_META: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  created: { label: "Created", icon: Clock, color: "bg-gray-100 text-gray-700" },
  active: { label: "Active", icon: PlayCircle, color: "bg-blue-100 text-blue-700" },
  completed: { label: "Completed", icon: CheckCircle, color: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "bg-red-100 text-red-700" },
};

const TYPE_LABELS: Record<string, string> = {
  spot_check: "Spot Check",
  full_count: "Full Count",
};

export default async function InventoryPage() {
  const accountId = await getSessionAccountId();
  if (!accountId) redirect("/manager/platform");

  const supabase = await createServerSupabaseAdmin();

  const { data: sessions } = await supabase
    .from("inventory_count_session")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });

  // Get entry counts per session
  const sessionIds = (sessions ?? []).map((s: any) => s.session_id);
  let entryCounts: Record<number, { unique_products: number; total_quantity: number }> = {};

  if (sessionIds.length > 0) {
    const { data: entries } = await supabase
      .from("inventory_count_entry")
      .select("session_id, product_id, quantity")
      .in("session_id", sessionIds);

    if (entries) {
      const productSets: Record<number, Set<number>> = {};
      for (const e of entries) {
        if (!entryCounts[e.session_id]) {
          entryCounts[e.session_id] = { unique_products: 0, total_quantity: 0 };
        }
        entryCounts[e.session_id].total_quantity += e.quantity;
        if (!productSets[e.session_id]) productSets[e.session_id] = new Set();
        productSets[e.session_id].add(e.product_id);
      }
      for (const [sid, pset] of Object.entries(productSets)) {
        if (entryCounts[Number(sid)]) {
          entryCounts[Number(sid)].unique_products = pset.size;
        }
      }
    }
  }

  // Get store names
  const { data: stores } = await supabase
    .from("store")
    .select("store_id, name")
    .eq("account_id", accountId);
  const storeMap = Object.fromEntries((stores ?? []).map((s: any) => [s.store_id, s.name]));

  const activeCount = (sessions ?? []).filter((s: any) => s.status === "active").length;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Inventory" }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Count</h1>
          <p className="text-gray-500 mt-1">
            Create counting sessions and track product quantities
          </p>
        </div>
        <Link
          href="/inventory/new"
          className="flex items-center gap-2 bg-posterita-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={18} />
          New Session
        </Link>
      </div>

      {activeCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3">
          <p className="text-sm text-blue-700">
            <strong>{activeCount} session{activeCount !== 1 ? "s" : ""}</strong> currently active.
            Scan products on Android POS to record counts.
          </p>
        </div>
      )}

      {(!sessions || sessions.length === 0) ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="bg-amber-50 p-6 rounded-full mb-6">
            <ClipboardList size={48} className="text-amber-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">No inventory sessions yet</h2>
          <p className="text-gray-500 mt-2 max-w-md">
            Create a counting session to start scanning and recording product quantities in your store.
          </p>
          <Link
            href="/inventory/new"
            className="mt-6 flex items-center gap-2 bg-posterita-blue text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={18} />
            Create First Session
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Session</th>
                <th>Store</th>
                <th>Type</th>
                <th>Status</th>
                <th className="text-center">Products</th>
                <th className="text-center">Total Qty</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s: any) => {
                const st = STATUS_META[s.status] ?? STATUS_META.created;
                const StIcon = st.icon;
                const counts = entryCounts[s.session_id] ?? { unique_products: 0, total_quantity: 0 };

                return (
                  <tr key={s.session_id} className="cursor-pointer hover:bg-blue-50/50 transition">
                    <td>
                      <Link href={`/inventory/${s.session_id}`} className="font-medium text-sm">
                        {s.name || `Session #${s.session_id}`}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/inventory/${s.session_id}`} className="text-sm text-gray-600">
                        {storeMap[s.store_id] ?? `Store ${s.store_id}`}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/inventory/${s.session_id}`} className="text-sm text-gray-600">
                        {TYPE_LABELS[s.type] ?? s.type}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/inventory/${s.session_id}`}>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${st.color}`}>
                          <StIcon size={12} />
                          {st.label}
                        </span>
                      </Link>
                    </td>
                    <td className="text-center">
                      <Link href={`/inventory/${s.session_id}`} className="text-sm font-medium flex items-center justify-center gap-1">
                        <Package size={14} className="text-gray-400" />
                        {counts.unique_products}
                      </Link>
                    </td>
                    <td className="text-center">
                      <Link href={`/inventory/${s.session_id}`} className="text-sm font-medium">
                        {counts.total_quantity}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/inventory/${s.session_id}`} className="text-sm text-gray-500">
                        {new Date(s.created_at).toLocaleDateString()}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
