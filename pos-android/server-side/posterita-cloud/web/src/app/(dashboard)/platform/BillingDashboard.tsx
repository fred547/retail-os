"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Loader2,
  TrendingUp,
  Users,
  CreditCard,
  Clock,
  AlertTriangle,
  XCircle,
  Search,
  ChevronDown,
  ExternalLink,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Gift,
  Ban,
  RefreshCw,
  Globe,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────────

interface BillingData {
  summary: {
    total: number;
    paid: number;
    trialing: number;
    pastDue: number;
    canceled: number;
    free: number;
  };
  mrr: {
    total: number;
    byPlan: Record<string, number>;
  };
  plans: {
    breakdown: Record<string, number>;
    regions: Record<string, number>;
  };
  trials: {
    active: number;
    breakdown: Record<string, number>;
    expiringSoon: Array<{
      account_id: string;
      businessname: string;
      trial_plan: string;
      trial_ends_at: string;
    }>;
    expiredNotConverted: Array<{
      account_id: string;
      businessname: string;
      trial_ends_at: string;
    }>;
    conversionRate: number;
    totalExpired30d: number;
    converted30d: number;
  };
  recentActivity: {
    newSubscriptions: number;
    cancellations: number;
    paymentFailures: number;
    upgrades: number;
    downgrades: number;
    trialGrants: number;
  };
  events: Array<{
    id: number;
    account_id: string;
    account_name: string;
    event_type: string;
    payload: any;
    created_at: string;
  }>;
  accounts: Array<{
    account_id: string;
    businessname: string;
    plan: string;
    billing_region: string;
    subscription_status: string;
    trial_plan: string | null;
    trial_ends_at: string | null;
    current_period_end: string | null;
    created_at: string;
    type: string;
    status: string;
    store_count: number;
    has_paddle: boolean;
    country_code: string | null;
    has_region_mismatch: boolean;
  }>;
  regionMismatches: {
    count: number;
    uniqueAccounts: number;
    alerts: Array<{
      account_id: string;
      account_name: string;
      account_country: string | null;
      account_region: string | null;
      paddle_country: string | null;
      paddle_region: string | null;
      source_event: string | null;
      detected_at: string;
    }>;
  };
  churn: {
    canceledLast30: Array<{ account_id: string; businessname: string }>;
    pastDue: Array<{
      account_id: string;
      businessname: string;
      current_period_end: string | null;
    }>;
    expiredWithoutConverting: Array<{
      account_id: string;
      businessname: string;
      trial_ends_at: string;
    }>;
  };
}

// ── Helpers ─────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function relativeDate(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

const PLAN_COLORS: Record<string, string> = {
  free: "bg-gray-100 text-gray-600",
  starter: "bg-blue-100 text-blue-700",
  growth: "bg-purple-100 text-purple-700",
  business: "bg-slate-800 text-white",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  trialing: "bg-blue-100 text-blue-700",
  past_due: "bg-amber-100 text-amber-700",
  canceled: "bg-red-100 text-red-700",
  none: "bg-gray-100 text-gray-500",
  paused: "bg-yellow-100 text-yellow-700",
};

const REGION_LABELS: Record<string, string> = {
  developing: "T1",
  emerging: "T2",
  developed: "T3",
};

const REGION_COLORS: Record<string, string> = {
  developing: "bg-green-100 text-green-700",
  emerging: "bg-blue-100 text-blue-700",
  developed: "bg-purple-100 text-purple-700",
};

const EVENT_CONFIG: Record<string, { label: string; color: string; dotColor: string }> = {
  "subscription.created": { label: "New subscription", color: "text-green-700", dotColor: "bg-green-500" },
  "subscription.canceled": { label: "Cancellation", color: "text-red-700", dotColor: "bg-red-500" },
  "subscription.updated": { label: "Plan change", color: "text-blue-700", dotColor: "bg-blue-500" },
  "transaction.payment_failed": { label: "Payment failed", color: "text-amber-700", dotColor: "bg-amber-500" },
  trial_grant: { label: "Trial granted", color: "text-blue-700", dotColor: "bg-blue-400" },
  trial_extend: { label: "Trial extended", color: "text-cyan-700", dotColor: "bg-cyan-400" },
  trial_revoke: { label: "Trial revoked", color: "text-red-700", dotColor: "bg-red-400" },
};

// ── Main Component ──────────────────────────────────────────────

