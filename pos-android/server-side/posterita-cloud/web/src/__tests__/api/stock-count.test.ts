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

let mockAccountId: string | null = "test-stock-acc";

vi.mock("@/lib/supabase/admin", () => ({ getDb: () => ({ from: (t: string) => createChain(t) }) }));
vi.mock("@/lib/account-context", () => ({ getSessionAccountId: () => Promise.resolve(mockAccountId) }));

function mockReq(body?: any, url?: string): any {
  return {
    json: () => Promise.resolve(body ?? {}),
    url: url ?? "http://localhost/api/stock-count",
    text: () => Promise.resolve(JSON.stringify(body ?? {})),
    headers: new Map(),
  };
}

function mockParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  tableResults = {};
  supabaseOps = [];
  mockAccountId = "test-stock-acc";
});

// ─── GET /api/stock-count — list count plans ─────────────────────
describe("GET /api/stock-count", () => {
  it("returns 401 when not authenticated", async () => {
    mockAccountId = null;
    const { GET } = await import("../../app/api/stock-count/route");
    const res = await GET(mockReq(undefined, "http://localhost/api/stock-count"));
    expect(res.status).toBe(401);
  });

  it("returns empty plans list when no plans exist", async () => {
    tableResults["count_plan"] = { data: [], error: null };
    const { GET } = await import("../../app/api/stock-count/route");
    const res = await GET(mockReq(undefined, "http://localhost/api/stock-count"));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.plans).toEqual([]);
  });

  it("returns plans with assignments enriched", async () => {
    tableResults["count_plan"] = {
      data: [{ id: 10, name: "Full Count", store_id: 1, status: "draft" }],
      error: null,
    };
    tableResults["count_zone_assignment"] = {
      data: [{ plan_id: 10, user_id: 1, shelf_start: 1, shelf_end: 5 }],
      error: null,
    };
    const { GET } = await import("../../app/api/stock-count/route");
    const res = await GET(mockReq(undefined, "http://localhost/api/stock-count"));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.plans).toHaveLength(1);
    expect(json.plans[0].assignments).toHaveLength(1);
    expect(json.plans[0].assignments[0].plan_id).toBe(10);
  });

  it("returns 500 on database error", async () => {
    tableResults["count_plan"] = { data: null, error: { message: "db fail" } };
    const { GET } = await import("../../app/api/stock-count/route");
    const res = await GET(mockReq(undefined, "http://localhost/api/stock-count"));
    expect(res.status).toBe(500);
  });
});

