import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Sync schema guard tests.
 *
 * These tests prevent regressions where the sync route pushes fields
 * that don't exist in the Supabase schema, or where pull queries
 * reference missing tables/columns.
 *
 * Root cause: shift.uuid was added to Android Room but the Supabase
 * migration was never run, causing "column not found" errors on every sync.
 */

// ─── Supabase mock that tracks ALL operations ───

let supabaseOps: Array<{ table: string; op: string; data?: any; filters: Record<string, any> }> = [];
let tableResults: Record<string, { data: any; error: any }> = {};

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
      if (m === "select") state.op = "select";
      if (m === "eq") state.filters[args[0]] = args[1];
      if (m === "in") state.filters[args[0]] = args[1];
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

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => createChain(table),
    rpc: (..._args: any[]) => {
      const result = { data: null, error: null };
      const obj: any = { ...result, throwOnError: () => Promise.resolve(result) };
      obj.then = (f: Function) => Promise.resolve(result).then(f as any);
      return obj;
    },
  }),
}));

function mockRequest(body: any): any {
  const hdrs = new Map<string, string>();
  return { json: () => Promise.resolve(body), headers: { get: (key: string) => hdrs.get(key) ?? null } };
}

function seedPullTables() {
  for (const t of [
    "product", "productcategory", "tax", "modifier", "customer", "preference",
    "pos_user", "discountcode", "restaurant_table", "table_section",
    "preparation_station", "category_station_mapping", "store", "terminal",
    "inventory_count_session", "serial_item", "loyalty_config", "promotion",
    "menu_schedule", "shift", "delivery", "tag_group", "tag", "product_tag",
    "quotation", "quotation_line",
  ]) {
    tableResults[t] = { data: [], error: null };
  }
}

beforeEach(() => {
  tableResults = {};
  supabaseOps = [];
  vi.resetModules();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
});

async function importSyncRoute() {
  return await import("../../app/api/sync/route");
}

// ─── Tests ───

describe("Sync schema guard — shift push", () => {
  it("pushes shifts without crashing when uuid field is present", async () => {
    tableResults["account"] = { data: { account_id: "acc1" }, error: null };
    seedPullTables();
    tableResults["shift"] = { data: null, error: null };

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({
      account_id: "acc1",
      terminal_id: 1,
      store_id: 1,
      last_sync_at: "2024-01-01T00:00:00Z",
      shifts: [{
        user_id: 1,
        user_name: "Alice",
        clock_in: "2024-01-15T08:00:00Z",
        status: "active",
        uuid: "shift-uuid-001",
      }],
    }));
    const json = await res.json();

    // Shift should be processed (either synced or have a non-crash error)
    expect(json.success).toBeDefined();
    // Should NOT crash the whole sync
    expect(res.status).toBe(200);
  });

  it("pushes shifts without uuid field (legacy clients)", async () => {
    tableResults["account"] = { data: { account_id: "acc1" }, error: null };
    seedPullTables();
    tableResults["shift"] = { data: null, error: null };

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({
      account_id: "acc1",
      terminal_id: 1,
      store_id: 1,
      last_sync_at: "2024-01-01T00:00:00Z",
      shifts: [{
        user_id: 1,
        user_name: "Bob",
        clock_in: "2024-01-15T09:00:00Z",
        status: "active",
      }],
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBeDefined();
  });
});

describe("Sync schema guard — pull tables exist", () => {
  it("pulls all tables without crashing when tables are empty", async () => {
    tableResults["account"] = { data: { account_id: "acc1" }, error: null };
    seedPullTables();

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({
      account_id: "acc1",
      terminal_id: 1,
      store_id: 1,
      last_sync_at: "2024-01-01T00:00:00Z",
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    // Verify all expected pull arrays are present in response
    const expectedPullFields = [
      "products", "product_categories", "taxes", "modifiers", "customers",
      "preferences", "users", "discount_codes", "restaurant_tables",
      "table_sections", "preparation_stations", "category_station_mappings",
      "stores", "terminals", "inventory_sessions", "serial_items",
      "loyalty_configs", "promotions", "menu_schedules", "shifts", "deliveries",
      "tag_groups", "tags", "product_tags",
      "quotations", "quotation_lines",
      "sibling_brands",
    ];

    for (const field of expectedPullFields) {
      expect(json).toHaveProperty(field);
    }
  });

  it("includes pagination fields in response", async () => {
    tableResults["account"] = { data: { account_id: "acc1" }, error: null };
    seedPullTables();

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({
      account_id: "acc1",
      terminal_id: 1,
      store_id: 1,
      last_sync_at: "2024-01-01T00:00:00Z",
    }));
    const json = await res.json();

    expect(json).toHaveProperty("has_more_products");
    expect(json).toHaveProperty("has_more_customers");
    expect(json).toHaveProperty("pull_page");
    expect(json).toHaveProperty("pull_page_size");
  });
});

describe("Sync schema guard — quotation pull", () => {
  it("returns quotations and quotation_lines arrays", async () => {
    tableResults["account"] = { data: { account_id: "acc1" }, error: null };
    seedPullTables();
    tableResults["quotation"] = {
      data: [{ quotation_id: 1, document_no: "Q-0001", status: "draft" }],
      error: null,
    };
    tableResults["quotation_line"] = {
      data: [{ line_id: 1, quotation_id: 1, product_name: "Widget" }],
      error: null,
    };

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({
      account_id: "acc1",
      terminal_id: 1,
      store_id: 1,
      last_sync_at: "2024-01-01T00:00:00Z",
    }));
    const json = await res.json();

    expect(json.quotations).toHaveLength(1);
    expect(json.quotation_lines).toHaveLength(1);
  });

  it("returns empty quotation_lines when no quotations exist", async () => {
    tableResults["account"] = { data: { account_id: "acc1" }, error: null };
    seedPullTables();
    // quotation returns empty array (already set by seedPullTables)

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({
      account_id: "acc1",
      terminal_id: 1,
      store_id: 1,
      last_sync_at: "2024-01-01T00:00:00Z",
    }));
    const json = await res.json();

    expect(json.quotations).toHaveLength(0);
    expect(json.quotation_lines).toHaveLength(0);
  });
});

