import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for platform admin routes:
 * - GET /api/platform/plan-constraints — list all constraints (admin only)
 * - POST /api/platform/plan-constraints — upsert a constraint (admin only)
 * - POST /api/platform/trial — grant/extend/revoke trial (admin only)
 * - GET /api/super-admin/status — check super admin status
 * - POST /api/super-admin/switch — impersonate an account
 */

// ─── Supabase mock ──────────────────────────────────────────────
let tableResults: Record<string, { data: any; error: any }> = {};
let supabaseOps: Array<{ table: string; op: string; data?: any; filters: Record<string, any> }> = [];

function createChain(table: string) {
  const state = { op: "select" as string, data: undefined as any, filters: {} as Record<string, any> };
  function resolve() {
    supabaseOps.push({ table, op: state.op, data: state.data, filters: state.filters });
    const fk = Object.entries(state.filters).map(([k, v]) => `${k}=${v}`).join(",");
    const result = tableResults[`${table}:${fk}`] ?? tableResults[table] ?? { data: state.op === "select" ? [] : null, error: null };
    return result;
  }
  const chain: any = {};
  for (const m of ["select", "eq", "gte", "order", "limit", "range", "in", "neq", "is", "not", "or", "gt", "lte", "ilike"] as const) {
    chain[m] = (...args: any[]) => {
      if (m === "eq") state.filters[args[0]] = args[1];
      return chain;
    };
  }
  for (const m of ["insert", "update", "upsert", "delete"] as const) {
    chain[m] = (...args: any[]) => { state.op = m; state.data = args[0]; return chain; };
  }
  chain.single = () => { const r = resolve() as any; const d = Array.isArray(r.data) ? r.data[0] ?? null : r.data; return Promise.resolve({ ...r, data: d }); };
  chain.maybeSingle = chain.single;
  chain.then = (f: Function, r?: Function) => Promise.resolve(resolve()).then(f as any, r as any);
  return chain;
}

vi.mock("@/lib/supabase/admin", () => ({ getDb: () => ({ from: (t: string) => createChain(t) }) }));

// Default: authenticated as account manager — mutable for per-test overrides
let mockSwitchResult = true;
let mockIsManager = true;
let mockImpersonating: any = null;
let mockAdminInfoOverride: any = undefined; // set to non-undefined to override entire getSuperAdminInfo result
vi.mock("@/lib/super-admin", () => ({
  isAccountManager: () => Promise.resolve(mockIsManager),
  isSuperAdmin: () => Promise.resolve(mockIsManager),
  getSuperAdminInfo: () => Promise.resolve(
    mockAdminInfoOverride !== undefined ? mockAdminInfoOverride : {
      id: 1,
      email: "admin@posterita.com",
      name: "Test Admin",
      impersonating: mockImpersonating,
    }
  ),
  switchAccount: () => Promise.resolve(mockSwitchResult),
}));

vi.mock("@/lib/account-context", () => ({
  getSessionAccountId: () => Promise.resolve("test-platform-acc"),
}));

vi.mock("@/lib/billing", () => ({
  _clearConstraintCache: vi.fn(),
}));

// Mock next/headers cookies
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({
    delete: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
  }),
}));

function mockReq(body: any): any {
  return {
    json: () => Promise.resolve(body),
    url: "http://localhost/api/platform",
    text: () => Promise.resolve(JSON.stringify(body)),
    headers: new Map(),
  };
}

beforeEach(() => {
  tableResults = {};
  supabaseOps = [];
  mockSwitchResult = true;
  mockIsManager = true;
  mockImpersonating = null;
  mockAdminInfoOverride = undefined;
});

