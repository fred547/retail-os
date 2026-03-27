import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Supabase mock ───
let tableResults: Record<string, { data: any; error: any; count?: number }> = {};
let supabaseOps: Array<{ table: string; op: string; data?: any; filters: Record<string, any> }> = [];

function createChain(table: string) {
  const state = { op: "select" as string, data: undefined as any, filters: {} as Record<string, any> };
  function resolve() {
    supabaseOps.push({ table, op: state.op, data: state.data, filters: state.filters });
    const filterKey = Object.entries(state.filters).map(([k, v]) => `${k}=${v}`).join(",");
    return tableResults[`${table}:${filterKey}`] ?? tableResults[table] ?? { data: state.op === "select" ? [] : null, error: null };
  }
  const chain: any = {};
  for (const m of ["select", "eq", "gte", "order", "limit", "range", "in", "neq", "is", "not", "or", "gt", "ilike", "contains"] as const) {
    chain[m] = (...args: any[]) => {
      if (m === "eq") state.filters[args[0]] = args[1];
      return chain;
    };
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
  getDb: () => ({
    from: (table: string) => createChain(table),
    rpc: () => { const r = { data: null, error: null }; const o: any = { ...r, throwOnError: () => Promise.resolve(r) }; o.then = (f: Function) => Promise.resolve(r).then(f as any); return o; },
  }),
}));
vi.mock("@/lib/account-context", () => ({
  getSessionAccountId: () => Promise.resolve("test-account"),
}));

function mockRequest(body: any, url?: string): any {
  return {
    json: () => Promise.resolve(body),
    url: url ?? "http://localhost/api/quotations",
  };
}

beforeEach(() => {
  tableResults = {};
  supabaseOps = [];
  vi.resetModules();
});

// ─── Tests ───

