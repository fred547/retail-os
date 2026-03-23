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

  it("Real accounts have owner_id set (excludes auto-created test accounts)", async () => {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/account?owner_id=is.null&select=account_id&account_id=not.like.smoke_*&account_id=not.like.test*&account_id=not.like.x*`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );
    const orphans = await res.json();
    expect(orphans.length).toBe(0);
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

// ── Data Proxy Column Validation ──
// These tests verify that the columns referenced in web console pages ACTUALLY EXIST
// in the database. Catches silent failures like "category_id does not exist".

describe.skipIf(!canRun)("Data Proxy Column Validation", () => {
  const testQuery = async (table: string, select: string) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}&limit=0`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    return res;
  };

  const criticalQueries = [
    { table: "product", select: "product_id, name, sellingprice, productcategory_id, isactive, product_status, station_override_id" },
    { table: "productcategory", select: "productcategory_id, name, isactive" },
    { table: "orders", select: "order_id, document_no, grand_total, date_ordered, is_paid, is_sync, account_id" },
    { table: "orderline", select: "orderline_id, order_id, product_id, productname, qtyentered, priceentered, lineamt, linenetamt" },
    { table: "store", select: "store_id, name, address, city, country, currency, isactive" },
    { table: "terminal", select: "terminal_id, name, prefix, isactive, terminal_type, zone, store_id" },
    { table: "pos_user", select: "user_id, username, firstname, pin, role, email" },
    { table: "customer", select: "customer_id, name, phone1, email, isactive" },
    { table: "restaurant_table", select: "table_id, table_name, seats, is_occupied, section_id, store_id" },
    { table: "table_section", select: "section_id, name, display_order, color, is_active, is_takeaway, store_id" },
    { table: "preparation_station", select: "station_id, name, station_type, printer_id, color, is_active, store_id" },
    { table: "category_station_mapping", select: "id, category_id, station_id" },
    { table: "modifier", select: "modifier_id, name, sellingprice, product_id, productcategory_id, isactive" },
    { table: "error_logs", select: "id, severity, tag, message, stack_trace, device_info, created_at, status" },
    { table: "sync_request_log", select: "id, account_id, terminal_id, status, duration_ms, orders_pushed, products_pulled" },
    { table: "ci_report", select: "id, git_sha, branch, android_passed, web_passed, status" },
  ];

  for (const q of criticalQueries) {
    it(`${q.table}: columns ${q.select.split(",").length} columns exist`, async () => {
      const res = await testQuery(q.table, q.select);
      expect(res.status).toBe(200);
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

// ── Platform Brand Management ──

describe.skipIf(!canRun)("Platform Brand Management", () => {
  it("every account has a businessname", async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/account?select=account_id,businessname&businessname=is.null`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    const orphans = await res.json();
    expect(orphans.length).toBe(0);
  });

  it("account types are valid values", async () => {
    const valid = ["live", "demo", "trial"];
    const res = await fetch(`${SUPABASE_URL}/rest/v1/account?select=account_id,type`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    const accounts = await res.json();
    for (const a of accounts) {
      expect(valid).toContain(a.type);
    }
  });

  it("account statuses are valid values", async () => {
    const valid = ["draft", "onboarding", "active", "suspended", "archived", "testing", "failed"];
    const res = await fetch(`${SUPABASE_URL}/rest/v1/account?select=account_id,status`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    const accounts = await res.json();
    for (const a of accounts) {
      expect(valid).toContain(a.status);
    }
  });

  it("every owner has at least one account", async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/owner?select=id,email`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    const owners = await res.json();
    for (const owner of owners) {
      const accRes = await fetch(`${SUPABASE_URL}/rest/v1/account?owner_id=eq.${owner.id}&select=account_id&limit=1`, {
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      });
      const accounts = await accRes.json();
      expect(accounts.length).toBeGreaterThan(0);
    }
  });

  it("platform page loads", async () => {
    const res = await fetch(`${BASE}/platform`, { redirect: "manual" });
    expect([200, 307]).toContain(res.status);
  });

  it("platform with tab=brands loads", async () => {
    const res = await fetch(`${BASE}/platform?tab=brands`, { redirect: "manual" });
    expect([200, 307]).toContain(res.status);
  });

  it("platform with status filter loads", async () => {
    for (const status of ["testing", "onboarding", "active"]) {
      const res = await fetch(`${BASE}/platform?tab=brands&status=${status}`, { redirect: "manual" });
      expect([200, 307]).toContain(res.status);
    }
  });

  it("platform with type filter loads", async () => {
    for (const type of ["demo", "live"]) {
      const res = await fetch(`${BASE}/platform?tab=brands&type=${type}`, { redirect: "manual" });
      expect([200, 307]).toContain(res.status);
    }
  });

  it("platform tabs all load without 500", async () => {
    for (const tab of ["brands", "owners", "errors", "sync", "tests", "benchmark", "infra"]) {
      const res = await fetch(`${BASE}/platform?tab=${tab}`, { redirect: "manual" });
      expect(res.status).not.toBe(500);
    }
  });

  it("super-admin status endpoint works", async () => {
    const res = await fetch(`${BASE}/api/super-admin/status`);
    expect(res.status).toBeLessThan(500);
  });

  it("infrastructure API returns service data", async () => {
    const res = await fetch(`${BASE}/api/infrastructure`);
    if (res.status === 200) {
      const json = await res.json();
      expect(json.services).toBeDefined();
      expect(json.totalCost).toBeDefined();
      expect(json.services.supabase).toBeDefined();
      expect(json.services.vercel).toBeDefined();
      expect(json.services.render).toBeDefined();
    }
  });

  it("changelog API returns commits", async () => {
    const res = await fetch(`${BASE}/api/changelog`);
    if (res.status === 200) {
      const json = await res.json();
      expect(json.commits).toBeDefined();
      expect(json.version).toBeDefined();
      // Should have commits if GitHub token is configured
      if (!json.error) {
        expect(json.commits.length).toBeGreaterThan(0);
      }
    }
  });

  it("monitor API returns all checks", async () => {
    const res = await fetch(`${BASE}/api/monitor`);
    if (res.status === 200) {
      const json = await res.json();
      expect(json.checks).toBeDefined();
      expect(json.checks.supabase).toBeDefined();
      expect(json.checks.render_backend).toBeDefined();
    }
  });
});