// ─── GET /api/platform/plan-constraints ─────────────────────────
describe("GET /api/platform/plan-constraints", () => {
  it("returns constraints grouped by plan", async () => {
    tableResults["plan_constraint"] = {
      data: [
        { plan: "free", constraint_key: "max_users", constraint_value: "2" },
        { plan: "free", constraint_key: "max_terminals", constraint_value: "2" },
        { plan: "starter", constraint_key: "max_users", constraint_value: "5" },
      ],
      error: null,
    };

    const { GET } = await import("../../app/api/platform/plan-constraints/route");
    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.constraints.free).toHaveLength(2);
    expect(json.constraints.starter).toHaveLength(1);
    expect(json.total).toBe(3);
  });

  it("returns 403 when not account manager", async () => {
    mockIsManager = false;
    const { GET } = await import("../../app/api/platform/plan-constraints/route");
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns 500 on DB error", async () => {
    tableResults["plan_constraint"] = { data: null, error: { message: "Connection refused" } };

    const { GET } = await import("../../app/api/platform/plan-constraints/route");
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

// ─── POST /api/platform/plan-constraints ────────────────────────
describe("POST /api/platform/plan-constraints", () => {
  it("upserts a constraint and clears cache", async () => {
    tableResults["plan_constraint"] = {
      data: { plan: "free", constraint_key: "max_users", constraint_value: "3" },
      error: null,
    };

    const { POST } = await import("../../app/api/platform/plan-constraints/route");
    const res = await POST(mockReq({ plan: "free", constraint_key: "max_users", constraint_value: "3" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.constraint).toBeDefined();
  });

  it("returns 400 when missing required fields", async () => {
    const { POST } = await import("../../app/api/platform/plan-constraints/route");

    const res1 = await POST(mockReq({ plan: "free" }));
    expect(res1.status).toBe(400);

    const res2 = await POST(mockReq({ constraint_key: "max_users", constraint_value: "5" }));
    expect(res2.status).toBe(400);
  });

  it("returns 403 when not account manager", async () => {
    mockIsManager = false;
    const { POST } = await import("../../app/api/platform/plan-constraints/route");
    const res = await POST(mockReq({ plan: "free", constraint_key: "max_users", constraint_value: "3" }));
    expect(res.status).toBe(403);
  });
});

// ─── POST /api/platform/trial ───────────────────────────────────
describe("POST /api/platform/trial", () => {
  it("grants a trial successfully", async () => {
    tableResults["account"] = {
      data: { account_id: "acc-123", businessname: "Test Co", trial_plan: null, trial_ends_at: null },
      error: null,
    };

    const { POST } = await import("../../app/api/platform/trial/route");
    const res = await POST(mockReq({
      account_id: "acc-123",
      action: "grant",
      trial_plan: "growth",
      trial_days: 14,
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.action).toBe("grant");
    expect(json.trial_plan).toBe("growth");
    expect(json.trial_ends_at).toBeTruthy();
  });

  it("extends an existing trial", async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    tableResults["account"] = {
      data: { account_id: "acc-123", businessname: "Test Co", trial_plan: "growth", trial_ends_at: futureDate },
      error: null,
    };

    const { POST } = await import("../../app/api/platform/trial/route");
    const res = await POST(mockReq({
      account_id: "acc-123",
      action: "extend",
      trial_days: 7,
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.action).toBe("extend");
  });

  it("revokes a trial", async () => {
    tableResults["account"] = {
      data: { account_id: "acc-123", businessname: "Test Co", trial_plan: "growth", trial_ends_at: new Date().toISOString() },
      error: null,
    };

    const { POST } = await import("../../app/api/platform/trial/route");
    const res = await POST(mockReq({
      account_id: "acc-123",
      action: "revoke",
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.action).toBe("revoke");
    expect(json.trial_plan).toBeNull();
    expect(json.trial_ends_at).toBeNull();
  });

  it("returns 400 for invalid action", async () => {
    const { POST } = await import("../../app/api/platform/trial/route");
    const res = await POST(mockReq({ account_id: "acc-123", action: "invalid" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when account_id missing", async () => {
    const { POST } = await import("../../app/api/platform/trial/route");
    const res = await POST(mockReq({ action: "grant" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when grant is missing trial_plan or trial_days", async () => {
    tableResults["account"] = {
      data: { account_id: "acc-123", businessname: "Test Co", trial_plan: null, trial_ends_at: null },
      error: null,
    };

    const { POST } = await import("../../app/api/platform/trial/route");
    const res = await POST(mockReq({ account_id: "acc-123", action: "grant", trial_plan: "growth" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when extend is missing trial_days", async () => {
    tableResults["account"] = {
      data: { account_id: "acc-123", businessname: "Test Co", trial_plan: "growth", trial_ends_at: new Date().toISOString() },
      error: null,
    };

    const { POST } = await import("../../app/api/platform/trial/route");
    const res = await POST(mockReq({ account_id: "acc-123", action: "extend" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when account does not exist", async () => {
    tableResults["account"] = { data: null, error: { message: "Not found" } };

    const { POST } = await import("../../app/api/platform/trial/route");
    const res = await POST(mockReq({ account_id: "nonexistent", action: "grant", trial_plan: "growth", trial_days: 14 }));
    expect(res.status).toBe(404);
  });

  it("returns 403 when not account manager", async () => {
    mockIsManager = false;
    const { POST } = await import("../../app/api/platform/trial/route");
    const res = await POST(mockReq({ account_id: "acc-123", action: "grant", trial_plan: "growth", trial_days: 14 }));
    expect(res.status).toBe(403);
  });
});

// ─── GET /api/super-admin/status ────────────────────────────────
describe("GET /api/super-admin/status", () => {
  it("returns super admin info when authenticated", async () => {
    const { GET } = await import("../../app/api/super-admin/status/route");
    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.is_super_admin).toBe(true);
    expect(json.is_account_manager).toBe(true);
    expect(json.email).toBe("admin@posterita.com");
    expect(json.name).toBe("Test Admin");
    expect(json.impersonating).toBeNull();
  });

  it("returns impersonation info when active", async () => {
    mockImpersonating = { account_id: "acc-target", businessname: "Target Brand" };
    const { GET } = await import("../../app/api/super-admin/status/route");
    const res = await GET();
    const json = await res.json();

    expect(json.is_super_admin).toBe(true);
    expect(json.impersonating.account_id).toBe("acc-target");
    expect(json.impersonating.businessname).toBe("Target Brand");
  });

  it("returns is_super_admin false when not admin", async () => {
    mockIsManager = false;
    mockAdminInfoOverride = null;
    const { GET } = await import("../../app/api/super-admin/status/route");
    const res = await GET();
    const json = await res.json();

    expect(json.is_super_admin).toBe(false);
  });
});

// ─── POST /api/super-admin/switch ───────────────────────────────
describe("POST /api/super-admin/switch", () => {
  it("switches to a target account", async () => {
    const { POST } = await import("../../app/api/super-admin/switch/route");
    const res = await POST(mockReq({ account_id: "acc-target" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.account_id).toBe("acc-target");
  });

  it("stops impersonation when account_id is null", async () => {
    const { POST } = await import("../../app/api/super-admin/switch/route");
    const res = await POST(mockReq({ account_id: null }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it("returns 403 when switchAccount returns false", async () => {
    mockSwitchResult = false;
    const { POST } = await import("../../app/api/super-admin/switch/route");
    const res = await POST(mockReq({ account_id: "acc-target" }));
    expect(res.status).toBe(403);
    mockSwitchResult = true; // restore
  });
});
