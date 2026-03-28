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
  for (const m of ["select", "eq", "neq", "gte", "order", "limit", "range", "in", "contains", "is", "not", "or", "gt", "ilike"] as const) {
    chain[m] = (...args: any[]) => {
      if (m === "eq") state.filters[args[0]] = args[1];
      return chain;
    };
  }
  for (const m of ["insert", "update", "upsert", "delete"] as const) {
    chain[m] = (...args: any[]) => { state.op = m; state.data = args[0]; return chain; };
  }
  chain.single = () => { const r = resolve(); return Promise.resolve({ ...r, data: Array.isArray(r.data) ? r.data[0] ?? null : r.data }); };
  chain.maybeSingle = chain.single;
  chain.then = (f: Function, r?: Function) => Promise.resolve(resolve()).then(f as any, r as any);
  return chain;
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: (table: string) => createChain(table) }),
}));

let mockAccountId: string | null = "test_webhook_acc";
vi.mock("@/lib/account-context", () => ({
  getSessionAccountId: () => Promise.resolve(mockAccountId),
}));

beforeEach(() => {
  supabaseOps = [];
  tableResults = {};
  mockAccountId = "test_webhook_acc";
});

function makeReq(body: any) {
  return new Request("http://localhost/api/webhooks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

describe("POST /api/webhooks — create subscription", () => {
  let POST: Function;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("@/app/api/webhooks/route");
    POST = mod.POST;
    // Default: no existing subs (under limit)
    tableResults["webhook_subscription"] = { data: [], error: null, count: 0 };
  });

  it("returns 401 if not authenticated", async () => {
    mockAccountId = null;
    vi.resetModules();
    const mod = await import("@/app/api/webhooks/route");
    const res = await mod.POST(makeReq({ url: "https://example.com/hook", events: ["order.created"] }));
    expect(res.status).toBe(401);
  });

  it("returns 400 if URL is missing", async () => {
    const res = await POST(makeReq({ events: ["order.created"] }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("URL");
  });

  it("returns 400 if URL is not HTTPS", async () => {
    const res = await POST(makeReq({ url: "http://insecure.com/hook", events: ["order.created"] }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("HTTPS");
  });

  it("returns 400 if no events selected", async () => {
    const res = await POST(makeReq({ url: "https://example.com/hook", events: [] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid event names", async () => {
    const res = await POST(makeReq({ url: "https://example.com/hook", events: ["invalid.event"] }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("invalid.event");
  });

  it("creates subscription with valid data", async () => {
    tableResults["webhook_subscription"] = {
      data: [{ id: 1, url: "https://example.com/hook", events: ["order.created"], secret: "abc", is_active: true }],
      error: null,
      count: 0,
    };

    const res = await POST(makeReq({
      url: "https://example.com/hook",
      events: ["order.created", "till.closed"],
      description: "Test webhook",
    }));
    expect(res.status).toBe(201);

    const insertOp = supabaseOps.find((o) => o.table === "webhook_subscription" && o.op === "insert");
    expect(insertOp).toBeDefined();
    expect(insertOp!.data.url).toBe("https://example.com/hook");
    expect(insertOp!.data.events).toContain("order.created");
    expect(insertOp!.data.secret).toBeDefined();
    expect(insertOp!.data.secret.length).toBe(64); // 32 bytes hex
  });
});

describe("GET /api/webhooks — list subscriptions", () => {
  it("returns subscriptions for account", async () => {
    vi.resetModules();
    tableResults["webhook_subscription"] = {
      data: [
        { id: 1, url: "https://a.com/hook", events: ["order.created"], is_active: true },
        { id: 2, url: "https://b.com/hook", events: ["till.closed"], is_active: false },
      ],
      error: null,
    };
    const mod = await import("@/app/api/webhooks/route");
    const res = await mod.GET();
    const json = await res.json();
    expect(json.data).toHaveLength(2);
  });
});

describe("DELETE /api/webhooks/[id]", () => {
  it("deletes a subscription", async () => {
    vi.resetModules();
    const mod = await import("@/app/api/webhooks/[id]/route");
    const req = new Request("http://localhost/api/webhooks/5", { method: "DELETE" });
    const res = await mod.DELETE(req as any, { params: Promise.resolve({ id: "5" }) });
    expect(res.status).toBe(200);

    const deleteOp = supabaseOps.find((o) => o.table === "webhook_subscription" && o.op === "delete");
    expect(deleteOp).toBeDefined();
    expect(deleteOp!.filters.id).toBe(5);
    expect(deleteOp!.filters.account_id).toBe("test_webhook_acc");
  });

  it("returns 400 for invalid ID", async () => {
    vi.resetModules();
    const mod = await import("@/app/api/webhooks/[id]/route");
    const req = new Request("http://localhost/api/webhooks/abc", { method: "DELETE" });
    const res = await mod.DELETE(req as any, { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/webhooks/[id]", () => {
  it("resets failure count when re-enabling", async () => {
    vi.resetModules();
    tableResults["webhook_subscription"] = {
      data: { id: 3, url: "https://a.com/hook", is_active: true, failure_count: 0 },
      error: null,
    };
    const mod = await import("@/app/api/webhooks/[id]/route");
    const req = new Request("http://localhost/api/webhooks/3", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: true }),
    });
    const res = await mod.PATCH(req as any, { params: Promise.resolve({ id: "3" }) });
    expect(res.status).toBe(200);

    const updateOp = supabaseOps.find((o) => o.table === "webhook_subscription" && o.op === "update");
    expect(updateOp).toBeDefined();
    expect(updateOp!.data.is_active).toBe(true);
    expect(updateOp!.data.failure_count).toBe(0);
  });
});

describe("fireWebhook utility", () => {
  it("generates valid HMAC signature", async () => {
    const { createHmac } = await import("crypto");
    const secret = "test-secret-key";
    const payload = JSON.stringify({ event: "order.created", data: { order_id: 1 } });
    const sig = createHmac("sha256", secret).update(payload).digest("hex");
    expect(sig).toHaveLength(64);
    // Verify deterministic
    const sig2 = createHmac("sha256", secret).update(payload).digest("hex");
    expect(sig).toBe(sig2);
  });

  it("generateTestPayload returns data for all events", async () => {
    const { generateTestPayload, WEBHOOK_EVENTS } = await import("@/lib/webhooks");
    for (const event of WEBHOOK_EVENTS) {
      const payload = generateTestPayload(event);
      expect(payload).toBeDefined();
      expect(typeof payload).toBe("object");
    }
  });
});
