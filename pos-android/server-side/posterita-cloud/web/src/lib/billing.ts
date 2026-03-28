/**
 * Billing configuration — plan limits, regional pricing, feature gating.
 * Used by API routes and the billing page.
 *
 * PRIMARY source: plan_constraint table in Supabase (DB-driven).
 * FALLBACK: hardcoded constants below (in case DB is unreachable).
 */

import { getDb } from "@/lib/supabase/admin";

// ─── Plan Types ─────────────────────────────────────────────────
export type Plan = "free" | "starter" | "growth" | "business";
export type BillingRegion = "developing" | "emerging" | "developed";
export type SubscriptionStatus = "none" | "trialing" | "active" | "past_due" | "paused" | "canceled";

export const PLANS: Plan[] = ["free", "starter", "growth", "business"];

// ─── Fallback Constants (used only when DB unreachable) ─────────
const FALLBACK_PLAN_LIMITS: Record<Plan, { users: number; terminals: number }> = {
  free:     { users: 1,  terminals: 1  },
  starter:  { users: 3,  terminals: 2  },
  growth:   { users: 8,  terminals: 5  },
  business: { users: 20, terminals: 15 },
};

const FALLBACK_RETENTION: Record<Plan, number> = {
  free: 90,
  starter: 365,
  growth: 1095,
  business: 1825,
};

