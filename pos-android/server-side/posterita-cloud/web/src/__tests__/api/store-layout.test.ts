import { describe, it, expect, vi, beforeEach } from "vitest";

let tableResults: Record<string, { data: any; error: any }> = {};
let supabaseOps: Array<{ table: string; op: string; data?: any; filters: Record<string, any> }> = [];

function createChain(table: string) {
  const state = { op: "select" as string, data: undefined as any, filters: {} as Record<string, any> };
  function resolve() {
    supabaseOps.push({ table, op: state.op, data: state.data, filters: state.filters });
    const fk = Object.entries(state.filters).map(([k, v]) => `${k}=${v}`).join(",");
    return tableResults[`${table}:${fk}`] ?? tableResults[table] ?? { data: state.op === "select" ? [] : null, error: null };
  }
  const chain: any = {};
  for (const m of ["select", "eq", "gte", "order", "limit", "range", "in", "neq", "is", "not", "or", "gt", "lte", "ilike"] as const) {
    chain[m] = (...args: any[]) => { if (m === "eq") state.filters[args[0]] = args[1]; return chain; };
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
  return { json: () => Promise.resolve(body), url: url ?? "http://localhost/api/store-layout" };
}

beforeEach(() => { tableResults = {}; supabaseOps = []; vi.resetModules(); });

describe("/api/store-layout GET", () => {
  it("returns zones for the account", async () => {
    tableResults["store_layout_zone"] = { data: [
      { id: 1, store_id: 1, zone_name: "Main Floor", shelf_start: 1, shelf_end: 20, height_labels: ["A","B","C"] },
    ], error: null };

    const { GET } = await import("../../app/api/store-layout/route");
    const res = await GET(mockReq({}, "http://localhost/api/store-layout?store_id=1"));
    const json = await res.json();

    expect(json.zones).toHaveLength(1);
    expect(json.zones[0].zone_name).toBe("Main Floor");
  });
});

describe("/api/store-layout POST", () => {
  it("creates a zone", async () => {
    tableResults["store_layout_zone"] = { data: { id: 1, zone_name: "Back Room" }, error: null };

    const { POST } = await import("../../app/api/store-layout/route");
    const res = await POST(mockReq({
      store_id: 1, zone_name: "Back Room", shelf_start: 30, shelf_end: 35, height_labels: ["A","B"],
    }));
    const json = await res.json();

    // Route may return 200 or 201 depending on implementation
    expect([200, 201]).toContain(res.status);
    const insert = supabaseOps.find(o => o.table === "store_layout_zone" && o.op === "insert");
    expect(insert).toBeDefined();
  });

  it("returns 400 when zone_name is missing", async () => {
    const { POST } = await import("../../app/api/store-layout/route");
    const res = await POST(mockReq({ store_id: 1 }));
    expect(res.status).toBe(400);
  });
});
