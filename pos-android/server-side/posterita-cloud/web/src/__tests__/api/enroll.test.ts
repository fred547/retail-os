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

function mockReq(body: any): any {
  return { json: () => Promise.resolve(body) };
}

beforeEach(() => { tableResults = {}; supabaseOps = []; vi.resetModules(); });

describe("/api/enroll POST — device enrollment", () => {
  it("returns 400 when account_id is missing", async () => {
    const { POST } = await import("../../app/api/enroll/route");
    const res = await POST(mockReq({ store_id: 1, terminal_id: 1 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when store_id is missing", async () => {
    const { POST } = await import("../../app/api/enroll/route");
    const res = await POST(mockReq({ account_id: "acc1", terminal_id: 1 }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when account does not exist", async () => {
    tableResults["account"] = { data: null, error: null };

    const { POST } = await import("../../app/api/enroll/route");
    const res = await POST(mockReq({ account_id: "fake", store_id: 1, terminal_id: 1 }));
    expect(res.status).toBe(404);
  });

  it("returns 404 when store does not exist", async () => {
    tableResults["account"] = { data: { account_id: "acc1" }, error: null };
    tableResults["store"] = { data: null, error: null };

    const { POST } = await import("../../app/api/enroll/route");
    const res = await POST(mockReq({ account_id: "acc1", store_id: 999, terminal_id: 1 }));
    expect(res.status).toBe(404);
  });

  it("returns 404 when terminal does not exist", async () => {
    tableResults["account"] = { data: { account_id: "acc1" }, error: null };
    tableResults["store"] = { data: { store_id: 1 }, error: null };
    tableResults["terminal"] = { data: null, error: null };

    const { POST } = await import("../../app/api/enroll/route");
    const res = await POST(mockReq({ account_id: "acc1", store_id: 1, terminal_id: 999 }));
    expect(res.status).toBe(404);
  });

  it("returns 409 when terminal is locked to another device", async () => {
    tableResults["account"] = { data: { account_id: "acc1" }, error: null };
    tableResults["store"] = { data: { store_id: 1 }, error: null };
    tableResults["terminal"] = { data: { terminal_id: 1, locked_device_id: "device-A", locked_device_name: "Old POS" }, error: null };

    const { POST } = await import("../../app/api/enroll/route");
    const res = await POST(mockReq({
      account_id: "acc1", store_id: 1, terminal_id: 1, device_id: "device-B",
    }));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.locked_device_id).toBe("device-A");
    expect(json.hint).toContain("unlock");
  });

  it("allows enrollment when terminal has no lock", async () => {
    tableResults["account"] = { data: { account_id: "acc1" }, error: null };
    tableResults["store"] = { data: { store_id: 1, name: "Store" }, error: null };
    tableResults["terminal"] = { data: { terminal_id: 1, locked_device_id: null }, error: null };
    tableResults["pos_user"] = { data: [], error: null };
    tableResults["product"] = { data: [], error: null };
    tableResults["productcategory"] = { data: [], error: null };
    tableResults["tax"] = { data: [], error: null };
    tableResults["modifier"] = { data: [], error: null };
    tableResults["preference"] = { data: [], error: null };
    tableResults["customer"] = { data: [], error: null };
    tableResults["discountcode"] = { data: [], error: null };

    const { POST } = await import("../../app/api/enroll/route");
    const res = await POST(mockReq({
      account_id: "acc1", store_id: 1, terminal_id: 1, device_id: "device-new",
    }));

    expect(res.status).toBe(200);
    // Verify terminal was locked to device
    const lockUpdate = supabaseOps.find(o => o.table === "terminal" && o.op === "update");
    expect(lockUpdate).toBeDefined();
    expect(lockUpdate!.data.locked_device_id).toBe("device-new");
  });

  it("allows same device to re-enroll", async () => {
    tableResults["account"] = { data: { account_id: "acc1" }, error: null };
    tableResults["store"] = { data: { store_id: 1, name: "Store" }, error: null };
    tableResults["terminal"] = { data: { terminal_id: 1, locked_device_id: "device-A" }, error: null };
    tableResults["pos_user"] = { data: [], error: null };
    tableResults["product"] = { data: [], error: null };
    tableResults["productcategory"] = { data: [], error: null };
    tableResults["tax"] = { data: [], error: null };
    tableResults["modifier"] = { data: [], error: null };
    tableResults["preference"] = { data: [], error: null };
    tableResults["customer"] = { data: [], error: null };
    tableResults["discountcode"] = { data: [], error: null };

    const { POST } = await import("../../app/api/enroll/route");
    const res = await POST(mockReq({
      account_id: "acc1", store_id: 1, terminal_id: 1, device_id: "device-A",
    }));

    expect(res.status).toBe(200);
  });
});