// ─── DB-Driven Constraint System ──────────────────────────────
let constraintCache: { data: Record<string, Record<string, string>>; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Loads all plan constraints from the DB, grouped by plan.
 * Caches for 5 minutes. Returns { plan: { key: value } }.
 */
export async function getPlanConstraints(): Promise<Record<string, Record<string, string>>> {
  if (constraintCache && Date.now() - constraintCache.ts < CACHE_TTL) {
    return constraintCache.data;
  }
  try {
    const { data, error } = await getDb()
      .from("plan_constraint")
      .select("plan, constraint_key, constraint_value");
    if (error || !data) {
      console.warn("[billing] Failed to load plan_constraint:", error?.message);
      return buildFallbackConstraints();
    }
    const map: Record<string, Record<string, string>> = {};
    for (const row of data) {
      if (!map[row.plan]) map[row.plan] = {};
      map[row.plan][row.constraint_key] = row.constraint_value;
    }
    constraintCache = { data: map, ts: Date.now() };
    return map;
  } catch (e) {
    console.warn("[billing] plan_constraint fetch error:", e);
    return buildFallbackConstraints();
  }
}

function buildFallbackConstraints(): Record<string, Record<string, string>> {
  const map: Record<string, Record<string, string>> = {};
  for (const plan of PLANS) {
    map[plan] = {
      max_users: String(FALLBACK_PLAN_LIMITS[plan].users),
      max_terminals: String(FALLBACK_PLAN_LIMITS[plan].terminals),
      retention_days: String(FALLBACK_RETENTION[plan]),
    };
  }
  return map;
}

/**
 * Returns a single constraint value for a plan + key.
 */
export async function getConstraint(plan: string, key: string): Promise<string | null> {
  const constraints = await getPlanConstraints();
  return constraints[plan]?.[key] ?? null;
}

/**
 * Checks whether a plan has access to a specific feature.
 * Feature key format: just the name (e.g., "loyalty") — "feature_" prefix is added automatically.
 */
export async function canAccessFeatureDb(plan: string, feature: string): Promise<boolean> {
  const key = feature.startsWith("feature_") ? feature : `feature_${feature}`;
  const val = await getConstraint(plan, key);
  return val === "true";
}

/**
 * Returns a numeric plan limit (e.g., max_users, max_terminals).
 */
export async function getPlanLimit(plan: string, key: string): Promise<number> {
  const val = await getConstraint(plan, key);
  return val ? parseInt(val, 10) : 0;
}

/**
 * Returns the retention period in days for a plan.
 */
export async function getRetentionDays(plan: string): Promise<number> {
  const val = await getConstraint(plan, "retention_days");
  if (val) return parseInt(val, 10);
  return FALLBACK_RETENTION[(plan as Plan)] ?? 90;
}

/**
 * Resolves the effective plan for an account, considering trials and subscriptions.
 * Active trial takes precedence over subscription.
 */
export async function getEffectivePlan(accountId: string): Promise<{
  plan: string;
  isTrial: boolean;
  trialEndsAt: string | null;
}> {
  try {
    const { data, error } = await getDb()
      .from("account")
      .select("plan, subscription_status, current_period_end, trial_plan, trial_ends_at")
      .eq("account_id", accountId)
      .single();

    if (error || !data) return { plan: "free", isTrial: false, trialEndsAt: null };

    // Active trial takes precedence
    if (data.trial_plan && data.trial_ends_at && new Date(data.trial_ends_at) > new Date()) {
      return { plan: data.trial_plan, isTrial: true, trialEndsAt: data.trial_ends_at };
    }

    // Active or past_due subscription
    if (["active", "past_due", "trialing"].includes(data.subscription_status)) {
      return { plan: data.plan ?? "free", isTrial: false, trialEndsAt: null };
    }

    // Canceled but period not over
    if (data.subscription_status === "canceled" && data.current_period_end && new Date(data.current_period_end) > new Date()) {
      return { plan: data.plan ?? "free", isTrial: false, trialEndsAt: null };
    }

    return { plan: "free", isTrial: false, trialEndsAt: null };
  } catch (e) {
    console.warn("[billing] getEffectivePlan error:", e);
    return { plan: "free", isTrial: false, trialEndsAt: null };
  }
}

// ─── Convenience wrapper for synchronous callers (fallback only) ─
/**
 * Returns the per-store user/terminal limits for a plan.
 * Prefers DB constraints, falls back to hardcoded.
 */
export function getPlanLimits(plan: Plan, _storeCount?: number): { users: number; terminals: number } {
  return FALLBACK_PLAN_LIMITS[plan] ?? FALLBACK_PLAN_LIMITS.free;
}

// ─── Regional Pricing (USD/month) ──────────────────────────────
export interface RegionalPricing {
  starter: number;
  growth: number;
  business: number;
  storeAddon: Record<Plan, number>;
}

export const REGIONAL_PRICING: Record<BillingRegion, RegionalPricing> = {
  developing: {
    starter: 7, growth: 19, business: 39,
    storeAddon: { free: 1, starter: 7, growth: 19, business: 39 },
  },
  emerging: {
    starter: 12, growth: 29, business: 59,
    storeAddon: { free: 2, starter: 12, growth: 29, business: 59 },
  },
  developed: {
    starter: 19, growth: 49, business: 99,
    storeAddon: { free: 3, starter: 19, growth: 49, business: 99 },
  },
};

// ─── Legacy Feature Gating (kept for backward compat) ──────────
export type Feature =
  | "basic_pos" | "offline" | "receipt" | "barcode" | "till"
  | "categories" | "basic_inventory" | "basic_loyalty" | "kitchen_printing"
  // Starter
  | "multi_user" | "customers" | "full_inventory" | "shifts"
  | "modifiers" | "csv_export"
  // Growth
  | "loyalty_advanced" | "promotions" | "restaurant" | "kds"
  | "stations" | "menus" | "ai_import" | "suppliers"
  | "purchase_orders" | "quotations" | "pdf_catalogue" | "tags"
  | "analytics" | "delivery"
  // Business
  | "serialized_items" | "warehouse" | "xero" | "webhooks"
  | "tower_control" | "staff_scheduling" | "staff_leave" | "qr_actions";

const FREE_FEATURES: Feature[] = [
  "basic_pos", "offline", "receipt", "barcode", "till",
  "categories", "basic_inventory", "basic_loyalty", "kitchen_printing",
];

const STARTER_FEATURES: Feature[] = [
  ...FREE_FEATURES,
  "multi_user", "customers", "full_inventory", "shifts",
  "modifiers", "csv_export",
];

const GROWTH_FEATURES: Feature[] = [
  ...STARTER_FEATURES,
  "loyalty_advanced", "promotions", "restaurant", "kds",
  "stations", "menus", "ai_import", "suppliers",
  "purchase_orders", "quotations", "pdf_catalogue", "tags",
  "analytics", "delivery",
];

const BUSINESS_FEATURES: Feature[] = [
  ...GROWTH_FEATURES,
  "serialized_items", "warehouse", "xero", "webhooks",
  "tower_control", "staff_scheduling", "staff_leave", "qr_actions",
];

export const PLAN_FEATURES: Record<Plan, Feature[]> = {
  free: FREE_FEATURES,
  starter: STARTER_FEATURES,
  growth: GROWTH_FEATURES,
  business: BUSINESS_FEATURES,
};

/**
 * Synchronous feature check (fallback). Use canAccessFeatureDb() for DB-driven checks.
 */
export function canAccessFeature(plan: Plan, feature: Feature): boolean {
  const features = PLAN_FEATURES[plan] ?? PLAN_FEATURES.free;
  return features.includes(feature);
}

/**
 * Fetches the current account's billing state from Supabase.
 */
export async function getAccountPlan(accountId: string): Promise<{
  plan: Plan;
  region: BillingRegion;
  status: SubscriptionStatus;
  limits: { users: number; terminals: number };
  paddle_customer_id: string | null;
  paddle_subscription_id: string | null;
  current_period_end: string | null;
}> {
  const { data, error } = await getDb()
    .from("account")
    .select("plan, billing_region, subscription_status, paddle_customer_id, paddle_subscription_id, current_period_end")
    .eq("account_id", accountId)
    .single();

  if (error || !data) {
    return {
      plan: "free",
      region: "developing",
      status: "none",
      limits: FALLBACK_PLAN_LIMITS.free,
      paddle_customer_id: null,
      paddle_subscription_id: null,
      current_period_end: null,
    };
  }

  const plan = (data.plan as Plan) || "free";
  const region = (data.billing_region as BillingRegion) || "developing";
  const status = (data.subscription_status as SubscriptionStatus) || "none";

  return {
    plan,
    region,
    status,
    limits: getPlanLimits(plan),
    paddle_customer_id: data.paddle_customer_id,
    paddle_subscription_id: data.paddle_subscription_id,
    current_period_end: data.current_period_end,
  };
}

// ─── Paddle Product IDs ───────────────────────────────────────
export const PADDLE_PRODUCT_IDS = {
  starter:          "pro_01kmv731cq38mpatzs2rkp7768",
  growth:           "pro_01kmv7373p2tjc3rn2tee6faex",
  business:         "pro_01kmv73cdarh5w74cdmkjbappg",
  store_free:       "pro_01kmv73km712ztcdqd8rc5f2sc",
  store_starter:    "pro_01kmv73yf939ny8058z3dtzwbf",
  store_growth:     "pro_01kmv743n892w22za4yas689by",
  store_business:   "pro_01kmv748v212fxqvx7xcvwq6a6",
} as const;

// ─── Paddle Price IDs ─────────────────────────────────────────
export const PADDLE_PRICE_IDS = {
  // Base plans
  starter_developing:   "pri_01kmv74xhd0dchmfh9d7yy2p1k",  // $7/mo
  starter_emerging:     "pri_01kmv753at0gjvzrwyfzqnp21g",  // $12/mo
  starter_developed:    "pri_01kmv759adp43smtp4jd1r6mwy",  // $19/mo
  growth_developing:    "pri_01kmv75f1mrjnps4n5z2sqhds2",  // $19/mo
  growth_emerging:      "pri_01kmv75me09wbh0rex18n743n9",  // $29/mo
  growth_developed:     "pri_01kmv75tf71fk5d33c1tagj7cz",  // $49/mo
  business_developing:  "pri_01kmv760teprtgm9t7daneppdr",  // $39/mo
  business_emerging:    "pri_01kmv7674mzrts6vxgk1m5sc7a",  // $59/mo
  business_developed:   "pri_01kmv76ctmd851kqsgney9g1pz",  // $99/mo

  // Store add-ons
  store_free_developing:     "pri_01kmv76kbm75m07rsm2p8a01z8",  // $1/mo
  store_free_emerging:       "pri_01kmv76tfdxm5twnf8ret7cdz3",  // $2/mo
  store_free_developed:      "pri_01kmv76zj7q7bz27tza12654fz",  // $3/mo
  store_starter_developing:  "pri_01kmv775j5dmztr3p0akh7h8kv",  // $7/mo
  store_starter_emerging:    "pri_01kmv77b98pc5gyj46z98dy82e",  // $12/mo
  store_starter_developed:   "pri_01kmv77gjgzhjx428av1w8gte8",  // $19/mo
  store_growth_developing:   "pri_01kmv77pf2prx2h88eqmxq4fxf",  // $19/mo
  store_growth_emerging:     "pri_01kmv77vmmhvs5mza2zzdnz0pg",  // $29/mo
  store_growth_developed:    "pri_01kmv7810v4j327553bfj87hnx",  // $49/mo
  store_business_developing: "pri_01kmv788f5st1h2bpr7cnce1a4",  // $39/mo
  store_business_emerging:   "pri_01kmv78dsy20mp327nbgxht714",  // $59/mo
  store_business_developed:  "pri_01kmv78k2q3eja1yewwt8tbw53",  // $99/mo

} as const;

/**
 * Maps plan + region to a Paddle price ID for base plan subscriptions.
 */
export function getPaddlePriceId(plan: Plan, region: BillingRegion): string | null {
  if (plan === "free") return null;
  const key = `${plan}_${region}` as keyof typeof PADDLE_PRICE_IDS;
  return PADDLE_PRICE_IDS[key] ?? null;
}

/**
 * Maps store add-on plan + region to a Paddle price ID.
 */
export function getStoreAddonPriceId(plan: Plan, region: BillingRegion): string {
  const key = `store_${plan}_${region}` as keyof typeof PADDLE_PRICE_IDS;
  return PADDLE_PRICE_IDS[key];
}

// ─── Cache invalidation (for tests) ───────────────────────────
export function _clearConstraintCache() {
  constraintCache = null;
}
