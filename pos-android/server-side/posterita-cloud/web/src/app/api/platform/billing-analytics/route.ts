import { NextResponse } from "next/server";
import { isAccountManager } from "@/lib/super-admin";
import { getDb } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Pricing per plan per billing region (monthly USD)
const PLAN_PRICES: Record<string, Record<string, number>> = {
  developing: { starter: 7, growth: 19, business: 39 },
  emerging: { starter: 12, growth: 29, business: 59 },
  developed: { starter: 19, growth: 49, business: 99 },
};

async function logToErrorDb(message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: "system",
      severity: "ERROR",
      tag: "BILLING_ANALYTICS",
      message,
      stack_trace: stackTrace ?? null,
      device_info: "web-api",
      app_version: "web",
    });
  } catch (_) {
    /* swallow */
  }
}

/**
 * GET /api/platform/billing-analytics
 * Returns comprehensive billing analytics for the platform admin dashboard.
 */
export async function GET() {
  try {
    const isManager = await isAccountManager();
    if (!isManager) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = getDb();
    const now = new Date().toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // ── Parallel queries ────────────────────────────────────────

    const [
      // Summary counts
      totalResult,
      paidResult,
      trialingResult,
      pastDueResult,
      canceledResult,
      // All accounts with billing info
      allAccountsResult,
      // Store counts per account
      storeCountsResult,
      // Billing events (last 30 days)
      billingEventsResult,
      // Active trials (trial_plan not null and trial_ends_at > now)
      activeTrialsResult,
      // Trials expiring within 7 days
      trialsExpiringSoonResult,
      // Trials expired in last 30 days
      trialsExpiredRecentResult,
      // Region mismatch events (last 30 days)
      regionMismatchResult,
    ] = await Promise.all([
      db.from("account").select("account_id", { count: "exact", head: true }),
      db.from("account").select("account_id", { count: "exact", head: true }).eq("subscription_status", "active"),
      db.from("account").select("account_id", { count: "exact", head: true }).eq("subscription_status", "trialing"),
      db.from("account").select("account_id", { count: "exact", head: true }).eq("subscription_status", "past_due"),
      db.from("account").select("account_id", { count: "exact", head: true }).eq("subscription_status", "canceled"),
      db.from("account").select(
        "account_id, businessname, plan, billing_region, subscription_status, trial_plan, trial_ends_at, current_period_end, created_at, type, status, paddle_subscription_id, country_code"
      ).order("created_at", { ascending: false }),
      db.from("store").select("account_id"),
      db.from("billing_event").select("*").gte("created_at", thirtyDaysAgo).order("created_at", { ascending: false }),
      db.from("account").select("account_id, trial_plan, trial_ends_at").not("trial_plan", "is", null).gt("trial_ends_at", now),
      db.from("account").select("account_id, trial_plan, trial_ends_at, businessname").not("trial_plan", "is", null).gt("trial_ends_at", now).lte("trial_ends_at", sevenDaysFromNow),
      db.from("account").select("account_id, trial_plan, trial_ends_at, businessname, plan, subscription_status").not("trial_ends_at", "is", null).lt("trial_ends_at", now).gt("trial_ends_at", thirtyDaysAgo),
      db.from("billing_event").select("account_id, payload, created_at").eq("event_type", "region_mismatch_detected").gte("created_at", thirtyDaysAgo).order("created_at", { ascending: false }),
    ]);

    const accounts = allAccountsResult.data ?? [];
    const storeRows = storeCountsResult.data ?? [];
    const billingEvents = billingEventsResult.data ?? [];
    const activeTrials = activeTrialsResult.data ?? [];
    const trialsExpiringSoon = trialsExpiringSoonResult.data ?? [];
    const trialsExpiredRecent = trialsExpiredRecentResult.data ?? [];
    const regionMismatches = regionMismatchResult.data ?? [];

    // ── Store count map ─────────────────────────────────────────

    const storeCountMap: Record<string, number> = {};
    for (const row of storeRows) {
      storeCountMap[row.account_id] = (storeCountMap[row.account_id] || 0) + 1;
    }

    // ── Free accounts: plan=free, subscription_status=none, no active trial ──

    const freeCount = accounts.filter(
      (a: any) =>
        (a.plan === "free" || !a.plan) &&
        (a.subscription_status === "none" || !a.subscription_status) &&
        !activeTrials.some((t: any) => t.account_id === a.account_id)
    ).length;

    // ── Plan breakdown ──────────────────────────────────────────

    const planBreakdown: Record<string, number> = { free: 0, starter: 0, growth: 0, business: 0 };
    const regionBreakdown: Record<string, number> = { developing: 0, emerging: 0, developed: 0 };

    for (const a of accounts) {
      const plan = a.plan || "free";
      if (plan in planBreakdown) planBreakdown[plan]++;
      const region = a.billing_region || "developing";
      if (region in regionBreakdown) regionBreakdown[region]++;
    }

    // ── MRR calculation ─────────────────────────────────────────

    let totalMrr = 0;
    const mrrByPlan: Record<string, number> = { starter: 0, growth: 0, business: 0 };

    for (const a of accounts) {
      if (a.subscription_status !== "active") continue;
      const plan = a.plan || "free";
      if (plan === "free") continue;
      const region = a.billing_region || "developing";
      const basePrice = PLAN_PRICES[region]?.[plan] ?? 0;
      // Base subscription
      totalMrr += basePrice;
      mrrByPlan[plan] = (mrrByPlan[plan] || 0) + basePrice;
      // Store add-on: extra stores beyond the first
      const storeCount = storeCountMap[a.account_id] || 0;
      if (storeCount > 1) {
        const addOn = (storeCount - 1) * basePrice;
        totalMrr += addOn;
        mrrByPlan[plan] = (mrrByPlan[plan] || 0) + addOn;
      }
    }

    // ── Trial metrics ───────────────────────────────────────────

    const trialBreakdown: Record<string, number> = {};
    for (const t of activeTrials) {
      const tp = t.trial_plan || "unknown";
      trialBreakdown[tp] = (trialBreakdown[tp] || 0) + 1;
    }

    // Trial conversion: expired trials that became paid
    const expiredTrialConverted = trialsExpiredRecent.filter(
      (a: any) => a.subscription_status === "active" && a.plan !== "free"
    ).length;
    const expiredTrialNotConverted = trialsExpiredRecent.filter(
      (a: any) =>
        (a.plan === "free" || !a.plan) &&
        (a.subscription_status === "none" || !a.subscription_status)
    );
    const totalExpiredTrials = trialsExpiredRecent.length;
    const conversionRate =
      totalExpiredTrials > 0
        ? Math.round((expiredTrialConverted / totalExpiredTrials) * 100)
        : 0;

    // ── Recent activity (billing events) ────────────────────────

    // Map account IDs to names
    const accountNameMap: Record<string, string> = {};
    for (const a of accounts) {
      accountNameMap[a.account_id] = a.businessname || a.account_id;
    }

    const recentActivity = {
      newSubscriptions: billingEvents.filter((e: any) => e.event_type === "subscription.created"),
      cancellations: billingEvents.filter((e: any) => e.event_type === "subscription.canceled"),
      paymentFailures: billingEvents.filter((e: any) => e.event_type === "transaction.payment_failed"),
      upgrades: billingEvents.filter((e: any) => {
        if (e.event_type !== "subscription.updated") return false;
        try {
          const p = typeof e.payload === "string" ? JSON.parse(e.payload) : e.payload;
          return p?.direction === "upgrade";
        } catch {
          return false;
        }
      }),
      downgrades: billingEvents.filter((e: any) => {
        if (e.event_type !== "subscription.updated") return false;
        try {
          const p = typeof e.payload === "string" ? JSON.parse(e.payload) : e.payload;
          return p?.direction === "downgrade";
        } catch {
          return false;
        }
      }),
      trialGrants: billingEvents.filter((e: any) => e.event_type === "trial_grant"),
    };

    // ── Churn indicators ────────────────────────────────────────

    const canceledLast30 = accounts.filter((a: any) => {
      if (a.subscription_status !== "canceled") return false;
      // Check if there is a cancel event in last 30 days
      return billingEvents.some(
        (e: any) => e.account_id === a.account_id && e.event_type === "subscription.canceled"
      );
    });

    const pastDueAccounts = accounts.filter((a: any) => a.subscription_status === "past_due");

    // ── Account list with store counts ──────────────────────────

    // ── Region mismatch summary ─────────────────────────────────

    const mismatchAccountIds = new Set(regionMismatches.map((m: any) => m.account_id));
    const regionMismatchAlerts = regionMismatches.map((m: any) => {
      const p = typeof m.payload === "string" ? JSON.parse(m.payload) : m.payload;
      return {
        account_id: m.account_id,
        account_name: accountNameMap[m.account_id] || m.account_id,
        account_country: p?.account_country,
        account_region: p?.account_region,
        paddle_country: p?.paddle_country,
        paddle_region: p?.paddle_region,
        source_event: p?.source_event,
        detected_at: m.created_at,
      };
    });

    const accountList = accounts.map((a: any) => ({
      account_id: a.account_id,
      businessname: a.businessname,
      plan: a.plan || "free",
      billing_region: a.billing_region || "developing",
      subscription_status: a.subscription_status || "none",
      trial_plan: a.trial_plan,
      trial_ends_at: a.trial_ends_at,
      current_period_end: a.current_period_end,
      created_at: a.created_at,
      type: a.type,
      status: a.status,
      store_count: storeCountMap[a.account_id] || 0,
      has_paddle: !!a.paddle_subscription_id,
      country_code: a.country_code || null,
      has_region_mismatch: mismatchAccountIds.has(a.account_id),
    }));

    // ── Enriched billing events with account names ──────────────

    const enrichedEvents = billingEvents.slice(0, 50).map((e: any) => ({
      id: e.id,
      account_id: e.account_id,
      account_name: accountNameMap[e.account_id] || e.account_id,
      event_type: e.event_type,
      payload: e.payload,
      created_at: e.created_at,
    }));

    return NextResponse.json({
      summary: {
        total: totalResult.count ?? 0,
        paid: paidResult.count ?? 0,
        trialing: trialingResult.count ?? 0,
        pastDue: pastDueResult.count ?? 0,
        canceled: canceledResult.count ?? 0,
        free: freeCount,
      },
      mrr: {
        total: totalMrr,
        byPlan: mrrByPlan,
      },
      plans: {
        breakdown: planBreakdown,
        regions: regionBreakdown,
      },
      trials: {
        active: activeTrials.length,
        breakdown: trialBreakdown,
        expiringSoon: trialsExpiringSoon.map((t: any) => ({
          account_id: t.account_id,
          businessname: t.businessname || t.account_id,
          trial_plan: t.trial_plan,
          trial_ends_at: t.trial_ends_at,
        })),
        expiredNotConverted: expiredTrialNotConverted.map((a: any) => ({
          account_id: a.account_id,
          businessname: a.businessname || a.account_id,
          trial_ends_at: a.trial_ends_at,
        })),
        conversionRate,
        totalExpired30d: totalExpiredTrials,
        converted30d: expiredTrialConverted,
      },
      recentActivity: {
        newSubscriptions: recentActivity.newSubscriptions.length,
        cancellations: recentActivity.cancellations.length,
        paymentFailures: recentActivity.paymentFailures.length,
        upgrades: recentActivity.upgrades.length,
        downgrades: recentActivity.downgrades.length,
        trialGrants: recentActivity.trialGrants.length,
      },
      events: enrichedEvents,
      accounts: accountList,
      churn: {
        canceledLast30: canceledLast30.map((a: any) => ({
          account_id: a.account_id,
          businessname: a.businessname || a.account_id,
        })),
        pastDue: pastDueAccounts.map((a: any) => ({
          account_id: a.account_id,
          businessname: a.businessname || a.account_id,
          current_period_end: a.current_period_end,
        })),
        expiredWithoutConverting: expiredTrialNotConverted.map((a: any) => ({
          account_id: a.account_id,
          businessname: a.businessname || a.account_id,
          trial_ends_at: a.trial_ends_at,
        })),
      },
      regionMismatches: {
        count: regionMismatchAlerts.length,
        uniqueAccounts: mismatchAccountIds.size,
        alerts: regionMismatchAlerts,
      },
    });
  } catch (e: any) {
    await logToErrorDb(`Billing analytics failed: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Failed to load billing analytics" }, { status: 500 });
  }
}
