import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Supabase mock ──────────────────────────────────────────────
let tableResults: Record<string, { data: any; error: any; count?: number }> = {};
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
  for (const m of ["select", "eq", "gte", "lte", "gt", "order", "limit", "range", "in", "neq", "is", "not", "or", "ilike"] as const) {
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

let mockAccountId: string | null = "test-staff-acc";

vi.mock("@/lib/supabase/admin", () => ({ getDb: () => ({ from: (t: string) => createChain(t) }) }));
vi.mock("@/lib/account-context", () => ({
  getSessionAccountId: () => Promise.resolve(mockAccountId),
  getSessionUserId: () => Promise.resolve(1),
}));

function makeReq(path: string, method: string, body?: any) {
  const opts: any = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  const url = new URL(`http://localhost${path}`);
  const req = new Request(url.toString(), opts) as any;
  req.nextUrl = url;
  return req;
}

beforeEach(() => {
  tableResults = {};
  supabaseOps = [];
  mockAccountId = "test-staff-acc";
  vi.resetModules();
});

// ─── Roster Slots CRUD ──────────────────────────────────────────

describe("GET /api/staff/roster-slots", () => {
  it("returns 401 without auth", async () => {
    mockAccountId = null;
    const { GET } = await import("@/app/api/staff/roster-slots/route");
    const res = await GET(makeReq("/api/staff/roster-slots", "GET"));
    expect(res.status).toBe(401);
  });

  it("returns all slots for account", async () => {
    tableResults["roster_template_slot"] = {
      data: [
        { id: 1, name: "Morning Cashier", day_of_week: 1, start_time: "08:00", end_time: "14:00" },
        { id: 2, name: "Afternoon Floor", day_of_week: 1, start_time: "14:00", end_time: "20:00" },
      ],
      error: null,
    };
    const { GET } = await import("@/app/api/staff/roster-slots/route");
    const res = await GET(makeReq("/api/staff/roster-slots", "GET"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.slots).toHaveLength(2);
  });

  it("filters by store_id", async () => {
    tableResults["roster_template_slot"] = { data: [{ id: 1, store_id: 5 }], error: null };
    const { GET } = await import("@/app/api/staff/roster-slots/route");
    const res = await GET(makeReq("/api/staff/roster-slots?store_id=5", "GET"));
    expect(res.status).toBe(200);
  });

  it("rejects invalid store_id", async () => {
    const { GET } = await import("@/app/api/staff/roster-slots/route");
    const res = await GET(makeReq("/api/staff/roster-slots?store_id=abc", "GET"));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/staff/roster-slots", () => {
  it("creates a roster slot with all fields", async () => {
    tableResults["roster_template_slot"] = {
      data: [{ id: 10, name: "Evening Shift", day_of_week: 3, start_time: "16:00", end_time: "22:00", break_minutes: 45, color: "#FF5733" }],
      error: null,
    };
    const { POST } = await import("@/app/api/staff/roster-slots/route");
    const res = await POST(makeReq("/api/staff/roster-slots", "POST", {
      store_id: 1, name: "Evening Shift", day_of_week: 3, start_time: "16:00", end_time: "22:00", break_minutes: 45, color: "#FF5733",
    }));
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.slot.name).toBe("Evening Shift");
    expect(body.slot.break_minutes).toBe(45);
  });

  it("rejects day_of_week = 0", async () => {
    const { POST } = await import("@/app/api/staff/roster-slots/route");
    const res = await POST(makeReq("/api/staff/roster-slots", "POST", {
      store_id: 1, name: "Bad", day_of_week: 0, start_time: "08:00", end_time: "14:00",
    }));
    expect(res.status).toBe(400);
  });

  it("rejects start_time equal to end_time", async () => {
    const { POST } = await import("@/app/api/staff/roster-slots/route");
    const res = await POST(makeReq("/api/staff/roster-slots", "POST", {
      store_id: 1, name: "Equal", day_of_week: 1, start_time: "14:00", end_time: "14:00",
    }));
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/staff/roster-slots/[id]", () => {
  it("returns 401 without auth", async () => {
    mockAccountId = null;
    const { PATCH } = await import("@/app/api/staff/roster-slots/[id]/route");
    const res = await PATCH(makeReq("/api/staff/roster-slots/1", "PATCH", { name: "New" }), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(401);
  });

  it("updates a slot name", async () => {
    tableResults["roster_template_slot"] = {
      data: [{ id: 1, name: "Updated Cashier", day_of_week: 1, start_time: "08:00", end_time: "14:00" }],
      error: null,
    };
    const { PATCH } = await import("@/app/api/staff/roster-slots/[id]/route");
    const res = await PATCH(
      makeReq("/api/staff/roster-slots/1", "PATCH", { name: "Updated Cashier" }),
      { params: Promise.resolve({ id: "1" }) },
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.slot.name).toBe("Updated Cashier");
  });

  it("rejects invalid ID", async () => {
    const { PATCH } = await import("@/app/api/staff/roster-slots/[id]/route");
    const res = await PATCH(
      makeReq("/api/staff/roster-slots/abc", "PATCH", { name: "Bad" }),
      { params: Promise.resolve({ id: "abc" }) },
    );
    expect(res.status).toBe(400);
  });

  it("rejects invalid day_of_week on update", async () => {
    const { PATCH } = await import("@/app/api/staff/roster-slots/[id]/route");
    const res = await PATCH(
      makeReq("/api/staff/roster-slots/1", "PATCH", { day_of_week: 8 }),
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(res.status).toBe(400);
  });

  it("rejects start_time >= end_time on update", async () => {
    const { PATCH } = await import("@/app/api/staff/roster-slots/[id]/route");
    const res = await PATCH(
      makeReq("/api/staff/roster-slots/1", "PATCH", { start_time: "18:00", end_time: "08:00" }),
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/staff/roster-slots/[id]", () => {
  it("soft-deletes a slot", async () => {
    tableResults["roster_template_slot"] = { data: null, error: null };
    const { DELETE } = await import("@/app/api/staff/roster-slots/[id]/route");
    const res = await DELETE(
      makeReq("/api/staff/roster-slots/1", "DELETE"),
      { params: Promise.resolve({ id: "1" }) },
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.deleted).toBe(true);
    const updateOp = supabaseOps.find(o => o.table === "roster_template_slot" && o.op === "update");
    expect(updateOp).toBeDefined();
    expect(updateOp?.data?.is_deleted).toBe(true);
  });

  it("rejects invalid ID on delete", async () => {
    const { DELETE } = await import("@/app/api/staff/roster-slots/[id]/route");
    const res = await DELETE(
      makeReq("/api/staff/roster-slots/xyz", "DELETE"),
      { params: Promise.resolve({ id: "xyz" }) },
    );
    expect(res.status).toBe(400);
  });
});

// ─── Schedule CRUD ──────────────────────────────────────────────

describe("GET /api/staff/schedule", () => {
  it("returns 401 without auth", async () => {
    mockAccountId = null;
    const { GET } = await import("@/app/api/staff/schedule/route");
    const res = await GET(makeReq("/api/staff/schedule", "GET"));
    expect(res.status).toBe(401);
  });

  it("returns schedule entries for date range", async () => {
    tableResults["staff_schedule"] = {
      data: [
        { id: 1, user_id: 5, date: "2026-04-06", start_time: "08:00", end_time: "16:00" },
        { id: 2, user_id: 6, date: "2026-04-07", start_time: "09:00", end_time: "17:00" },
      ],
      error: null,
    };
    const { GET } = await import("@/app/api/staff/schedule/route");
    const res = await GET(makeReq("/api/staff/schedule?start_date=2026-04-06&end_date=2026-04-12", "GET"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.entries).toHaveLength(2);
  });

  it("defaults to current week when no dates provided", async () => {
    tableResults["staff_schedule"] = { data: [], error: null };
    const { GET } = await import("@/app/api/staff/schedule/route");
    const res = await GET(makeReq("/api/staff/schedule", "GET"));
    expect(res.status).toBe(200);
  });

  it("rejects invalid store_id", async () => {
    const { GET } = await import("@/app/api/staff/schedule/route");
    const res = await GET(makeReq("/api/staff/schedule?start_date=2026-04-06&end_date=2026-04-12&store_id=abc", "GET"));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/staff/schedule", () => {
  it("creates a single schedule entry", async () => {
    tableResults["staff_schedule"] = {
      data: [{ id: 1, user_id: 5, date: "2026-04-06", start_time: "08:00", end_time: "16:00" }],
      error: null,
    };
    const { POST } = await import("@/app/api/staff/schedule/route");
    const res = await POST(makeReq("/api/staff/schedule", "POST", {
      store_id: 1, user_id: 5, date: "2026-04-06", start_time: "08:00", end_time: "16:00",
    }));
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.entries).toHaveLength(1);
  });

  it("creates bulk schedule entries", async () => {
    tableResults["staff_schedule"] = {
      data: [
        { id: 1, user_id: 5, date: "2026-04-06" },
        { id: 2, user_id: 6, date: "2026-04-06" },
      ],
      error: null,
    };
    const { POST } = await import("@/app/api/staff/schedule/route");
    const res = await POST(makeReq("/api/staff/schedule", "POST", {
      entries: [
        { store_id: 1, user_id: 5, date: "2026-04-06", start_time: "08:00", end_time: "16:00" },
        { store_id: 1, user_id: 6, date: "2026-04-06", start_time: "09:00", end_time: "17:00" },
      ],
    }));
    expect(res.status).toBe(201);
  });

  it("rejects missing required fields", async () => {
    const { POST } = await import("@/app/api/staff/schedule/route");
    const res = await POST(makeReq("/api/staff/schedule", "POST", { store_id: 1, user_id: 5 }));
    expect(res.status).toBe(400);
  });

  it("rejects start_time >= end_time", async () => {
    const { POST } = await import("@/app/api/staff/schedule/route");
    const res = await POST(makeReq("/api/staff/schedule", "POST", {
      store_id: 1, user_id: 5, date: "2026-04-06", start_time: "18:00", end_time: "08:00",
    }));
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/staff/schedule/[id]", () => {
  it("updates a schedule entry", async () => {
    tableResults["staff_schedule"] = {
      data: [{ id: 1, start_time: "09:00", end_time: "17:00", notes: "Updated" }],
      error: null,
    };
    const { PATCH } = await import("@/app/api/staff/schedule/[id]/route");
    const res = await PATCH(
      makeReq("/api/staff/schedule/1", "PATCH", { start_time: "09:00", end_time: "17:00", notes: "Updated" }),
      { params: Promise.resolve({ id: "1" }) },
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.entry.notes).toBe("Updated");
  });

  it("rejects invalid time order on update", async () => {
    const { PATCH } = await import("@/app/api/staff/schedule/[id]/route");
    const res = await PATCH(
      makeReq("/api/staff/schedule/1", "PATCH", { start_time: "20:00", end_time: "08:00" }),
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/staff/schedule/[id]", () => {
  it("cancels a schedule entry", async () => {
    tableResults["staff_schedule"] = { data: null, error: null };
    const { DELETE } = await import("@/app/api/staff/schedule/[id]/route");
    const res = await DELETE(
      makeReq("/api/staff/schedule/1", "DELETE"),
      { params: Promise.resolve({ id: "1" }) },
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.cancelled).toBe(true);
  });
});

// ─── Copy Week ──────────────────────────────────────────────────

describe("POST /api/staff/schedule/copy-week", () => {
  it("returns 401 without auth", async () => {
    mockAccountId = null;
    const { POST } = await import("@/app/api/staff/schedule/copy-week/route");
    const res = await POST(makeReq("/api/staff/schedule/copy-week", "POST", {
      source_date: "2026-03-23", target_date: "2026-03-30", store_id: 1,
    }));
    expect(res.status).toBe(401);
  });

  it("copies a week of schedule entries", async () => {
    tableResults["staff_schedule"] = {
      data: [
        { id: 1, store_id: 1, user_id: 5, date: "2026-03-23", start_time: "08:00", end_time: "16:00", break_minutes: 30, role_override: null, notes: null, status: "scheduled" },
        { id: 2, store_id: 1, user_id: 6, date: "2026-03-24", start_time: "09:00", end_time: "17:00", break_minutes: 0, role_override: null, notes: null, status: "scheduled" },
      ],
      error: null,
    };
    const { POST } = await import("@/app/api/staff/schedule/copy-week/route");
    const res = await POST(makeReq("/api/staff/schedule/copy-week", "POST", {
      source_date: "2026-03-23", target_date: "2026-03-30", store_id: "1",
    }));
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.copied).toBe(2);
  });

  it("returns 0 copied when source week is empty", async () => {
    tableResults["staff_schedule"] = { data: [], error: null };
    const { POST } = await import("@/app/api/staff/schedule/copy-week/route");
    const res = await POST(makeReq("/api/staff/schedule/copy-week", "POST", {
      source_date: "2026-03-23", target_date: "2026-03-30", store_id: "1",
    }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.copied).toBe(0);
  });

  it("rejects missing fields", async () => {
    const { POST } = await import("@/app/api/staff/schedule/copy-week/route");
    const res = await POST(makeReq("/api/staff/schedule/copy-week", "POST", { source_date: "2026-03-23" }));
    expect(res.status).toBe(400);
  });

  it("rejects invalid store_id", async () => {
    const { POST } = await import("@/app/api/staff/schedule/copy-week/route");
    const res = await POST(makeReq("/api/staff/schedule/copy-week", "POST", {
      source_date: "2026-03-23", target_date: "2026-03-30", store_id: "abc",
    }));
    expect(res.status).toBe(400);
  });
});

// ─── Timesheets ─────────────────────────────────────────────────

describe("GET /api/staff/timesheets", () => {
  it("returns 401 without auth", async () => {
    mockAccountId = null;
    const { GET } = await import("@/app/api/staff/timesheets/route");
    const res = await GET(makeReq("/api/staff/timesheets?start_date=2026-03-01&end_date=2026-03-31", "GET"));
    expect(res.status).toBe(401);
  });

  it("requires start_date and end_date", async () => {
    const { GET } = await import("@/app/api/staff/timesheets/route");
    const res = await GET(makeReq("/api/staff/timesheets", "GET"));
    expect(res.status).toBe(400);
  });

  it("computes timesheet summary from shifts", async () => {
    tableResults["pos_user"] = {
      data: [{ user_id: 5, username: "alice", firstname: "Alice", lastname: "Smith" }],
      error: null,
    };
    tableResults["shift"] = {
      data: [
        { user_id: 5, clock_in: "2026-03-10T08:00:00Z", clock_out: "2026-03-10T17:00:00Z", is_late: false },
        { user_id: 5, clock_in: "2026-03-11T08:00:00Z", clock_out: "2026-03-11T18:00:00Z", is_late: true },
      ],
      error: null,
    };
    tableResults["staff_break"] = {
      data: [{ user_id: 5, duration_minutes: 60 }],
      error: null,
    };

    const { GET } = await import("@/app/api/staff/timesheets/route");
    const res = await GET(makeReq("/api/staff/timesheets?start_date=2026-03-01&end_date=2026-03-31", "GET"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.timesheets).toHaveLength(1);

    const ts = body.timesheets[0];
    expect(ts.user_id).toBe(5);
    expect(ts.user_name).toBe("Alice Smith");
    expect(ts.shift_count).toBe(2);
    // 9h + 10h = 19h total, overtime: max(0,9-8)+max(0,10-8) = 1+2 = 3, 1h break
    expect(ts.total_hours).toBe(19);
    expect(ts.overtime_hours).toBe(3);
    expect(ts.break_hours).toBe(1);
    expect(ts.net_hours).toBe(18); // 19 - 1
    expect(ts.late_count).toBe(1);
    expect(ts.days_worked).toBe(2);
  });

  it("handles user with no completed shifts", async () => {
    tableResults["pos_user"] = { data: [], error: null };
    tableResults["shift"] = { data: [], error: null };
    tableResults["staff_break"] = { data: [], error: null };

    const { GET } = await import("@/app/api/staff/timesheets/route");
    const res = await GET(makeReq("/api/staff/timesheets?start_date=2026-03-01&end_date=2026-03-31", "GET"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.timesheets).toHaveLength(0);
  });
});

// ─── Breaks ─────────────────────────────────────────────────────

describe("POST /api/staff/breaks", () => {
  it("returns 401 without auth", async () => {
    mockAccountId = null;
    const { POST } = await import("@/app/api/staff/breaks/route");
    const res = await POST(makeReq("/api/staff/breaks", "POST", { user_id: "5" }));
    expect(res.status).toBe(401);
  });

  it("starts a break", async () => {
    tableResults["staff_break"] = {
      data: [{ id: 1, user_id: 5, break_type: "lunch", start_time: "2026-03-10T12:00:00Z" }],
      error: null,
    };
    const { POST } = await import("@/app/api/staff/breaks/route");
    const res = await POST(makeReq("/api/staff/breaks", "POST", { user_id: "5", break_type: "lunch" }));
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.break.break_type).toBe("lunch");
  });

  it("rejects missing user_id", async () => {
    const { POST } = await import("@/app/api/staff/breaks/route");
    const res = await POST(makeReq("/api/staff/breaks", "POST", {}));
    expect(res.status).toBe(400);
  });

  it("rejects invalid user_id", async () => {
    const { POST } = await import("@/app/api/staff/breaks/route");
    const res = await POST(makeReq("/api/staff/breaks", "POST", { user_id: "abc" }));
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/staff/breaks", () => {
  it("ends a break and computes duration", async () => {
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    tableResults["staff_break"] = {
      data: [{ id: 1, start_time: tenMinsAgo, end_time: new Date().toISOString(), duration_minutes: 10 }],
      error: null,
    };
    const { PATCH } = await import("@/app/api/staff/breaks/route");
    const res = await PATCH(makeReq("/api/staff/breaks?id=1", "PATCH"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.break.duration_minutes).toBeDefined();
  });

  it("requires id query param", async () => {
    const { PATCH } = await import("@/app/api/staff/breaks/route");
    const res = await PATCH(makeReq("/api/staff/breaks", "PATCH"));
    expect(res.status).toBe(400);
  });
});

// ─── Leave Types ────────────────────────────────────────────────

describe("GET /api/staff/leave-types", () => {
  it("returns leave types", async () => {
    tableResults["leave_type"] = {
      data: [
        { id: 1, name: "Annual Leave", paid: true, default_days: 21 },
        { id: 2, name: "Sick Leave", paid: true, default_days: 15 },
      ],
      error: null,
    };
    const { GET } = await import("@/app/api/staff/leave-types/route");
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.leave_types).toHaveLength(2);
  });
});

describe("POST /api/staff/leave-types", () => {
  it("creates a leave type", async () => {
    tableResults["leave_type"] = {
      data: [{ id: 3, name: "Compassionate Leave", paid: false, default_days: 5, color: "#FF0000" }],
      error: null,
    };
    const { POST } = await import("@/app/api/staff/leave-types/route");
    const res = await POST(makeReq("/api/staff/leave-types", "POST", {
      name: "Compassionate Leave", paid: false, default_days: 5, color: "#FF0000",
    }));
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.leave_type.name).toBe("Compassionate Leave");
  });

  it("rejects empty name", async () => {
    const { POST } = await import("@/app/api/staff/leave-types/route");
    const res = await POST(makeReq("/api/staff/leave-types", "POST", { name: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 409 for duplicate leave type", async () => {
    tableResults["leave_type"] = { data: null, error: { message: "duplicate key value violates unique constraint" } };
    const { POST } = await import("@/app/api/staff/leave-types/route");
    const res = await POST(makeReq("/api/staff/leave-types", "POST", { name: "Annual Leave" }));
    expect(res.status).toBe(409);
  });
});

// ─── Leave Requests ─────────────────────────────────────────────

describe("GET /api/staff/leave", () => {
  it("returns leave requests", async () => {
    tableResults["leave_request"] = {
      data: [
        { id: 1, user_id: 5, status: "pending", start_date: "2026-04-01", end_date: "2026-04-05", days: 5 },
      ],
      error: null,
    };
    const { GET } = await import("@/app/api/staff/leave/route");
    const res = await GET(makeReq("/api/staff/leave", "GET"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.requests).toHaveLength(1);
  });

  it("filters by status", async () => {
    tableResults["leave_request"] = { data: [], error: null };
    const { GET } = await import("@/app/api/staff/leave/route");
    const res = await GET(makeReq("/api/staff/leave?status=approved", "GET"));
    expect(res.status).toBe(200);
  });
});

describe("POST /api/staff/leave", () => {
  it("creates a leave request", async () => {
    tableResults["leave_request"] = {
      data: [{ id: 1, user_id: 5, leave_type_id: 1, start_date: "2026-04-01", end_date: "2026-04-05", days: 5, status: "pending" }],
      error: null,
    };
    const { POST } = await import("@/app/api/staff/leave/route");
    const res = await POST(makeReq("/api/staff/leave", "POST", {
      user_id: 5, leave_type_id: 1, start_date: "2026-04-01", end_date: "2026-04-05", days: 5, reason: "Holiday",
    }));
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.request.status).toBe("pending");
  });

  it("rejects missing required fields", async () => {
    const { POST } = await import("@/app/api/staff/leave/route");
    const res = await POST(makeReq("/api/staff/leave", "POST", { user_id: 5 }));
    expect(res.status).toBe(400);
  });

  it("rejects start_date after end_date", async () => {
    const { POST } = await import("@/app/api/staff/leave/route");
    const res = await POST(makeReq("/api/staff/leave", "POST", {
      user_id: 5, leave_type_id: 1, start_date: "2026-04-10", end_date: "2026-04-01", days: 5,
    }));
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/staff/leave/[id]", () => {
  it("approves a leave request and deducts balance", async () => {
    tableResults["leave_request"] = {
      data: [{ id: 1, user_id: 5, leave_type_id: 1, start_date: "2026-04-01", end_date: "2026-04-05", days: 5, status: "approved" }],
      error: null,
    };
    tableResults["pos_user"] = {
      data: [{ user_id: 10 }],
      error: null,
    };
    tableResults["leave_balance"] = {
      data: [{ id: 1, user_id: 5, leave_type_id: 1, year: 2026, total_days: 21, used_days: 3 }],
      error: null,
    };
    const { PATCH } = await import("@/app/api/staff/leave/[id]/route");
    const res = await PATCH(
      makeReq("/api/staff/leave/1", "PATCH", { status: "approved" }),
      { params: Promise.resolve({ id: "1" }) },
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.request.status).toBe("approved");
    // Verify balance update was called
    const balanceUpdate = supabaseOps.find(o => o.table === "leave_balance" && o.op === "update");
    expect(balanceUpdate).toBeDefined();
  });

  it("rejects an invalid status value", async () => {
    const { PATCH } = await import("@/app/api/staff/leave/[id]/route");
    const res = await PATCH(
      makeReq("/api/staff/leave/1", "PATCH", { status: "invalid" }),
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(res.status).toBe(400);
  });

  it("rejects a leave request with reason", async () => {
    tableResults["leave_request"] = {
      data: [{ id: 1, user_id: 5, leave_type_id: 1, start_date: "2026-04-01", end_date: "2026-04-05", days: 5, status: "rejected" }],
      error: null,
    };
    tableResults["pos_user"] = { data: [{ user_id: 10 }], error: null };
    const { PATCH } = await import("@/app/api/staff/leave/[id]/route");
    const res = await PATCH(
      makeReq("/api/staff/leave/1", "PATCH", { status: "rejected", rejection_reason: "Understaffed" }),
      { params: Promise.resolve({ id: "1" }) },
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.request.status).toBe("rejected");
  });
});

// ─── Leave Balance ──────────────────────────────────────────────

describe("GET /api/staff/leave/balance", () => {
  it("returns 401 without auth", async () => {
    mockAccountId = null;
    const { GET } = await import("@/app/api/staff/leave/balance/route");
    const res = await GET(makeReq("/api/staff/leave/balance", "GET"));
    expect(res.status).toBe(401);
  });

  it("returns leave balances for current year", async () => {
    tableResults["leave_balance"] = {
      data: [
        { id: 1, user_id: 5, leave_type_id: 1, year: 2026, total_days: 21, used_days: 5 },
        { id: 2, user_id: 5, leave_type_id: 2, year: 2026, total_days: 15, used_days: 2 },
      ],
      error: null,
    };
    const { GET } = await import("@/app/api/staff/leave/balance/route");
    const res = await GET(makeReq("/api/staff/leave/balance?user_id=5", "GET"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.balances).toHaveLength(2);
  });

  it("accepts year parameter", async () => {
    tableResults["leave_balance"] = { data: [], error: null };
    const { GET } = await import("@/app/api/staff/leave/balance/route");
    const res = await GET(makeReq("/api/staff/leave/balance?year=2025", "GET"));
    expect(res.status).toBe(200);
  });

  it("rejects invalid year", async () => {
    const { GET } = await import("@/app/api/staff/leave/balance/route");
    const res = await GET(makeReq("/api/staff/leave/balance?year=abc", "GET"));
    expect(res.status).toBe(400);
  });
});

// ─── Staffing Requirements ──────────────────────────────────────

describe("GET /api/staff/staffing-requirements", () => {
  it("returns requirements", async () => {
    tableResults["staffing_requirement"] = {
      data: [
        { id: 1, slot_id: 1, role: "cashier", min_count: 2, max_count: 3 },
        { id: 2, slot_id: 1, role: "supervisor", min_count: 1, max_count: 1 },
      ],
      error: null,
    };
    const { GET } = await import("@/app/api/staff/staffing-requirements/route");
    const res = await GET(makeReq("/api/staff/staffing-requirements?slot_id=1", "GET"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.requirements).toHaveLength(2);
  });
});

describe("POST /api/staff/staffing-requirements", () => {
  it("replaces requirements for a slot", async () => {
    tableResults["staffing_requirement"] = {
      data: [{ id: 10, slot_id: 1, role: "cashier", min_count: 3, max_count: 3 }],
      error: null,
    };
    const { POST } = await import("@/app/api/staff/staffing-requirements/route");
    const res = await POST(makeReq("/api/staff/staffing-requirements", "POST", {
      slot_id: 1,
      requirements: [{ role: "cashier", min_count: 3 }],
    }));
    const body = await res.json();
    expect(res.status).toBe(201);
    // Verify old requirements were deleted first
    const deleteOp = supabaseOps.find(o => o.table === "staffing_requirement" && o.op === "delete");
    expect(deleteOp).toBeDefined();
  });

  it("rejects missing slot_id", async () => {
    const { POST } = await import("@/app/api/staff/staffing-requirements/route");
    const res = await POST(makeReq("/api/staff/staffing-requirements", "POST", {
      requirements: [{ role: "cashier", min_count: 1 }],
    }));
    expect(res.status).toBe(400);
  });

  it("rejects requirements without role", async () => {
    const { POST } = await import("@/app/api/staff/staffing-requirements/route");
    const res = await POST(makeReq("/api/staff/staffing-requirements", "POST", {
      slot_id: 1,
      requirements: [{ min_count: 1 }],
    }));
    expect(res.status).toBe(400);
  });

  it("handles empty requirements array (clears slot)", async () => {
    tableResults["staffing_requirement"] = { data: null, error: null };
    const { POST } = await import("@/app/api/staff/staffing-requirements/route");
    const res = await POST(makeReq("/api/staff/staffing-requirements", "POST", {
      slot_id: 1, requirements: [],
    }));
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.requirements).toHaveLength(0);
  });
});

// ─── Payroll Export ─────────────────────────────────────────────

describe("GET /api/staff/payroll-export", () => {
  it("returns 401 without auth", async () => {
    mockAccountId = null;
    const { GET } = await import("@/app/api/staff/payroll-export/route");
    const res = await GET(makeReq("/api/staff/payroll-export?start_date=2026-03-01&end_date=2026-03-31", "GET"));
    expect(res.status).toBe(401);
  });

  it("requires start_date and end_date", async () => {
    const { GET } = await import("@/app/api/staff/payroll-export/route");
    const res = await GET(makeReq("/api/staff/payroll-export", "GET"));
    expect(res.status).toBe(400);
  });

  it("returns CSV with correct headers", async () => {
    tableResults["shift"] = {
      data: [
        { user_id: 5, clock_in: "2026-03-10T08:00:00Z", clock_out: "2026-03-10T16:00:00Z" },
      ],
      error: null,
    };
    tableResults["staff_break"] = { data: [], error: null };
    tableResults["pos_user"] = {
      data: [{ user_id: 5, username: "alice", firstname: "Alice" }],
      error: null,
    };

    const { GET } = await import("@/app/api/staff/payroll-export/route");
    const res = await GET(makeReq("/api/staff/payroll-export?start_date=2026-03-01&end_date=2026-03-31", "GET"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/csv");
    expect(res.headers.get("Content-Disposition")).toContain("payroll_2026-03-01_to_2026-03-31.csv");

    const csv = await res.text();
    expect(csv).toContain("employee_id,employee_name,total_hours,overtime_hours,break_hours,net_hours,shift_count");
    expect(csv).toContain("Alice");
  });
});
