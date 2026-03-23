export const dynamic = "force-dynamic";

import { createServerSupabaseAdmin } from "@/lib/supabase/server";
import { isAccountManager } from "@/lib/super-admin";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import CreateAccountForm from "./CreateAccountForm";
import ManagerPortfolio from "./ManagerPortfolio";
import PlatformTabs from "./PlatformTabs";
import OwnerList from "./OwnerList";
import SyncMonitor from "./SyncMonitor";
import TestResults from "./TestResults";
import Benchmark from "./Benchmark";
import Infrastructure from "./Infrastructure";
import Changelog from "./Changelog";

const PAGE_SIZE = 25;

export default async function PlatformPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const isManager = await isAccountManager();
  if (!isManager) redirect("/customer");

  const params = await searchParams;
  const tab = params.tab || "brands";
  const admin = await createServerSupabaseAdmin();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-red-50 text-red-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
          Account Manager Portal
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mt-4">Platform</h1>
      </div>

      {/* Tabs */}
      <Suspense fallback={null}>
        <PlatformTabs />
      </Suspense>

      {/* Tab content */}
      {tab === "brands" && (
        <BrandsTab admin={admin} params={params} />
      )}
      {tab === "owners" && (
        <OwnersTab admin={admin} />
      )}
      {tab === "errors" && (
        <ErrorsTab admin={admin} />
      )}
      {tab === "sync" && (
        <SyncTab admin={admin} />
      )}
      {tab === "tests" && (
        <TestsTab admin={admin} />
      )}
      {tab === "benchmark" && (
        <Benchmark />
      )}
      {tab === "infra" && (
        <Infrastructure />
      )}
      {tab === "changelog" && (
        <Changelog />
      )}
    </div>
  );
}

// ── Brands Tab ──────────────────────────────────────────

async function BrandsTab({ admin, params }: { admin: any; params: any }) {
  const page = Math.max(1, parseInt(params.page || "1"));
  const typeFilter = params.type || "all";
  const statusFilter = params.status || "all";
  const search = params.q || "";

  let query = admin
    .from("account")
    .select("*, owner:owner_id(id, email, phone, name, account_manager:account_manager_id(id, email, name))", { count: "exact" })
    .order("created_at", { ascending: false });

  if (typeFilter !== "all") query = query.eq("type", typeFilter);
  if (statusFilter !== "all") query = query.eq("status", statusFilter);
  if (search) query = query.or(`businessname.ilike.%${search}%,account_id.ilike.%${search}%`);

  const from = (page - 1) * PAGE_SIZE;
  query = query.range(from, from + PAGE_SIZE - 1);

  const { data: accounts, count: totalCount } = await query;

  const { data: managers } = await admin
    .from("account_manager")
    .select("id, email, name")
    .eq("is_active", true)
    .order("email", { ascending: true });

  const accountIds = (accounts ?? []).map((a: any) => a.account_id);
  let accountStats: any[] = [];

  if (accountIds.length > 0) {
    const statsMap: Record<string, any> = {};
    for (const id of accountIds) statsMap[id] = { store_count: 0, product_count: 0, user_count: 0, order_count: 0 };

    await Promise.all(accountIds.map(async (id: string) => {
      const [stores, products, users, orders] = await Promise.all([
        admin.from("store").select("store_id", { count: "exact", head: true }).eq("account_id", id),
        admin.from("product").select("product_id", { count: "exact", head: true }).eq("account_id", id),
        admin.from("pos_user").select("user_id", { count: "exact", head: true }).eq("account_id", id),
        admin.from("orders").select("order_id", { count: "exact", head: true }).eq("account_id", id),
      ]);
      statsMap[id] = {
        store_count: stores.count ?? 0,
        product_count: products.count ?? 0,
        user_count: users.count ?? 0,
        order_count: orders.count ?? 0,
      };
    }));

    accountStats = (accounts ?? []).map((a: any) => ({ ...a, ...statsMap[a.account_id] }));
  }

  const [totalAccounts, demoCount, liveCount, trialCount, testingCount, onboardingCount, activeCount] = await Promise.all([
    admin.from("account").select("account_id", { count: "exact", head: true }),
    admin.from("account").select("account_id", { count: "exact", head: true }).eq("type", "demo"),
    admin.from("account").select("account_id", { count: "exact", head: true }).eq("type", "live"),
    admin.from("account").select("account_id", { count: "exact", head: true }).eq("type", "trial"),
    admin.from("account").select("account_id", { count: "exact", head: true }).eq("status", "testing"),
    admin.from("account").select("account_id", { count: "exact", head: true }).eq("status", "onboarding"),
    admin.from("account").select("account_id", { count: "exact", head: true }).eq("status", "active"),
  ]);

  const totalPages = Math.ceil((totalCount ?? 0) / PAGE_SIZE);

  return (
    <>
      <CreateAccountForm />
      <ManagerPortfolio
        accounts={accountStats}
        managers={(managers ?? []) as any[]}
        totalCount={totalCount ?? 0}
        page={page}
        totalPages={totalPages}
        typeFilter={typeFilter}
        statusFilter={statusFilter}
        search={search}
        summaryCounts={{
          total: totalAccounts.count ?? 0,
          demo: demoCount.count ?? 0,
          live: liveCount.count ?? 0,
          trial: trialCount.count ?? 0,
          testing: testingCount.count ?? 0,
          onboarding: onboardingCount.count ?? 0,
          active: activeCount.count ?? 0,
        }}
      />
    </>
  );
}

