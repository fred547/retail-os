import { describe, it, expect, vi, beforeEach } from "vitest";

let supabaseOps: Array<{ table: string; op: string; data?: any; filters: Record<string, any> }> = [];
let tableResults: Record<string, { data: any; error: any; count?: number }> = {};

function createChain(table: string) {
  const state = { op: "select" as string, data: undefined as any, filters: {} as Record<string, any> };
  function resolve() {
    supabaseOps.push({ table, op: state.op, data: state.data, filters: { ...state.filters } });
    const filterKey = Object.entries(state.filters).map(([k, v]) => `${k}=${v}`).join(",");
    return tableResults[`${table}:${filterKey}`] ?? tableResults[table] ?? { data: state.op === "select" ? [] : null, error: null, count: 0 };
  }
  const chain: any = {};
  for (const m of ["select", "eq", "neq", "gte", "lte", "gt", "lt", "order", "limit", "range", "in", "contains", "is", "not", "or", "ilike", "single", "maybeSingle"] as const) {
    chain[m] = (...args: any[]) => {
      if (m === "eq") state.filters[args[0]] = args[1];
      if (m === "single" || m === "maybeSingle") {
        const r = resolve();
        return Promise.resolve({ ...r, data: Array.isArray(r.data) ? r.data[0] ?? null : r.data });
      }
      return chain;
    };
  }
  for (const m of ["insert", "update", "upsert", "delete"] as const) {
    chain[m] = (...args: any[]) => { state.op = m; state.data = args[0]; return chain; };
  }
  chain.then = (f: Function, r?: Function) => Promise.resolve(resolve()).then(f as any, r as any);
  chain.csv = () => { const r = resolve(); return Promise.resolve({ data: r.data, error: r.error }); };
  return chain;
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: (table: string) => createChain(table) }),
}));

let mockAccountId: string | null = "test_staff_acc";
vi.mock("@/lib/account-context", () => ({
  getSessionAccountId: () => Promise.resolve(mockAccountId),
}));

beforeEach(() => {
  supabaseOps = [];
  tableResults = {};
  mockAccountId = "test_staff_acc";
});

function makeReq(path: string, method: string, body?: any) {
  const opts: any = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  const url = new URL(`http://localhost${path}`);
  const req = new Request(url.toString(), opts) as any;
  // NextRequest has nextUrl — mock it
  req.nextUrl = url;
  return req;
}

// ─── Schedule ───

describe("POST /api/staff/schedule — create shift", () => {
  it("returns 401 if not authenticated", async () => {
    mockAccountId = null;
    vi.resetModules();
    const mod = await import("@/app/api/staff/schedule/route");
    const res = await mod.POST(makeReq("/api/staff/schedule", "POST", {
      entries: [{ store_id: 1, user_id: 1, date: "2026-04-01", start_time: "09:00", end_time: "17:00" }],
    }));
    expect(res.status).toBe(401);
  });

  it("validates start_time < end_time", async () => {
    vi.resetModules();
    const mod = await import("@/app/api/staff/schedule/route");
    const res = await mod.POST(makeReq("/api/staff/schedule", "POST", {
      entries: [{ store_id: 1, user_id: 1, date: "2026-04-01", start_time: "17:00", end_time: "09:00" }],
    }));
    expect(res.status).toBe(400);
  });

  it("creates schedule entry with valid data", async () => {
    vi.resetModules();
    tableResults["staff_schedule"] = { data: [{ id: 1 }], error: null };
    const mod = await import("@/app/api/staff/schedule/route");
    const res = await mod.POST(makeReq("/api/staff/schedule", "POST", {
      entries: [{ store_id: 1, user_id: 5, date: "2026-04-01", start_time: "09:00", end_time: "17:00", break_minutes: 30 }],
    }));
    expect(res.status).toBe(201);
    const insertOp = supabaseOps.find((o) => o.table === "staff_schedule" && o.op === "insert");
    expect(insertOp).toBeDefined();
    expect(insertOp!.data[0].user_id).toBe(5);
    expect(insertOp!.data[0].account_id).toBe("test_staff_acc");
  });
});

describe("GET /api/staff/schedule — list schedule", () => {
  it("returns schedule for current week by default", async () => {
    vi.resetModules();
    tableResults["staff_schedule"] = {
      data: [
        { id: 1, user_id: 1, date: "2026-04-01", start_time: "09:00", end_time: "17:00" },
        { id: 2, user_id: 2, date: "2026-04-01", start_time: "10:00", end_time: "18:00" },
      ],
      error: null,
    };
    const mod = await import("@/app/api/staff/schedule/route");
    const res = await mod.GET(makeReq("/api/staff/schedule", "GET"));
    expect(res.status).toBe(200);
  });
});

// ─── Copy Week ───