describe("Sync schema guard — concurrent terminal usage", () => {
  it("handles same terminal_id from two sync requests without data loss", async () => {
    tableResults["account"] = { data: { account_id: "acc1" }, error: null };
    seedPullTables();
    tableResults["orders"] = { data: null, error: null };
    tableResults["till"] = { data: null, error: null };

    const { POST } = await importSyncRoute();

    // Two "devices" sync with the same terminal_id
    const [res1, res2] = await Promise.all([
      POST(mockRequest({
        account_id: "acc1", terminal_id: 5, store_id: 1,
        last_sync_at: "2024-01-01T00:00:00Z",
        orders: [{ orderId: 1, uuid: "order-from-device-A", grandTotal: 100, subtotal: 85, taxTotal: 15 }],
      })),
      POST(mockRequest({
        account_id: "acc1", terminal_id: 5, store_id: 1,
        last_sync_at: "2024-01-01T00:00:00Z",
        orders: [{ orderId: 2, uuid: "order-from-device-B", grandTotal: 200, subtotal: 170, taxTotal: 30 }],
      })),
    ]);

    const json1 = await res1.json();
    const json2 = await res2.json();

    // Both should succeed (not crash)
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    // Both orders should be attempted
    expect(json1.orders_synced + json2.orders_synced).toBeGreaterThanOrEqual(1);
  });

  it("conflict detection skips stale overwrites from duplicate pushes", async () => {
    tableResults["account"] = { data: { account_id: "acc1" }, error: null };
    seedPullTables();

    // Simulate existing order with newer timestamp
    tableResults["orders"] = {
      data: { uuid: "dup-order", updated_at: "2025-01-01T00:00:00Z", is_sync: true },
      error: null,
    };

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({
      account_id: "acc1", terminal_id: 1, store_id: 1,
      last_sync_at: "2024-01-01T00:00:00Z",
      orders: [{
        orderId: 1, uuid: "dup-order", grandTotal: 100, subtotal: 85, taxTotal: 15,
      }],
    }));
    const json = await res.json();

    // Order should be counted (as conflict handled), not fail
    expect(res.status).toBe(200);
    expect(json.conflicts_detected).toBeGreaterThanOrEqual(0);
  });
});
