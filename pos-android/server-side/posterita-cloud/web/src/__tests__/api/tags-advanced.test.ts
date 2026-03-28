import { describe, it, expect, vi, beforeEach } from "vitest";

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
  for (const m of ["select", "eq", "gte", "order", "limit", "range", "in", "neq", "is", "not", "or", "gt", "lte", "ilike"] as const) {
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
vi.mock("@/lib/account-context", () => ({ getSessionAccountId: () => Promise.resolve("test-acc") }));

function mockReq(body: any, url?: string): any {
  return { json: () => Promise.resolve(body), url: url ?? "http://localhost" };
}

beforeEach(() => { tableResults = {}; supabaseOps = []; vi.resetModules(); });

describe("/api/tags/assign POST — bulk tag assignment", () => {
  it("adds tags to products", async () => {
    tableResults["product_tag"] = { data: null, error: null };

    const { POST } = await import("../../app/api/tags/assign/route");
    const res = await POST(mockReq({
      entity_type: "product",
      entity_ids: [1, 2, 3],
      add_tag_ids: [10, 20],
    }));
    const json = await res.json();

    expect(json.added).toBe(6); // 3 products x 2 tags
  });

  it("removes tags from products", async () => {
    tableResults["product_tag"] = { data: null, error: null, count: 3 };

    const { POST } = await import("../../app/api/tags/assign/route");
    const res = await POST(mockReq({
      entity_type: "product",
      entity_ids: [1, 2, 3],
      remove_tag_ids: [10],
    }));
    const json = await res.json();

    expect(json.removed).toBeGreaterThanOrEqual(0);
  });

  it("rejects invalid entity_type", async () => {
    const { POST } = await import("../../app/api/tags/assign/route");
    const res = await POST(mockReq({ entity_type: "invalid", entity_ids: [1], add_tag_ids: [1] }));
    expect(res.status).toBe(400);
  });

  it("rejects empty entity_ids", async () => {
    const { POST } = await import("../../app/api/tags/assign/route");
    const res = await POST(mockReq({ entity_type: "product", entity_ids: [], add_tag_ids: [1] }));
    expect(res.status).toBe(400);
  });

  it("supports customer entity type", async () => {
    tableResults["customer_tag"] = { data: null, error: null };

    const { POST } = await import("../../app/api/tags/assign/route");
    const res = await POST(mockReq({
      entity_type: "customer",
      entity_ids: [5],
      add_tag_ids: [10],
    }));
    const json = await res.json();

    expect(json.added).toBe(1);
    const upsert = supabaseOps.find(o => o.table === "customer_tag" && o.op === "upsert");
    expect(upsert).toBeDefined();
  });

  it("supports order entity type", async () => {
    tableResults["order_tag"] = { data: null, error: null };

    const { POST } = await import("../../app/api/tags/assign/route");
    const res = await POST(mockReq({
      entity_type: "order",
      entity_ids: [100],
      add_tag_ids: [5, 6],
    }));
    const json = await res.json();

    expect(json.added).toBe(2);
  });
});

describe("/api/tags/report GET — sales by tag", () => {
  it("returns tag report data", async () => {
    // The report route joins multiple tables — mock all
    tableResults["product_tag"] = { data: [
      { product_id: 1, tag_id: 10 },
      { product_id: 2, tag_id: 10 },
    ], error: null };
    tableResults["tag"] = { data: [
      { tag_id: 10, name: "Summer", color: "#FF0000", tag_group_id: 1 },
    ], error: null };
    tableResults["tag_group"] = { data: [
      { tag_group_id: 1, name: "Season" },
    ], error: null };
    tableResults["orderline"] = { data: [], error: null };

    const { GET } = await import("../../app/api/tags/report/route");
    const res = await GET(mockReq({}, "http://localhost/api/tags/report"));
    const json = await res.json();

    expect(res.status).toBe(200);
    // Report returns breakdown + summary
    expect(json).toHaveProperty("breakdown");
    expect(json).toHaveProperty("summary");
  });
});
