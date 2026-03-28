import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Supabase mock ──────────────────────────────────────────────
let tableResults: Record<string, { data: any; error: any }> = {};
let supabaseOps: Array<{ table: string; op: string; data?: any; filters: Record<string, any> }> = [];
let authAdminMock: any = {};
let authSignInMock: any = {};
let authResetMock: any = {};

function createChain(table: string) {
  const state = { op: "select" as string, data: undefined as any, filters: {} as Record<string, any> };
  function resolve() {
    supabaseOps.push({ table, op: state.op, data: state.data, filters: state.filters });
    const fk = Object.entries(state.filters).map(([k, v]) => `${k}=${v}`).join(",");
    return tableResults[`${table}:${fk}`] ?? tableResults[table] ?? { data: state.op === "select" ? [] : null, error: null };
  }
  const chain: any = {};
  for (const m of ["select", "eq", "gte", "order", "limit", "range", "in", "neq", "is", "not", "or", "gt", "lte", "ilike", "lt", "contains"] as const) {
    chain[m] = (...args: any[]) => { if (m === "eq") state.filters[args[0]] = args[1]; if (m === "in") state.filters[args[0]] = args[1]; return chain; };
  }
  for (const m of ["insert", "update", "upsert", "delete"] as const) {
    chain[m] = (...args: any[]) => { state.op = m; state.data = args[0]; return chain; };
  }
  chain.single = () => { const r = resolve(); const d = Array.isArray(r.data) ? r.data[0] ?? null : r.data; return Promise.resolve({ ...r, data: d }); };
  chain.maybeSingle = chain.single;
  chain.then = (f: Function, r?: Function) => Promise.resolve(resolve()).then(f as any, r as any);
  return chain;
}

function getDbMock() {
  return {
    from: (t: string) => createChain(t),
    auth: {
      admin: {
        createUser: (args: any) => Promise.resolve(authAdminMock.createUser ?? { data: { user: { id: "auth-uid-123" } }, error: null }),
        listUsers: () => Promise.resolve(authAdminMock.listUsers ?? { data: { users: [] }, error: null }),
        deleteUser: () => Promise.resolve({ data: null, error: null }),
      },
      signInWithPassword: (args: any) => Promise.resolve(authSignInMock),
      resetPasswordForEmail: () => Promise.resolve(authResetMock),
    },
    rpc: () => Promise.resolve({ data: null, error: null }),
  };
}

vi.mock("@/lib/supabase/admin", () => ({ getDb: () => getDbMock() }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: (args: any) => Promise.resolve(authSignInMock),
    },
  }),
}));
vi.mock("@/lib/owner-lifecycle", () => ({
  normalizeEmail: (e: any) => (typeof e === "string" ? e.trim().toLowerCase() : ""),
  normalizePhone: (p: any) => (typeof p === "string" ? p.trim() : ""),
  findOwnerByIdentity: () => Promise.resolve({ owner: null, matchedOn: null }),
}));

function mockReq(body: any, url?: string, headers?: Record<string, string>): any {
  const headerMap = new Map(Object.entries(headers ?? {}));
  return {
    json: () => Promise.resolve(body),
    url: url ?? "http://localhost/api/auth",
    headers: {
      get: (name: string) => headerMap.get(name) ?? null,
    },
  };
}

beforeEach(() => {
  tableResults = {};
  supabaseOps = [];
  authAdminMock = {};
  authSignInMock = {};
  authResetMock = {};
  vi.resetModules();
  vi.doMock("@/lib/supabase/admin", () => ({ getDb: () => getDbMock() }));
  vi.doMock("@supabase/supabase-js", () => ({
    createClient: () => ({
      auth: {
        signInWithPassword: () => Promise.resolve(authSignInMock),
      },
    }),
  }));
  vi.doMock("@/lib/owner-lifecycle", () => ({
    normalizeEmail: (e: any) => (typeof e === "string" ? e.trim().toLowerCase() : ""),
    normalizePhone: (p: any) => (typeof p === "string" ? p.trim() : ""),
    findOwnerByIdentity: () => Promise.resolve({ owner: null, matchedOn: null }),
  }));
});

