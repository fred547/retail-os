import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Inline mocks (same pattern as shifts.test.ts) ──────────────

let tableResults: Record<string, { data: any; error: any; count?: number }> = {};
let supabaseOps: Array<{ table: string; op: string; data?: any }> = [];

function createChain(table: string) {
  const state = { op: "select" as string, data: undefined as any, filters: {} as Record<string, any> };

  function resolve() {
    supabaseOps.push({ table, op: state.op, data: state.data });
    const filterKey = Object.entries(state.filters).map(([k, v]) => `${k}=${v}`).join(",");
    return tableResults[`${table}:${filterKey}`] ?? tableResults[table] ?? { data: state.op === "select" ? [] : null, error: null, count: 0 };
  }

  const chain: any = {};
  for (const m of ["select", "eq", "gte", "lte", "gt", "order", "limit", "range", "in", "neq", "is", "not", "or"] as const) {
    chain[m] = (...args: any[]) => { if (m === "eq") state.filters[args[0]] = args[1]; return chain; };
  }
  for (const m of ["insert", "update", "upsert", "delete"] as const) {
    chain[m] = (...args: any[]) => { state.op = m; state.data = args[0]; return chain; };
  }
  chain.single = () => { const r = resolve(); return Promise.resolve({ ...r, data: Array.isArray(r.data) ? r.data[0] ?? null : r.data }); };
  chain.maybeSingle = chain.single;
  chain.then = (onF: Function, onR?: Function) => Promise.resolve(resolve()).then(onF as any, onR as any);
  return chain;
}

let mockAccountId: string | null = "test_roster_acc";

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: (table: string) => createChain(table) }),
}));

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
  mockAccountId = "test_roster_acc";
  vi.resetModules();
});

// ── Holidays ──────────────────────────────────────────────────────

