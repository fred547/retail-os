import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for terminal management routes:
 * - POST /api/terminals/[id]/deploy — switch terminal to production lock mode
 * - POST /api/terminals/[id]/takeover — take over terminal from another device
 * - POST /api/terminals/[id]/unlock — release terminal device lock
 */

// ─── Supabase mock ──────────────────────────────────────────────
let tableResults: Record<string, { data: any; error: any }> = {};
let supabaseOps: Array<{ table: string; op: string; data?: any; filters: Record<string, any> }> = [];
let mockAccountId: string | null = "test-terminal-acc";

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
vi.mock("@/lib/account-context", () => ({ getSessionAccountId: () => Promise.resolve(mockAccountId) }));

// Import after mock setup
import { POST as deployPOST } from "../../app/api/terminals/[id]/deploy/route";
import { POST as takeoverPOST } from "../../app/api/terminals/[id]/takeover/route";
import { POST as unlockPOST } from "../../app/api/terminals/[id]/unlock/route";

function mockReq(body: any): any {
  return {
    json: () => Promise.resolve(body),
    url: "http://localhost/api/terminals/1/deploy",
    text: () => Promise.resolve(JSON.stringify(body)),
    headers: new Map(),
  };
}

function mockParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  tableResults = {};
  supabaseOps = [];
  mockAccountId = "test-terminal-acc";
});

// ─── POST /api/terminals/[id]/deploy ────────────────────────────
describe("POST /api/terminals/[id]/deploy", () => {
  it("deploys a terminal to production mode", async () => {
    tableResults["terminal"] = {
      data: { terminal_id: 1, lock_mode: "production", name: "Register 1" },
      error: null,
    };

    const res = await deployPOST(mockReq({}), mockParams("1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.terminal).toBeDefined();
    expect(json.message).toContain("deployed");

    const updateOp = supabaseOps.find(o => o.table === "terminal" && o.op === "update");
    expect(updateOp).toBeDefined();
    expect(updateOp?.data?.lock_mode).toBe("production");
  });

  it("returns 401 when not authenticated", async () => {
    mockAccountId = null;
    const res = await deployPOST(mockReq({}), mockParams("1"));
    expect(res.status).toBe(401);
  });

  it("returns 400 for non-numeric ID", async () => {
    const res = await deployPOST(mockReq({}), mockParams("abc"));
    expect(res.status).toBe(400);
  });

  it("returns 500 on DB error", async () => {
    tableResults["terminal"] = { data: null, error: { message: "DB error" } };
    const res = await deployPOST(mockReq({}), mockParams("1"));
    expect(res.status).toBe(500);
  });
});

// ─── POST /api/terminals/[id]/takeover ──────────────────────────
describe("POST /api/terminals/[id]/takeover", () => {
  it("takes over a terminal from another device", async () => {
    tableResults["terminal"] = {
      data: {
        terminal_id: 1,
        lock_mode: "exploration",
        locked_device_id: "old-device-uuid",
        locked_device_name: "Old Phone",
      },
      error: null,
    };

    const res = await takeoverPOST(
      mockReq({ device_id: "new-device-uuid", device_name: "New Tablet" }),
      mockParams("1"),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.terminal).toBeDefined();
    expect(json.previous_device).toBe("old-device-uuid");
    expect(json.message).toContain("Old Phone");

    // Verify old device session was ended
    const sessionUpdate = supabaseOps.find(o => o.table === "device_session" && o.op === "update");
    expect(sessionUpdate).toBeDefined();
    expect(sessionUpdate?.data?.is_active).toBe(false);
    expect(sessionUpdate?.data?.end_reason).toBe("takeover");
  });

  it("takes over an unlocked terminal", async () => {
    tableResults["terminal"] = {
      data: {
        terminal_id: 1,
        lock_mode: "exploration",
        locked_device_id: null,
        locked_device_name: null,
      },
      error: null,
    };

    const res = await takeoverPOST(
      mockReq({ device_id: "new-device-uuid", device_name: "New Tablet" }),
      mockParams("1"),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.previous_device).toBeNull();

    // Should NOT end any device session when no previous lock
    const sessionUpdate = supabaseOps.find(o => o.table === "device_session" && o.op === "update");
    expect(sessionUpdate).toBeUndefined();
  });

  it("returns 401 when not authenticated", async () => {
    mockAccountId = null;
    const res = await takeoverPOST(mockReq({ device_id: "dev-1" }), mockParams("1"));
    expect(res.status).toBe(401);
  });

  it("returns 400 for non-numeric ID", async () => {
    const res = await takeoverPOST(mockReq({ device_id: "dev-1" }), mockParams("xyz"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when device_id is missing", async () => {
    const res = await takeoverPOST(mockReq({}), mockParams("1"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when terminal does not exist", async () => {
    tableResults["terminal"] = { data: null, error: null };
    const res = await takeoverPOST(mockReq({ device_id: "dev-1" }), mockParams("999"));
    expect(res.status).toBe(404);
  });

  it("skips session ending when same device takes over", async () => {
    tableResults["terminal"] = {
      data: {
        terminal_id: 1,
        lock_mode: "exploration",
        locked_device_id: "same-device",
        locked_device_name: "Same Device",
      },
      error: null,
    };

    const res = await takeoverPOST(
      mockReq({ device_id: "same-device", device_name: "Same Device" }),
      mockParams("1"),
    );

    expect(res.status).toBe(200);
    // Should NOT update device_session since same device
    const sessionUpdate = supabaseOps.find(o => o.table === "device_session" && o.op === "update");
    expect(sessionUpdate).toBeUndefined();
  });
});

// ─── POST /api/terminals/[id]/unlock ────────────────────────────
describe("POST /api/terminals/[id]/unlock", () => {
  it("unlocks a locked terminal", async () => {
    tableResults["terminal"] = {
      data: {
        terminal_id: 1,
        name: "Register 1",
        locked_device_id: "device-uuid-abc",
        locked_device_name: "Samsung Galaxy",
      },
      error: null,
    };

    const res = await unlockPOST(mockReq({}), mockParams("1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toContain("Register 1");
    expect(json.message).toContain("unlocked");
    expect(json.previous_device).toBe("Samsung Galaxy");
  });

  it("returns message when terminal is not locked", async () => {
    tableResults["terminal"] = {
      data: {
        terminal_id: 1,
        name: "Register 1",
        locked_device_id: null,
        locked_device_name: null,
      },
      error: null,
    };

    const res = await unlockPOST(mockReq({}), mockParams("1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toContain("not locked");
  });

  it("returns 401 when not authenticated", async () => {
    mockAccountId = null;
    const res = await unlockPOST(mockReq({}), mockParams("1"));
    expect(res.status).toBe(401);
  });

  it("returns 400 for non-numeric ID", async () => {
    const res = await unlockPOST(mockReq({}), mockParams("bad-id"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when terminal does not exist", async () => {
    tableResults["terminal"] = { data: null, error: null };
    const res = await unlockPOST(mockReq({}), mockParams("999"));
    expect(res.status).toBe(404);
  });
});
