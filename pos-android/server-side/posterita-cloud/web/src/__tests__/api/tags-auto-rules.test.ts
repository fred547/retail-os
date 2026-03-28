import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Supabase mock ──────────────────────────────────────────────
let tableResults: Record<string, { data: any; error: any; count?: number }> = {};
let supabaseOps: Array<{ table: string; op: string; data?: any; filters: Record<string, any> }> = [];

function createChain(table: string) {
  const state = { op: "select" as string, data: undefined as any, filters: {} as Record<string, any> };
  function resolve() {
    supabaseOps.push({ table, op: state.op, data: state.data, filters: state.filters });
    const fk = Object.entries(state.filters).map(([k, v]) => `${k}=${v}`).join(",");
    return tableResults[`${table}:${fk}`] ?? tableResults[table] ?? { data: state.op === "select" ? [] : null, error: null, count: 0 };
  }
  const chain: any = {};
  for (const m of ["select", "eq", "gte", "order", "limit", "range", "in", "neq", "is", "not", "or", "gt", "lte", "ilike", "lt", "contains"] as const) {
    chain[m] = (...args: any[]) => { if (m === "eq") state.filters[args[0]] = args[1]; if (m === "in") state.filters[args[0]] = args[1]; return chain; };
  }
  for (const m of ["insert", "update", "upsert", "delete"] as const) {
    chain[m] = (...args: any[]) => { state.op = m; state.data = args[0]; return chain; };
  }
  chain.single = () => { const r = resolve(); const d = Array.isArray(r.data) ? r.data[0] ?? null : r.data; return Promise.resolve({ ...r, data: d }); };
  chain.maybeSingle = chain.single;
  chain.then = (f: Function, r?: Function) => Promise.resolve(resolve()).then(f as any, r as any);
  return chain;
}

vi.mock("@/lib/supabase/admin", () => ({ getDb: () => ({ from: (t: string) => createChain(t) }) }));
vi.mock("@/lib/account-context", () => ({ getSessionAccountId: () => Promise.resolve("test-tag-acc") }));

function mockReq(body: any, url?: string): any {
  return { json: () => Promise.resolve(body), url: url ?? "http://localhost" };
}

beforeEach(() => {
  tableResults = {};
  supabaseOps = [];
  vi.resetModules();
  vi.doMock("@/lib/supabase/admin", () => ({ getDb: () => ({ from: (t: string) => createChain(t) }) }));
  vi.doMock("@/lib/account-context", () => ({ getSessionAccountId: () => Promise.resolve("test-tag-acc") }));
});

