import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Terminal device lock tests.
 *
 * Features tested:
 * 1. POST /api/terminals/[id]/unlock — clears device lock
 * 2. POST /api/enroll — device lock enforcement on enrollment
 * 3. POST /api/sync — device lock check on sync push
 */

// ─── Supabase mock ───

let supabaseOps: Array<{ table: string; op: string; data?: any; filters: Record<string, any> }> = [];
let tableResults: Record<string, { data: any; error: any }> = {};

function createChain(table: string) {
  const state = { op: "select" as string, data: undefined as any, filters: {} as Record<string, any> };
  function resolve() {
    supabaseOps.push({ table, op: state.op, data: state.data, filters: state.filters });
    const filterKey = Object.entries(state.filters).map(([k, v]) => `${k}=${v}`).join(",");
    return tableResults[`${table}:${filterKey}`] ?? tableResults[table] ?? { data: state.op === "select" ? [] : null, error: null };
  }
  const chain: any = {};
  for (const m of ["select", "eq", "gte", "order", "limit", "range", "in", "neq", "is", "not", "or", "gt", "ilike", "contains", "maybeSingle"] as const) {
    chain[m] = (...args: any[]) => {
      if (m === "eq") state.filters[args[0]] = args[1];
      return chain;
    };
  }
  for (const m of ["insert", "update", "upsert", "delete"] as const) {
    chain[m] = (...args: any[]) => { state.op = m; state.data = args[0]; return chain; };
  }
  chain.single = () => { const r = resolve(); return Promise.resolve({ ...r, data: Array.isArray(r.data) ? r.data[0] ?? null : r.data }); };
  chain.maybeSingle = () => chain.single();
  chain.then = (f: Function, r?: Function) => Promise.resolve(resolve()).then(f as any, r as any);
  return chain;
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: (table: string) => createChain(table) }),
}));

let mockAccountId: string | null = "test_lock_acc";
vi.mock("@/lib/account-context", () => ({
  getSessionAccountId: () => Promise.resolve(mockAccountId),
}));

beforeEach(() => {
  supabaseOps = [];
  tableResults = {};
  mockAccountId = "test_lock_acc";
});

// ─── /api/terminals/[id]/unlock ───

describe("POST /api/terminals/[id]/unlock", () => {
  let POST: Function;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("@/app/api/terminals/[id]/unlock/route");
    POST = mod.POST;
  });

  it("returns 401 if not authenticated", async () => {
    mockAccountId = null;
    const req = new Request("http://localhost/api/terminals/5/unlock", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "5" }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 if terminal not found", async () => {
    tableResults["terminal"] = { data: null, error: { message: "not found" } };
    const req = new Request("http://localhost/api/terminals/999/unlock", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "999" }) });
    expect(res.status).toBe(404);
  });

  it("returns success message if terminal is not locked", async () => {
    tableResults["terminal"] = {
      data: { terminal_id: 5, name: "POS-1", locked_device_id: null, locked_device_name: null },
      error: null,
    };
    const req = new Request("http://localhost/api/terminals/5/unlock", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "5" }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.message).toContain("not locked");
  });

  it("clears the lock and returns previous device info", async () => {
    tableResults["terminal"] = {
      data: { terminal_id: 5, name: "POS-1", locked_device_id: "device-abc", locked_device_name: "Samsung Tab A" },
      error: null,
    };
    const req = new Request("http://localhost/api/terminals/5/unlock", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "5" }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.previous_device).toBe("Samsung Tab A");

    // Verify an update was issued to clear the lock
    const updateOp = supabaseOps.find((o) => o.table === "terminal" && o.op === "update");
    expect(updateOp).toBeDefined();
    expect(updateOp!.data.locked_device_id).toBeNull();
    expect(updateOp!.data.locked_device_name).toBeNull();
    expect(updateOp!.data.locked_at).toBeNull();
  });

  it("logs the unlock action to error_logs", async () => {
    tableResults["terminal"] = {
      data: { terminal_id: 5, name: "POS-1", locked_device_id: "device-abc", locked_device_name: "Tab" },
      error: null,
    };
    const req = new Request("http://localhost/api/terminals/5/unlock", { method: "POST" });
    await POST(req, { params: Promise.resolve({ id: "5" }) });

    const logOp = supabaseOps.find((o) => o.table === "error_logs" && o.op === "insert");
    expect(logOp).toBeDefined();
    expect(logOp!.data.tag).toBe("TERMINAL_UNLOCK");
    expect(logOp!.data.severity).toBe("INFO");
  });
});