// ── Owners Tab ──────────────────────────────────────────

async function OwnersTab({ admin }: { admin: any }) {
  // Run owners + account counts in parallel
  const [{ data: owners }, { data: accounts }] = await Promise.all([
    admin.from("owner").select("id, name, email, phone, is_active, created_at").order("created_at", { ascending: false }),
    admin.from("account").select("owner_id"),  // Only fetches owner_id column, not full rows
  ]);

  const brandCounts: Record<number, number> = {};
  for (const a of accounts ?? []) {
    brandCounts[a.owner_id] = (brandCounts[a.owner_id] || 0) + 1;
  }

  const enriched = (owners ?? []).map((o: any) => ({
    ...o,
    brand_count: brandCounts[o.id] || 0,
  }));

  return <OwnerList owners={enriched} />;
}

// ── Sync Tab ────────────────────────────────────────────

async function SyncTab({ admin }: { admin: any }) {
  const { data: logs } = await admin
    .from("sync_request_log")
    .select("*")
    .order("request_at", { ascending: false })
    .limit(100);

  // Build account name map
  const accountIds = [...new Set((logs ?? []).map((l: any) => l.account_id))];
  const { data: accounts } = await admin
    .from("account")
    .select("account_id, businessname")
    .in("account_id", accountIds.length > 0 ? accountIds : ["__none__"]);

  const accountMap: Record<string, string> = {};
  for (const a of accounts ?? []) {
    accountMap[a.account_id] = a.businessname;
  }

  return <SyncMonitor logs={logs ?? []} accountMap={accountMap} />;
}

// ── Errors Tab ──────────────────────────────────────────

async function ErrorsTab({ admin }: { admin: any }) {
  const ErrorLogList = (await import("./error-logs/ErrorLogList")).default;

  const { data: errors, count } = await admin
    .from("error_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(0, 49);

  const [totalErrors, openCount, errorCount, warnCount, fatalCount] = await Promise.all([
    admin.from("error_logs").select("id", { count: "exact", head: true }),
    admin.from("error_logs").select("id", { count: "exact", head: true }).eq("status", "open"),
    admin.from("error_logs").select("id", { count: "exact", head: true }).eq("severity", "ERROR"),
    admin.from("error_logs").select("id", { count: "exact", head: true }).eq("severity", "WARN"),
    admin.from("error_logs").select("id", { count: "exact", head: true }).eq("severity", "FATAL"),
  ]);

  // Get unique tags (limit to recent 500 rows to avoid full table scan)
  const { data: tagRows } = await admin.from("error_logs").select("tag").order("created_at", { ascending: false }).limit(500);
  const uniqueTags = [...new Set((tagRows ?? []).map((r: any) => r.tag).filter(Boolean))].sort();

  return (
    <ErrorLogList
      errors={errors ?? []}
      totalCount={count ?? 0}
      page={1}
      totalPages={Math.ceil((count ?? 0) / 50)}
      severity="all"
      tag="all"
      status="all"
      search=""
      uniqueTags={uniqueTags as string[]}
      summaryCounts={{
        total: totalErrors.count ?? 0,
        open: openCount.count ?? 0,
        error: errorCount.count ?? 0,
        warn: warnCount.count ?? 0,
        fatal: fatalCount.count ?? 0,
      }}
    />
  );
}

// ── Tests Tab ───────────────────────────────────────────

async function TestsTab({ admin }: { admin: any }) {
  const { data: reports } = await admin
    .from("ci_report")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  return <TestResults ciReports={reports ?? []} />;
}
