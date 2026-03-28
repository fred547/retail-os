import { describe, it, expect, vi, beforeEach } from "vitest";

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
  for (const m of ["select", "eq", "gte", "order", "limit", "range", "in", "neq", "is", "not", "or", "gt", "lte", "ilike", "lt", "contains"] as const) {
    chain[m] = (...args: any[]) => {
      if (m === "select" && args[1]?.count) state.countMode = true;
      if (m === "eq") state.filters[args[0]] = args[1];
      if (m === "in") state.filters[args[0]] = args[1];
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

vi.mock("@/lib/supabase/admin", () => ({ getDb: () => ({ from: (t: string) => createChain(t) }) }));
let mockAccountId: string | null = "test-quote-acc";
vi.mock("@/lib/account-context", () => ({ getSessionAccountId: () => Promise.resolve(mockAccountId) }));
// Mock PDF dependencies so the pdf route can be imported without React PDF
vi.mock("@react-pdf/renderer", () => ({ renderToBuffer: () => Promise.resolve(Buffer.from("fake-pdf")) }));
vi.mock("@/lib/pdf/quote-templates", () => ({ renderQuotePdf: () => "fake-element" }));

function mockReq(body: any, url?: string): any {
  return {
    json: () => Promise.resolve(body),
    url: url ?? "http://localhost/api/quotations",
    headers: new Map(),
  };
}

function mockReqWithParams(body: any, id: string, url?: string): any {
  return {
    json: () => Promise.resolve(body),
    url: url ?? `http://localhost/api/quotations/${id}`,
    headers: new Map(),
  };
}

function paramsPromise(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  tableResults = {};
  supabaseOps = [];
  mockAccountId = "test-quote-acc";
});

// ─── GET /api/quotations ────────────────────────────────────────
describe("GET /api/quotations — list quotations", () => {
  it("returns quotations list", async () => {
    tableResults["quotation"] = {
      data: [
        { quotation_id: 1, document_no: "Q-001", grand_total: 100 },
        { quotation_id: 2, document_no: "Q-002", grand_total: 200 },
      ],
      error: null,
      count: 2,
    };

    const { GET } = await import("../../app/api/quotations/route");
    const res = await GET(mockReq(null, "http://localhost/api/quotations") as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.quotations).toHaveLength(2);
  });

  it("returns 401 when not authenticated", async () => {
    mockAccountId = null;
    const { GET } = await import("../../app/api/quotations/route");
    const res = await GET(mockReq(null, "http://localhost/api/quotations") as any);
    expect(res.status).toBe(401);
    mockAccountId = "test-quote-acc"; // restore
  });

  it("supports status filter", async () => {
    tableResults["quotation"] = { data: [{ quotation_id: 1, status: "draft" }], error: null, count: 1 };

    const { GET } = await import("../../app/api/quotations/route");
    const res = await GET(mockReq(null, "http://localhost/api/quotations?status=draft") as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.quotations).toBeDefined();
  });
});

// ─── POST /api/quotations — create ─────────────────────────────
describe("POST /api/quotations — create quotation", () => {
  it("creates a quotation with lines and calculates totals", async () => {
    tableResults["quotation"] = {
      data: { quotation_id: 10, document_no: "Q-010", status: "draft", subtotal: 90, tax_total: 13.5, grand_total: 103.5 },
      error: null,
    };
    tableResults["quotation_line"] = { data: [
      { quotation_line_id: 1, product_name: "Widget", quantity: 2, unit_price: 50, line_total: 90, position: 0 },
    ], error: null };

    const { POST } = await import("../../app/api/quotations/route");
    const res = await POST(mockReq({
      store_id: 1,
      customer_name: "Test Customer",
      lines: [
        { product_name: "Widget", quantity: 2, unit_price: 50, discount_percent: 10, tax_rate: 15 },
      ],
    }) as any);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.quotation).toBeDefined();
    expect(json.quotation.quotation_id).toBe(10);
  });

  it("rejects creation with no lines", async () => {
    const { POST } = await import("../../app/api/quotations/route");
    const res = await POST(mockReq({ store_id: 1, lines: [] }) as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("line item");
  });

  it("rejects creation with missing lines field", async () => {
    const { POST } = await import("../../app/api/quotations/route");
    const res = await POST(mockReq({ store_id: 1 }) as any);
    expect(res.status).toBe(400);
  });

  it("calculates line totals with discount correctly", async () => {
    tableResults["quotation"] = {
      data: { quotation_id: 11, subtotal: 90, tax_total: 0, grand_total: 90 },
      error: null,
    };
    tableResults["quotation_line"] = { data: [], error: null };

    const { POST } = await import("../../app/api/quotations/route");
    const res = await POST(mockReq({
      lines: [{ product_name: "Item", quantity: 1, unit_price: 100, discount_percent: 10, tax_rate: 0 }],
    }) as any);

    expect(res.status).toBe(201);
    // Verify the insert was called with correct subtotal
    const insertOp = supabaseOps.find(o => o.table === "quotation" && o.op === "insert");
    expect(insertOp).toBeDefined();
    expect(insertOp?.data?.subtotal).toBe(90); // 100 * (1 - 10/100)
    expect(insertOp?.data?.grand_total).toBe(90);
  });
});

// ─── GET /api/quotations/[id] ───────────────────────────────────
describe("GET /api/quotations/[id] — get single quotation", () => {
  it("returns quotation with lines", async () => {
    tableResults["quotation"] = {
      data: { quotation_id: 5, document_no: "Q-005", status: "draft" },
      error: null,
    };
    tableResults["quotation_line"] = {
      data: [{ quotation_line_id: 1, product_name: "Widget", quantity: 2 }],
      error: null,
    };

    const { GET } = await import("../../app/api/quotations/[id]/route");
    const res = await GET(mockReqWithParams(null, "5") as any, paramsPromise("5") as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.quotation.quotation_id).toBe(5);
    expect(json.quotation.lines).toHaveLength(1);
  });

  it("returns 404 for non-existent quotation", async () => {
    tableResults["quotation"] = { data: null, error: { message: "not found" } };

    const { GET } = await import("../../app/api/quotations/[id]/route");
    const res = await GET(mockReqWithParams(null, "999") as any, paramsPromise("999") as any);
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid ID", async () => {
    const { GET } = await import("../../app/api/quotations/[id]/route");
    const res = await GET(mockReqWithParams(null, "abc") as any, paramsPromise("abc") as any);
    expect(res.status).toBe(400);
  });
});

// ─── PATCH /api/quotations/[id] ─────────────────────────────────
describe("PATCH /api/quotations/[id] — update quotation", () => {
  it("updates quotation fields", async () => {
    tableResults["quotation"] = {
      data: { quotation_id: 5, status: "draft" },
      error: null,
    };
    tableResults["quotation_line"] = { data: [], error: null };

    const { PATCH } = await import("../../app/api/quotations/[id]/route");
    const res = await PATCH(
      mockReqWithParams({ customer_name: "Updated Name", notes: "New notes" }, "5") as any,
      paramsPromise("5") as any,
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.quotation).toBeDefined();
  });

  it("rejects editing a converted quotation", async () => {
    tableResults["quotation"] = {
      data: { quotation_id: 5, status: "converted" },
      error: null,
    };

    const { PATCH } = await import("../../app/api/quotations/[id]/route");
    const res = await PATCH(
      mockReqWithParams({ notes: "test" }, "5") as any,
      paramsPromise("5") as any,
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("converted");
  });

  it("rejects editing a cancelled quotation", async () => {
    tableResults["quotation"] = {
      data: { quotation_id: 5, status: "cancelled" },
      error: null,
    };

    const { PATCH } = await import("../../app/api/quotations/[id]/route");
    const res = await PATCH(
      mockReqWithParams({ notes: "test" }, "5") as any,
      paramsPromise("5") as any,
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("cancelled");
  });
});

// ─── DELETE /api/quotations/[id] ────────────────────────────────
describe("DELETE /api/quotations/[id] — soft delete", () => {
  it("soft deletes a quotation", async () => {
    tableResults["quotation"] = { data: null, error: null };

    const { DELETE } = await import("../../app/api/quotations/[id]/route");
    const res = await DELETE(mockReqWithParams(null, "5") as any, paramsPromise("5") as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    const updateOp = supabaseOps.find(o => o.table === "quotation" && o.op === "update");
    expect(updateOp).toBeDefined();
    expect(updateOp?.data?.is_deleted).toBe(true);
  });

  it("returns 400 for invalid ID", async () => {
    const { DELETE } = await import("../../app/api/quotations/[id]/route");
    const res = await DELETE(mockReqWithParams(null, "abc") as any, paramsPromise("abc") as any);
    expect(res.status).toBe(400);
  });
});

// ─── POST /api/quotations/[id]/send ─────────────────────────────
describe("POST /api/quotations/[id]/send — mark as sent", () => {
  it("marks a draft quotation as sent", async () => {
    tableResults["quotation"] = {
      data: { quotation_id: 5, status: "draft" },
      error: null,
    };

    const { POST } = await import("../../app/api/quotations/[id]/send/route");
    const res = await POST(mockReqWithParams({}, "5") as any, paramsPromise("5") as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.sent_at).toBeDefined();

    const updateOp = supabaseOps.find(o => o.table === "quotation" && o.op === "update");
    expect(updateOp?.data?.status).toBe("sent");
  });

  it("rejects sending a converted quotation", async () => {
    tableResults["quotation"] = {
      data: { quotation_id: 5, status: "converted" },
      error: null,
    };

    const { POST } = await import("../../app/api/quotations/[id]/send/route");
    const res = await POST(mockReqWithParams({}, "5") as any, paramsPromise("5") as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("converted");
  });

  it("returns 404 for non-existent quotation", async () => {
    tableResults["quotation"] = { data: null, error: { message: "not found" } };

    const { POST } = await import("../../app/api/quotations/[id]/send/route");
    const res = await POST(mockReqWithParams({}, "999") as any, paramsPromise("999") as any);
    expect(res.status).toBe(404);
  });
});

// ─── POST /api/quotations/[id]/convert — convert to order ──────
describe("POST /api/quotations/[id]/convert — convert to order", () => {
  it("converts a draft quotation to an order", async () => {
    tableResults["quotation"] = {
      data: { quotation_id: 5, status: "draft", customer_id: 1, store_id: 1, terminal_id: 1, subtotal: 100, tax_total: 15, grand_total: 115, document_no: "Q-005", currency: "MUR", notes: "Test" },
      error: null,
    };
    tableResults["quotation_line"] = {
      data: [{ product_id: 1, product_name: "Widget", quantity: 2, unit_price: 50, line_total: 100, tax_rate: 15, tax_id: 1, description: null }],
      error: null,
    };
    tableResults["orders"] = {
      data: { order_id: 42 },
      error: null,
    };
    tableResults["orderline"] = { data: null, error: null };

    const { POST } = await import("../../app/api/quotations/[id]/convert/route");
    const res = await POST(mockReqWithParams({}, "5") as any, paramsPromise("5") as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.order_id).toBe(42);
    expect(json.order_uuid).toBeDefined();
  });

  it("rejects converting an already converted quotation", async () => {
    tableResults["quotation"] = {
      data: { quotation_id: 5, status: "converted", converted_order_id: 42 },
      error: null,
    };
    tableResults["quotation_line"] = { data: [], error: null };

    const { POST } = await import("../../app/api/quotations/[id]/convert/route");
    const res = await POST(mockReqWithParams({}, "5") as any, paramsPromise("5") as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("already converted");
  });

  it("rejects converting a cancelled quotation", async () => {
    tableResults["quotation"] = {
      data: { quotation_id: 5, status: "cancelled" },
      error: null,
    };
    tableResults["quotation_line"] = { data: [], error: null };

    const { POST } = await import("../../app/api/quotations/[id]/convert/route");
    const res = await POST(mockReqWithParams({}, "5") as any, paramsPromise("5") as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("cancelled");
  });
});

// ─── POST /api/quotations/[id]/pdf — generate PDF ──────────────
describe("POST /api/quotations/[id]/pdf — PDF generation", () => {
  it("generates a PDF for a valid quotation", async () => {
    tableResults["quotation"] = {
      data: { quotation_id: 5, document_no: "Q-005", template_id: "classic" },
      error: null,
    };
    tableResults["quotation_line"] = { data: [{ product_name: "Widget" }], error: null };
    tableResults["quote_template_config"] = { data: null, error: null };

    const { POST } = await import("../../app/api/quotations/[id]/pdf/route");
    const res = await POST(
      mockReqWithParams({}, "5", "http://localhost/api/quotations/5/pdf") as any,
      paramsPromise("5") as any,
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
  });

  it("returns 404 when quotation not found", async () => {
    tableResults["quotation"] = { data: null, error: { message: "not found" } };
    tableResults["quotation_line"] = { data: [], error: null };
    tableResults["quote_template_config"] = { data: null, error: null };

    const { POST } = await import("../../app/api/quotations/[id]/pdf/route");
    const res = await POST(
      mockReqWithParams({}, "999", "http://localhost/api/quotations/999/pdf") as any,
      paramsPromise("999") as any,
    );
    expect(res.status).toBe(404);
  });
});

// ─── GET /api/quotations/templates ──────────────────────────────
describe("GET /api/quotations/templates — template listing", () => {
  it("returns all 5 templates with configs", async () => {
    tableResults["quote_template_config"] = {
      data: [{ template_id: "classic", is_default: true, account_id: "test-quote-acc" }],
      error: null,
    };

    const { GET } = await import("../../app/api/quotations/templates/route");
    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.templates).toHaveLength(5);
    const classic = json.templates.find((t: any) => t.id === "classic");
    expect(classic.is_default).toBe(true);
  });

  it("returns templates with null config when none saved", async () => {
    tableResults["quote_template_config"] = { data: [], error: null };

    const { GET } = await import("../../app/api/quotations/templates/route");
    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    for (const t of json.templates) {
      expect(t.config).toBeNull();
      expect(t.is_default).toBe(false);
    }
  });
});

// ─── POST /api/quotations/templates — save config ───────────────
describe("POST /api/quotations/templates — save template config", () => {
  it("saves a template config", async () => {
    tableResults["quote_template_config"] = {
      data: { template_id: "modern", primary_color: "#FF0000", is_default: false },
      error: null,
    };

    const { POST } = await import("../../app/api/quotations/templates/route");
    const res = await POST(mockReq({
      template_id: "modern",
      primary_color: "#FF0000",
      company_name: "Test Co",
    }) as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.config).toBeDefined();
  });

  it("rejects invalid template_id", async () => {
    const { POST } = await import("../../app/api/quotations/templates/route");
    const res = await POST(mockReq({ template_id: "nonexistent" }) as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Invalid template_id");
  });

  it("rejects missing template_id", async () => {
    const { POST } = await import("../../app/api/quotations/templates/route");
    const res = await POST(mockReq({ company_name: "Test" }) as any);
    expect(res.status).toBe(400);
  });
});
