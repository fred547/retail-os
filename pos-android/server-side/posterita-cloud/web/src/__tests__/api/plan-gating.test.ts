import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for plan gating system:
 * - getEffectivePlan (trial vs subscription vs free)
 * - Constraint loading and caching
 * - Feature access checks
 * - Retention calculation
 * - Trial grant/extend/revoke API logic
 */

// ─── Supabase mock ─────────────────────────────────────────────

let tableResults: Record<string, { data: any; error: any }> = {};

function createChain(table: string) {
  const state = {
    table,
    filters: {} as Record<string, any>,
  };

  const resolve = () => {
    const key = Object.keys(state.filters).length > 0
      ? `${table}:${Object.entries(state.filters).map(([k, v]) => `${k}=${v}`).join(",")}`
      : table;
    return tableResults[key] ?? tableResults[table] ?? { data: null, error: null };
  };

  const chain: any = {
    select: () => chain,
    insert: () => chain,
    update: () => chain,
    upsert: () => chain,
    delete: () => chain,
    eq: (col: string, val: any) => { state.filters[col] = val; return chain; },
    neq: () => chain,
    single: () => resolve(),
    maybeSingle: () => resolve(),
    order: () => chain,
    limit: () => chain,
    then: (fn: any) => Promise.resolve(resolve()).then(fn),
  };
  return chain;
}

const mockDb = { from: (table: string) => createChain(table) };

vi.mock("@/lib/supabase/admin", () => ({
  getDb: () => mockDb,
}));

// Import after mock setup
import {
  getEffectivePlan,
  getPlanConstraints,
  getConstraint,
  canAccessFeatureDb,
  canAccessFeature,
  getPlanLimits,
  getPlanLimit,
  getRetentionDays,
  getAccountPlan,
  _clearConstraintCache,
} from "@/lib/billing";

// ─── Tests ──────────────────────────────────────────────────────