describe("/api/quotations POST — create", () => {
  it("creates a quotation with lines", async () => {
    tableResults["quotation"] = { data: { quotation_id: 1, document_no: "Q-0001", status: "draft", grand_total: 115 }, error: null };
    tableResults["quotation_line"] = { data: null, error: null };

    const { POST } = await import("../../app/api/quotations/route");
    const res = await POST(mockRequest({
      customer_name: "John",
      lines: [
        { product_name: "Widget", quantity: 2, unit_price: 50, tax_rate: 15 },
      ],
    }));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.quotation).toBeDefined();
    expect(json.quotation.document_no).toBe("Q-0001");
  });

  it("returns 400 when no lines provided", async () => {
    const { POST } = await import("../../app/api/quotations/route");
    const res = await POST(mockRequest({ customer_name: "John" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when lines array is empty", async () => {
    const { POST } = await import("../../app/api/quotations/route");
    const res = await POST(mockRequest({ lines: [] }));
    expect(res.status).toBe(400);
  });

  it("calculates totals correctly", async () => {
    tableResults["quotation"] = {
      data: { quotation_id: 1, document_no: "Q-0001", status: "draft" },
      error: null,
    };
    tableResults["quotation_line"] = { data: null, error: null };

    const { POST } = await import("../../app/api/quotations/route");
    await POST(mockRequest({
      lines: [
        { product_name: "A", quantity: 3, unit_price: 100, tax_rate: 15 },
        { product_name: "B", quantity: 1, unit_price: 50, discount_percent: 10, tax_rate: 15 },
      ],
    }));

    // Check the insert call
    const insertOp = supabaseOps.find(o => o.table === "quotation" && o.op === "insert");
    expect(insertOp).toBeDefined();
    // A: 3*100 = 300, B: 1*50*(1-0.1) = 45 → subtotal = 345
    expect(insertOp!.data.subtotal).toBe(345);
    // Tax: 300*0.15 + 45*0.15 = 45 + 6.75 = 51.75
    expect(insertOp!.data.tax_total).toBe(51.75);
    expect(insertOp!.data.grand_total).toBe(396.75);
  });
});

describe("/api/quotations GET — list", () => {
  it("returns quotations for account", async () => {
    tableResults["quotation"] = {
      data: [
        { quotation_id: 1, document_no: "Q-0001", status: "draft", grand_total: 100 },
        { quotation_id: 2, document_no: "Q-0002", status: "sent", grand_total: 200 },
      ],
      error: null,
      count: 2,
    };

    const { GET } = await import("../../app/api/quotations/route");
    const res = await GET(mockRequest({}, "http://localhost/api/quotations"));
    const json = await res.json();

    expect(json.quotations).toHaveLength(2);
    expect(json.total).toBe(2);
  });
});

describe("/api/quotations/[id] GET — detail", () => {
  it("returns quotation with lines", async () => {
    tableResults["quotation"] = {
      data: { quotation_id: 1, document_no: "Q-0001", status: "draft" },
      error: null,
    };
    tableResults["quotation_line"] = {
      data: [{ line_id: 1, product_name: "Widget", quantity: 2, unit_price: 50 }],
      error: null,
    };

    const { GET } = await import("../../app/api/quotations/[id]/route");
    const res = await GET(mockRequest({}), { params: Promise.resolve({ id: "1" }) });
    const json = await res.json();

    expect(json.quotation).toBeDefined();
    expect(json.quotation.lines).toHaveLength(1);
  });

  it("returns 404 for missing quotation", async () => {
    tableResults["quotation"] = { data: null, error: null };

    const { GET } = await import("../../app/api/quotations/[id]/route");
    const res = await GET(mockRequest({}), { params: Promise.resolve({ id: "999" }) });
    expect(res.status).toBe(404);
  });
});

describe("/api/quotations/[id] PATCH — update", () => {
  it("updates quotation fields", async () => {
    tableResults["quotation"] = {
      data: { quotation_id: 1, status: "draft" },
      error: null,
    };
    tableResults["quotation_line"] = { data: [], error: null };

    const { PATCH } = await import("../../app/api/quotations/[id]/route");
    const res = await PATCH(
      mockRequest({ notes: "Updated notes" }),
      { params: Promise.resolve({ id: "1" }) }
    );
    const json = await res.json();

    expect(json.quotation).toBeDefined();
  });

  it("rejects editing converted quotation", async () => {
    tableResults["quotation"] = {
      data: { quotation_id: 1, status: "converted" },
      error: null,
    };

    const { PATCH } = await import("../../app/api/quotations/[id]/route");
    const res = await PATCH(
      mockRequest({ notes: "Won't work" }),
      { params: Promise.resolve({ id: "1" }) }
    );
    expect(res.status).toBe(400);
  });
});

describe("/api/quotations/[id]/send POST", () => {
  it("marks quotation as sent", async () => {
    tableResults["quotation"] = {
      data: { quotation_id: 1, status: "draft" },
      error: null,
    };

    const { POST } = await import("../../app/api/quotations/[id]/send/route");
    const res = await POST(mockRequest({}), { params: Promise.resolve({ id: "1" }) });
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.sent_at).toBeDefined();
  });

  it("rejects sending converted quotation", async () => {
    tableResults["quotation"] = {
      data: { quotation_id: 1, status: "converted" },
      error: null,
    };

    const { POST } = await import("../../app/api/quotations/[id]/send/route");
    const res = await POST(mockRequest({}), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(400);
  });
});

describe("/api/quotations/[id]/convert POST", () => {
  it("converts quotation to order", async () => {
    tableResults["quotation"] = {
      data: { quotation_id: 1, status: "accepted", customer_id: 5, subtotal: 100, tax_total: 15, grand_total: 115, store_id: 1, document_no: "Q-0001" },
      error: null,
    };
    tableResults["quotation_line"] = {
      data: [{ line_id: 1, product_name: "W", quantity: 2, unit_price: 50, tax_rate: 15, line_total: 100, tax_id: 1 }],
      error: null,
    };
    tableResults["orders"] = { data: { order_id: 42 }, error: null };
    tableResults["orderline"] = { data: null, error: null };

    const { POST } = await import("../../app/api/quotations/[id]/convert/route");
    const res = await POST(mockRequest({}), { params: Promise.resolve({ id: "1" }) });
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.order_id).toBe(42);
  });

  it("rejects converting already-converted quotation", async () => {
    tableResults["quotation"] = {
      data: { quotation_id: 1, status: "converted", converted_order_id: 10 },
      error: null,
    };

    const { POST } = await import("../../app/api/quotations/[id]/convert/route");
    const res = await POST(mockRequest({}), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.order_id).toBe(10);
  });

  it("rejects converting cancelled quotation", async () => {
    tableResults["quotation"] = {
      data: { quotation_id: 1, status: "cancelled" },
      error: null,
    };

    const { POST } = await import("../../app/api/quotations/[id]/convert/route");
    const res = await POST(mockRequest({}), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(400);
  });
});

describe("/api/quotations/templates GET", () => {
  it("returns 5 templates", async () => {
    tableResults["quote_template_config"] = { data: [], error: null };

    const { GET } = await import("../../app/api/quotations/templates/route");
    const res = await GET();
    const json = await res.json();

    expect(json.templates).toHaveLength(5);
    expect(json.templates.map((t: any) => t.id)).toEqual(["classic", "modern", "minimal", "bold", "elegant"]);
  });
});

describe("/api/quotations/templates POST", () => {
  it("saves template config", async () => {
    tableResults["quote_template_config"] = {
      data: { id: 1, template_id: "modern", primary_color: "#FF0000" },
      error: null,
    };

    const { POST } = await import("../../app/api/quotations/templates/route");
    const res = await POST(mockRequest({
      template_id: "modern",
      primary_color: "#FF0000",
      company_name: "My Store",
    }));
    const json = await res.json();

    expect(json.config).toBeDefined();
    expect(json.config.template_id).toBe("modern");
  });

  it("rejects invalid template_id", async () => {
    const { POST } = await import("../../app/api/quotations/templates/route");
    const res = await POST(mockRequest({ template_id: "nonexistent" }));
    expect(res.status).toBe(400);
  });
});

describe("/api/quotations/[id] DELETE — soft delete", () => {
  it("soft deletes quotation", async () => {
    tableResults["quotation"] = { data: null, error: null };

    const { DELETE } = await import("../../app/api/quotations/[id]/route");
    const res = await DELETE(mockRequest({}), { params: Promise.resolve({ id: "1" }) });
    const json = await res.json();

    expect(json.success).toBe(true);
  });
});
