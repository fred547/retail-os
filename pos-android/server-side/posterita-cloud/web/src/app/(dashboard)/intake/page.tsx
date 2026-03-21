import { createServerSupabaseAdmin } from "@/lib/supabase/server";
import { getSessionAccountId } from "@/lib/account-context";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Globe, FileText, ShoppingCart, Receipt, Search, Rss, Clock, CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";

export const revalidate = 30;

const SOURCE_META: Record<string, { label: string; icon: typeof Globe; color: string }> = {
  website: { label: "Website", icon: Globe, color: "text-blue-600 bg-blue-50" },
  catalogue: { label: "Catalogue", icon: FileText, color: "text-purple-600 bg-purple-50" },
  purchase_order: { label: "Purchase Order", icon: ShoppingCart, color: "text-green-600 bg-green-50" },
  invoice: { label: "Invoice", icon: Receipt, color: "text-orange-600 bg-orange-50" },
  ai_search: { label: "AI Search", icon: Search, color: "text-indigo-600 bg-indigo-50" },
  supplier_feed: { label: "Supplier Feed", icon: Rss, color: "text-teal-600 bg-teal-50" },
};

const STATUS_META: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  processing: { label: "Processing", icon: Loader2, color: "bg-blue-100 text-blue-700" },
  ready: { label: "Ready for Review", icon: AlertCircle, color: "bg-orange-100 text-orange-700" },
  in_review: { label: "In Review", icon: Clock, color: "bg-yellow-100 text-yellow-700" },
  committed: { label: "Committed", icon: CheckCircle, color: "bg-green-100 text-green-700" },
  failed: { label: "Failed", icon: XCircle, color: "bg-red-100 text-red-700" },
};

export default async function IntakePage() {
  const accountId = await getSessionAccountId();
  if (!accountId) redirect("/manager/platform");

  const supabase = await createServerSupabaseAdmin();

  const { data: batches } = await supabase
    .from("intake_batch")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });

  const pendingCount = (batches ?? []).filter((b: any) => b.status === "ready" || b.status === "in_review").length;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Dashboard", href: "/customer" }, { label: "Product Intake" }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Intake</h1>
          <p className="text-gray-500 mt-1">
            Import products from websites, catalogues, purchase orders, and invoices
          </p>
        </div>
        <Link
          href="/customer/intake/new"
          className="flex items-center gap-2 bg-posterita-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={18} />
          New Intake
        </Link>
      </div>

      {pendingCount > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-3">
          <p className="text-sm text-orange-700">
            <strong>{pendingCount} batch{pendingCount !== 1 ? "es" : ""}</strong> waiting for your review.
            Approve products to make them available on the POS.
          </p>
        </div>
      )}

      {/* Batch List */}
      {(!batches || batches.length === 0) ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="bg-blue-50 p-6 rounded-full mb-6">
            <FileText size={48} className="text-posterita-blue" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">No intake batches yet</h2>
          <p className="text-gray-500 mt-2 max-w-md">
            Start importing products from a website, catalogue, purchase order, or invoice.
            AI will extract products, match them against your existing catalog, and let you review before going live.
          </p>
          <Link
            href="/customer/intake/new"
            className="mt-6 flex items-center gap-2 bg-posterita-blue text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={18} />
            Start First Intake
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Reference</th>
                <th>Items</th>
                <th>Status</th>
                <th>Created</th>
                <th className="text-right">Progress</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b: any) => {
                const src = SOURCE_META[b.source] ?? SOURCE_META.website;
                const st = STATUS_META[b.status] ?? STATUS_META.processing;
                const SrcIcon = src.icon;
                const StIcon = st.icon;

                return (
                  <tr key={b.batch_id} className="cursor-pointer hover:bg-blue-50/50 transition">
                    <td>
                      <Link href={`/customer/intake/${b.batch_id}`} className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${src.color}`}>
                          <SrcIcon size={18} />
                        </div>
                        <span className="font-medium text-sm">{src.label}</span>
                      </Link>
                    </td>
                    <td>
                      <Link href={`/customer/intake/${b.batch_id}`} className="text-sm text-gray-600 truncate max-w-xs block">
                        {b.source_ref || b.supplier_name || "—"}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/customer/intake/${b.batch_id}`} className="text-sm font-medium">
                        {b.item_count}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/customer/intake/${b.batch_id}`}>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${st.color}`}>
                          <StIcon size={12} className={b.status === "processing" ? "animate-spin" : ""} />
                          {st.label}
                        </span>
                      </Link>
                    </td>
                    <td>
                      <Link href={`/customer/intake/${b.batch_id}`} className="text-sm text-gray-500">
                        {new Date(b.created_at).toLocaleDateString()}
                      </Link>
                    </td>
                    <td className="text-right">
                      <Link href={`/customer/intake/${b.batch_id}`} className="text-sm text-gray-500">
                        {b.approved_count + b.rejected_count} / {b.item_count}
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