// ═══════════════════════════════════════════════════════════════
// POST /api/auth/signup
// ═══════════════════════════════════════════════════════════════
describe("POST /api/auth/signup — registration", () => {
  it("creates owner + live + demo accounts on successful signup", async () => {
    // owner insert
    tableResults["owner"] = { data: { id: 1 }, error: null };
    // account inserts
    tableResults["account"] = { data: { sync_secret: "secret-123" }, error: null };
    // store + terminal + user inserts
    tableResults["store"] = { data: { store_id: 10 }, error: null };
    tableResults["terminal"] = { data: { terminal_id: 20 }, error: null };
    tableResults["pos_user"] = { data: { user_id: 30 }, error: null };
    tableResults["owner_account_session"] = { data: null, error: null };
    tableResults["tax"] = { data: null, error: null };
    tableResults["productcategory"] = { data: [
      { productcategory_id: 1, name: "Food" },
      { productcategory_id: 2, name: "Drinks" },
      { productcategory_id: 3, name: "Snacks" },
      { productcategory_id: 4, name: "Desserts" },
    ], error: null };
    tableResults["product"] = { data: null, error: null };
    tableResults["modifier"] = { data: null, error: null };

    const { POST } = await import("../../app/api/auth/signup/route");
    const res = await POST(mockReq({
      email: "test@example.com",
      password: "password123",
      firstname: "John",
      lastname: "Doe",
      country: "Mauritius",
      currency: "MUR",
      pin: "1234",
    }) as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.owner_id).toBe(1);
    expect(json.live_account_id).toContain("live_");
    expect(json.demo_account_id).toContain("demo_");
    expect(json.message).toContain("2 brands");
  });

  it("rejects signup without email", async () => {
    const { POST } = await import("../../app/api/auth/signup/route");
    const res = await POST(mockReq({ firstname: "John", password: "pass" }) as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Email");
  });

  it("rejects signup without first name", async () => {
    const { POST } = await import("../../app/api/auth/signup/route");
    const res = await POST(mockReq({ email: "test@example.com", password: "pass" }) as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("First name");
  });

  it("rejects duplicate email/phone (409)", async () => {
    vi.resetModules();
    vi.doMock("@/lib/supabase/admin", () => ({ getDb: () => getDbMock() }));
    vi.doMock("@supabase/supabase-js", () => ({ createClient: () => ({ auth: { signInWithPassword: () => Promise.resolve(authSignInMock) } }) }));
    vi.doMock("@/lib/owner-lifecycle", () => ({
      normalizeEmail: (e: any) => (typeof e === "string" ? e.trim().toLowerCase() : ""),
      normalizePhone: (p: any) => (typeof p === "string" ? p.trim() : ""),
      findOwnerByIdentity: () => Promise.resolve({ owner: { id: 99 }, matchedOn: "email" }),
    }));

    const { POST } = await import("../../app/api/auth/signup/route");
    const res = await POST(mockReq({
      email: "existing@example.com",
      firstname: "Jane",
      password: "pass123",
    }) as any);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("ACCOUNT_EXISTS");
  });

  it("rejects first name that is too long", async () => {
    const { POST } = await import("../../app/api/auth/signup/route");
    const res = await POST(mockReq({
      email: "test@example.com",
      firstname: "A".repeat(101),
      password: "pass",
    }) as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("too long");
  });

  it("rejects email that is too long", async () => {
    const { POST } = await import("../../app/api/auth/signup/route");
    const res = await POST(mockReq({
      email: "a".repeat(250) + "@x.com",
      firstname: "John",
      password: "pass",
    }) as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Email too long");
  });
});

// ═══════════════════════════════════════════════════════════════
// POST /api/auth/login
// ═══════════════════════════════════════════════════════════════
describe("POST /api/auth/login — authentication", () => {
  it("returns account data on successful login", async () => {
    authSignInMock = { data: { user: { id: "auth-uid-1" } }, error: null };
    tableResults["owner"] = { data: { id: 1 }, error: null };
    tableResults["account"] = {
      data: [
        { account_id: "live_abc", type: "live", businessname: "Test Store", currency: "MUR", status: "active", sync_secret: "s1" },
        { account_id: "demo_abc", type: "demo", businessname: "Demo", currency: "MUR", status: "testing", sync_secret: "s2" },
      ],
      error: null,
    };
    tableResults["store"] = { data: { store_id: 10 }, error: null };
    tableResults["terminal"] = { data: { terminal_id: 20 }, error: null };
    tableResults["pos_user"] = { data: { user_id: 30, username: "john", firstname: "John", pin: "1234", role: "owner" }, error: null };

    const { POST } = await import("../../app/api/auth/login/route");
    const res = await POST(mockReq({ email: "test@example.com", password: "pass123" }) as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.owner_id).toBe(1);
    expect(json.live_account_id).toBe("live_abc");
    expect(json.demo_account_id).toBe("demo_abc");
    expect(json.auth_user_id).toBe("auth-uid-1");
  });

  it("rejects login with missing email", async () => {
    const { POST } = await import("../../app/api/auth/login/route");
    const res = await POST(mockReq({ password: "pass123" }) as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Email and password");
  });

  it("rejects login with missing password", async () => {
    const { POST } = await import("../../app/api/auth/login/route");
    const res = await POST(mockReq({ email: "test@example.com" }) as any);
    expect(res.status).toBe(400);
  });

  it("returns 401 on invalid credentials", async () => {
    authSignInMock = { data: { user: null }, error: { message: "Invalid credentials" } };

    const { POST } = await import("../../app/api/auth/login/route");
    const res = await POST(mockReq({ email: "test@example.com", password: "wrong" }) as any);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain("Invalid credentials");
  });

  it("returns 404 when no POS account exists for the email", async () => {
    authSignInMock = { data: { user: { id: "auth-uid-1" } }, error: null };
    tableResults["owner"] = { data: null, error: null };

    const { POST } = await import("../../app/api/auth/login/route");
    const res = await POST(mockReq({ email: "nopos@example.com", password: "pass123" }) as any);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain("No POS account");
  });
});

// ═══════════════════════════════════════════════════════════════
// POST /api/auth/check
// ═══════════════════════════════════════════════════════════════
describe("POST /api/auth/check — existence check", () => {
  it("returns exists=true when email matches", async () => {
    tableResults["owner"] = { data: { id: 1 }, error: null };

    const { POST } = await import("../../app/api/auth/check/route");
    const res = await POST(mockReq({ email: "test@example.com" }, undefined, { "x-forwarded-for": "1.2.3.4" }) as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.exists).toBe(true);
    expect(json.matched_on).toBe("email");
  });

  it("returns exists=false when no match", async () => {
    tableResults["owner"] = { data: null, error: null };

    const { POST } = await import("../../app/api/auth/check/route");
    const res = await POST(mockReq({ email: "nobody@example.com" }, undefined, { "x-forwarded-for": "1.2.3.5" }) as any);
    const json = await res.json();

    expect(json.exists).toBe(false);
    expect(json.matched_on).toBeNull();
  });

  it("returns exists=false when neither email nor phone provided", async () => {
    const { POST } = await import("../../app/api/auth/check/route");
    const res = await POST(mockReq({}, undefined, { "x-forwarded-for": "1.2.3.6" }) as any);
    const json = await res.json();

    expect(json.exists).toBe(false);
    expect(json.matched_on).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════
// POST /api/auth/reset — account reset (HMAC protected)
// ═══════════════════════════════════════════════════════════════
describe("POST /api/auth/reset — account data reset", () => {
  it("rejects when account_id is missing", async () => {
    const { POST } = await import("../../app/api/auth/reset/route");
    const res = await POST(mockReq({}) as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("account_id");
  });

  it("rejects when HMAC headers are missing", async () => {
    const { POST } = await import("../../app/api/auth/reset/route");
    const res = await POST(mockReq({ account_id: "test-acc" }) as any);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain("HMAC");
  });

  it("rejects when timestamp is expired", async () => {
    const oldTimestamp = String(Math.floor(Date.now() / 1000) - 600); // 10 min ago
    const { POST } = await import("../../app/api/auth/reset/route");
    const res = await POST(mockReq(
      { account_id: "test-acc" },
      undefined,
      { "x-sync-timestamp": oldTimestamp, "x-sync-signature": "abc123" },
    ) as any);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain("Timestamp");
  });
});

// ═══════════════════════════════════════════════════════════════
// POST /api/auth/reset-password
// ═══════════════════════════════════════════════════════════════
describe("POST /api/auth/reset-password — password reset email", () => {
  it("sends a reset email successfully", async () => {
    authResetMock = { error: null };

    const { POST } = await import("../../app/api/auth/reset-password/route");
    const res = await POST(mockReq({ email: "test@example.com" }) as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it("rejects when email is missing", async () => {
    const { POST } = await import("../../app/api/auth/reset-password/route");
    const res = await POST(mockReq({}) as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Email");
  });

  it("returns 500 when Supabase reset fails", async () => {
    authResetMock = { error: { message: "Service unavailable" } };

    const { POST } = await import("../../app/api/auth/reset-password/route");
    const res = await POST(mockReq({ email: "test@example.com" }) as any);
    expect(res.status).toBe(500);
  });
});

// ═══════════════════════════════════════════════════════════════
// POST /api/auth/ott — OTT generation
// ═══════════════════════════════════════════════════════════════
describe("POST /api/auth/ott — one-time token generation", () => {
  it("rejects when account_id is missing", async () => {
    const { POST } = await import("../../app/api/auth/ott/route");
    const res = await POST(mockReq({ user_id: 1 }) as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("account_id");
  });

  it("rejects when user_id is missing", async () => {
    const { POST } = await import("../../app/api/auth/ott/route");
    const res = await POST(mockReq({ account_id: "test-acc" }) as any);
    expect(res.status).toBe(400);
  });

  it("rejects when HMAC headers are missing", async () => {
    const { POST } = await import("../../app/api/auth/ott/route");
    const res = await POST(mockReq(
      { account_id: "test-acc", user_id: 1 },
    ) as any);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain("HMAC");
  });

  it("generates a token with valid HMAC", async () => {
    const { createHmac } = await import("crypto");
    const secret = "test-sync-secret";
    const timestamp = String(Math.floor(Date.now() / 1000));
    const body = { account_id: "test-acc", user_id: 1 };
    const payload = `${timestamp}.${JSON.stringify(body)}`;
    const signature = createHmac("sha256", secret).update(payload).digest("hex");

    tableResults["account"] = { data: { sync_secret: secret }, error: null };
    tableResults["ott_tokens"] = { data: null, error: null };

    const { POST } = await import("../../app/api/auth/ott/route");
    const res = await POST(mockReq(
      body,
      undefined,
      { "x-sync-timestamp": timestamp, "x-sync-signature": signature },
    ) as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.token).toBeDefined();
    expect(json.token.length).toBeGreaterThan(0);
    expect(json.expires_in).toBe(60);
  });
});

// ═══════════════════════════════════════════════════════════════
// POST /api/auth/ott/validate
// ═══════════════════════════════════════════════════════════════
describe("POST /api/auth/ott/validate — OTT validation", () => {
  it("validates a valid token", async () => {
    tableResults["ott_tokens"] = {
      data: {
        token: "valid-token",
        account_id: "test-acc",
        user_id: 1,
        user_role: "owner",
        store_id: 10,
        terminal_id: 20,
        used: true,
      },
      error: null,
    };

    const { POST } = await import("../../app/api/auth/ott/validate/route");
    const res = await POST(mockReq({ token: "valid-token" }) as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.valid).toBe(true);
    expect(json.account_id).toBe("test-acc");
    expect(json.user_id).toBe(1);
    expect(json.store_id).toBe(10);
    expect(json.terminal_id).toBe(20);
  });

  it("rejects missing token", async () => {
    const { POST } = await import("../../app/api/auth/ott/validate/route");
    const res = await POST(mockReq({}) as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("token");
  });

  it("rejects invalid/expired token", async () => {
    tableResults["ott_tokens"] = { data: null, error: { message: "not found" } };

    const { POST } = await import("../../app/api/auth/ott/validate/route");
    const res = await POST(mockReq({ token: "expired-token" }) as any);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain("Invalid or expired");
  });
});

// ═══════════════════════════════════════════════════════════════
// POST /api/auth/lookup
// ═══════════════════════════════════════════════════════════════
describe("POST /api/auth/lookup — owner lookup", () => {
  it("finds owner by email and returns account IDs", async () => {
    tableResults["owner"] = { data: { id: 1 }, error: null };
    tableResults["account"] = {
      data: [
        { account_id: "live_abc", type: "live" },
        { account_id: "demo_abc", type: "demo" },
      ],
      error: null,
    };

    const { POST } = await import("../../app/api/auth/lookup/route");
    const res = await POST(mockReq({ email: "test@example.com" }) as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.owner_id).toBe(1);
    expect(json.live_account_id).toBe("live_abc");
    expect(json.demo_account_id).toBe("demo_abc");
  });

  it("returns 404 when owner not found", async () => {
    tableResults["owner"] = { data: null, error: null };

    const { POST } = await import("../../app/api/auth/lookup/route");
    const res = await POST(mockReq({ email: "nobody@example.com" }) as any);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain("No account found");
  });

  it("rejects when neither email nor phone provided", async () => {
    const { POST } = await import("../../app/api/auth/lookup/route");
    const res = await POST(mockReq({}) as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Email or phone");
  });

  it("finds owner by phone", async () => {
    tableResults["owner"] = { data: { id: 2 }, error: null };
    tableResults["account"] = {
      data: [{ account_id: "live_xyz", type: "live" }],
      error: null,
    };

    const { POST } = await import("../../app/api/auth/lookup/route");
    const res = await POST(mockReq({ phone: "+23057001234" }) as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.owner_id).toBe(2);
    expect(json.live_account_id).toBe("live_xyz");
  });
});
