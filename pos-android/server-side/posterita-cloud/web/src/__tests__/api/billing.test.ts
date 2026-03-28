import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Supabase mock ──────────────────────────────────────────────
let tableResults: Record<string, { data: any; error: any }> = {};
let supabaseOps: Array<{ table: string; op: string; data?: any; filters: Record<string, any> }> = [];

function createChain(table: string) {
  const state = { op: "select" as string, data: undefined as any, filters: {} as Record<string, any>, countMode: false };
  function resolve() {
    supabaseOps.push({ table, op: state.op, data: state.data, filters: state.filters });
    const fk = Object.entries(state.filters).map(([k, v]) => `${k}=${v}`).join(",");
    const result = tableResults[`${table}:${fk}`] ?? tableResults[table] ?? { data: state.op === "select" ? [] : null, error: null };
    if (state.countMode) return { ...result, count: Array.isArray(result.data) ? result.data.length : 0 };
    return result;
  }
  const chain: any = {};
  for (const m of ["select", "eq", "gte", "order", "limit", "range", "in", "neq", "is", "not", "or", "gt", "lte", "ilike"] as const) {
    chain[m] = (...args: any[]) => {
      if (m === "select" && args[1]?.count) state.countMode = true;
      if (m === "eq") state.filters[args[0]] = args[1];
      return chain;
    };
  }
  for (const m of ["insert", "update", "upsert", "delete"] as const) {
    chain[m] = (...args: any[]) => { state.op = m; state.data = args[0]; return chain; };
  }
  chain.single = () => { const r = resolve() as any; const d = Array.isArray(r.data) ? r.data[0] ?? null : r.data; return Promise.resolve({ ...r, data: d, count: r.count ?? null }); };
  chain.maybeSingle = chain.single;
  chain.then = (f: Function, r?: Function) => Promise.resolve(resolve()).then(f as any, r as any);
  return chain;
}

vi.mock("@/lib/supabase/admin", () => ({ getDb: () => ({ from: (t: string) => createChain(t) }) }));
vi.mock("@/lib/account-context", () => ({ getSessionAccountId: () => Promise.resolve("test-billing-acc") }));

function mockReq(body: any, url?: string): any {
  return {
    json: () => Promise.resolve(body),
    url: url ?? "http://localhost/api/billing",
    text: () => Promise.resolve(JSON.stringify(body)),
    headers: new Map([["Paddle-Signature", ""]]),
  };
}

beforeEach(() => {
  tableResults = {};
  supabaseOps = [];
  vi.resetModules();
  // Re-apply auth mock (resetModules clears doMock overrides)
  vi.doMock("@/lib/account-context", () => ({ getSessionAccountId: () => Promise.resolve("test-billing-acc") }));
});

// ─── Plan Limits ────────────────────────────────────────────────
describe("Plan limits", () => {
  it("returns correct limits for each plan", async () => {
    const { getPlanLimits } = await import("../../lib/billing");

    expect(getPlanLimits("free")).toEqual({ users: 2, terminals: 2 });
    expect(getPlanLimits("starter")).toEqual({ users: 5, terminals: 3 });
    expect(getPlanLimits("growth")).toEqual({ users: 15, terminals: 10 });
    expect(getPlanLimits("business")).toEqual({ users: 50, terminals: 30 });
  });

  it("defaults to free limits for unknown plan", async () => {
    const { getPlanLimits } = await import("../../lib/billing");
    expect(getPlanLimits("unknown" as any)).toEqual({ users: 2, terminals: 2 });
  });
});