describe("GET /api/staff/holidays", () => {
  it("returns 401 without auth", async () => {
    mockAccountId = null;
    const { GET } = await import("@/app/api/staff/holidays/route");
    const res = await GET(makeReq("/api/staff/holidays?year=2026", "GET"));
    expect(res.status).toBe(401);
  });

  it("returns holidays for a year", async () => {
    tableResults["public_holiday"] = {
      data: [
        { id: 1, date: "2026-01-01", name: "New Year", country_code: "MU", is_recurring: true },
        { id: 2, date: "2026-03-12", name: "National Day", country_code: "MU", is_recurring: true },
      ],
      error: null,
    };
    const { GET } = await import("@/app/api/staff/holidays/route");
    const res = await GET(makeReq("/api/staff/holidays?year=2026", "GET"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.holidays).toHaveLength(2);
  });
});

describe("POST /api/staff/holidays", () => {
  it("creates a holiday", async () => {
    tableResults["public_holiday"] = {
      data: [{ id: 10, date: "2026-05-01", name: "Labour Day", is_recurring: true }],
      error: null,
    };
    const { POST } = await import("@/app/api/staff/holidays/route");
    const res = await POST(makeReq("/api/staff/holidays", "POST", { date: "2026-05-01", name: "Labour Day", is_recurring: true }));
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.holiday.name).toBe("Labour Day");
  });

  it("rejects missing fields", async () => {
    const { POST } = await import("@/app/api/staff/holidays/route");
    const res = await POST(makeReq("/api/staff/holidays", "POST", { date: "2026-05-01" }));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/staff/holidays/seed", () => {
  it("seeds Mauritius 2026 holidays", async () => {
    tableResults["public_holiday"] = {
      data: Array.from({ length: 14 }, (_, i) => ({ id: i + 1, country_code: "MU" })),
      error: null,
    };
    const { POST } = await import("@/app/api/staff/holidays/seed/route");
    const res = await POST(makeReq("/api/staff/holidays/seed", "POST", { country_code: "MU", year: 2026 }));
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.count).toBe(14);
  });

  it("rejects unknown country", async () => {
    const { POST } = await import("@/app/api/staff/holidays/seed/route");
    const res = await POST(makeReq("/api/staff/holidays/seed", "POST", { country_code: "US", year: 2026 }));
    expect(res.status).toBe(400);
  });
});

// ── Labor Config ──────────────────────────────────────────────────

describe("GET /api/staff/labor-config", () => {
  it("returns existing config", async () => {
    tableResults["labor_config"] = {
      data: [{ id: 1, account_id: "test_roster_acc", standard_weekly_hours: 45, sunday_multiplier: 1.5 }],
      error: null,
    };
    const { GET } = await import("@/app/api/staff/labor-config/route");
    const res = await GET(makeReq("/api/staff/labor-config", "GET"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.config.standard_weekly_hours).toBe(45);
  });
});

describe("POST /api/staff/labor-config", () => {
  it("updates config", async () => {
    tableResults["labor_config"] = {
      data: [{ id: 1, sunday_multiplier: 2.0, standard_weekly_hours: 40 }],
      error: null,
    };
    const { POST } = await import("@/app/api/staff/labor-config/route");
    const res = await POST(makeReq("/api/staff/labor-config", "POST", {
      standard_weekly_hours: 40, sunday_multiplier: 2.0,
    }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.config.sunday_multiplier).toBe(2.0);
  });
});

// ── Operating Hours ───────────────────────────────────────────────

describe("GET /api/staff/operating-hours", () => {
  it("requires store_id", async () => {
    const { GET } = await import("@/app/api/staff/operating-hours/route");
    const res = await GET(makeReq("/api/staff/operating-hours", "GET"));
    expect(res.status).toBe(400);
  });

  it("returns store hours", async () => {
    tableResults["store_operating_hours"] = {
      data: [
        { id: 1, store_id: 1, day_type: "weekday", open_time: "08:00", close_time: "18:00" },
        { id: 2, store_id: 1, day_type: "sunday", is_closed: true },
      ],
      error: null,
    };
    const { GET } = await import("@/app/api/staff/operating-hours/route");
    const res = await GET(makeReq("/api/staff/operating-hours?store_id=1", "GET"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.hours).toHaveLength(2);
  });
});

describe("POST /api/staff/operating-hours", () => {
  it("upserts store hours", async () => {
    tableResults["store_operating_hours"] = {
      data: [{ id: 1, day_type: "weekday" }, { id: 2, day_type: "saturday" }],
      error: null,
    };
    const { POST } = await import("@/app/api/staff/operating-hours/route");
    const res = await POST(makeReq("/api/staff/operating-hours", "POST", {
      entries: [
        { store_id: 1, day_type: "weekday", open_time: "08:00", close_time: "18:00" },
        { store_id: 1, day_type: "saturday", open_time: "09:00", close_time: "13:00" },
      ],
    }));
    expect(res.status).toBe(201);
  });

  it("rejects invalid day_type", async () => {
    const { POST } = await import("@/app/api/staff/operating-hours/route");
    const res = await POST(makeReq("/api/staff/operating-hours", "POST", {
      entries: [{ store_id: 1, day_type: "invalid" }],
    }));
    expect(res.status).toBe(400);
  });
});

// ── Roster Slots ──────────────────────────────────────────────────

describe("POST /api/staff/roster-slots", () => {
  it("creates a template slot", async () => {
    tableResults["roster_template_slot"] = {
      data: [{ id: 1, name: "Morning Cashier", day_of_week: 1, start_time: "08:00", end_time: "14:00" }],
      error: null,
    };
    const { POST } = await import("@/app/api/staff/roster-slots/route");
    const res = await POST(makeReq("/api/staff/roster-slots", "POST", {
      store_id: 1, name: "Morning Cashier", day_of_week: 1, start_time: "08:00", end_time: "14:00",
    }));
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.slot.name).toBe("Morning Cashier");
  });

  it("rejects missing fields", async () => {
    const { POST } = await import("@/app/api/staff/roster-slots/route");
    const res = await POST(makeReq("/api/staff/roster-slots", "POST", { store_id: 1 }));
    expect(res.status).toBe(400);
  });

  it("rejects invalid day_of_week", async () => {
    const { POST } = await import("@/app/api/staff/roster-slots/route");
    const res = await POST(makeReq("/api/staff/roster-slots", "POST", {
      store_id: 1, name: "Bad", day_of_week: 9, start_time: "08:00", end_time: "14:00",
    }));
    expect(res.status).toBe(400);
  });

  it("rejects end_time before start_time", async () => {
    const { POST } = await import("@/app/api/staff/roster-slots/route");
    const res = await POST(makeReq("/api/staff/roster-slots", "POST", {
      store_id: 1, name: "Bad", day_of_week: 1, start_time: "14:00", end_time: "08:00",
    }));
    expect(res.status).toBe(400);
  });
});

// ── Roster Periods ────────────────────────────────────────────────

describe("POST /api/staff/roster-periods", () => {
  it("creates a period", async () => {
    tableResults["roster_period"] = {
      data: [{ id: 1, name: "April 2026", status: "open", start_date: "2026-04-01", end_date: "2026-04-30" }],
      error: null,
    };
    const { POST } = await import("@/app/api/staff/roster-periods/route");
    const res = await POST(makeReq("/api/staff/roster-periods", "POST", {
      store_id: 1, name: "April 2026", start_date: "2026-04-01", end_date: "2026-04-30",
    }));
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.period.status).toBe("open");
  });

  it("rejects end before start", async () => {
    const { POST } = await import("@/app/api/staff/roster-periods/route");
    const res = await POST(makeReq("/api/staff/roster-periods", "POST", {
      store_id: 1, start_date: "2026-04-30", end_date: "2026-04-01",
    }));
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/staff/roster-periods/[id]", () => {
  it("rejects invalid transition (open → locked)", async () => {
    tableResults["roster_period"] = {
      data: [{ id: 1, status: "open" }],
      error: null,
    };
    const { PATCH } = await import("@/app/api/staff/roster-periods/[id]/route");
    const params = Promise.resolve({ id: "1" });
    const res = await PATCH(
      makeReq("/api/staff/roster-periods/1", "PATCH", { status: "locked" }),
      { params },
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Cannot transition");
  });
});

// ── Picks ─────────────────────────────────────────────────────────

describe("POST /api/staff/picks", () => {
  it("rejects pick when period not in picking status", async () => {
    tableResults["roster_period"] = {
      data: [{ status: "open" }],
      error: null,
    };
    const { POST } = await import("@/app/api/staff/picks/route");
    const res = await POST(makeReq("/api/staff/picks", "POST", {
      roster_period_id: 1, slot_id: 1, user_id: 5, date: "2026-04-06",
    }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("not open for picking");
  });

  it("rejects missing fields", async () => {
    const { POST } = await import("@/app/api/staff/picks/route");
    const res = await POST(makeReq("/api/staff/picks", "POST", { roster_period_id: 1 }));
    expect(res.status).toBe(400);
  });
});

// ── Effective Hours on Clock-Out ──────────────────────────────────

describe("POST /api/shifts (clock_out with effective hours)", () => {
  it("computes effective_hours on clock out", async () => {
    const eightHoursAgo = new Date(Date.now() - 8 * 3600000).toISOString();
    tableResults["shift"] = {
      data: [{ id: 1, clock_in: eightHoursAgo, status: "completed", hours_worked: 8, effective_hours: 8, day_type: "weekday", multiplier: 1.0 }],
      error: null,
    };
    tableResults["public_holiday"] = { data: null, error: null };
    tableResults["labor_config"] = {
      data: [{ weekday_multiplier: 1.0, saturday_multiplier: 1.0, sunday_multiplier: 1.5, public_holiday_multiplier: 2.0 }],
      error: null,
    };

    const { POST } = await import("@/app/api/shifts/route");
    const res = await POST(makeReq("/api/shifts", "POST", {
      action: "clock_out", user_id: 10, shift_id: 1,
    }));
    const body = await res.json();
    expect(body.action).toBe("clocked_out");
    expect(body.hours_worked).toBeGreaterThan(0);
    expect(body.effective_hours).toBeGreaterThan(0);
    expect(body.day_type).toBeDefined();
    expect(body.multiplier).toBeGreaterThanOrEqual(1.0);
  });
});