// ─── GET /api/tags/auto-rules ───────────────────────────────────
describe("GET /api/tags/auto-rules — list rules", () => {
  it("returns all active rules", async () => {
    tableResults["auto_tag_rule"] = {
      data: [
        { id: 1, name: "Food tags", rule_type: "category", is_active: true },
        { id: 2, name: "Premium tags", rule_type: "price_range", is_active: true },
      ],
      error: null,
    };

    const { GET } = await import("../../app/api/tags/auto-rules/route");
    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.rules).toHaveLength(2);
  });

  it("returns 401 when not authenticated", async () => {
    vi.resetModules();
    vi.doMock("@/lib/supabase/admin", () => ({ getDb: () => ({ from: (t: string) => createChain(t) }) }));
    vi.doMock("@/lib/account-context", () => ({ getSessionAccountId: () => Promise.resolve(null) }));

    const { GET } = await import("../../app/api/tags/auto-rules/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/tags/auto-rules — create rule ───────────────────
describe("POST /api/tags/auto-rules — create rule", () => {
  it("creates a category rule", async () => {
    tableResults["auto_tag_rule"] = {
      data: { id: 10, name: "Food Rule", rule_type: "category", tag_ids: [1, 2], category_ids: [5] },
      error: null,
    };

    const { POST } = await import("../../app/api/tags/auto-rules/route");
    const res = await POST(mockReq({
      name: "Food Rule",
      rule_type: "category",
      category_ids: [5],
      tag_ids: [1, 2],
    }) as any);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.rule.name).toBe("Food Rule");
    expect(json.rule.rule_type).toBe("category");
  });

  it("creates a price_range rule", async () => {
    tableResults["auto_tag_rule"] = {
      data: { id: 11, name: "Premium", rule_type: "price_range", min_price: 100, max_price: 500, tag_ids: [3] },
      error: null,
    };

    const { POST } = await import("../../app/api/tags/auto-rules/route");
    const res = await POST(mockReq({
      name: "Premium",
      rule_type: "price_range",
      min_price: 100,
      max_price: 500,
      tag_ids: [3],
    }) as any);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.rule.rule_type).toBe("price_range");
  });

  it("creates a keyword rule", async () => {
    tableResults["auto_tag_rule"] = {
      data: { id: 12, name: "Organic", rule_type: "keyword", keyword: "organic", tag_ids: [4] },
      error: null,
    };

    const { POST } = await import("../../app/api/tags/auto-rules/route");
    const res = await POST(mockReq({
      name: "Organic",
      rule_type: "keyword",
      keyword: "organic",
      tag_ids: [4],
    }) as any);

    expect(res.status).toBe(201);
  });

  it("rejects missing name", async () => {
    const { POST } = await import("../../app/api/tags/auto-rules/route");
    const res = await POST(mockReq({ rule_type: "category", tag_ids: [1] }) as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("name");
  });

  it("rejects missing tag_ids", async () => {
    const { POST } = await import("../../app/api/tags/auto-rules/route");
    const res = await POST(mockReq({ name: "Test", rule_type: "category" }) as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("tag_ids");
  });

  it("rejects empty tag_ids array", async () => {
    const { POST } = await import("../../app/api/tags/auto-rules/route");
    const res = await POST(mockReq({ name: "Test", rule_type: "category", tag_ids: [] }) as any);
    expect(res.status).toBe(400);
  });

  it("rejects invalid rule_type", async () => {
    const { POST } = await import("../../app/api/tags/auto-rules/route");
    const res = await POST(mockReq({ name: "Test", rule_type: "invalid_type", tag_ids: [1] }) as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("rule_type");
  });
});

// ─── PATCH /api/tags/auto-rules — toggle active/inactive ───────
describe("PATCH /api/tags/auto-rules — update rule", () => {
  it("toggles a rule to inactive", async () => {
    tableResults["auto_tag_rule"] = {
      data: { id: 10, name: "Food Rule", is_active: false },
      error: null,
    };

    const { PATCH } = await import("../../app/api/tags/auto-rules/route");
    const res = await PATCH(mockReq({ id: 10, is_active: false }) as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.rule).toBeDefined();

    const updateOp = supabaseOps.find(o => o.table === "auto_tag_rule" && o.op === "update");
    expect(updateOp).toBeDefined();
    expect(updateOp?.data?.is_active).toBe(false);
  });

  it("rejects missing id", async () => {
    const { PATCH } = await import("../../app/api/tags/auto-rules/route");
    const res = await PATCH(mockReq({ is_active: false }) as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("id");
  });
});

// ─── DELETE /api/tags/auto-rules — soft delete ──────────────────
describe("DELETE /api/tags/auto-rules — soft delete", () => {
  it("soft deletes a rule", async () => {
    tableResults["auto_tag_rule"] = { data: null, error: null };

    const { DELETE } = await import("../../app/api/tags/auto-rules/route");
    const res = await DELETE(mockReq({ id: 10 }) as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    const updateOp = supabaseOps.find(o => o.table === "auto_tag_rule" && o.op === "update");
    expect(updateOp).toBeDefined();
    expect(updateOp?.data?.is_deleted).toBe(true);
  });

  it("rejects missing id", async () => {
    const { DELETE } = await import("../../app/api/tags/auto-rules/route");
    const res = await DELETE(mockReq({}) as any);
    expect(res.status).toBe(400);
  });
});

// ─── POST /api/tags/auto-apply — execute engine ────────────────
describe("POST /api/tags/auto-apply — execute rules engine", () => {
  it("applies category rules to matching products", async () => {
    tableResults["auto_tag_rule"] = {
      data: [
        { id: 1, rule_type: "category", category_ids: [5], tag_ids: [10, 20], is_active: true, keyword: null, min_price: null, max_price: null },
      ],
      error: null,
    };
    tableResults["product"] = {
      data: [
        { product_id: 100, name: "Burger", productcategory_id: 5, sellingprice: 250, description: null },
        { product_id: 101, name: "Coffee", productcategory_id: 6, sellingprice: 80, description: null },
      ],
      error: null,
    };
    tableResults["product_tag"] = { data: null, error: null };

    const { POST } = await import("../../app/api/tags/auto-apply/route");
    const res = await POST(mockReq({}) as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.applied).toBe(2); // 1 product * 2 tags
    expect(json.rules_evaluated).toBe(1);
    expect(json.products_checked).toBe(2);
  });

  it("applies price_range rules correctly", async () => {
    tableResults["auto_tag_rule"] = {
      data: [
        { id: 2, rule_type: "price_range", min_price: 100, max_price: 300, tag_ids: [30], is_active: true, category_ids: [], keyword: null },
      ],
      error: null,
    };
    tableResults["product"] = {
      data: [
        { product_id: 100, name: "Burger", productcategory_id: 5, sellingprice: 250, description: null },
        { product_id: 101, name: "Water", productcategory_id: 6, sellingprice: 30, description: null },
        { product_id: 102, name: "Steak", productcategory_id: 5, sellingprice: 500, description: null },
      ],
      error: null,
    };
    tableResults["product_tag"] = { data: null, error: null };

    const { POST } = await import("../../app/api/tags/auto-apply/route");
    const res = await POST(mockReq({}) as any);
    const json = await res.json();

    expect(json.applied).toBe(1); // only Burger (250) is in range [100, 300]
  });

  it("applies keyword rules correctly", async () => {
    tableResults["auto_tag_rule"] = {
      data: [
        { id: 3, rule_type: "keyword", keyword: "organic", tag_ids: [40], is_active: true, category_ids: [], min_price: null, max_price: null },
      ],
      error: null,
    };
    tableResults["product"] = {
      data: [
        { product_id: 100, name: "Organic Salad", productcategory_id: 5, sellingprice: 200, description: null },
        { product_id: 101, name: "Regular Salad", productcategory_id: 5, sellingprice: 150, description: "Fresh organic ingredients" },
        { product_id: 102, name: "Burger", productcategory_id: 5, sellingprice: 250, description: "Classic beef" },
      ],
      error: null,
    };
    tableResults["product_tag"] = { data: null, error: null };

    const { POST } = await import("../../app/api/tags/auto-apply/route");
    const res = await POST(mockReq({}) as any);
    const json = await res.json();

    expect(json.applied).toBe(2); // "Organic Salad" (name) + "Regular Salad" (description)
  });

  it("returns zero when no active rules exist", async () => {
    tableResults["auto_tag_rule"] = { data: [], error: null };

    const { POST } = await import("../../app/api/tags/auto-apply/route");
    const res = await POST(mockReq({}) as any);
    const json = await res.json();

    expect(json.applied).toBe(0);
    expect(json.message).toContain("No active rules");
  });

  it("returns zero when no products match", async () => {
    tableResults["auto_tag_rule"] = {
      data: [{ id: 1, rule_type: "category", category_ids: [999], tag_ids: [10], is_active: true, keyword: null, min_price: null, max_price: null }],
      error: null,
    };
    tableResults["product"] = {
      data: [{ product_id: 100, name: "Burger", productcategory_id: 5, sellingprice: 250, description: null }],
      error: null,
    };

    const { POST } = await import("../../app/api/tags/auto-apply/route");
    const res = await POST(mockReq({}) as any);
    const json = await res.json();

    expect(json.applied).toBe(0);
    expect(json.message).toContain("No products matched");
  });

  it("supports targeting specific product_ids", async () => {
    tableResults["auto_tag_rule"] = {
      data: [{ id: 1, rule_type: "category", category_ids: [5], tag_ids: [10], is_active: true, keyword: null, min_price: null, max_price: null }],
      error: null,
    };
    tableResults["product"] = {
      data: [{ product_id: 100, name: "Burger", productcategory_id: 5, sellingprice: 250, description: null }],
      error: null,
    };
    tableResults["product_tag"] = { data: null, error: null };

    const { POST } = await import("../../app/api/tags/auto-apply/route");
    const res = await POST(mockReq({ product_ids: [100] }) as any);
    const json = await res.json();

    expect(json.applied).toBe(1);
  });

  it("uses upsert with ignoreDuplicates for safe re-runs", async () => {
    tableResults["auto_tag_rule"] = {
      data: [{ id: 1, rule_type: "category", category_ids: [5], tag_ids: [10], is_active: true, keyword: null, min_price: null, max_price: null }],
      error: null,
    };
    tableResults["product"] = {
      data: [{ product_id: 100, name: "Burger", productcategory_id: 5, sellingprice: 250, description: null }],
      error: null,
    };
    tableResults["product_tag"] = { data: null, error: null };

    const { POST } = await import("../../app/api/tags/auto-apply/route");
    await POST(mockReq({}) as any);

    const upsertOp = supabaseOps.find(o => o.table === "product_tag" && o.op === "upsert");
    expect(upsertOp).toBeDefined();
  });
});
