export const dynamic = "force-dynamic";

import { createServerSupabaseAdmin } from "@/lib/supabase/server";
import { isAccountManager } from "@/lib/super-admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import ErrorLogList from "./ErrorLogList";

const PAGE_SIZE = 50;

export default async function PlatformErrorLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; severity?: string; tag?: string; status?: string; q?: string }>;
}) {
  const isManager = await isAccountManager();
  if (!isManager) redirect("/customer");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1"));
  const severity = params.severity || "all";
  const tag = params.tag || "all";
  const status = params.status || "all";
  const search = params.q || "";

  const admin = await createServerSupabaseAdmin();

  let query = admin
    .from("error_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (severity !== "all") query = query.eq("severity", severity);
  if (tag !== "all") query = query.eq("tag", tag);
  if (status === "open") query = query.or("status.is.null,status.eq.open");
  if (status === "fixed") query = query.eq("status", "fixed");
  if (status === "ignored") query = query.eq("status", "ignored");
  if (search) query = query.or(`message.ilike.%${search}%,tag.ilike.%${search}%,account_id.ilike.%${search}%`);

  const from = (page - 1) * PAGE_SIZE;
  query = query.range(from, from + PAGE_SIZE - 1);

  const { data: errors, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  // Get summary counts
  const [
    { count: totalCount },
    { count: errorCount },
    { count: warnCount },
    { count: fatalCount },
    { count: openCount },
  ] = await Promise.all([
    admin.from("error_logs").select("id", { count: "exact", head: true }),
    admin.from("error_logs").select("id", { count: "exact", head: true }).eq("severity", "ERROR"),
    admin.from("error_logs").select("id", { count: "exact", head: true }).eq("severity", "WARN"),
    admin.from("error_logs").select("id", { count: "exact", head: true }).eq("severity", "FATAL"),
    admin.from("error_logs").select("id", { count: "exact", head: true }).or("status.is.null,status.eq.open"),
  ]);

  // Get unique tags for filter
  const { data: tagRows } = await admin
    .from("error_logs")
    .select("tag")
    .limit(100);
  const uniqueTags = [...new Set((tagRows ?? []).map((r: any) => r.tag).filter(Boolean))].sort();

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-red-50 text-red-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
          System Errors
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mt-3">Error Logs</h1>
        <p className="text-slate-500 mt-1">All errors from Android, Web Console, and API — across all accounts</p>
      </div>

      <ErrorLogList
        errors={errors ?? []}
        totalCount={count ?? 0}
        page={page}
        totalPages={totalPages}
        severity={severity}
        tag={tag}
        status={status}
        search={search}
        uniqueTags={uniqueTags}
        summaryCounts={{
          total: totalCount ?? 0,
          error: errorCount ?? 0,
          warn: warnCount ?? 0,
          fatal: fatalCount ?? 0,
          open: openCount ?? 0,
        }}
      />
    </div>
  );
}