// ─── Feature Gating ─────────────────────────────────────────────
describe("Feature gating", () => {
  it("free plan has basic features only", async () => {
    const { canAccessFeature } = await import("../../lib/billing");

    expect(canAccessFeature("free", "basic_pos")).toBe(true);
    expect(canAccessFeature("free", "offline")).toBe(true);
    expect(canAccessFeature("free", "receipt")).toBe(true);
    expect(canAccessFeature("free", "barcode")).toBe(true);
    expect(canAccessFeature("free", "till")).toBe(true);
    expect(canAccessFeature("free", "categories")).toBe(true);
    expect(canAccessFeature("free", "basic_inventory")).toBe(true);
    expect(canAccessFeature("free", "basic_loyalty")).toBe(true);
    expect(canAccessFeature("free", "kitchen_printing")).toBe(true);

    // Not available on free
    expect(canAccessFeature("free", "multi_user")).toBe(false);
    expect(canAccessFeature("free", "customers")).toBe(false);
    expect(canAccessFeature("free", "promotions")).toBe(false);
    expect(canAccessFeature("free", "warehouse")).toBe(false);
  });

  it("starter plan includes free + starter features", async () => {
    const { canAccessFeature } = await import("../../lib/billing");

    expect(canAccessFeature("starter", "basic_pos")).toBe(true);
    expect(canAccessFeature("starter", "multi_user")).toBe(true);
    expect(canAccessFeature("starter", "customers")).toBe(true);
    expect(canAccessFeature("starter", "full_inventory")).toBe(true);
    expect(canAccessFeature("starter", "shifts")).toBe(true);
    expect(canAccessFeature("starter", "modifiers")).toBe(true);
    expect(canAccessFeature("starter", "csv_export")).toBe(true);

    // Not available on starter
    expect(canAccessFeature("starter", "promotions")).toBe(false);
    expect(canAccessFeature("starter", "restaurant")).toBe(false);
    expect(canAccessFeature("starter", "warehouse")).toBe(false);
  });

  it("growth plan includes starter + growth features", async () => {
    const { canAccessFeature } = await import("../../lib/billing");

    expect(canAccessFeature("growth", "multi_user")).toBe(true);
    expect(canAccessFeature("growth", "promotions")).toBe(true);
    expect(canAccessFeature("growth", "restaurant")).toBe(true);
    expect(canAccessFeature("growth", "kds")).toBe(true);
    expect(canAccessFeature("growth", "ai_import")).toBe(true);
    expect(canAccessFeature("growth", "suppliers")).toBe(true);
    expect(canAccessFeature("growth", "tags")).toBe(true);

    // Not available on growth
    expect(canAccessFeature("growth", "warehouse")).toBe(false);
    expect(canAccessFeature("growth", "xero")).toBe(false);
    expect(canAccessFeature("growth", "serialized_items")).toBe(false);
  });

  it("business plan has all features", async () => {
    const { canAccessFeature } = await import("../../lib/billing");

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

// ─── Paddle Price ID Mapping ────────────────────────────────────
describe("Paddle price ID mapping", () => {
  it("returns null for free plan", async () => {
    const { getPaddlePriceId } = await import("../../lib/billing");
    expect(getPaddlePriceId("free", "developing")).toBeNull();
    expect(getPaddlePriceId("free", "emerging")).toBeNull();
    expect(getPaddlePriceId("free", "developed")).toBeNull();
  });

  it("returns price IDs for paid plans", async () => {
    const { getPaddlePriceId } = await import("../../lib/billing");

    expect(getPaddlePriceId("starter", "developing")).toBe("pri_01kmv74xhd0dchmfh9d7yy2p1k");
    expect(getPaddlePriceId("growth", "emerging")).toBe("pri_01kmv75me09wbh0rex18n743n9");
    expect(getPaddlePriceId("business", "developed")).toBe("pri_01kmv76ctmd851kqsgney9g1pz");
  });

  it("returns price IDs for all plan/region combinations", async () => {
    const { getPaddlePriceId, PLANS } = await import("../../lib/billing");

    for (const plan of PLANS) {
      if (plan === "free") continue;
      for (const region of ["developing", "emerging", "developed"] as const) {
        expect(getPaddlePriceId(plan, region)).toBeTruthy();
      }
    }
  });
});

// ─── Billing Status Endpoint ────────────────────────────────────
describe("GET /api/billing/status", () => {
  it("returns 401 when not authenticated", async () => {
    // Override the default mock to return null (unauthenticated)
    vi.resetModules();
    vi.doMock("@/lib/supabase/admin", () => ({ getDb: () => ({ from: (t: string) => createChain(t) }) }));
    vi.doMock("@/lib/account-context", () => ({ getSessionAccountId: () => Promise.resolve(null) }));
    const { GET } = await import("../../app/api/billing/status/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns billing status with usage", async () => {
    tableResults["account"] = {
      data: {
        plan: "starter",
        billing_region: "developing",
        subscription_status: "active",
        paddle_customer_id: "ctm_123",
        paddle_subscription_id: "sub_456",
        current_period_end: "2026-04-29T00:00:00Z",
      },
      error: null,
    };
    tableResults["pos_user"] = { data: [{ user_id: 1 }, { user_id: 2 }], error: null };
    tableResults["terminal"] = { data: [{ terminal_id: 1 }], error: null };
    tableResults["store"] = { data: [{ store_id: 1 }], error: null };
    tableResults["billing_event"] = { data: [], error: null };

    const { GET } = await import("../../app/api/billing/status/route");
    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.plan).toBe("starter");
    expect(json.billing_region).toBe("developing");
    expect(json.subscription_status).toBe("active");
    expect(json.limits).toEqual({ users: 5, terminals: 3 });
  });

  it("defaults to free when account has no plan set", async () => {
    tableResults["account"] = { data: { plan: null, billing_region: null, subscription_status: null }, error: null };
    tableResults["pos_user"] = { data: [], error: null };
    tableResults["terminal"] = { data: [], error: null };
    tableResults["store"] = { data: [], error: null };
    tableResults["billing_event"] = { data: [], error: null };

    const { GET } = await import("../../app/api/billing/status/route");
    const res = await GET();
    const json = await res.json();

    expect(json.plan).toBe("free");
    expect(json.limits).toEqual({ users: 2, terminals: 2 });
  });
});

// ─── Webhook Signature Verification ─────────────────────────────
describe("Webhook signature verification", () => {
  it("rejects requests with invalid signature", async () => {
    // Set env
    const origEnv = process.env.PADDLE_WEBHOOK_SECRET;
    process.env.PADDLE_WEBHOOK_SECRET = "test-secret-key";

    const { POST } = await import("../../app/api/billing/webhook/route");

    const payload = JSON.stringify({ event_type: "subscription.created", event_id: "evt_test" });
    const req = {
      text: () => Promise.resolve(payload),
      headers: {
        get: (name: string) => name === "Paddle-Signature" ? "ts=12345;h1=invalidsignature" : null,
      },
    };

    const res = await POST(req as any);
    expect(res.status).toBe(401);

    process.env.PADDLE_WEBHOOK_SECRET = origEnv;
  });

  it("rejects when webhook secret is not configured", async () => {
    const origEnv = process.env.PADDLE_WEBHOOK_SECRET;
    delete process.env.PADDLE_WEBHOOK_SECRET;

    const { POST } = await import("../../app/api/billing/webhook/route");

    const req = {
      text: () => Promise.resolve("{}"),
      headers: { get: () => "" },
    };

    const res = await POST(req as any);
    expect(res.status).toBe(500);

    process.env.PADDLE_WEBHOOK_SECRET = origEnv;
  });

  it("accepts valid signature and processes subscription.created", async () => {
    const { createHmac } = await import("crypto");
    const secret = "test-webhook-secret-valid";
    process.env.PADDLE_WEBHOOK_SECRET = secret;

    const payload = JSON.stringify({
      event_type: "subscription.created",
      event_id: "evt_unique_123",
      data: {
        id: "sub_test_789",
        customer_id: "ctm_test_456",
        custom_data: { account_id: "test-billing-acc", plan: "starter" },
        current_billing_period: { ends_at: "2026-04-29T00:00:00Z" },
      },
    });

    const ts = "1711700000";
    const signedPayload = `${ts}:${payload}`;
    const h1 = createHmac("sha256", secret).update(signedPayload).digest("hex");

    // Mock dedup check (no existing event)
    tableResults["billing_event"] = { data: null, error: null };
    // Mock account lookup
    tableResults["account"] = { data: null, error: null };

    const { POST } = await import("../../app/api/billing/webhook/route");

    const req = {
      text: () => Promise.resolve(payload),
      headers: {
        get: (name: string) => name === "Paddle-Signature" ? `ts=${ts};h1=${h1}` : null,
      },
    };

    const res = await POST(req as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.received).toBe(true);

    // Verify billing_event insert was called
    const insertOp = supabaseOps.find(o => o.table === "billing_event" && o.op === "insert");
    expect(insertOp).toBeDefined();
    expect(insertOp?.data?.event_type).toBe("subscription.created");

    // Verify account update was called
    const updateOp = supabaseOps.find(o => o.table === "account" && o.op === "update");
    expect(updateOp).toBeDefined();
    expect(updateOp?.data?.subscription_status).toBe("active");
    expect(updateOp?.data?.plan).toBe("starter");

    delete process.env.PADDLE_WEBHOOK_SECRET;
  });
});

// ─── Plan Change Logic ──────────────────────────────────────────
describe("POST /api/billing/change-plan", () => {
  it("returns 400 for invalid plan", async () => {
    const { POST } = await import("../../app/api/billing/change-plan/route");
    const res = await POST(mockReq({ new_plan: "invalid" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when no active subscription exists", async () => {
    tableResults["account"] = {
      data: {
        plan: "free",
        billing_region: "developing",
        subscription_status: "none",
        paddle_customer_id: null,
        paddle_subscription_id: null,
        current_period_end: null,
      },
      error: null,
    };

    const { POST } = await import("../../app/api/billing/change-plan/route");
    const res = await POST(mockReq({ new_plan: "starter" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("No active subscription");
  });

  it("returns 400 when trying to change to current plan", async () => {
    tableResults["account"] = {
      data: {
        plan: "starter",
        billing_region: "developing",
        subscription_status: "active",
        paddle_customer_id: "ctm_123",
        paddle_subscription_id: "sub_456",
        current_period_end: null,
      },
      error: null,
    };

    const { POST } = await import("../../app/api/billing/change-plan/route");
    const res = await POST(mockReq({ new_plan: "starter" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("Already on this plan");
  });

  it("returns 400 when trying to downgrade to free", async () => {
    tableResults["account"] = {
      data: {
        plan: "starter",
        billing_region: "developing",
        subscription_status: "active",
        paddle_customer_id: "ctm_123",
        paddle_subscription_id: "sub_456",
        current_period_end: null,
      },
      error: null,
    };

    const { POST } = await import("../../app/api/billing/change-plan/route");
    const res = await POST(mockReq({ new_plan: "free" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("cancel");
  });
});

// ─── Cancel Endpoint ────────────────────────────────────────────
describe("POST /api/billing/cancel", () => {
  it("returns 400 when no active subscription", async () => {
    tableResults["account"] = {
      data: {
        plan: "free",
        billing_region: "developing",
        subscription_status: "none",
        paddle_customer_id: null,
        paddle_subscription_id: null,
        current_period_end: null,
      },
      error: null,
    };

    const { POST } = await import("../../app/api/billing/cancel/route");
    const res = await POST();
    expect(res.status).toBe(400);
  });

  it("returns 400 when already canceled", async () => {
    tableResults["account"] = {
      data: {
        plan: "starter",
        billing_region: "developing",
        subscription_status: "canceled",
        paddle_customer_id: "ctm_123",
        paddle_subscription_id: "sub_456",
        current_period_end: null,
      },
      error: null,
    };

    const { POST } = await import("../../app/api/billing/cancel/route");
    const res = await POST();
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("already canceled");
  });
});

// ─── Regional Pricing ───────────────────────────────────────────
describe("Regional pricing", () => {
  it("has correct prices for all regions", async () => {
    const { REGIONAL_PRICING } = await import("../../lib/billing");

    expect(REGIONAL_PRICING.developing.starter).toBe(7);
    expect(REGIONAL_PRICING.developing.growth).toBe(19);
    expect(REGIONAL_PRICING.developing.business).toBe(39);

    expect(REGIONAL_PRICING.emerging.starter).toBe(12);
    expect(REGIONAL_PRICING.emerging.growth).toBe(29);
    expect(REGIONAL_PRICING.emerging.business).toBe(59);

    expect(REGIONAL_PRICING.developed.starter).toBe(19);
    expect(REGIONAL_PRICING.developed.growth).toBe(49);
    expect(REGIONAL_PRICING.developed.business).toBe(99);
  });

  it("has store addon prices for all plans/regions", async () => {
    const { REGIONAL_PRICING, PLANS } = await import("../../lib/billing");

    for (const region of ["developing", "emerging", "developed"] as const) {
      for (const plan of PLANS) {
        expect(REGIONAL_PRICING[region].storeAddon[plan]).toBeDefined();
        expect(typeof REGIONAL_PRICING[region].storeAddon[plan]).toBe("number");
      }
    }
  });

  it("has no individual terminal/user addon prices (simplified model)", async () => {
    const { REGIONAL_PRICING } = await import("../../lib/billing");

    for (const region of ["developing", "emerging", "developed"] as const) {
      expect((REGIONAL_PRICING[region] as any).addons).toBeUndefined();
    }
  });
});

// ─── Account Plan Fetching ──────────────────────────────────────
describe("getAccountPlan", () => {
  it("returns free defaults when account not found", async () => {
    tableResults["account"] = { data: null, error: { message: "not found" } };

    const { getAccountPlan } = await import("../../lib/billing");
    const result = await getAccountPlan("nonexistent-acc");

    expect(result.plan).toBe("free");
    expect(result.region).toBe("developing");
    expect(result.status).toBe("none");
    expect(result.limits).toEqual({ users: 2, terminals: 2 });
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

    const { getAccountPlan } = await import("../../lib/billing");
    const result = await getAccountPlan("test-acc-billing");

    expect(result.plan).toBe("growth");
    expect(result.region).toBe("developed");
    expect(result.status).toBe("active");
    expect(result.limits).toEqual({ users: 15, terminals: 10 });
    expect(result.paddle_customer_id).toBe("ctm_test");
    expect(result.paddle_subscription_id).toBe("sub_test");
  });
});