// ─── POST /api/stock-count — create count plan ──────────────────
describe("POST /api/stock-count", () => {
  it("returns 401 when not authenticated", async () => {
    mockAccountId = null;
    const { POST } = await import("../../app/api/stock-count/route");
    const res = await POST(mockReq({ name: "Test", store_id: 1 }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    const { POST } = await import("../../app/api/stock-count/route");
    const res = await POST(mockReq({ store_id: 1 }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toContain("name");
  });

  it("returns 400 when name is empty string", async () => {
    const { POST } = await import("../../app/api/stock-count/route");
    const res = await POST(mockReq({ name: "  ", store_id: 1 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when store_id is missing", async () => {
    const { POST } = await import("../../app/api/stock-count/route");
    const res = await POST(mockReq({ name: "Full Count" }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toContain("store_id");
  });

  it("creates plan and returns 201 on success", async () => {
    tableResults["count_plan"] = {
      data: { id: 20, name: "Q1 Count", store_id: 1, account_id: "test-stock-acc", status: "draft" },
      error: null,
    };
    tableResults["count_zone_assignment"] = { data: [], error: null };
    const { POST } = await import("../../app/api/stock-count/route");
    const res = await POST(mockReq({ name: "Q1 Count", store_id: 1 }));
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.plan.name).toBe("Q1 Count");
    const insertOp = supabaseOps.find(o => o.table === "count_plan" && o.op === "insert");
    expect(insertOp).toBeDefined();
  });

  it("creates plan with assignments", async () => {
    tableResults["count_plan"] = {
      data: { id: 21, name: "Zone Count", store_id: 1 },
      error: null,
    };
    tableResults["count_zone_assignment"] = { data: [{ plan_id: 21, user_id: 5 }], error: null };
    const { POST } = await import("../../app/api/stock-count/route");
    const res = await POST(mockReq({
      name: "Zone Count",
      store_id: 1,
      assignments: [{ user_id: 5, shelf_start: 1, shelf_end: 10, height_labels: ["A", "B"] }],
    }));
    expect(res.status).toBe(201);
    const assignInsert = supabaseOps.find(o => o.table === "count_zone_assignment" && o.op === "insert");
    expect(assignInsert).toBeDefined();
  });
});

// ─── GET /api/stock-count/[id] — plan detail ────────────────────
describe("GET /api/stock-count/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAccountId = null;
    const { GET } = await import("../../app/api/stock-count/[id]/route");
    const res = await GET(mockReq(), mockParams("10") as any);
    expect(res.status).toBe(401);
  });

  it("returns 404 when plan not found", async () => {
    tableResults["count_plan"] = { data: null, error: null };
    tableResults["count_zone_assignment"] = { data: [], error: null };
    const { GET } = await import("../../app/api/stock-count/[id]/route");
    const res = await GET(mockReq(), mockParams("999") as any);
    expect(res.status).toBe(404);
  });

  it("returns plan with assignments", async () => {
    tableResults["count_plan"] = {
      data: { id: 10, name: "Full Count", status: "active" },
      error: null,
    };
    tableResults["count_zone_assignment"] = {
      data: [{ plan_id: 10, user_id: 1, shelf_start: 1, shelf_end: 5 }],
      error: null,
    };
    const { GET } = await import("../../app/api/stock-count/[id]/route");
    const res = await GET(mockReq(), mockParams("10") as any);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.plan.name).toBe("Full Count");
    expect(json.plan.assignments).toHaveLength(1);
  });
});

// ─── PATCH /api/stock-count/[id] — update plan ──────────────────
describe("PATCH /api/stock-count/[id]", () => {
  it("updates plan status to active and sets started_at", async () => {
    tableResults["count_plan"] = { data: { id: 10, status: "active" }, error: null };
    tableResults["count_zone_assignment"] = { data: [], error: null };
    const { PATCH } = await import("../../app/api/stock-count/[id]/route");
    const res = await PATCH(mockReq({ status: "active" }), mockParams("10") as any);
    expect(res.status).toBe(200);
    const updateOp = supabaseOps.find(o => o.table === "count_plan" && o.op === "update");
    expect(updateOp).toBeDefined();
    expect(updateOp?.data?.status).toBe("active");
    expect(updateOp?.data?.started_at).toBeDefined();
  });

  it("updates plan status to completed and sets completed_at", async () => {
    tableResults["count_plan"] = { data: { id: 10, status: "completed" }, error: null };
    tableResults["count_zone_assignment"] = { data: [], error: null };
    const { PATCH } = await import("../../app/api/stock-count/[id]/route");
    const res = await PATCH(mockReq({ status: "completed" }), mockParams("10") as any);
    expect(res.status).toBe(200);
    const updateOp = supabaseOps.find(o => o.table === "count_plan" && o.op === "update");
    expect(updateOp?.data?.completed_at).toBeDefined();
  });

  it("replaces assignments when provided", async () => {
    tableResults["count_plan"] = { data: { id: 10, status: "draft" }, error: null };
    tableResults["count_zone_assignment"] = { data: [], error: null };
    const { PATCH } = await import("../../app/api/stock-count/[id]/route");
    const res = await PATCH(mockReq({
      assignments: [{ user_id: 2, shelf_start: 5, shelf_end: 10 }],
    }), mockParams("10") as any);
    expect(res.status).toBe(200);
    const deleteOp = supabaseOps.find(o => o.table === "count_zone_assignment" && o.op === "delete");
    expect(deleteOp).toBeDefined();
    const insertOp = supabaseOps.find(o => o.table === "count_zone_assignment" && o.op === "insert");
    expect(insertOp).toBeDefined();
  });
});

// ─── DELETE /api/stock-count/[id] — soft delete ──────────────────
describe("DELETE /api/stock-count/[id]", () => {
  it("soft deletes a plan", async () => {
    tableResults["count_plan"] = { data: null, error: null };
    const { DELETE } = await import("../../app/api/stock-count/[id]/route");
    const res = await DELETE(mockReq(), mockParams("10") as any);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    const updateOp = supabaseOps.find(o => o.table === "count_plan" && o.op === "update");
    expect(updateOp?.data?.is_deleted).toBe(true);
  });
});

// ─── GET /api/stock-count/[id]/dashboard ─────────────────────────
describe("GET /api/stock-count/[id]/dashboard", () => {
  it("returns 401 when not authenticated", async () => {
    mockAccountId = null;
    const { GET } = await import("../../app/api/stock-count/[id]/dashboard/route");
    const res = await GET(mockReq(), mockParams("10") as any);
    expect(res.status).toBe(401);
  });

  it("returns 404 when plan not found", async () => {
    tableResults["count_plan"] = { data: null, error: null };
    tableResults["count_zone_assignment"] = { data: [], error: null };
    tableResults["count_scan"] = { data: [], error: null };
    const { GET } = await import("../../app/api/stock-count/[id]/dashboard/route");
    const res = await GET(mockReq(), mockParams("999") as any);
    expect(res.status).toBe(404);
  });

  it("returns dashboard with empty scans", async () => {
    tableResults["count_plan"] = {
      data: { id: 10, name: "Count A", status: "active" },
      error: null,
    };
    tableResults["count_zone_assignment"] = {
      data: [{ shelf_start: 1, shelf_end: 3, height_labels: ["A", "B"] }],
      error: null,
    };
    tableResults["count_scan"] = { data: [], error: null };
    const { GET } = await import("../../app/api/stock-count/[id]/dashboard/route");
    const res = await GET(mockReq(), mockParams("10") as any);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.shelf_map).toEqual([]);
    expect(json.conflicts).toEqual([]);
    expect(json.unknowns).toEqual([]);
    expect(json.summary.total_locations_counted).toBe(0);
    expect(json.summary.total_expected_locations).toBe(6); // 3 shelves * 2 heights
    expect(json.summary.progress_percent).toBe(0);
  });

  it("computes progress and staff stats from scans", async () => {
    tableResults["count_plan"] = {
      data: { id: 10, name: "Count A", status: "active" },
      error: null,
    };
    tableResults["count_zone_assignment"] = {
      data: [{ shelf_start: 1, shelf_end: 2, height_labels: ["A"] }],
      error: null,
    };
    tableResults["count_scan"] = {
      data: [
        { shelf: 1, height: "A", user_id: 1, user_name: "Alice", product_id: 100, quantity: 5, is_unknown: false, scanned_at: "2026-03-29T10:00:00Z" },
        { shelf: 2, height: "A", user_id: 1, user_name: "Alice", product_id: 101, quantity: 3, is_unknown: false, scanned_at: "2026-03-29T10:01:00Z" },
      ],
      error: null,
    };
    const { GET } = await import("../../app/api/stock-count/[id]/dashboard/route");
    const res = await GET(mockReq(), mockParams("10") as any);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.summary.total_locations_counted).toBe(2);
    expect(json.summary.total_expected_locations).toBe(2);
    expect(json.summary.progress_percent).toBe(100);
    expect(json.summary.total_items).toBe(8);
    expect(json.staff_progress).toHaveLength(1);
    expect(json.staff_progress[0].user_name).toBe("Alice");
  });
});

// ─── GET /api/stock-count/[id]/scans ─────────────────────────────
describe("GET /api/stock-count/[id]/scans", () => {
  it("returns scans for a plan", async () => {
    tableResults["count_scan"] = {
      data: [
        { id: 1, plan_id: 10, shelf: 1, height: "A", quantity: 5 },
        { id: 2, plan_id: 10, shelf: 2, height: "B", quantity: 3 },
      ],
      error: null,
    };
    const { GET } = await import("../../app/api/stock-count/[id]/scans/route");
    const res = await GET(mockReq(), mockParams("10") as any);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.scans).toHaveLength(2);
  });

  it("returns 500 on database error", async () => {
    tableResults["count_scan"] = { data: null, error: { message: "db error" } };
    const { GET } = await import("../../app/api/stock-count/[id]/scans/route");
    const res = await GET(mockReq(), mockParams("10") as any);
    expect(res.status).toBe(500);
  });
});

// ─── POST /api/stock-count/[id]/scans — bulk push ───────────────
describe("POST /api/stock-count/[id]/scans", () => {
  it("returns 400 when scans array is empty", async () => {
    const { POST } = await import("../../app/api/stock-count/[id]/scans/route");
    const res = await POST(mockReq({ scans: [] }), mockParams("10") as any);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toContain("scans");
  });

  it("returns 400 when scans is missing", async () => {
    const { POST } = await import("../../app/api/stock-count/[id]/scans/route");
    const res = await POST(mockReq({}), mockParams("10") as any);
    expect(res.status).toBe(400);
  });

  it("inserts scans and returns count", async () => {
    tableResults["count_scan"] = { data: null, error: null };
    const { POST } = await import("../../app/api/stock-count/[id]/scans/route");
    const res = await POST(mockReq({
      scans: [
        { shelf: 1, height: "A", product_id: 100, barcode: "123456", quantity: 5, user_id: 1 },
        { shelf: 2, height: "B", product_id: 101, quantity: 3, user_id: 2 },
      ],
    }), mockParams("10") as any);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.inserted).toBe(2);
    const insertOp = supabaseOps.find(o => o.table === "count_scan" && o.op === "insert");
    expect(insertOp).toBeDefined();
    expect(insertOp?.data).toHaveLength(2);
  });

  it("marks scans without barcode or product_id as unknown", async () => {
    tableResults["count_scan"] = { data: null, error: null };
    const { POST } = await import("../../app/api/stock-count/[id]/scans/route");
    await POST(mockReq({
      scans: [{ shelf: 3, height: "C", quantity: 1, user_id: 1 }],
    }), mockParams("10") as any);
    const insertOp = supabaseOps.find(o => o.table === "count_scan" && o.op === "insert");
    expect(insertOp?.data[0].is_unknown).toBe(true);
  });
});