describe("POST /api/staff/schedule/copy-week", () => {
  it("copies entries from source to target week", async () => {
    vi.resetModules();
    // Source week has 3 entries
    tableResults["staff_schedule"] = {
      data: [
        { id: 1, store_id: 1, user_id: 1, date: "2026-03-23", start_time: "09:00", end_time: "17:00", break_minutes: 30, role_override: null, notes: null },
        { id: 2, store_id: 1, user_id: 2, date: "2026-03-24", start_time: "10:00", end_time: "18:00", break_minutes: 0, role_override: null, notes: null },
        { id: 3, store_id: 1, user_id: 1, date: "2026-03-25", start_time: "09:00", end_time: "17:00", break_minutes: 30, role_override: null, notes: null },
      ],
      error: null,
    };
    const mod = await import("@/app/api/staff/schedule/copy-week/route");
    const res = await mod.POST(makeReq("/api/staff/schedule/copy-week", "POST", {
      source_date: "2026-03-23",
      target_date: "2026-03-30",
      store_id: 1,
    }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.copied).toBe(3);
  });
});

// ─── Breaks ───

describe("POST /api/staff/breaks — start break", () => {
  it("creates break with start_time", async () => {
    vi.resetModules();
    tableResults["staff_break"] = { data: [{ id: 1 }], error: null };
    const mod = await import("@/app/api/staff/breaks/route");
    const res = await mod.POST(makeReq("/api/staff/breaks", "POST", {
      user_id: 5, break_type: "paid",
    }));
    expect(res.status).toBe(201);
    const insertOp = supabaseOps.find((o) => o.table === "staff_break" && o.op === "insert");
    expect(insertOp).toBeDefined();
    expect(insertOp!.data.user_id).toBe(5);
    expect(insertOp!.data.break_type).toBe("paid");
  });
});

// ─── Leave Types ───

describe("POST /api/staff/leave-types — create", () => {
  it("creates leave type", async () => {
    vi.resetModules();
    tableResults["leave_type"] = { data: [{ id: 1, name: "Annual", paid: true }], error: null };
    const mod = await import("@/app/api/staff/leave-types/route");
    const res = await mod.POST(makeReq("/api/staff/leave-types", "POST", {
      name: "Annual", paid: true, default_days: 21, color: "#2E7D32",
    }));
    expect(res.status).toBe(201);
  });
});

// ─── Leave Requests ───

describe("POST /api/staff/leave — create request", () => {
  it("creates leave request", async () => {
    vi.resetModules();
    tableResults["leave_request"] = { data: [{ id: 1 }], error: null };
    const mod = await import("@/app/api/staff/leave/route");
    const res = await mod.POST(makeReq("/api/staff/leave", "POST", {
      user_id: 3, leave_type_id: 1, start_date: "2026-04-10", end_date: "2026-04-14", days: 5, reason: "Holiday",
    }));
    expect(res.status).toBe(201);
  });

  it("returns 400 if required fields missing", async () => {
    vi.resetModules();
    const mod = await import("@/app/api/staff/leave/route");
    const res = await mod.POST(makeReq("/api/staff/leave", "POST", { user_id: 3 }));
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/staff/leave/[id] — approve/reject", () => {
  it("approves and deducts balance", async () => {
    vi.resetModules();
    tableResults["leave_request"] = { data: { id: 1, user_id: 3, leave_type_id: 1, days: 5, status: "pending", start_date: "2026-04-10" }, error: null };
    tableResults["pos_user"] = { data: { user_id: 10 }, error: null };
    tableResults["leave_balance"] = { data: null, error: null };
    tableResults["leave_type"] = { data: { default_days: 21 }, error: null };
    const mod = await import("@/app/api/staff/leave/[id]/route");
    const res = await mod.PATCH(
      makeReq("/api/staff/leave/1", "PATCH", { status: "approved" }),
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(res.status).toBe(200);

    // Check update was issued
    const updateOp = supabaseOps.find((o) => o.table === "leave_request" && o.op === "update");
    expect(updateOp).toBeDefined();
    expect(updateOp!.data.status).toBe("approved");

    // Check balance insert (no existing balance, so insert not upsert)
    const insertOp = supabaseOps.find((o) => o.table === "leave_balance" && o.op === "insert");
    expect(insertOp).toBeDefined();
  });
});

// ─── Timesheets ───

describe("GET /api/staff/timesheets", () => {
  it("returns timesheet data", async () => {
    vi.resetModules();
    tableResults["shift"] = {
      data: [
        { user_id: 1, user_name: "Alice", clock_in: "2026-04-01T09:00:00Z", clock_out: "2026-04-01T17:30:00Z", hours_worked: 8.5, overtime_minutes: 30, total_break_minutes: 30 },
      ],
      error: null,
    };
    tableResults["staff_break"] = { data: [], error: null };
    const mod = await import("@/app/api/staff/timesheets/route");
    const res = await mod.GET(makeReq("/api/staff/timesheets?start_date=2026-04-01&end_date=2026-04-07", "GET"));
    expect(res.status).toBe(200);
  });
});

// ─── Leave Balance ───

describe("GET /api/staff/leave/balance", () => {
  it("returns balances for current year", async () => {
    vi.resetModules();
    tableResults["leave_balance"] = {
      data: [
        { user_id: 3, leave_type_id: 1, year: 2026, total_days: 21, used_days: 5 },
      ],
      error: null,
    };
    const mod = await import("@/app/api/staff/leave/balance/route");
    const res = await mod.GET(makeReq("/api/staff/leave/balance", "GET"));
    expect(res.status).toBe(200);
  });
});
