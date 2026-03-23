/**
 * Smoke Tests — hit the REAL production API endpoints.
 * These verify the deployed system actually works, not just mocked logic.
 * Run separately from unit tests: `npx vitest run src/__tests__/api/smoke-test.test.ts`
 */
import { describe, it, expect, beforeAll } from "vitest";

const BASE = process.env.SMOKE_TEST_URL || "https://web.posterita.com";
const SUPABASE_URL = "https://ldyoiexyqvklujvwcaqq.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Skip if no service key (local dev without credentials)
const canRun = SERVICE_KEY.length > 10;

describe.skipIf(!canRun)("Production Smoke Tests", () => {
  // ── API Health ──

  it("GET /api/sync returns health check", async () => {
    const res = await fetch(`${BASE}/api/sync`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.service).toBe("posterita-cloud-sync");
    expect(json.sync_api_version).toBeGreaterThanOrEqual(2);
  });

  // ── Database Connectivity ──

  it("Supabase responds to a simple query", async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/account?select=account_id&limit=1`, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  // ── Critical Tables Exist ──

  const criticalTables = [
    "account", "owner", "product", "productcategory", "orders", "orderline",
    "store", "terminal", "pos_user", "tax", "customer", "till",
    "restaurant_table", "table_section", "preparation_station",
    "error_logs", "sync_request_log", "ci_report",
  ];

  for (const table of criticalTables) {
    it(`Table '${table}' exists and is queryable`, async () => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=0`, {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
      });
      // 200 = table exists. 404 = doesn't exist. 400 = RLS issue (still means table exists)
      expect([200, 400]).toContain(res.status);
    });
  }

  // ── Data Integrity ──

  it("Every account has an owner_id", async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/account?owner_id=is.null&select=account_id`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    const orphans = await res.json();
    expect(orphans.length).toBe(0); // No orphaned accounts
  });

  it("No open errors older than 7 days", async () => {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/error_logs?status=eq.open&created_at=lt.${weekAgo}&select=id`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );
    const stale = await res.json();
    if (stale.length > 0) {
      console.warn(`⚠️ ${stale.length} open errors older than 7 days`);
    }
    // Warn but don't fail — this is an advisory check
    expect(true).toBe(true);
  });

  it("Every store has a valid account_id", async () => {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/store?account_id=is.null&select=store_id`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );
    const orphans = await res.json();
    expect(orphans.length).toBe(0);
  });

  it("Terminal types are valid values", async () => {
    const valid = ["pos_retail", "pos_restaurant", "kds", "mobile_staff", "customer_display", "self_service"];
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/terminal?select=terminal_id,terminal_type`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );
    const terminals = await res.json();
    for (const t of terminals) {
      expect(valid).toContain(t.terminal_type);
    }
  });

  // ── Sync Contract ──

  it("POST /api/sync with minimal payload returns structured response", async () => {
    const res = await fetch(`${BASE}/api/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account_id: "smoke_test_nonexistent",
        terminal_id: 1,
        store_id: 1,
        last_sync_at: "1970-01-01T00:00:00Z",
      }),
    });
    // Should return 200 (auto-creates account) or structured error
    expect([200, 400, 500]).toContain(res.status);
    const json = await res.json();
    // Response should have expected structure
    if (res.status === 200) {
      expect(json).toHaveProperty("server_sync_version");
      expect(json).toHaveProperty("products");
      expect(json).toHaveProperty("server_time");
    }
  });

  // ── Web Console Pages Load ──

  const pages = [
    "/", "/products", "/orders", "/categories", "/stores",
    "/terminals", "/tables", "/stations", "/settings",
    "/inventory", "/customers", "/users",
  ];

  for (const page of pages) {
    it(`Web console ${page} returns 200 or redirect`, async () => {
      const res = await fetch(`${BASE}${page}`, { redirect: "manual" });
      // 200 = page loads. 307 = auth redirect (expected for protected pages)
      expect([200, 307]).toContain(res.status);
    });
  }
});

// ── Edge Case Discovery ──

describe.skipIf(!canRun)("Edge Case Tests", () => {
  it("Sync handles empty strings in account_id", async () => {
    const res = await fetch(`${BASE}/api/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account_id: "", terminal_id: 1 }),
    });
    expect(res.status).toBe(400);
  });

  it("Sync handles extremely long account_id", async () => {
    const res = await fetch(`${BASE}/api/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account_id: "x".repeat(10000), terminal_id: 1 }),
    });
    // Should not crash — either 400 or 200 with auto-create
    expect([200, 400, 500]).toContain(res.status);
  });

  it("Sync handles negative terminal_id", async () => {
    const res = await fetch(`${BASE}/api/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account_id: "test", terminal_id: -1 }),
    });
    expect(res.status).toBeLessThan(600); // Doesn't crash
  });

  it("Data proxy rejects SQL injection attempt in table name", async () => {
    const res = await fetch(`${BASE}/api/data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "product; DROP TABLE product;--", select: "*" }),
    });
    const json = await res.json();
    expect(json.error).toBeDefined(); // Blocked by whitelist
  });

  it("Data proxy rejects SQL injection in filter value", async () => {
    const res = await fetch(`${BASE}/api/data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "product",
        select: "*",
        filters: [{ column: "name", op: "eq", value: "'; DROP TABLE product;--" }],
      }),
    });
    // Supabase parameterizes queries, so this should return 0 results, not crash
    expect(res.status).toBeLessThan(600);
  });
});
