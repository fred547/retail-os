import { createServerSupabaseAdmin } from "@/lib/supabase/server";
import { getSessionAccountId } from "@/lib/account-context";
import { redirect } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import ErrorLogTable from "./ErrorLogTable";

export const dynamic = "force-dynamic";

export default async function ErrorsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; severity?: string; tag?: string }>;
}) {
  const accountId = await getSessionAccountId();
  if (!accountId) redirect("/manager/platform");

  const params = await searchParams;
  const supabase = await createServerSupabaseAdmin();
  const page = parseInt(params.page ?? "1");
  const perPage = 50;
  const offset = (page - 1) * perPage;

  let query = supabase
    .from("error_logs")
    .select("*", { count: "exact" })
    .eq("account_id", accountId)
    .order("timestamp", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (params.severity) query = query.eq("severity", params.severity);
  if (params.tag) query = query.ilike("tag", `%${params.tag}%`);

  const { data: errors, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / perPage);

  // Get severity counts for badges
  const { data: fatalCount } = await supabase
    .from("error_logs")
    .select("id", { count: "exact", head: true })
    .eq("account_id", accountId)
    .eq("severity", "FATAL");

  const { data: errorCount } = await supabase
    .from("error_logs")
    .select("id", { count: "exact", head: true })
    .eq("account_id", accountId)
    .eq("severity", "ERROR");

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Error Logs" },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Error Logs</h1>
          <p className="text-gray-500 mt-1">
            {count ?? 0} errors from Android terminals
          </p>
        </div>

        {/* Severity filter chips */}
        <div className="flex gap-2">
          <a
            href="/customer/errors"
            className={`px-3 py-1.5 rounded-lg text-sm ${
              !params.severity
                ? "bg-posterita-blue text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            All
          </a>
          <a
            href="/customer/errors?severity=FATAL"
            className={`px-3 py-1.5 rounded-lg text-sm ${
              params.severity === "FATAL"
                ? "bg-red-600 text-white"
                : "bg-red-50 text-red-700"
            }`}
          >
            Fatal
          </a>
          <a
            href="/customer/errors?severity=ERROR"
            className={`px-3 py-1.5 rounded-lg text-sm ${
              params.severity === "ERROR"
                ? "bg-orange-600 text-white"
                : "bg-orange-50 text-orange-700"
            }`}
          >
            Error
          </a>
          <a
            href="/customer/errors?severity=WARN"
            className={`px-3 py-1.5 rounded-lg text-sm ${
              params.severity === "WARN"
                ? "bg-yellow-600 text-white"
                : "bg-yellow-50 text-yellow-700"
            }`}
          >
            Warn
          </a>
        </div>
      </div>

      <ErrorLogTable errors={errors ?? []} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {page > 1 && (
            <a
              href={`/customer/errors?page=${page - 1}${
                params.severity ? `&severity=${params.severity}` : ""
              }`}
              className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-sm"
            >
              Previous
            </a>
          )}
          <span className="px-3 py-1.5 text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <a
              href={`/customer/errors?page=${page + 1}${
                params.severity ? `&severity=${params.severity}` : ""
              }`}
              className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-sm"
            >
              Next
            </a>
          )}
        </div>
      )}
    </div>
  );
}