export default function BillingDashboard() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/platform/billing-analytics");
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
      setError(null);
      setLastRefresh(new Date());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="animate-spin mr-2" size={16} />
        Loading billing analytics...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <AlertTriangle size={24} className="text-red-400" />
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Refresh bar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {lastRefresh
            ? `Updated ${lastRefresh.toLocaleTimeString()} (auto-refreshes every 60s)`
            : "Loading..."}
        </p>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {/* Row 1: Summary Cards */}
      <SummaryCards summary={data.summary} />

      {/* Row 2: MRR + Plan Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MrrCard mrr={data.mrr} />
        <PlanDistribution plans={data.plans} total={data.summary.total} />
      </div>

      {/* Row 3: Trial Health */}
      <TrialHealth trials={data.trials} />

      {/* Row 4: Recent Activity Feed */}
      <ActivityFeed
        activity={data.recentActivity}
        events={data.events}
      />

      {/* Row 5: Account Table */}
      <AccountTable accounts={data.accounts} />

      {/* Row 6: Region Mismatch Alerts */}
      {data.regionMismatches && data.regionMismatches.count > 0 && (
        <RegionAlerts mismatches={data.regionMismatches} />
      )}

      {/* Row 7: Churn & Risk */}
      <ChurnRisk churn={data.churn} />
    </div>
  );
}

// ── Row 1: Summary Cards ────────────────────────────────────────

