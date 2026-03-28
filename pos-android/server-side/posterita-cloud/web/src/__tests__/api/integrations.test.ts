import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Supabase mock ──────────────────────────────────────────────
let tableResults: Record<string, { data: any; error: any }> = {};
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
  for (const m of ["select", "eq", "gte", "order", "limit", "range", "in", "neq", "is", "not", "or", "gt", "lte", "ilike"] as const) {
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

let mockAccountId: string | null = "test-xero-acc";

vi.mock("@/lib/supabase/admin", () => ({ getDb: () => ({ from: (t: string) => createChain(t) }) }));
vi.mock("@/lib/account-context", () => ({ getSessionAccountId: () => Promise.resolve(mockAccountId) }));

// ─── Xero lib mock ──────────────────────────────────────────────
const mockBuildAuthUrl = vi.fn().mockReturnValue("https://login.xero.com/identity/connect/authorize?mock=true");
const mockExchangeCodeForTokens = vi.fn().mockResolvedValue({
  access_token: "xero_access_123",
  refresh_token: "xero_refresh_456",
  expires_in: 1800,
});
const mockGetConnections = vi.fn().mockResolvedValue([
  { tenantId: "tenant-abc", tenantName: "Acme Corp" },
]);
const mockRefreshAccessToken = vi.fn().mockResolvedValue({
  access_token: "xero_access_refreshed",
  refresh_token: "xero_refresh_new",
  expires_in: 1800,
});
const mockGetAccounts = vi.fn().mockResolvedValue([
  { Code: "200", Name: "Sales", Type: "REVENUE", Class: "REVENUE" },
]);
const mockGetTaxRates = vi.fn().mockResolvedValue([
  { TaxType: "OUTPUT", Name: "GST on Income", EffectiveRate: 15, Status: "ACTIVE" },
  { TaxType: "EXEMPT", Name: "Exempt", EffectiveRate: 0, Status: "DELETED" },
]);
const mockCreateInvoice = vi.fn().mockResolvedValue({
  InvoiceID: "inv-xero-001",
  InvoiceNumber: "INV-0001",
});
const mockCreatePayment = vi.fn().mockResolvedValue({
  PaymentID: "pmt-xero-001",
});
const mockMapOrderToInvoice = vi.fn().mockReturnValue({ Type: "ACCREC", LineItems: [] });
const mockMapPaymentToXero = vi.fn().mockReturnValue({ InvoiceID: "inv-xero-001", Amount: 100 });

vi.mock("@/lib/xero", () => ({
  buildAuthUrl: (...args: any[]) => mockBuildAuthUrl(...args),
  exchangeCodeForTokens: (...args: any[]) => mockExchangeCodeForTokens(...args),
  getConnections: (...args: any[]) => mockGetConnections(...args),
  refreshAccessToken: (...args: any[]) => mockRefreshAccessToken(...args),
  getAccounts: (...args: any[]) => mockGetAccounts(...args),
  getTaxRates: (...args: any[]) => mockGetTaxRates(...args),
  createInvoice: (...args: any[]) => mockCreateInvoice(...args),
  createPayment: (...args: any[]) => mockCreatePayment(...args),
  mapOrderToInvoice: (...args: any[]) => mockMapOrderToInvoice(...args),
  mapPaymentToXero: (...args: any[]) => mockMapPaymentToXero(...args),
}));

function mockReq(body?: any, url?: string): any {
  return {
    json: () => Promise.resolve(body ?? {}),
    url: url ?? "http://localhost/api/integrations",
    text: () => Promise.resolve(JSON.stringify(body ?? {})),
    headers: new Map(),
  };
}

beforeEach(() => {
  tableResults = {};
  supabaseOps = [];
  mockAccountId = "test-xero-acc";
  mockBuildAuthUrl.mockClear();
  mockExchangeCodeForTokens.mockClear();
  mockGetConnections.mockClear();
  mockRefreshAccessToken.mockClear();
  mockGetAccounts.mockClear();
  mockGetTaxRates.mockClear();
  mockCreateInvoice.mockClear();
  mockCreatePayment.mockClear();
  mockMapOrderToInvoice.mockClear();
  mockMapPaymentToXero.mockClear();
});

// ─── GET /api/integrations — list connections ────────────────────
describe("GET /api/integrations", () => {
  it("returns 401 when not authenticated", async () => {
    mockAccountId = null;
    const { GET } = await import("../../app/api/integrations/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns connections and recent events", async () => {
    tableResults["integration_connection"] = {
      data: [{ id: 1, provider: "xero", org_name: "Acme", status: "active" }],
      error: null,
    };
    tableResults["integration_event_log"] = {
      data: [{ provider: "xero", event_type: "oauth.connected", status: "sent" }],
      error: null,
    };
    const { GET } = await import("../../app/api/integrations/route");
    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.connections).toHaveLength(1);
    expect(json.connections[0].provider).toBe("xero");
    expect(json.recent_events).toHaveLength(1);
  });

  it("returns empty arrays when no connections exist", async () => {
    tableResults["integration_connection"] = { data: [], error: null };
    tableResults["integration_event_log"] = { data: [], error: null };
    const { GET } = await import("../../app/api/integrations/route");
    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.connections).toEqual([]);
    expect(json.recent_events).toEqual([]);
  });
});

// ─── GET /api/integrations/xero/connect ──────────────────────────
describe("GET /api/integrations/xero/connect", () => {
  it("returns 401 when not authenticated", async () => {
    mockAccountId = null;
    const { GET } = await import("../../app/api/integrations/xero/connect/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("redirects to Xero OAuth URL with state", async () => {
    const { GET } = await import("../../app/api/integrations/xero/connect/route");
    const res = await GET();
    // NextResponse.redirect returns 307
    expect(res.status).toBe(307);
    expect(mockBuildAuthUrl).toHaveBeenCalledOnce();
    // Verify state contains account_id
    const stateArg = mockBuildAuthUrl.mock.calls[0][0];
    const decoded = JSON.parse(Buffer.from(stateArg, "base64url").toString());
    expect(decoded.account_id).toBe("test-xero-acc");
  });
});

// ─── GET /api/integrations/xero/callback ─────────────────────────
describe("GET /api/integrations/xero/callback", () => {
  it("redirects with error=denied when Xero returns error", async () => {
    const { GET } = await import("../../app/api/integrations/xero/callback/route");
    const res = await GET(mockReq(undefined, "http://localhost/api/integrations/xero/callback?error=access_denied"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("error=denied");
  });

  it("redirects with error=invalid when no code or state", async () => {
    const { GET } = await import("../../app/api/integrations/xero/callback/route");
    const res = await GET(mockReq(undefined, "http://localhost/api/integrations/xero/callback"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("error=invalid");
  });

  it("exchanges code for tokens and stores connection", async () => {
    tableResults["integration_connection"] = { data: null, error: null };
    tableResults["integration_event_log"] = { data: null, error: null };
    const state = Buffer.from(JSON.stringify({ account_id: "test-xero-acc" })).toString("base64url");
    const { GET } = await import("../../app/api/integrations/xero/callback/route");
    const res = await GET(mockReq(undefined, `http://localhost/api/integrations/xero/callback?code=auth_code_123&state=${state}`));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("success=xero");
    expect(mockExchangeCodeForTokens).toHaveBeenCalledWith("auth_code_123");
    expect(mockGetConnections).toHaveBeenCalledWith("xero_access_123");
    const upsertOp = supabaseOps.find(o => o.table === "integration_connection" && o.op === "upsert");
    expect(upsertOp).toBeDefined();
    expect(upsertOp?.data?.provider).toBe("xero");
    expect(upsertOp?.data?.tenant_id).toBe("tenant-abc");
    expect(upsertOp?.data?.org_name).toBe("Acme Corp");
  });

  it("redirects with error=no_org when no organisations returned", async () => {
    mockGetConnections.mockResolvedValueOnce([]);
    const state = Buffer.from(JSON.stringify({ account_id: "test-xero-acc" })).toString("base64url");
    const { GET } = await import("../../app/api/integrations/xero/callback/route");
    const res = await GET(mockReq(undefined, `http://localhost/api/integrations/xero/callback?code=code_123&state=${state}`));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("error=no_org");
  });

  it("redirects with error=token_failed when exchange throws", async () => {
    mockExchangeCodeForTokens.mockRejectedValueOnce(new Error("Token exchange failed"));
    const state = Buffer.from(JSON.stringify({ account_id: "test-xero-acc" })).toString("base64url");
    const { GET } = await import("../../app/api/integrations/xero/callback/route");
    const res = await GET(mockReq(undefined, `http://localhost/api/integrations/xero/callback?code=bad_code&state=${state}`));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("error=token_failed");
  });
});

// ─── GET /api/integrations/xero/settings ─────────────────────────
describe("GET /api/integrations/xero/settings", () => {
  it("returns 401 when not authenticated", async () => {
    mockAccountId = null;
    const { GET } = await import("../../app/api/integrations/xero/settings/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 404 when Xero not connected", async () => {
    tableResults["integration_connection"] = { data: null, error: null };
    const { GET } = await import("../../app/api/integrations/xero/settings/route");
    const res = await GET();
    expect(res.status).toBe(404);
  });

  it("returns 404 when status is disconnected", async () => {
    tableResults["integration_connection"] = {
      data: { settings: {}, status: "disconnected", org_name: "Old Corp" },
      error: null,
    };
    const { GET } = await import("../../app/api/integrations/xero/settings/route");
    const res = await GET();
    expect(res.status).toBe(404);
  });

  it("returns settings, local taxes, xero accounts and tax rates", async () => {
    tableResults["integration_connection"] = {
      data: {
        settings: { sales_account_code: "200" },
        status: "active",
        org_name: "Acme Corp",
        access_token: "tok",
        refresh_token: "ref",
        tenant_id: "tid",
        token_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      },
      error: null,
    };
    tableResults["tax"] = {
      data: [{ tax_id: 1, name: "VAT 15%", rate: 15 }],
      error: null,
    };
    const { GET } = await import("../../app/api/integrations/xero/settings/route");
    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.settings.sales_account_code).toBe("200");
    expect(json.org_name).toBe("Acme Corp");
    expect(json.local_taxes).toHaveLength(1);
    expect(json.xero_accounts).toHaveLength(1);
    // Only ACTIVE tax rates returned
    expect(json.xero_tax_rates).toHaveLength(1);
    expect(json.xero_tax_rates[0].name).toBe("GST on Income");
  });
});

// ─── POST /api/integrations/xero/settings ────────────────────────
describe("POST /api/integrations/xero/settings", () => {
  it("returns 401 when not authenticated", async () => {
    mockAccountId = null;
    const { POST } = await import("../../app/api/integrations/xero/settings/route");
    const res = await POST(mockReq({ sales_account_code: "200" }));
    expect(res.status).toBe(401);
  });

  it("updates settings with allowed keys only", async () => {
    tableResults["integration_connection"] = {
      data: { settings: { sync_mode: "manual" } },
      error: null,
    };
    const { POST } = await import("../../app/api/integrations/xero/settings/route");
    const res = await POST(mockReq({
      sales_account_code: "200",
      auto_push: true,
      some_random_key: "ignored",
    }));
    expect(res.status).toBe(200);
    const updateOp = supabaseOps.find(o => o.table === "integration_connection" && o.op === "update");
    expect(updateOp).toBeDefined();
    // Merged settings should include both old and new
    expect(updateOp?.data?.settings?.sync_mode).toBe("manual");
    expect(updateOp?.data?.settings?.sales_account_code).toBe("200");
    expect(updateOp?.data?.settings?.auto_push).toBe(true);
    // Random key should not be included
    expect(updateOp?.data?.settings?.some_random_key).toBeUndefined();
  });
});

// ─── POST /api/integrations/xero/push ────────────────────────────
describe("POST /api/integrations/xero/push", () => {
  it("returns 401 when not authenticated", async () => {
    mockAccountId = null;
    const { POST } = await import("../../app/api/integrations/xero/push/route");
    const res = await POST(mockReq({ order_id: 1 }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when no order_id or order_uuid", async () => {
    const { POST } = await import("../../app/api/integrations/xero/push/route");
    const res = await POST(mockReq({}));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toContain("order_id");
  });

  it("returns 401 when Xero token is not available", async () => {
    tableResults["integration_connection"] = { data: null, error: null };
    const { POST } = await import("../../app/api/integrations/xero/push/route");
    const res = await POST(mockReq({ order_id: 100 }));
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json.error).toContain("not connected");
  });

  it("returns 404 when order not found", async () => {
    tableResults["integration_connection"] = {
      data: {
        access_token: "tok", refresh_token: "ref", tenant_id: "tid",
        token_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        status: "active",
      },
      error: null,
    };
    tableResults["orders"] = { data: null, error: { message: "not found" } };
    const { POST } = await import("../../app/api/integrations/xero/push/route");
    const res = await POST(mockReq({ order_id: 999 }));
    expect(res.status).toBe(404);
  });

  it("returns 409 when order already pushed", async () => {
    tableResults["integration_connection"] = {
      data: {
        access_token: "tok", refresh_token: "ref", tenant_id: "tid",
        token_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        status: "active",
      },
      error: null,
    };
    tableResults["orders"] = {
      data: { order_id: 100, uuid: "order-uuid-1", grand_total: 500 },
      error: null,
    };
    tableResults["integration_event_log"] = {
      data: [{ id: 1, external_id: "inv-existing" }],
      error: null,
    };
    const { POST } = await import("../../app/api/integrations/xero/push/route");
    const res = await POST(mockReq({ order_id: 100 }));
    const json = await res.json();
    expect(res.status).toBe(409);
    expect(json.error).toContain("already pushed");
    expect(json.xero_invoice_id).toBe("inv-existing");
  });

  it("pushes order as invoice + payments on success", async () => {
    tableResults["integration_connection"] = {
      data: {
        id: 1, access_token: "tok", refresh_token: "ref", tenant_id: "tid",
        token_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        status: "active",
      },
      error: null,
    };
    tableResults["orders"] = {
      data: { order_id: 100, uuid: "order-uuid-2", grand_total: 500 },
      error: null,
    };
    // No existing push events
    tableResults["integration_event_log"] = { data: [], error: null };
    tableResults["orderline"] = {
      data: [{ orderline_id: 1, order_id: 100, qtyentered: 2, priceentered: 250 }],
      error: null,
    };
    tableResults["account"] = { data: { currency: "MUR" }, error: null };
    tableResults["payment"] = {
      data: [{ payment_id: 1, order_id: 100, amount: 500, tender_type: "cash" }],
      error: null,
    };
    const { POST } = await import("../../app/api/integrations/xero/push/route");
    const res = await POST(mockReq({ order_id: 100 }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.invoice_id).toBe("inv-xero-001");
    expect(json.invoice_number).toBe("INV-0001");
    expect(json.payments_pushed).toBe(1);
    expect(mockCreateInvoice).toHaveBeenCalledOnce();
    expect(mockCreatePayment).toHaveBeenCalledOnce();
  });
});

// ─── POST /api/integrations/xero/disconnect ──────────────────────
describe("POST /api/integrations/xero/disconnect", () => {
  it("returns 401 when not authenticated", async () => {
    mockAccountId = null;
    const { POST } = await import("../../app/api/integrations/xero/disconnect/route");
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("disconnects and clears tokens", async () => {
    tableResults["integration_connection"] = { data: null, error: null };
    tableResults["integration_event_log"] = { data: null, error: null };
    const { POST } = await import("../../app/api/integrations/xero/disconnect/route");
    const res = await POST();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.disconnected).toBe(true);
    const updateOp = supabaseOps.find(o => o.table === "integration_connection" && o.op === "update");
    expect(updateOp).toBeDefined();
    expect(updateOp?.data?.status).toBe("disconnected");
    expect(updateOp?.data?.access_token).toBeNull();
    expect(updateOp?.data?.refresh_token).toBeNull();
    // Verify disconnect event logged
    const insertOp = supabaseOps.find(o => o.table === "integration_event_log" && o.op === "insert");
    expect(insertOp).toBeDefined();
    expect(insertOp?.data?.event_type).toBe("oauth.disconnected");
  });
});

// ─── POST /api/integrations/xero/refresh ─────────────────────────
describe("POST /api/integrations/xero/refresh", () => {
  it("returns 401 when not authenticated", async () => {
    mockAccountId = null;
    const { POST } = await import("../../app/api/integrations/xero/refresh/route");
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("returns 404 when no connection found", async () => {
    tableResults["integration_connection"] = { data: null, error: null };
    const { POST } = await import("../../app/api/integrations/xero/refresh/route");
    const res = await POST();
    expect(res.status).toBe(404);
  });

  it("returns 404 when connection has no refresh token", async () => {
    tableResults["integration_connection"] = {
      data: { id: 1, refresh_token: null },
      error: null,
    };
    const { POST } = await import("../../app/api/integrations/xero/refresh/route");
    const res = await POST();
    expect(res.status).toBe(404);
  });

  it("refreshes token and returns new expiry", async () => {
    tableResults["integration_connection"] = {
      data: { id: 1, refresh_token: "old_refresh_token", access_token: "old_access" },
      error: null,
    };
    const { POST } = await import("../../app/api/integrations/xero/refresh/route");
    const res = await POST();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.refreshed).toBe(true);
    expect(json.expires_at).toBeDefined();
    expect(mockRefreshAccessToken).toHaveBeenCalledWith("old_refresh_token");
    const updateOp = supabaseOps.find(o => o.table === "integration_connection" && o.op === "update");
    expect(updateOp).toBeDefined();
    expect(updateOp?.data?.access_token).toBe("xero_access_refreshed");
    expect(updateOp?.data?.status).toBe("active");
    expect(updateOp?.data?.error_message).toBeNull();
  });

  it("returns 500 when refresh fails", async () => {
    tableResults["integration_connection"] = {
      data: { id: 1, refresh_token: "bad_token", access_token: "old" },
      error: null,
    };
    mockRefreshAccessToken.mockRejectedValueOnce(new Error("Refresh failed"));
    const { POST } = await import("../../app/api/integrations/xero/refresh/route");
    const res = await POST();
    expect(res.status).toBe(500);
  });
});
