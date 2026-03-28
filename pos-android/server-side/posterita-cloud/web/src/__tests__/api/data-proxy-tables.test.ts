import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Data proxy (/api/data) tests for:
 * 1. Table allowlist — newly added tables (quotation, quotation_line)
 * 2. Soft-delete auto-filtering
 * 3. Account ID mismatch rejection
 * 4. NO_ACCOUNT_ID_TABLES bypass
 */

let supabaseOps: Array<{ table: string; op: string; data?: any; filters: Record<string, any> }> = [];
let tableResults: Record<string, { data: any; error: any; count?: number }> = {};

function createChain(table: string) {
  const state = { op: "select" as string, data: undefined as any, filters: {} as Record<string, any> };
  function resolve() {
    supabaseOps.push({ table, op: state.op, data: state.data, filters: { ...state.filters } });
    const filterKey = Object.entries(state.filters).map(([k, v]) => `${k}=${v}`).join(",");
    return tableResults[`${table}:${filterKey}`] ?? tableResults[table] ?? { data: [], error: null, count: 0 };
  }
  const chain: any = {};
  for (const m of ["select", "eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "order", "limit", "range", "in", "is", "not", "or"] as const) {
    chain[m] = (...args: any[]) => {
      if (m === "eq") state.filters[args[0]] = args[1];
      return chain;
    };
  }
  for (const m of ["insert", "update", "upsert", "delete"] as const) {
    chain[m] = (...args: any[]) => { state.op = m; state.data = args[0]; return chain; };
  }
  chain.single = () => { const r = resolve(); return Promise.resolve({ ...r, data: Array.isArray(r.data) ? r.data[0] ?? null : r.data }); };
  chain.maybeSingle = chain.single;
  chain.then = (f: Function, r?: Function) => Promise.resolve(resolve()).then(f as any, r as any);
  return chain;
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: (table: string) => createChain(table) }),
}));

let mockAccountId: string | null = "test_data_acc";
vi.mock("@/lib/account-context", () => ({
  getSessionAccountId: () => Promise.resolve(mockAccountId),
}));

let POST: Function;

beforeEach(async () => {
  supabaseOps = [];
  tableResults = {};
  mockAccountId = "test_data_acc";
  vi.resetModules();
  const mod = await import("@/app/api/data/route");
  POST = mod.POST;
});

function dataReq(body: any) {
  return new Request("http://localhost/api/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

describe("/api/data — table allowlist", () => {
  it("rejects disallowed tables", async () => {
    const res = await POST(dataReq({ table: "owner" }));
    const body = await res.json();
    expect(body.error).toContain("not allowed");
  });

  it("allows quotation table", async () => {
    const res = await POST(dataReq({ table: "quotation" }));
    const body = await res.json();
    expect(body.error).toBeNull();
  });

  it("allows quotation_line table", async () => {
    const res = await POST(dataReq({ table: "quotation_line" }));
    const body = await res.json();
    expect(body.error).toBeNull();
  });

  const newlyAddedTables = [
    "tag_group", "tag", "product_tag", "customer_tag", "order_tag",
    "quotation", "quotation_line",
  ];

  for (const table of newlyAddedTables) {
    it(`allows ${table} in allowlist`, async () => {
      const res = await POST(dataReq({ table }));
      const body = await res.json();
      expect(body.error).toBeNull();
    });
  }
});

describe("/api/data — soft-delete auto-filter", () => {
  const softDeleteTables = ["product", "store", "terminal", "pos_user", "customer", "productcategory", "orders"];

  for (const table of softDeleteTables) {
    it(`auto-filters is_deleted=false on ${table}`, async () => {
      await POST(dataReq({ table }));
      const op = supabaseOps.find((o) => o.table === table);
      expect(op).toBeDefined();
      expect(op!.filters.is_deleted).toBe(false);
    });
  }

  it("skips soft-delete filter when client explicitly includes is_deleted", async () => {
    await POST(dataReq({
      table: "product",
      filters: [{ column: "is_deleted", op: "eq", value: true }],
    }));
    // The auto-filter should NOT override the client's explicit filter
    const op = supabaseOps.find((o) => o.table === "product");
    expect(op).toBeDefined();
    // Client explicitly requested is_deleted=true, so auto-filter was skipped
    expect(op!.filters.is_deleted).toBe(true);
  });
});

describe("/api/data — security", () => {
  it("returns 401 if not authenticated", async () => {
    mockAccountId = null;
    vi.resetModules();
    const mod = await import("@/app/api/data/route");
    const res = await mod.POST(dataReq({ table: "product" }));
    expect(res.status).toBe(401);
  });

  it("rejects account_id mismatch", async () => {
    const res = await POST(dataReq({
      table: "product",
      filters: [{ column: "account_id", op: "eq", value: "other_account" }],
    }));
    const body = await res.json();
    expect(body.error).toContain("Account ID mismatch");
  });

  it("auto-injects account_id for tables that have it", async () => {
    await POST(dataReq({ table: "product" }));
    const op = supabaseOps.find((o) => o.table === "product");
    expect(op!.filters.account_id).toBe("test_data_acc");
  });

  it("skips account_id injection for NO_ACCOUNT_ID_TABLES", async () => {
    await POST(dataReq({ table: "orderline" }));
    const op = supabaseOps.find((o) => o.table === "orderline");
    expect(op!.filters.account_id).toBeUndefined();
  });
});

describe("/api/data — batch queries", () => {
  it("handles array of queries", async () => {
    const res = await POST(dataReq([
      { table: "product" },
      { table: "productcategory" },
    ]));
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(2);
  });
});
