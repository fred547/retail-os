import { createServerSupabaseAdmin } from "@/lib/supabase/server";
import { getSessionAccountId } from "@/lib/account-context";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, FileText, Send, CheckCircle, ArrowRight, Clock, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

const statusConfig: Record<string, { bg: string; text: string; icon: any }> = {
  draft:     { bg: "bg-gray-100", text: "text-gray-600", icon: Clock },
  sent:      { bg: "bg-blue-100", text: "text-blue-700", icon: Send },
  accepted:  { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle },
  converted: { bg: "bg-purple-100", text: "text-purple-700", icon: ArrowRight },
  expired:   { bg: "bg-amber-100", text: "text-amber-700", icon: Clock },
  cancelled: { bg: "bg-red-100", text: "text-red-600", icon: XCircle },
};

export default async function QuotationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>;
}) {
  const accountId = await getSessionAccountId();
  if (!accountId) redirect("/manager/platform");

  const params = await searchParams;
  const supabase = await createServerSupabaseAdmin();
  const page = parseInt(params.page ?? "1");
  const perPage = 25;
  const offset = (page - 1) * perPage;
  const statusFilter = params.status ?? "";

  let query = supabase
    .from("quotation")
    .select("*", { count: "exact" })
    .eq("account_id", accountId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (statusFilter) query = query.eq("status", statusFilter);
  if (params.search) {
    const safe = params.search.replace(/[,.()"'\\]/g, "");
    if (safe) query = query.or(`document_no.ilike.%${safe}%,customer_name.ilike.%${safe}%`);
  }

  // Get counts per status for tabs
  const [{ data: quotations, count }, ...statusCounts] = await Promise.all([
    query,
    supabase.from("quotation").select("quotation_id", { count: "exact", head: true }).eq("account_id", accountId).eq("is_deleted", false).eq("status", "draft"),
    supabase.from("quotation").select("quotation_id", { count: "exact", head: true }).eq("account_id", accountId).eq("is_deleted", false).eq("status", "sent"),
    supabase.from("quotation").select("quotation_id", { count: "exact", head: true }).eq("account_id", accountId).eq("is_deleted", false).eq("status", "accepted"),
    supabase.from("quotation").select("quotation_id", { count: "exact", head: true }).eq("account_id", accountId).eq("is_deleted", false).eq("status", "converted"),
  ]);

  const [draftCount, sentCount, acceptedCount, convertedCount] = statusCounts.map((r) => r.count ?? 0);
  const totalPages = Math.ceil((count ?? 0) / perPage);

  const tabUrl = (status: string) => {
    const p = new URLSearchParams();
    if (status) p.set("status", status);
    if (params.search) p.set("search", params.search);
    return `/customer/quotations?${p.toString()}`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Quotations</h1>
          <p className="text-sm text-gray-500">{count ?? 0} total</p>
        </div>
        <Link
          href="/customer/quotations/create"
          className="flex items-center gap-2 bg-posterita-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
        >
          <Plus size={16} />
          New Quote
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {[
          { key: "", label: "All" },
          { key: "draft", label: "Drafts", count: draftCount },
          { key: "sent", label: "Sent", count: sentCount },
          { key: "accepted", label: "Accepted", count: acceptedCount },
          { key: "converted", label: "Converted", count: convertedCount },
        ].map((tab) => (
          <Link
            key={tab.key}
            href={tabUrl(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
              statusFilter === tab.key
                ? "border-posterita-blue text-posterita-blue"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
                {tab.count}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Search */}
      <form className="relative max-w-md">
        <input
          name="search"
          defaultValue={params.search}
          placeholder="Search by quote # or customer..."
          className="w-full pl-4 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none text-sm"
        />
      </form>

      {/* Quotation list */}
      <div className="space-y-2">
        {quotations?.map((q: any) => {
          const sc = statusConfig[q.status] ?? statusConfig.draft;
          const Icon = sc.icon;
          return (
            <Link
              key={q.quotation_id}
              href={`/customer/quotations/${q.quotation_id}`}
              className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 hover:border-blue-200 hover:shadow-md transition group"
            >
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText size={20} className="text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{q.document_no || `#${q.quotation_id}`}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${sc.bg} ${sc.text}`}>
                    <Icon size={10} />
                    {q.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 truncate">
                  {q.customer_name || "No customer"} {q.customer_email ? `— ${q.customer_email}` : ""}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-gray-900">{formatCurrency(q.grand_total)}</p>
                <p className="text-xs text-gray-400">{formatDate(q.created_at)}</p>
              </div>
              <ArrowRight size={16} className="text-gray-300 group-hover:text-blue-500 transition flex-shrink-0" />
            </Link>
          );
        })}

        {(!quotations || quotations.length === 0) && (
          <div className="text-center py-16">
            <FileText size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No quotations yet</p>
            <Link href="/customer/quotations/create" className="text-posterita-blue text-sm font-medium mt-2 inline-block hover:underline">
              Create your first quote
            </Link>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/customer/quotations?page=${p}${statusFilter ? `&status=${statusFilter}` : ""}${params.search ? `&search=${params.search}` : ""}`}
              className={`px-3 py-2 rounded-lg text-sm ${p === page ? "bg-posterita-blue text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "MUR", minimumFractionDigits: 2 }).format(n ?? 0);
}

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" }); }
  catch { return ""; }
}
