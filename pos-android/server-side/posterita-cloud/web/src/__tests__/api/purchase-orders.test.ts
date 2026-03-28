import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Supabase mock ──────────────────────────────────────────────
let tableResults: Record<string, { data: any; error: any; count?: number }> = {};
let supabaseOps: Array<{ table: string; op: string; data?: any; filters: Record<string, any> }> = [];

function createChain(table: string) {
  const state = { op: "select" as string, data: undefined as any, filters: {} as Record<string, any>, countMode: false, headMode: false };
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
      if (m === "select" && args[1]?.head) state.headMode = true;
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

let mockAccountId: string | null = "test-po-acc";

vi.mock("@/lib/supabase/admin", () => ({ getDb: () => ({ from: (t: string) => createChain(t) }) }));
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
  mockAccountId = "test-po-acc";
  vi.resetModules();
});

// ─── List POs ───────────────────────────────────────────────────

describe("GET /api/purchase-orders", () => {
  it("returns 401 without auth", async () => {
    mockAccountId = null;
    const { GET } = await import("@/app/api/purchase-orders/route");
    const res = await GET(makeReq("/api/purchase-orders", "GET"));
    expect(res.status).toBe(401);
  });

  it("returns paginated purchase orders", async () => {
    tableResults["purchase_order"] = {
      data: [
        { po_id: 1, po_number: "PO-00001", supplier_id: 10, status: "draft", subtotal: 500, grand_total: 500 },
        { po_id: 2, po_number: "PO-00002", supplier_id: 10, status: "ordered", subtotal: 300, grand_total: 300 },
      ],
      error: null,
      count: 2,
    };
    tableResults["supplier"] = {
      data: [{ supplier_id: 10, name: "Acme Supplies" }],
      error: null,
    };

    const { GET } = await import("@/app/api/purchase-orders/route");
    const res = await GET(makeReq("/api/purchase-orders", "GET"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.orders).toHaveLength(2);
    expect(body.orders[0].supplier_name).toBe("Acme Supplies");
    expect(body.total).toBe(2);
    expect(body.page).toBe(1);
  });

  it("filters by status", async () => {
    tableResults["purchase_order"] = { data: [], error: null, count: 0 };
    tableResults["supplier"] = { data: [], error: null };
    const { GET } = await import("@/app/api/purchase-orders/route");
    const res = await GET(makeReq("/api/purchase-orders?status=draft", "GET"));
    expect(res.status).toBe(200);
  });

  it("filters by supplier_id", async () => {
    tableResults["purchase_order"] = { data: [], error: null, count: 0 };
    tableResults["supplier"] = { data: [], error: null };
    const { GET } = await import("@/app/api/purchase-orders/route");
    const res = await GET(makeReq("/api/purchase-orders?supplier_id=10", "GET"));
    expect(res.status).toBe(200);
  });
});

// ─── Create PO ──────────────────────────────────────────────────

describe("POST /api/purchase-orders", () => {
  it("returns 401 without auth", async () => {
    mockAccountId = null;
    const { POST } = await import("@/app/api/purchase-orders/route");
    const res = await POST(makeReq("/api/purchase-orders", "POST", {
      supplier_id: 10, lines: [{ product_id: 1, quantity_ordered: 10, unit_cost: 5 }],
    }));
    expect(res.status).toBe(401);
  });

  it("creates a PO with lines", async () => {
    // Mock count for PO number generation
    tableResults["purchase_order"] = {
      data: [{ po_id: 1, po_number: "PO-00001", supplier_id: 10, status: "draft", subtotal: 50, grand_total: 50 }],
      error: null,
      count: 0,
    };
    tableResults["purchase_order_line"] = { data: null, error: null };

    const { POST } = await import("@/app/api/purchase-orders/route");
    const res = await POST(makeReq("/api/purchase-orders", "POST", {
      supplier_id: 10,
      store_id: 1,
      lines: [{ product_id: 1, product_name: "Widget", quantity_ordered: 10, unit_cost: 5 }],
      notes: "Urgent order",
      expected_date: "2026-04-15",
    }));
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.order.po_number).toBe("PO-00001");
    expect(body.order.status).toBe("draft");

    // Verify PO header insert
    const poInsert = supabaseOps.find(o => o.table === "purchase_order" && o.op === "insert");
    expect(poInsert).toBeDefined();
    expect(poInsert?.data?.subtotal).toBe(50);

    // Verify lines insert
    const lineInsert = supabaseOps.find(o => o.table === "purchase_order_line" && o.op === "insert");
    expect(lineInsert).toBeDefined();
  });

  it("rejects missing supplier_id", async () => {
    const { POST } = await import("@/app/api/purchase-orders/route");
    const res = await POST(makeReq("/api/purchase-orders", "POST", {
      lines: [{ product_id: 1, quantity_ordered: 10, unit_cost: 5 }],
    }));
    expect(res.status).toBe(400);
  });

  it("rejects empty lines", async () => {
    const { POST } = await import("@/app/api/purchase-orders/route");
    const res = await POST(makeReq("/api/purchase-orders", "POST", {
      supplier_id: 10, lines: [],
    }));
    expect(res.status).toBe(400);
  });

  it("rejects missing lines field", async () => {
    const { POST } = await import("@/app/api/purchase-orders/route");
    const res = await POST(makeReq("/api/purchase-orders", "POST", {
      supplier_id: 10,
    }));
    expect(res.status).toBe(400);
  });

  it("calculates subtotal from multiple lines", async () => {
    tableResults["purchase_order"] = {
      data: [{ po_id: 2, po_number: "PO-00002", status: "draft", subtotal: 250, grand_total: 250 }],
      error: null,
      count: 1,
    };
    tableResults["purchase_order_line"] = { data: null, error: null };

    const { POST } = await import("@/app/api/purchase-orders/route");
    const res = await POST(makeReq("/api/purchase-orders", "POST", {
      supplier_id: 10,
      lines: [
        { product_id: 1, quantity_ordered: 10, unit_cost: 5 },   // 50
        { product_id: 2, quantity_ordered: 20, unit_cost: 10 },  // 200
      ],
    }));
    expect(res.status).toBe(201);

    // Verify subtotal calculation (10*5 + 20*10 = 250)
    const poInsert = supabaseOps.find(o => o.table === "purchase_order" && o.op === "insert");
    expect(poInsert?.data?.subtotal).toBe(250);
  });
});