function SummaryCards({ summary }: { summary: BillingData["summary"] }) {
  const total = summary.total || 1;
  const cards = [
    {
      label: "Total Accounts",
      value: summary.total,
      pct: 100,
      icon: Users,
      color: "text-slate-700",
      bg: "bg-white",
    },
    {
      label: "Paid Subscriptions",
      value: summary.paid,
      pct: Math.round((summary.paid / total) * 100),
      icon: CreditCard,
      color: "text-green-700",
      bg: "bg-green-50",
    },
    {
      label: "Active Trials",
      value: summary.trialing,
      pct: Math.round((summary.trialing / total) * 100),
      icon: Clock,
      color: "text-blue-700",
      bg: "bg-blue-50",
    },
    {
      label: "Past Due",
      value: summary.pastDue,
      pct: Math.round((summary.pastDue / total) * 100),
      icon: AlertTriangle,
      color: "text-amber-700",
      bg: "bg-amber-50",
    },
    {
      label: "Canceled",
      value: summary.canceled,
      pct: Math.round((summary.canceled / total) * 100),
      icon: XCircle,
      color: "text-red-700",
      bg: "bg-red-50",
    },
    {
      label: "Free Accounts",
      value: summary.free,
      pct: Math.round((summary.free / total) * 100),
      icon: Users,
      color: "text-gray-500",
      bg: "bg-gray-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            className={`${c.bg} rounded-xl border border-gray-200 shadow-sm p-4`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon size={14} className={c.color} />
              <span className="text-xs font-medium text-gray-500">{c.label}</span>
            </div>
            <div className="flex items-end gap-2">
              <span className={`text-2xl font-bold ${c.color}`}>{c.value}</span>
              <span className="text-[10px] text-gray-400 mb-1">{c.pct}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Row 2: MRR Card ─────────────────────────────────────────────

function MrrCard({ mrr }: { mrr: BillingData["mrr"] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign size={16} className="text-green-600" />
        <h3 className="text-sm font-semibold text-slate-800">Monthly Recurring Revenue</h3>
      </div>
      <div className="text-3xl font-bold text-green-700 mb-4">{formatCurrency(mrr.total)}</div>
      <div className="space-y-2">
        {Object.entries(mrr.byPlan)
          .filter(([, v]) => v > 0)
          .sort(([, a], [, b]) => b - a)
          .map(([plan, amount]) => (
            <div key={plan} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PLAN_COLORS[plan] || "bg-gray-100 text-gray-600"}`}
                >
                  {plan}
                </span>
              </div>
              <span className="text-sm font-medium text-gray-700">
                {formatCurrency(amount)}
              </span>
            </div>
          ))}
        {mrr.total === 0 && (
          <p className="text-xs text-gray-400">No active subscriptions yet</p>
        )}
      </div>
    </div>
  );
}

// ── Row 2: Plan Distribution ────────────────────────────────────

function PlanDistribution({
  plans,
  total,
}: {
  plans: BillingData["plans"];
  total: number;
}) {
  const planOrder = ["free", "starter", "growth", "business"];
  const barTotal = total || 1;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-slate-800 mb-4">Plan Distribution</h3>

      {/* Stacked bar */}
      <div className="flex rounded-full overflow-hidden h-6 mb-4">
        {planOrder.map((plan) => {
          const count = plans.breakdown[plan] || 0;
          const pct = (count / barTotal) * 100;
          if (pct === 0) return null;
          const colorMap: Record<string, string> = {
            free: "bg-gray-300",
            starter: "bg-blue-400",
            growth: "bg-purple-500",
            business: "bg-slate-700",
          };
          return (
            <div
              key={plan}
              className={`${colorMap[plan]} flex items-center justify-center`}
              style={{ width: `${pct}%` }}
              title={`${plan}: ${count} (${Math.round(pct)}%)`}
            >
              {pct > 8 && (
                <span className="text-[10px] text-white font-bold">{count}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        {planOrder.map((plan) => (
          <div key={plan} className="flex items-center gap-2">
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PLAN_COLORS[plan]}`}
            >
              {plan}
            </span>
            <span className="text-xs text-gray-500">{plans.breakdown[plan] || 0}</span>
          </div>
        ))}
      </div>

      {/* Region distribution */}
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        By Region
      </h4>
      <div className="flex gap-3">
        {Object.entries(plans.regions).map(([region, count]) => (
          <div key={region} className="flex items-center gap-1.5">
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${REGION_COLORS[region] || "bg-gray-100 text-gray-600"}`}
            >
              {REGION_LABELS[region] || region}
            </span>
            <span className="text-xs text-gray-500">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Row 3: Trial Health ─────────────────────────────────────────

function TrialHealth({ trials }: { trials: BillingData["trials"] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Gift size={16} className="text-blue-600" />
        <h3 className="text-sm font-semibold text-slate-800">Trial Health</h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        <div>
          <p className="text-2xl font-bold text-blue-700">{trials.active}</p>
          <p className="text-xs text-gray-500">Active trials</p>
          {Object.entries(trials.breakdown).map(([plan, cnt]) => (
            <span
              key={plan}
              className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mr-1 mt-1 ${PLAN_COLORS[plan] || "bg-gray-100 text-gray-600"}`}
            >
              {plan}: {cnt}
            </span>
          ))}
        </div>
        <div>
          <p className="text-2xl font-bold text-amber-600">{trials.expiringSoon.length}</p>
          <p className="text-xs text-gray-500">Expiring this week</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-red-600">
            {trials.expiredNotConverted.length}
          </p>
          <p className="text-xs text-gray-500">Lost (expired, no conversion)</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-green-600">{trials.conversionRate}%</p>
          <p className="text-xs text-gray-500">
            Conversion rate (30d)
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {trials.converted30d}/{trials.totalExpired30d} converted
          </p>
        </div>
      </div>

      {/* Expiring soon list */}
      {trials.expiringSoon.length > 0 && (
        <div className="border-t border-gray-100 pt-3">
          <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">
            Expiring This Week
          </h4>
          <div className="space-y-1.5">
            {trials.expiringSoon.map((t) => (
              <div
                key={t.account_id}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-gray-700 font-medium">{t.businessname}</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${PLAN_COLORS[t.trial_plan] || "bg-gray-100 text-gray-600"}`}
                  >
                    {t.trial_plan}
                  </span>
                  <span className="text-amber-600">
                    {daysUntil(t.trial_ends_at)}d left
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Row 4: Activity Feed ────────────────────────────────────────

function ActivityFeed({
  activity,
  events,
}: {
  activity: BillingData["recentActivity"];
  events: BillingData["events"];
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleEvents = expanded ? events : events.slice(0, 10);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Zap size={16} className="text-purple-600" />
        <h3 className="text-sm font-semibold text-slate-800">Recent Activity (30 days)</h3>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {activity.newSubscriptions > 0 && (
          <span className="flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-medium">
            <ArrowUpRight size={12} /> {activity.newSubscriptions} new
          </span>
        )}
        {activity.cancellations > 0 && (
          <span className="flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2.5 py-1 rounded-full font-medium">
            <Ban size={12} /> {activity.cancellations} canceled
          </span>
        )}
        {activity.paymentFailures > 0 && (
          <span className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-medium">
            <AlertTriangle size={12} /> {activity.paymentFailures} failed
          </span>
        )}
        {activity.upgrades > 0 && (
          <span className="flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full font-medium">
            <ArrowUpRight size={12} /> {activity.upgrades} upgraded
          </span>
        )}
        {activity.downgrades > 0 && (
          <span className="flex items-center gap-1 text-xs bg-orange-50 text-orange-700 px-2.5 py-1 rounded-full font-medium">
            <ArrowDownRight size={12} /> {activity.downgrades} downgraded
          </span>
        )}
        {activity.trialGrants > 0 && (
          <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
            <Gift size={12} /> {activity.trialGrants} trials
          </span>
        )}
      </div>

      {/* Event timeline */}
      {events.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">
          No billing events in the last 30 days
        </p>
      ) : (
        <div className="space-y-0">
          {visibleEvents.map((e) => {
            const config = EVENT_CONFIG[e.event_type] || {
              label: e.event_type,
              color: "text-gray-600",
              dotColor: "bg-gray-400",
            };
            return (
              <div
                key={e.id}
                className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0"
              >
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${config.dotColor}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${config.color}`}>
                      {config.label}
                    </span>
                    <span className="text-xs text-gray-500 truncate">
                      {e.account_name}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 whitespace-nowrap">
                  {relativeDate(e.created_at)}
                </span>
              </div>
            );
          })}

          {events.length > 10 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full text-center py-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              {expanded ? "Show less" : `Show all ${events.length} events`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Row 5: Account Table ────────────────────────────────────────

function AccountTable({ accounts }: { accounts: BillingData["accounts"] }) {
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"created_at" | "plan" | "status">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
  };

  const planOrder: Record<string, number> = { free: 0, starter: 1, growth: 2, business: 3 };

  const filtered = useMemo(() => {
    let list = accounts;

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          (a.businessname || "").toLowerCase().includes(q) ||
          a.account_id.toLowerCase().includes(q)
      );
    }

    if (planFilter !== "all") {
      list = list.filter((a) => a.plan === planFilter);
    }

    if (statusFilter !== "all") {
      list = list.filter((a) => {
        if (statusFilter === "free") {
          return (
            (a.plan === "free" || !a.plan) &&
            (a.subscription_status === "none" || !a.subscription_status) &&
            !a.trial_plan
          );
        }
        if (statusFilter === "trialing") {
          return a.trial_plan && a.trial_ends_at && new Date(a.trial_ends_at) > new Date();
        }
        return a.subscription_status === statusFilter;
      });
    }

    // Sort
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "created_at") {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === "plan") {
        cmp = (planOrder[a.plan] ?? 0) - (planOrder[b.plan] ?? 0);
      } else if (sortBy === "status") {
        cmp = (a.subscription_status || "").localeCompare(b.subscription_status || "");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [accounts, search, planFilter, statusFilter, sortBy, sortDir]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [search, planFilter, statusFilter]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-slate-700" />
          <h3 className="text-sm font-semibold text-slate-800">All Accounts</h3>
          <span className="text-xs text-gray-400">{filtered.length} accounts</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search business name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-600"
          >
            <option value="all">All plans</option>
            <option value="free">Free</option>
            <option value="starter">Starter</option>
            <option value="growth">Growth</option>
            <option value="business">Business</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-600"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="trialing">Trialing</option>
            <option value="past_due">Past due</option>
            <option value="canceled">Canceled</option>
            <option value="free">Free</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">
                Business Name
              </th>
              <th
                className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700"
                onClick={() => toggleSort("plan")}
              >
                Plan {sortBy === "plan" && (sortDir === "asc" ? "\u2191" : "\u2193")}
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">
                Region
              </th>
              <th
                className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700"
                onClick={() => toggleSort("status")}
              >
                Status {sortBy === "status" && (sortDir === "asc" ? "\u2191" : "\u2193")}
              </th>
              <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">
                Stores
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">
                Trial
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">
                Period End
              </th>
              <th
                className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700"
                onClick={() => toggleSort("created_at")}
              >
                Created {sortBy === "created_at" && (sortDir === "asc" ? "\u2191" : "\u2193")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paged.map((a) => {
              const hasActiveTrial =
                a.trial_plan &&
                a.trial_ends_at &&
                new Date(a.trial_ends_at) > new Date();

              return (
                <tr key={a.account_id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-gray-800 truncate max-w-[200px]">
                      {a.businessname || a.account_id}
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono truncate">
                      {a.account_id}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PLAN_COLORS[a.plan]}`}
                    >
                      {a.plan}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${REGION_COLORS[a.billing_region] || "bg-gray-100 text-gray-600"}`}
                    >
                      {REGION_LABELS[a.billing_region] || a.billing_region}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[a.subscription_status] || "bg-gray-100 text-gray-500"}`}
                    >
                      {a.subscription_status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center text-xs text-gray-600">
                    {a.store_count}
                  </td>
                  <td className="px-4 py-2.5">
                    {hasActiveTrial ? (
                      <span className="text-[10px] text-blue-600 font-medium whitespace-nowrap">
                        {a.trial_plan} until{" "}
                        {new Date(a.trial_ends_at!).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {a.current_period_end ? (
                      <span className="text-[10px] text-gray-600 whitespace-nowrap">
                        {new Date(a.current_period_end).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-[10px] text-gray-500 whitespace-nowrap">
                      {relativeDate(a.created_at)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <span className="text-xs text-gray-400">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-3 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            >
              Prev
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Row 6: Region Mismatch Alerts ────────────────────────────────

function RegionAlerts({ mismatches }: { mismatches: BillingData["regionMismatches"] }) {
  return (
    <div className="bg-white rounded-xl border border-orange-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        <Globe size={14} className="text-orange-500" />
        <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
          Region Mismatch Alerts (30d)
        </h4>
        <span className="ml-auto text-xs font-bold text-orange-600">
          {mismatches.uniqueAccounts} account{mismatches.uniqueAccounts !== 1 ? "s" : ""}
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Accounts where the Paddle payment country differs from the registered billing region.
        This may indicate region arbitrage or legitimate travel/corporate cards.
      </p>
      <div className="space-y-2">
        {mismatches.alerts.slice(0, 10).map((a, i) => (
          <div
            key={`${a.account_id}-${i}`}
            className="flex items-center justify-between text-xs bg-orange-50 rounded-lg px-3 py-2"
          >
            <div>
              <span className="font-medium text-gray-800">{a.account_name}</span>
              <span className="text-gray-400 ml-1.5">
                registered: {a.account_country || "?"} ({a.account_region})
              </span>
            </div>
            <div className="text-orange-600 whitespace-nowrap">
              paid from: {a.paddle_country || "?"} ({a.paddle_region})
            </div>
          </div>
        ))}
        {mismatches.alerts.length > 10 && (
          <p className="text-xs text-gray-400 text-center">
            +{mismatches.alerts.length - 10} more
          </p>
        )}
      </div>
    </div>
  );
}

// ── Row 7: Churn & Risk ─────────────────────────────────────────

function ChurnRisk({ churn }: { churn: BillingData["churn"] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Canceled last 30 days */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <XCircle size={14} className="text-red-500" />
          <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
            Canceled (30d)
          </h4>
          <span className="ml-auto text-xs font-bold text-red-600">
            {churn.canceledLast30.length}
          </span>
        </div>
        {churn.canceledLast30.length === 0 ? (
          <p className="text-xs text-gray-400">No cancellations</p>
        ) : (
          <div className="space-y-1.5">
            {churn.canceledLast30.map((a) => (
              <div key={a.account_id} className="text-xs text-gray-700">
                {a.businessname}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past due */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={14} className="text-amber-500" />
          <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
            Past Due
          </h4>
          <span className="ml-auto text-xs font-bold text-amber-600">
            {churn.pastDue.length}
          </span>
        </div>
        {churn.pastDue.length === 0 ? (
          <p className="text-xs text-gray-400">No past due accounts</p>
        ) : (
          <div className="space-y-1.5">
            {churn.pastDue.map((a) => (
              <div
                key={a.account_id}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-gray-700">{a.businessname}</span>
                {a.current_period_end && (
                  <span className="text-amber-600 whitespace-nowrap">
                    {daysSince(a.current_period_end)}d overdue
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trial expired without converting */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={14} className="text-red-400" />
          <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
            Trial Expired (no conversion)
          </h4>
          <span className="ml-auto text-xs font-bold text-red-500">
            {churn.expiredWithoutConverting.length}
          </span>
        </div>
        {churn.expiredWithoutConverting.length === 0 ? (
          <p className="text-xs text-gray-400">No expired trials</p>
        ) : (
          <div className="space-y-1.5">
            {churn.expiredWithoutConverting.map((a) => (
              <div
                key={a.account_id}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-gray-700">{a.businessname}</span>
                <span className="text-red-500 whitespace-nowrap">
                  expired {daysSince(a.trial_ends_at)}d ago
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