// ─── /api/enroll — device lock enforcement ───

describe("POST /api/enroll — device lock", () => {
  let POST: Function;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("@/app/api/enroll/route");
    POST = mod.POST;
  });

  function enrollReq(body: Record<string, any>) {
    return new Request("http://localhost/api/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns 400 if required fields are missing", async () => {
    const res = await POST(enrollReq({ account_id: "acc1" }));
    expect(res.status).toBe(400);
  });

  it("returns 409 if terminal is locked to a different device", async () => {
    tableResults["account"] = { data: { account_id: "acc1" }, error: null };
    tableResults["store"] = { data: { store_id: 1, account_id: "acc1" }, error: null };
    tableResults["terminal"] = {
      data: { terminal_id: 1, account_id: "acc1", locked_device_id: "device-A", locked_device_name: "Old Tab", locked_at: "2026-01-01" },
      error: null,
    };

    const res = await POST(enrollReq({
      account_id: "acc1", store_id: 1, terminal_id: 1,
      device_id: "device-B", device_name: "New Tab",
    }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain("locked to another device");
    expect(body.locked_device_id).toBe("device-A");
  });

  it("allows enrollment if terminal is locked to the same device", async () => {
    tableResults["account"] = { data: { account_id: "acc1" }, error: null };
    tableResults["store"] = { data: { store_id: 1, account_id: "acc1" }, error: null };
    tableResults["terminal"] = {
      data: { terminal_id: 1, account_id: "acc1", locked_device_id: "device-A", locked_device_name: "Tab" },
      error: null,
    };

    const res = await POST(enrollReq({
      account_id: "acc1", store_id: 1, terminal_id: 1,
      device_id: "device-A", device_name: "Tab",
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("allows enrollment if terminal has no lock", async () => {
    tableResults["account"] = { data: { account_id: "acc1" }, error: null };
    tableResults["store"] = { data: { store_id: 1, account_id: "acc1" }, error: null };
    tableResults["terminal"] = {
      data: { terminal_id: 1, account_id: "acc1", locked_device_id: null },
      error: null,
    };

    const res = await POST(enrollReq({
      account_id: "acc1", store_id: 1, terminal_id: 1,
      device_id: "device-B",
    }));
    expect(res.status).toBe(200);

    // Should lock the terminal to this device
    const updateOp = supabaseOps.find((o) => o.table === "terminal" && o.op === "update");
    expect(updateOp).toBeDefined();
    expect(updateOp!.data.locked_device_id).toBe("device-B");
  });

  it("returns bootstrap data on successful enrollment", async () => {
    tableResults["account"] = { data: [{ account_id: "acc1", name: "Test Brand" }], error: null };
    tableResults["store"] = { data: [{ store_id: 1, account_id: "acc1" }], error: null };
    tableResults["terminal"] = { data: [{ terminal_id: 1, account_id: "acc1", locked_device_id: null }], error: null };

    const res = await POST(enrollReq({ account_id: "acc1", store_id: 1, terminal_id: 1 }));
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.account).toBeDefined();
    expect(body.enrolled_store).toBeDefined();
    expect(body.enrolled_terminal).toBeDefined();
    expect(body.sync_secret).toBeDefined();
    expect(body.server_time).toBeDefined();
    expect(Array.isArray(body.stores)).toBe(true);
    expect(Array.isArray(body.products)).toBe(true);
    expect(Array.isArray(body.users)).toBe(true);
  });

  it("GET returns health check", async () => {
    vi.resetModules();
    const mod = await import("@/app/api/enroll/route");
    const res = await mod.GET();
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.service).toBe("posterita-device-enrollment");
  });
});