describe("Plan Gating", () => {
  beforeEach(() => {
    tableResults = {};
    _clearConstraintCache();
  });

  // ── getEffectivePlan ──────────────────────────────────────

  describe("getEffectivePlan", () => {
    it("returns free for missing account", async () => {
      tableResults["account"] = { data: null, error: { message: "Not found" } };
      const result = await getEffectivePlan("missing_id");
      expect(result).toEqual({ plan: "free", isTrial: false, trialEndsAt: null });
    });

    it("returns active trial when trial is still valid", async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      tableResults["account"] = {
        data: {
          plan: "free",
          subscription_status: "none",
          current_period_end: null,
          trial_plan: "growth",
          trial_ends_at: futureDate,
        },
        error: null,
      };
      const result = await getEffectivePlan("test_acc");
      expect(result.plan).toBe("growth");
      expect(result.isTrial).toBe(true);
      expect(result.trialEndsAt).toBe(futureDate);
    });

    it("returns free when trial is expired", async () => {
      const pastDate = new Date(Date.now() - 1000).toISOString();
      tableResults["account"] = {
        data: {
          plan: "free",
          subscription_status: "none",
          current_period_end: null,
          trial_plan: "growth",
          trial_ends_at: pastDate,
        },
        error: null,
      };
      const result = await getEffectivePlan("test_acc");
      expect(result.plan).toBe("free");
      expect(result.isTrial).toBe(false);
    });

    it("returns subscription plan when active", async () => {
      tableResults["account"] = {
        data: {
          plan: "starter",
          subscription_status: "active",
          current_period_end: null,
          trial_plan: null,
          trial_ends_at: null,
        },
        error: null,
      };
      const result = await getEffectivePlan("test_acc");
      expect(result.plan).toBe("starter");
      expect(result.isTrial).toBe(false);
    });

    it("trial takes precedence over active subscription", async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      tableResults["account"] = {
        data: {
          plan: "starter",
          subscription_status: "active",
          current_period_end: null,
          trial_plan: "business",
          trial_ends_at: futureDate,
        },
        error: null,
      };
      const result = await getEffectivePlan("test_acc");
      expect(result.plan).toBe("business");
      expect(result.isTrial).toBe(true);
    });

    it("returns subscription plan for past_due status", async () => {
      tableResults["account"] = {
        data: {
          plan: "growth",
          subscription_status: "past_due",
          current_period_end: null,
          trial_plan: null,
          trial_ends_at: null,
        },
        error: null,
      };
      const result = await getEffectivePlan("test_acc");
      expect(result.plan).toBe("growth");
      expect(result.isTrial).toBe(false);
    });

    it("returns plan for canceled subscription within period", async () => {
      const futureEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      tableResults["account"] = {
        data: {
          plan: "starter",
          subscription_status: "canceled",
          current_period_end: futureEnd,
          trial_plan: null,
          trial_ends_at: null,
        },
        error: null,
      };
      const result = await getEffectivePlan("test_acc");
      expect(result.plan).toBe("starter");
      expect(result.isTrial).toBe(false);
    });

    it("returns free for canceled subscription past period", async () => {
      const pastEnd = new Date(Date.now() - 1000).toISOString();
      tableResults["account"] = {
        data: {
          plan: "starter",
          subscription_status: "canceled",
          current_period_end: pastEnd,
          trial_plan: null,
          trial_ends_at: null,
        },
        error: null,
      };
      const result = await getEffectivePlan("test_acc");
      expect(result.plan).toBe("free");
    });
  });

  // ── Constraint Loading & Caching ──────────────────────────

  describe("getPlanConstraints", () => {
    it("loads constraints from DB and groups by plan", async () => {
      tableResults["plan_constraint"] = {
        data: [
          { plan: "free", constraint_key: "max_users", constraint_value: "2" },
          { plan: "free", constraint_key: "max_terminals", constraint_value: "2" },
          { plan: "starter", constraint_key: "max_users", constraint_value: "5" },
        ],
        error: null,
      };

      const result = await getPlanConstraints();
      expect(result["free"]["max_users"]).toBe("2");
      expect(result["free"]["max_terminals"]).toBe("2");
      expect(result["starter"]["max_users"]).toBe("5");
    });

    it("caches constraints on second call", async () => {
      const fromSpy = vi.spyOn(mockDb, "from");
      tableResults["plan_constraint"] = {
        data: [{ plan: "free", constraint_key: "max_users", constraint_value: "2" }],
        error: null,
      };

      await getPlanConstraints();
      const callCount = fromSpy.mock.calls.length;
      await getPlanConstraints();
      // Should not have made another DB call
      expect(fromSpy.mock.calls.length).toBe(callCount);
      fromSpy.mockRestore();
    });

    it("returns fallback when DB errors", async () => {
      tableResults["plan_constraint"] = { data: null, error: { message: "Connection failed" } };
      const result = await getPlanConstraints();
      // Fallback should have free plan limits
      expect(result["free"]["max_users"]).toBe("2");
      expect(result["business"]["max_terminals"]).toBe("30");
    });
  });

  // ── Feature Access Checks ─────────────────────────────────

  describe("canAccessFeatureDb", () => {
    beforeEach(() => {
      tableResults["plan_constraint"] = {
        data: [
          { plan: "free", constraint_key: "feature_loyalty", constraint_value: "false" },
          { plan: "growth", constraint_key: "feature_loyalty", constraint_value: "true" },
          { plan: "free", constraint_key: "feature_kitchen_printing", constraint_value: "true" },
        ],
        error: null,
      };
    });

    it("returns false when feature not available on plan", async () => {
      const result = await canAccessFeatureDb("free", "loyalty");
      expect(result).toBe(false);
    });

    it("returns true when feature available on plan", async () => {
      const result = await canAccessFeatureDb("growth", "loyalty");
      expect(result).toBe(true);
    });

    it("returns true for free plan features", async () => {
      const result = await canAccessFeatureDb("free", "kitchen_printing");
      expect(result).toBe(true);
    });

    it("handles feature_ prefix correctly", async () => {
      // Should work with or without prefix
      const r1 = await canAccessFeatureDb("free", "loyalty");
      _clearConstraintCache();
      tableResults["plan_constraint"] = {
        data: [
          { plan: "free", constraint_key: "feature_loyalty", constraint_value: "false" },
        ],
        error: null,
      };
      const r2 = await canAccessFeatureDb("free", "feature_loyalty");
      expect(r1).toBe(r2);
    });
  });

  // ── Plan Limits ───────────────────────────────────────────

  describe("getPlanLimit", () => {
    it("returns correct numeric limits", async () => {
      tableResults["plan_constraint"] = {
        data: [
          { plan: "free", constraint_key: "max_users", constraint_value: "2" },
          { plan: "business", constraint_key: "max_users", constraint_value: "50" },
        ],
        error: null,
      };

      expect(await getPlanLimit("free", "max_users")).toBe(2);
      expect(await getPlanLimit("business", "max_users")).toBe(50);
    });

    it("returns 0 for unknown plan/key", async () => {
      tableResults["plan_constraint"] = { data: [], error: null };
      expect(await getPlanLimit("nonexistent", "max_users")).toBe(0);
    });
  });

  // ── Retention Days ────────────────────────────────────────

  describe("getRetentionDays", () => {
    it("returns correct retention for each plan", async () => {
      tableResults["plan_constraint"] = {
        data: [
          { plan: "free", constraint_key: "retention_days", constraint_value: "90" },
          { plan: "starter", constraint_key: "retention_days", constraint_value: "365" },
          { plan: "growth", constraint_key: "retention_days", constraint_value: "1095" },
          { plan: "business", constraint_key: "retention_days", constraint_value: "1825" },
        ],
        error: null,
      };

      expect(await getRetentionDays("free")).toBe(90);
      expect(await getRetentionDays("starter")).toBe(365);
      expect(await getRetentionDays("growth")).toBe(1095);
      expect(await getRetentionDays("business")).toBe(1825);
    });

    it("returns 90 as fallback for unknown plan", async () => {
      tableResults["plan_constraint"] = { data: [], error: null };
      expect(await getRetentionDays("unknown")).toBe(90);
    });
  });

  // ── getConstraint ─────────────────────────────────────────

  describe("getConstraint", () => {
    it("returns value for existing constraint", async () => {
      tableResults["plan_constraint"] = {
        data: [{ plan: "free", constraint_key: "max_users", constraint_value: "2" }],
        error: null,
      };
      expect(await getConstraint("free", "max_users")).toBe("2");
    });

    it("returns null for missing constraint", async () => {
      tableResults["plan_constraint"] = { data: [], error: null };
      expect(await getConstraint("free", "nonexistent_key")).toBeNull();
    });
  });

  // ── Trial API Logic ───────────────────────────────────────

  describe("Trial scenarios", () => {
    it("trial plan overrides free even when subscription is none", async () => {
      const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      tableResults["account"] = {
        data: {
          plan: "free",
          subscription_status: "none",
          current_period_end: null,
          trial_plan: "growth",
          trial_ends_at: futureDate,
        },
        error: null,
      };
      const result = await getEffectivePlan("trial_acc");
      expect(result.plan).toBe("growth");
      expect(result.isTrial).toBe(true);
    });

    it("expired trial falls back to subscription", async () => {
      const pastDate = new Date(Date.now() - 1000).toISOString();
      tableResults["account"] = {
        data: {
          plan: "starter",
          subscription_status: "active",
          current_period_end: null,
          trial_plan: "business",
          trial_ends_at: pastDate,
        },
        error: null,
      };
      const result = await getEffectivePlan("trial_acc");
      expect(result.plan).toBe("starter");
      expect(result.isTrial).toBe(false);
    });

    it("null trial fields means no trial", async () => {
      tableResults["account"] = {
        data: {
          plan: "free",
          subscription_status: "none",
          current_period_end: null,
          trial_plan: null,
          trial_ends_at: null,
        },
        error: null,
      };
      const result = await getEffectivePlan("no_trial_acc");
      expect(result.plan).toBe("free");
      expect(result.isTrial).toBe(false);
      expect(result.trialEndsAt).toBeNull();
    });

    it("trialing subscription status is treated as active", async () => {
      tableResults["account"] = {
        data: {
          plan: "growth",
          subscription_status: "trialing",
          current_period_end: null,
          trial_plan: null,
          trial_ends_at: null,
        },
        error: null,
      };
      const result = await getEffectivePlan("paddle_trial_acc");
      expect(result.plan).toBe("growth");
      expect(result.isTrial).toBe(false);
    });
  });

  // ── Sync canAccessFeature (legacy/fallback) ─────────────

  describe("canAccessFeature (sync fallback)", () => {
    it("free plan has basic features only", () => {
      expect(canAccessFeature("free", "basic_pos")).toBe(true);
      expect(canAccessFeature("free", "offline")).toBe(true);
      expect(canAccessFeature("free", "receipt")).toBe(true);
      expect(canAccessFeature("free", "barcode")).toBe(true);
      expect(canAccessFeature("free", "till")).toBe(true);
      expect(canAccessFeature("free", "categories")).toBe(true);
      expect(canAccessFeature("free", "basic_inventory")).toBe(true);
      expect(canAccessFeature("free", "basic_loyalty")).toBe(true);
      expect(canAccessFeature("free", "kitchen_printing")).toBe(true);
      // Not on free
      expect(canAccessFeature("free", "multi_user")).toBe(false);
      expect(canAccessFeature("free", "customers")).toBe(false);
      expect(canAccessFeature("free", "promotions")).toBe(false);
      expect(canAccessFeature("free", "warehouse")).toBe(false);
    });

    it("starter plan includes free + starter features", () => {
      expect(canAccessFeature("starter", "basic_pos")).toBe(true);
      expect(canAccessFeature("starter", "multi_user")).toBe(true);
      expect(canAccessFeature("starter", "customers")).toBe(true);
      expect(canAccessFeature("starter", "full_inventory")).toBe(true);
      expect(canAccessFeature("starter", "shifts")).toBe(true);
      expect(canAccessFeature("starter", "modifiers")).toBe(true);
      expect(canAccessFeature("starter", "csv_export")).toBe(true);
      // Not on starter
      expect(canAccessFeature("starter", "promotions")).toBe(false);
      expect(canAccessFeature("starter", "restaurant")).toBe(false);
      expect(canAccessFeature("starter", "warehouse")).toBe(false);
    });

    it("growth plan includes starter + growth features", () => {
      expect(canAccessFeature("growth", "multi_user")).toBe(true);
      expect(canAccessFeature("growth", "promotions")).toBe(true);
      expect(canAccessFeature("growth", "restaurant")).toBe(true);
      expect(canAccessFeature("growth", "kds")).toBe(true);
      expect(canAccessFeature("growth", "ai_import")).toBe(true);
      expect(canAccessFeature("growth", "suppliers")).toBe(true);
      expect(canAccessFeature("growth", "tags")).toBe(true);
      // Not on growth
      expect(canAccessFeature("growth", "warehouse")).toBe(false);
      expect(canAccessFeature("growth", "xero")).toBe(false);
      expect(canAccessFeature("growth", "serialized_items")).toBe(false);
    });

    it("business plan has all features", () => {
      expect(canAccessFeature("business", "basic_pos")).toBe(true);
      expect(canAccessFeature("business", "promotions")).toBe(true);
      expect(canAccessFeature("business", "warehouse")).toBe(true);
      expect(canAccessFeature("business", "xero")).toBe(true);
      expect(canAccessFeature("business", "serialized_items")).toBe(true);
      expect(canAccessFeature("business", "webhooks")).toBe(true);
      expect(canAccessFeature("business", "tower_control")).toBe(true);
      expect(canAccessFeature("business", "qr_actions")).toBe(true);
    });
  });

  // ── getPlanLimits (sync fallback) ──────────────────────────

  describe("getPlanLimits (sync fallback)", () => {
    it("returns correct limits for each plan", () => {
      expect(getPlanLimits("free")).toEqual({ users: 2, terminals: 2 });
      expect(getPlanLimits("starter")).toEqual({ users: 5, terminals: 3 });
      expect(getPlanLimits("growth")).toEqual({ users: 15, terminals: 10 });
      expect(getPlanLimits("business")).toEqual({ users: 50, terminals: 30 });
    });

    it("defaults to free limits for unknown plan", () => {
      expect(getPlanLimits("unknown" as any)).toEqual({ users: 2, terminals: 2 });
    });
  });

  // ── getAccountPlan ─────────────────────────────────────────

  describe("getAccountPlan", () => {
    it("returns free defaults when account not found", async () => {
      tableResults["account"] = { data: null, error: { message: "not found" } };
      const result = await getAccountPlan("nonexistent-acc");

      expect(result.plan).toBe("free");
      expect(result.region).toBe("developing");
      expect(result.status).toBe("none");
      expect(result.limits).toEqual({ users: 2, terminals: 2 });
      expect(result.paddle_customer_id).toBeNull();
      expect(result.paddle_subscription_id).toBeNull();
    });

    it("returns correct data when account has billing info", async () => {
      tableResults["account"] = {
        data: {
          plan: "growth",
          billing_region: "developed",
          subscription_status: "active",
          paddle_customer_id: "ctm_test",
          paddle_subscription_id: "sub_test",
          current_period_end: "2026-05-01T00:00:00Z",
        },
        error: null,
      };
      const result = await getAccountPlan("test-acc-billing");

      expect(result.plan).toBe("growth");
      expect(result.region).toBe("developed");
      expect(result.status).toBe("active");
      expect(result.limits).toEqual({ users: 15, terminals: 10 });
      expect(result.paddle_customer_id).toBe("ctm_test");
      expect(result.paddle_subscription_id).toBe("sub_test");
    });

    it("defaults to free plan when account plan is null", async () => {
      tableResults["account"] = {
        data: {
          plan: null,
          billing_region: null,
          subscription_status: null,
          paddle_customer_id: null,
          paddle_subscription_id: null,
          current_period_end: null,
        },
        error: null,
      };
      const result = await getAccountPlan("null-plan-acc");

      expect(result.plan).toBe("free");
      expect(result.region).toBe("developing");
      expect(result.status).toBe("none");
    });
  });

  // ── Paused subscription ────────────────────────────────────

  describe("Paused subscription", () => {
    it("returns free for paused subscription (not in active list)", async () => {
      tableResults["account"] = {
        data: {
          plan: "starter",
          subscription_status: "paused",
          current_period_end: null,
          trial_plan: null,
          trial_ends_at: null,
        },
        error: null,
      };
      const result = await getEffectivePlan("paused_acc");
      expect(result.plan).toBe("free");
      expect(result.isTrial).toBe(false);
    });
  });

  // ── Canceled without period end ────────────────────────────

  describe("Canceled without period end", () => {
    it("returns free when canceled and no current_period_end set", async () => {
      tableResults["account"] = {
        data: {
          plan: "growth",
          subscription_status: "canceled",
          current_period_end: null,
          trial_plan: null,
          trial_ends_at: null,
        },
        error: null,
      };
      const result = await getEffectivePlan("canceled_no_period_acc");
      expect(result.plan).toBe("free");
    });
  });

  // ── Cache invalidation ────────────────────────────────────

  describe("_clearConstraintCache", () => {
    it("forces fresh DB load after clear", async () => {
      tableResults["plan_constraint"] = {
        data: [{ plan: "free", constraint_key: "max_users", constraint_value: "2" }],
        error: null,
      };
      const r1 = await getPlanConstraints();
      expect(r1["free"]["max_users"]).toBe("2");

      // Change the mock data
      tableResults["plan_constraint"] = {
        data: [{ plan: "free", constraint_key: "max_users", constraint_value: "99" }],
        error: null,
      };

      // Without clear, should return cached value
      const r2 = await getPlanConstraints();
      expect(r2["free"]["max_users"]).toBe("2");

      // After clear, should return new value
      _clearConstraintCache();
      const r3 = await getPlanConstraints();
      expect(r3["free"]["max_users"]).toBe("99");
    });
  });
});
