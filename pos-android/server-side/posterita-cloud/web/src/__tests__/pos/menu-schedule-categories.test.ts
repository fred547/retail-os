import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Supabase mock ───
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

vi.mock("@/lib/supabase/admin", () => ({
  getDb: () => ({ from: (table: string) => createChain(table) }),
}));
vi.mock("@/lib/account-context", () => ({
  getSessionAccountId: () => Promise.resolve("test-account"),
}));

function mockRequest(body: any, url?: string): any {
  return { json: () => Promise.resolve(body), url: url ?? "http://localhost/api/menu-schedules" };
}

beforeEach(() => { tableResults = {}; supabaseOps = []; vi.resetModules(); });

describe("Menu Schedules — category_ids integration", () => {
  it("POST: includes category_ids in insert payload", async () => {
    tableResults["menu_schedule"] = { data: { id: 1, name: "Breakfast" }, error: null };

    const { POST } = await import("../../app/api/menu-schedules/route");
    await POST(mockRequest({
      name: "Breakfast", start_time: "06:00", end_time: "11:00",
      category_ids: [10, 20, 30],
    }));

    const insert = supabaseOps.find(o => o.table === "menu_schedule" && o.op === "insert");
    expect(insert).toBeDefined();
    expect(insert!.data.category_ids).toEqual([10, 20, 30]);
  });

  it("POST: empty category_ids means 'show all'", async () => {
    tableResults["menu_schedule"] = { data: { id: 2, name: "All Day" }, error: null };

    const { POST } = await import("../../app/api/menu-schedules/route");
    await POST(mockRequest({
      name: "All Day", start_time: "00:00", end_time: "23:59",
      category_ids: [],
    }));

    const insert = supabaseOps.find(o => o.table === "menu_schedule" && o.op === "insert");
    expect(insert!.data.category_ids).toEqual([]);
  });

  it("POST: missing category_ids defaults gracefully", async () => {
    tableResults["menu_schedule"] = { data: { id: 3 }, error: null };

    const { POST } = await import("../../app/api/menu-schedules/route");
    await POST(mockRequest({
      name: "NoCategories", start_time: "08:00", end_time: "12:00",
    }));

    const insert = supabaseOps.find(o => o.table === "menu_schedule" && o.op === "insert");
    // Should be either undefined/null or empty array — not crash
    expect(insert).toBeDefined();
  });

  it("PATCH: updates category_ids on existing schedule", async () => {
    tableResults["menu_schedule"] = { data: { id: 1, category_ids: [5, 6] }, error: null };

    const { PATCH } = await import("../../app/api/menu-schedules/[id]/route");
    await PATCH(mockRequest({ category_ids: [5, 6] }), { params: Promise.resolve({ id: "1" }) });

    const update = supabaseOps.find(o => o.table === "menu_schedule" && o.op === "update");
    expect(update).toBeDefined();
    expect(update!.data.category_ids).toEqual([5, 6]);
  });

  it("PATCH: clears category_ids (reset to show all)", async () => {
    tableResults["menu_schedule"] = { data: { id: 1, category_ids: [] }, error: null };

    const { PATCH } = await import("../../app/api/menu-schedules/[id]/route");
    await PATCH(mockRequest({ category_ids: [] }), { params: Promise.resolve({ id: "1" }) });

    const update = supabaseOps.find(o => o.table === "menu_schedule" && o.op === "update");
    expect(update!.data.category_ids).toEqual([]);
  });

  it("GET: returns category_ids in schedule list", async () => {
    tableResults["menu_schedule"] = {
      data: [
        { id: 1, name: "Breakfast", category_ids: [1, 2] },
        { id: 2, name: "Lunch", category_ids: [3, 4, 5] },
      ],
      error: null,
    };

    const { GET } = await import("../../app/api/menu-schedules/route");
    const res = await GET(mockRequest({}, "http://localhost/api/menu-schedules"));
    const json = await res.json();

    expect(json.schedules).toHaveLength(2);
    expect(json.schedules[0].category_ids).toEqual([1, 2]);
    expect(json.schedules[1].category_ids).toEqual([3, 4, 5]);
  });
});