// ─── PO Detail ──────────────────────────────────────────────────

describe("GET /api/purchase-orders/[id]", () => {
  it("returns 401 without auth", async () => {
    mockAccountId = null;
    const { GET } = await import("@/app/api/purchase-orders/[id]/route");
    const res = await GET(makeReq("/api/purchase-orders/1", "GET"), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(401);
  });

  it("returns PO detail with lines", async () => {
    tableResults["purchase_order"] = {
      data: [{ po_id: 1, po_number: "PO-00001", supplier_id: 10, status: "draft" }],
      error: null,
    };
    tableResults["purchase_order_line"] = {
      data: [
        { id: 1, po_id: 1, product_id: 1, product_name: "Widget", quantity_ordered: 10, unit_cost: 5, line_total: 50 },
      ],
      error: null,
    };
    tableResults["supplier"] = {
      data: [{ name: "Acme", contact_name: "John", phone: "555-0100", email: "john@acme.com" }],
      error: null,
    };

    const { GET } = await import("@/app/api/purchase-orders/[id]/route");
    const res = await GET(makeReq("/api/purchase-orders/1", "GET"), { params: Promise.resolve({ id: "1" }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.order.supplier_name).toBe("Acme");
    expect(body.order.supplier_detail.email).toBe("john@acme.com");
    expect(body.lines).toHaveLength(1);
  });

  it("returns 400 for invalid ID", async () => {
    const { GET } = await import("@/app/api/purchase-orders/[id]/route");
    const res = await GET(makeReq("/api/purchase-orders/abc", "GET"), { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(400);
  });

  it("returns 404 when PO not found", async () => {
    tableResults["purchase_order"] = { data: null, error: { message: "not found" } };
    tableResults["purchase_order_line"] = { data: [], error: null };
    const { GET } = await import("@/app/api/purchase-orders/[id]/route");
    const res = await GET(makeReq("/api/purchase-orders/999", "GET"), { params: Promise.resolve({ id: "999" }) });
    expect(res.status).toBe(404);
  });
});

// ─── Update PO ──────────────────────────────────────────────────

describe("PATCH /api/purchase-orders/[id]", () => {
  it("updates PO status", async () => {
    tableResults["purchase_order"] = {
      data: [{ po_id: 1, status: "ordered", notes: null }],
      error: null,
    };
    const { PATCH } = await import("@/app/api/purchase-orders/[id]/route");
    const res = await PATCH(
      makeReq("/api/purchase-orders/1", "PATCH", { status: "ordered" }),
      { params: Promise.resolve({ id: "1" }) },
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.order.status).toBe("ordered");
  });

  it("updates PO notes", async () => {
    tableResults["purchase_order"] = {
      data: [{ po_id: 1, status: "draft", notes: "Updated notes" }],
      error: null,
    };
    const { PATCH } = await import("@/app/api/purchase-orders/[id]/route");
    const res = await PATCH(
      makeReq("/api/purchase-orders/1", "PATCH", { notes: "Updated notes" }),
      { params: Promise.resolve({ id: "1" }) },
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.order.notes).toBe("Updated notes");
  });

  it("rejects invalid ID", async () => {
    const { PATCH } = await import("@/app/api/purchase-orders/[id]/route");
    const res = await PATCH(
      makeReq("/api/purchase-orders/abc", "PATCH", { status: "ordered" }),
      { params: Promise.resolve({ id: "abc" }) },
    );
    expect(res.status).toBe(400);
  });
});

// ─── Receive Goods (GRN) ────────────────────────────────────────

describe("POST /api/purchase-orders/[id]/receive", () => {
  it("returns 401 without auth", async () => {
    mockAccountId = null;
    const { POST } = await import("@/app/api/purchase-orders/[id]/receive/route");
    const res = await POST(
      makeReq("/api/purchase-orders/1/receive", "POST", { lines: [{ id: 1, quantity_received: 5 }] }),
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(res.status).toBe(401);
  });

  it("receives goods and updates stock", async () => {
    tableResults["purchase_order"] = {
      data: [{ po_id: 1, status: "ordered", store_id: 1 }],
      error: null,
    };
    tableResults["purchase_order_line"] = {
      data: [{ id: 10, po_id: 1, product_id: 100, quantity_ordered: 20, quantity_received: 0 }],
      error: null,
    };
    tableResults["product"] = {
      data: [{ product_id: 100, quantity_on_hand: 50, track_stock: true }],
      error: null,
    };
    tableResults["stock_journal"] = { data: null, error: null };

    const { POST } = await import("@/app/api/purchase-orders/[id]/receive/route");
    const res = await POST(
      makeReq("/api/purchase-orders/1/receive", "POST", {
        lines: [{ id: 10, quantity_received: 20 }],
      }),
      { params: Promise.resolve({ id: "1" }) },
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe("received"); // Fully received
    expect(body.lines_received).toHaveLength(1);
    expect(body.lines_received[0].total_received).toBe(20);

    // Verify product stock update
    const productUpdate = supabaseOps.find(o => o.table === "product" && o.op === "update");
    expect(productUpdate).toBeDefined();
    expect(productUpdate?.data?.quantity_on_hand).toBe(70); // 50 + 20

    // Verify stock journal entry
    const journalInsert = supabaseOps.find(o => o.table === "stock_journal" && o.op === "insert");
    expect(journalInsert).toBeDefined();
    expect(journalInsert?.data?.quantity_change).toBe(20);
    expect(journalInsert?.data?.reason).toBe("receive");
  });

  it("partial receive sets status to partial", async () => {
    tableResults["purchase_order"] = {
      data: [{ po_id: 1, status: "ordered", store_id: 1 }],
      error: null,
    };
    tableResults["purchase_order_line"] = {
      data: [{ id: 10, po_id: 1, product_id: 100, quantity_ordered: 20, quantity_received: 0 }],
      error: null,
    };
    tableResults["product"] = {
      data: [{ product_id: 100, quantity_on_hand: 50, track_stock: true }],
      error: null,
    };
    tableResults["stock_journal"] = { data: null, error: null };

    const { POST } = await import("@/app/api/purchase-orders/[id]/receive/route");
    const res = await POST(
      makeReq("/api/purchase-orders/1/receive", "POST", {
        lines: [{ id: 10, quantity_received: 10 }], // Only 10 of 20 ordered
      }),
      { params: Promise.resolve({ id: "1" }) },
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe("partial");
    expect(body.lines_received[0].total_received).toBe(10);
    expect(body.lines_received[0].quantity_ordered).toBe(20);
  });

  it("rejects receive on cancelled PO", async () => {
    tableResults["purchase_order"] = {
      data: [{ po_id: 1, status: "cancelled", store_id: 1 }],
      error: null,
    };
    const { POST } = await import("@/app/api/purchase-orders/[id]/receive/route");
    const res = await POST(
      makeReq("/api/purchase-orders/1/receive", "POST", {
        lines: [{ id: 10, quantity_received: 5 }],
      }),
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("cancelled");
  });

  it("rejects empty lines array", async () => {
    const { POST } = await import("@/app/api/purchase-orders/[id]/receive/route");
    const res = await POST(
      makeReq("/api/purchase-orders/1/receive", "POST", { lines: [] }),
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when PO not found", async () => {
    tableResults["purchase_order"] = { data: null, error: { message: "not found" } };
    const { POST } = await import("@/app/api/purchase-orders/[id]/receive/route");
    const res = await POST(
      makeReq("/api/purchase-orders/999/receive", "POST", {
        lines: [{ id: 1, quantity_received: 5 }],
      }),
      { params: Promise.resolve({ id: "999" }) },
    );
    expect(res.status).toBe(404);
  });

  it("rejects invalid PO ID", async () => {
    const { POST } = await import("@/app/api/purchase-orders/[id]/receive/route");
    const res = await POST(
      makeReq("/api/purchase-orders/abc/receive", "POST", { lines: [{ id: 1, quantity_received: 5 }] }),
      { params: Promise.resolve({ id: "abc" }) },
    );
    expect(res.status).toBe(400);
  });
});
