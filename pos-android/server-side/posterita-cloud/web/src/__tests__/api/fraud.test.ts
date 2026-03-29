import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Inline mocks ────────────────────────────────────────────────

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

let mockAccountId: string | null = "test_fraud_acc";

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: (table: string) => createChain(table) }),
}));

vi.mock("@/lib/account-context", () => ({
  getSessionAccountId: () => Promise.resolve(mockAccountId),
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
  mockAccountId = "test_fraud_acc";
  vi.resetModules();
});

// ── Signals API ─────────────────────────────────────────────────

describe("GET /api/fraud/signals", () => {
  it("returns 401 without auth", async () => {
    mockAccountId = null;
    const { GET } = await import("@/app/api/fraud/signals/route");
    const res = await GET(makeReq("/api/fraud/signals", "GET"));
    expect(res.status).toBe(401);
  });

  it("returns signals", async () => {
    tableResults["fraud_signal"] = {
      data: [
        { id: 1, signal_type: "high_void_rate", severity: "warning", title: "High void rate: 8%", status: "open" },
        { id: 2, signal_type: "cash_shortage", severity: "critical", title: "Cash shortage: 250.00", status: "open" },
      ],
      error: null,
      count: 2,
    };
    const { GET } = await import("@/app/api/fraud/signals/route");
    const res = await GET(makeReq("/api/fraud/signals", "GET"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.signals).toHaveLength(2);
    expect(body.total).toBe(2);
  });
});

describe("PATCH /api/fraud/signals", () => {
  it("updates signal status", async () => {
    tableResults["fraud_signal"] = {
      data: [{ id: 1, status: "resolved" }],
      error: null,
    };
    const { PATCH } = await import("@/app/api/fraud/signals/route");
    const res = await PATCH(makeReq("/api/fraud/signals", "PATCH", { id: 1, status: "resolved" }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.signal.status).toBe("resolved");
  });

  it("rejects invalid status", async () => {
    const { PATCH } = await import("@/app/api/fraud/signals/route");
    const res = await PATCH(makeReq("/api/fraud/signals", "PATCH", { id: 1, status: "invalid" }));
    expect(res.status).toBe(400);
  });
});

// ── Audit Trail API ─────────────────────────────────────────────

describe("GET /api/fraud/audit-trail", () => {
  it("returns audit events", async () => {
    tableResults["audit_event"] = {
      data: [
        { id: 1, action: "order.void", user_name: "Alice", detail: "Voided #123", amount: 50.0 },
        { id: 2, action: "drawer.open", user_name: "Bob", detail: "No-sale", amount: null },
      ],
      error: null,
      count: 2,
    };
    const { GET } = await import("@/app/api/fraud/audit-trail/route");
    const res = await GET(makeReq("/api/fraud/audit-trail", "GET"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.events).toHaveLength(2);
    expect(body.total).toBe(2);
  });
});

// ── Fraud Detection Engine ──────────────────────────────────────

describe("Fraud detection rules", () => {
  it("detects high void rate", async () => {
    const { runFraudDetection } = await import("@/lib/fraud-detection");
    const mockDb = {
      from: (table: string) => {
        if (table === "orders") {
          return createChainWithData([
            ...Array.from({ length: 90 }, (_, i) => ({ order_id: i, doc_status: "CO", store_id: 1 })),
            ...Array.from({ length: 10 }, (_, i) => ({ order_id: 100 + i, doc_status: "VO", store_id: 1 })),
          ]);
        }
        return createChainWithData([]);
      },
    };
    const signals = await runFraudDetection(mockDb, "acc1", "2026-03-01", "2026-03-29");
    const voidSignal = signals.find(s => s.signal_type === "high_void_rate");
    expect(voidSignal).toBeDefined();
    expect(voidSignal!.metric_value).toBeCloseTo(10, 0);
  });

  it("detects excessive refunds", async () => {
    const { runFraudDetection } = await import("@/lib/fraud-detection");
    const mockDb = {
      from: (table: string) => {
        if (table === "audit_event") {
          return createChainWithData([
            ...Array.from({ length: 8 }, () => ({ user_id: 5, user_name: "BadStaff", action: "order.create" })),
            ...Array.from({ length: 3 }, () => ({ user_id: 5, user_name: "BadStaff", action: "order.refund" })),
          ]);
        }
        return createChainWithData([]);
      },
    };
    const signals = await runFraudDetection(mockDb, "acc1", "2026-03-01", "2026-03-29");
    const refundSignal = signals.find(s => s.signal_type === "excessive_refunds");
    expect(refundSignal).toBeDefined();
    expect(refundSignal!.title).toContain("BadStaff");
  });

  it("returns empty for clean data", async () => {
    const { runFraudDetection } = await import("@/lib/fraud-detection");
    const mockDb = {
      from: () => createChainWithData([]),
    };
    const signals = await runFraudDetection(mockDb, "acc1", "2026-03-01", "2026-03-29");
    expect(signals).toHaveLength(0);
  });
});

// Helper for detection tests — builds a chain that always returns given data
function createChainWithData(data: any[]) {
  const chain: any = {};
  for (const m of ["select", "eq", "gte", "lte", "order", "limit", "range", "in", "neq"] as const) {
    chain[m] = () => chain;
  }
  chain.single = () => Promise.resolve({ data: data[0] ?? null, error: null });
  chain.maybeSingle = chain.single;
  chain.then = (onF: Function) => Promise.resolve({ data, error: null }).then(onF as any);
  return chain;
}
