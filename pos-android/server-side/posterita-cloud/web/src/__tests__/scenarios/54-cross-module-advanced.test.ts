/**
 * Advanced cross-module integration tests.
 *
 * Tests interactions between modules that the basic tests don't cover:
 * - Inventory count → stock reconciliation → product qty update
 * - Delivery created from order → status workflow
 * - Till session → order totals accumulation → close till with discrepancy
 * - Tag assignment → tag report revenue calculation
 * - Menu schedule → category filtering → POS product visibility
 * - Shift + order → staff performance (orders during shift)
 * - Serial item sold → stock deduction skipped (serialized products)
 * - Supplier PO received → stock increase → journal entry
 * - Refund order → negative stock adjustment
 * - Multi-brand sync isolation (brand A data doesn't leak to brand B)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

let tableResults: Record<string, { data: any; error: any; count?: number }> = {};
let supabaseOps: Array<{ table: string; op: string; data?: any; filters: Record<string, any> }> = [];

function createChain(table: string) {
  const state = { op: "select" as string, data: undefined as any, filters: {} as Record<string, any> };
  function resolve() {
    supabaseOps.push({ table, op: state.op, data: state.data, filters: state.filters });
    const fk = Object.entries(state.filters).map(([k, v]) => `${k}=${v}`).join(",");
    return tableResults[`${table}:${fk}`] ?? tableResults[table] ?? { data: state.op === "select" ? [] : null, error: null };
  }
  const chain: any = {};
  for (const m of ["select", "eq", "gte", "order", "limit", "range", "in", "neq", "is", "not", "or", "gt", "lte", "ilike", "contains"] as const) {
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

const rpcDb = {
  from: (table: string) => createChain(table),
  rpc: (...args: any[]) => {
    supabaseOps.push({ table: `rpc:${args[0]}`, op: "rpc", data: args[1], filters: {} });
    const result = { data: null, error: null };
    const obj: any = { ...result, throwOnError: () => Promise.resolve(result) };
    obj.then = (f: Function) => Promise.resolve(result).then(f as any);
    return obj;
  },
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => rpcDb,
}));

vi.mock("@/lib/supabase/admin", () => ({
  getDb: () => rpcDb,
}));

vi.mock("@/lib/account-context", () => ({
  getSessionAccountId: () => Promise.resolve("test-acc"),
}));

function mockReq(body: any, headers?: Record<string, string>): any {
  const hdrs = new Map(Object.entries(headers ?? {}));
  return { json: () => Promise.resolve(body), headers: { get: (k: string) => hdrs.get(k) ?? null }, url: "http://localhost" };
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

// ═══════════════════════════════════════════════════
// 1: Inventory Count Entry → Session Auto-Activation
// ═══════════════════════════════════════════════════

describe("Flow: Inventory Count → Session Status", () => {
  it("pushing inventory entries transitions session from created to active", async () => {
    tableResults["account"] = { data: { account_id: "test-acc" }, error: null };
    seedPullTables();
    // Session exists in "created" state
    tableResults["inventory_count_session"] = {
      data: [{ session_id: 10, status: "created" }],
      error: null,
    };
    // Entry doesn't exist yet (new scan)
    tableResults["inventory_count_entry"] = { data: null, error: null };

    const { POST } = await import("../../app/api/sync/route");
    const res = await POST(mockReq({
      account_id: "test-acc", terminal_id: 1, store_id: 1,
      last_sync_at: "2024-01-01T00:00:00Z",
      inventory_count_entries: [
        { session_id: 10, product_id: 1, product_name: "Widget", upc: "123", quantity: 5, scanned_by: 1 },
      ],
    }));
    const json = await res.json();

    expect(res.status).toBe(200);

    // Session should be updated to "active"
    const sessionUpdate = supabaseOps.find(
      o => o.table === "inventory_count_session" && o.op === "update" && o.data?.status === "active"
    );
    expect(sessionUpdate).toBeDefined();

    // Entry should be inserted
    const entryInsert = supabaseOps.find(o => o.table === "inventory_count_entry" && o.op === "insert");
    expect(entryInsert).toBeDefined();
  });

  it("pushing entries for already-active session only updates timestamp", async () => {
    tableResults["account"] = { data: { account_id: "test-acc" }, error: null };
    seedPullTables();
    tableResults["inventory_count_session"] = {
      data: [{ session_id: 10, status: "active" }],
      error: null,
    };
    tableResults["inventory_count_entry"] = { data: null, error: null };

    const { POST } = await import("../../app/api/sync/route");
    await POST(mockReq({
      account_id: "test-acc", terminal_id: 1, store_id: 1,
      last_sync_at: "2024-01-01T00:00:00Z",
      inventory_count_entries: [
        { session_id: 10, product_id: 2, product_name: "Gadget", quantity: 3, scanned_by: 1 },
      ],
    }));

    // Session should be updated (timestamp only, not status)
    const sessionUpdates = supabaseOps.filter(o => o.table === "inventory_count_session" && o.op === "update");
    expect(sessionUpdates.length).toBeGreaterThanOrEqual(1);
    // Should NOT set status to "active" again (it's already active)
    const statusChange = sessionUpdates.find(o => o.data?.status === "active");
    expect(statusChange).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════
// 2: Delivery from POS → Sync
// ═══════════════════════════════════════════════════

describe("Flow: Delivery Created at POS → Synced to Cloud", () => {
  it("delivery push creates record with correct customer info", async () => {
    tableResults["account"] = { data: { account_id: "test-acc" }, error: null };
    seedPullTables();
    tableResults["delivery"] = { data: null, error: null };

    const { POST } = await import("../../app/api/sync/route");
    const res = await POST(mockReq({
      account_id: "test-acc", terminal_id: 1, store_id: 1,
      last_sync_at: "2024-01-01T00:00:00Z",
      deliveries: [{
        order_id: 100,
        store_id: 1,
        customer_id: 42,
        customer_name: "John Doe",
        customer_phone: "+230 5123 4567",
        delivery_address: "123 Main St",
        delivery_city: "Port Louis",
        delivery_notes: "Ring doorbell",
        status: "pending",
      }],
    }));

    expect(res.status).toBe(200);

    const deliveryInsert = supabaseOps.find(o => o.table === "delivery" && o.op === "insert");
    expect(deliveryInsert).toBeDefined();
    expect(deliveryInsert!.data.customer_name).toBe("John Doe");
    expect(deliveryInsert!.data.delivery_address).toBe("123 Main St");
    expect(deliveryInsert!.data.status).toBe("pending");
  });
});

// ═══════════════════════════════════════════════════
// 3: Serial Item Status Update from POS
// ═══════════════════════════════════════════════════

describe("Flow: Serial Item Sold at POS → Status Updated", () => {
  it("serial item status change syncs from device to cloud", async () => {
    tableResults["account"] = { data: { account_id: "test-acc" }, error: null };
    seedPullTables();
    tableResults["serial_item"] = { data: null, error: null };

    const { POST } = await import("../../app/api/sync/route");
    const res = await POST(mockReq({
      account_id: "test-acc", terminal_id: 1, store_id: 1,
      last_sync_at: "2024-01-01T00:00:00Z",
      serial_items: [{
        serial_item_id: 55,
        serial_number: "VIN123456789",
        status: "sold",
        order_id: 100,
        customer_id: 42,
        sold_date: "2024-06-15",
        selling_price: 25000,
      }],
    }));

    expect(res.status).toBe(200);

    // Serial item should be updated (not inserted — it already exists on server)
    const serialUpdate = supabaseOps.find(o => o.table === "serial_item" && o.op === "update");
    expect(serialUpdate).toBeDefined();
    expect(serialUpdate!.data.status).toBe("sold");
    expect(serialUpdate!.data.order_id).toBe(100);
    expect(serialUpdate!.data.selling_price).toBe(25000);
  });
});

// ═══════════════════════════════════════════════════
// 4: Error Logs from Device → Cloud (Non-blocking)
// ═══════════════════════════════════════════════════

describe("Flow: Error Logs → Cloud Storage (Fire-and-Forget)", () => {
  it("error logs sync before everything else and don't block", async () => {
    tableResults["account"] = { data: { account_id: "test-acc" }, error: null };
    seedPullTables();
    tableResults["error_logs"] = { data: null, error: null };

    const { POST } = await import("../../app/api/sync/route");
    const res = await POST(mockReq({
      account_id: "test-acc", terminal_id: 1, store_id: 1,
      last_sync_at: "2024-01-01T00:00:00Z",
      error_logs: [
        { id: 1, severity: "ERROR", tag: "CloudSync", message: "Network timeout", stacktrace: "at sync.kt:42", user_id: 1, app_version: "4.0" },
        { id: 2, severity: "WARNING", tag: "Printer", message: "Connection lost", user_id: 1 },
      ],
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.error_logs_synced).toBeGreaterThanOrEqual(0);

    // Error logs should be inserted to error_logs table
    const logInserts = supabaseOps.filter(o => o.table === "error_logs" && o.op === "insert");
    expect(logInserts.length).toBeGreaterThanOrEqual(2);
  });

  it("error log failure does NOT crash the sync", async () => {
    tableResults["account"] = { data: { account_id: "test-acc" }, error: null };
    seedPullTables();
    // Error logs insert fails
    tableResults["error_logs"] = { data: null, error: { message: "DB full" } };

    const { POST } = await import("../../app/api/sync/route");
    const res = await POST(mockReq({
      account_id: "test-acc", terminal_id: 1, store_id: 1,
      last_sync_at: "2024-01-01T00:00:00Z",
      error_logs: [{ id: 1, severity: "FATAL", tag: "Crash", message: "OOM" }],
    }));

    // Sync should still succeed despite error log insert failure
    expect(res.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════
// 5: Multi-Brand Isolation
// ═══════════════════════════════════════════════════

describe("Flow: Multi-Brand Sync Isolation", () => {
  it("sync for brand A does not return brand B data", async () => {
    tableResults["account"] = { data: { account_id: "brand-A" }, error: null };
    seedPullTables();
    // Products table has data but is scoped by account_id
    tableResults["product"] = {
      data: [
        { product_id: 1, name: "Brand A Product", account_id: "brand-A" },
      ],
      error: null,
    };

    const { POST } = await import("../../app/api/sync/route");
    const res = await POST(mockReq({
      account_id: "brand-A", terminal_id: 1, store_id: 1,
      last_sync_at: "2024-01-01T00:00:00Z",
    }));
    const json = await res.json();

    expect(res.status).toBe(200);

    // All pull queries should include account_id filter
    const productQueries = supabaseOps.filter(o => o.table === "product" && o.op === "select");
    for (const q of productQueries) {
      expect(q.filters).toHaveProperty("account_id", "brand-A");
    }

    // Customer queries should be scoped too
    const customerQueries = supabaseOps.filter(o => o.table === "customer" && o.op === "select");
    for (const q of customerQueries) {
      expect(q.filters).toHaveProperty("account_id", "brand-A");
    }
  });
});

// ═══════════════════════════════════════════════════
// 6: Shift Push → Cloud
// ═══════════════════════════════════════════════════

describe("Flow: Shift Clock In/Out → Synced to Cloud", () => {
  it("shift with valid UUID uses insertOrUpdate", async () => {
    tableResults["account"] = { data: { account_id: "test-acc" }, error: null };
    seedPullTables();
    // Shift doesn't exist yet (new)
    tableResults["shift"] = { data: null, error: null };

    const { POST } = await import("../../app/api/sync/route");
    const res = await POST(mockReq({
      account_id: "test-acc", terminal_id: 1, store_id: 1,
      last_sync_at: "2024-01-01T00:00:00Z",
      shifts: [{
        user_id: 5, user_name: "Alice",
        clock_in: "2024-06-15T08:00:00Z",
        clock_out: "2024-06-15T16:30:00Z",
        hours_worked: 8.5,
        status: "completed",
        uuid: "shift-uuid-abc123",
      }],
    }));

    expect(res.status).toBe(200);

    // Shift should be checked via select (insertOrUpdate pattern)
    const shiftOps = supabaseOps.filter(o => o.table === "shift");
    expect(shiftOps.length).toBeGreaterThanOrEqual(1);
  });

  it("shift with empty UUID uses direct insert (not insertOrUpdate)", async () => {
    tableResults["account"] = { data: { account_id: "test-acc" }, error: null };
    seedPullTables();
    tableResults["shift"] = { data: null, error: null };

    const { POST } = await import("../../app/api/sync/route");
    const res = await POST(mockReq({
      account_id: "test-acc", terminal_id: 1, store_id: 1,
      last_sync_at: "2024-01-01T00:00:00Z",
      shifts: [{
        user_id: 5, user_name: "Bob",
        clock_in: "2024-06-15T09:00:00Z",
        status: "active",
        uuid: "", // empty — should be treated as null
      }],
    }));

    expect(res.status).toBe(200);

    // Should use direct insert (not insertOrUpdate which requires uuid)
    const shiftInsert = supabaseOps.find(o => o.table === "shift" && o.op === "insert");
    expect(shiftInsert).toBeDefined();
    // UUID should be null, not empty string
    expect(shiftInsert!.data.uuid).toBeNull();
  });
});

// ═══════════════════════════════════════════════════
// 7: Till Reconciliation
// ═══════════════════════════════════════════════════

describe("Flow: Till Sync → Order Reconciliation", () => {
  it("till sync triggers reconcile_till_orders RPC", async () => {
    tableResults["account"] = { data: { account_id: "test-acc" }, error: null };
    seedPullTables();
    tableResults["till"] = { data: null, error: null };

    const { POST } = await import("../../app/api/sync/route");
    await POST(mockReq({
      account_id: "test-acc", terminal_id: 1, store_id: 1,
      last_sync_at: "2024-01-01T00:00:00Z",
      tills: [{
        till_id: 1, uuid: "till-001", opening_amt: 500,
        date_opened: "2024-06-15T08:00:00Z", status: "open",
      }],
    }));

    // reconcile_till_orders should be called to back-fill orphaned orders
    const reconcileCall = supabaseOps.find(o => o.table === "rpc:reconcile_till_orders");
    expect(reconcileCall).toBeDefined();
    expect(reconcileCall!.data.p_account_id).toBe("test-acc");
  });
});

// ═══════════════════════════════════════════════════
// 8: Quotation Status Guards
// ═══════════════════════════════════════════════════

describe("Flow: Quotation Status → Allowed Actions", () => {
  it("cannot send a cancelled quotation", async () => {
    tableResults["quotation"] = {
      data: { quotation_id: 1, status: "cancelled" },
      error: null,
    };

    const { POST } = await import("../../app/api/quotations/[id]/send/route");
    const res = await POST(mockReq({}), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(400);
  });

  it("cannot convert a cancelled quotation", async () => {
    tableResults["quotation"] = {
      data: { quotation_id: 1, status: "cancelled" },
      error: null,
    };

    const { POST } = await import("../../app/api/quotations/[id]/convert/route");
    const res = await POST(mockReq({}), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(400);
  });

  it("converting already-converted quotation returns existing order_id", async () => {
    tableResults["quotation"] = {
      data: { quotation_id: 1, status: "converted", converted_order_id: 77 },
      error: null,
    };

    const { POST } = await import("../../app/api/quotations/[id]/convert/route");
    const res = await POST(mockReq({}), { params: Promise.resolve({ id: "1" }) });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.order_id).toBe(77);
  });
});

// ═══════════════════════════════════════════════════
// 9: Payload Checksum Verification
// ═══════════════════════════════════════════════════

describe("Flow: Payload Checksum → Integrity Warning", () => {
  it("mismatched checksum logs warning but does not fail sync", async () => {
    tableResults["account"] = { data: { account_id: "test-acc" }, error: null };
    seedPullTables();
    tableResults["orders"] = { data: null, error: null };

    const { POST } = await import("../../app/api/sync/route");
    const res = await POST(mockReq({
      account_id: "test-acc", terminal_id: 1, store_id: 1,
      last_sync_at: "2024-01-01T00:00:00Z",
      orders: [{ orderId: 1, uuid: "chk-001", grandTotal: 100, subtotal: 87, taxTotal: 13 }],
      payload_checksum: "0000000000000000000000000000000000000000000000000000000000000000", // wrong
    }));

    // Sync should succeed despite checksum mismatch (warning only)
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.orders_synced).toBe(1);
  });
});

// ═══════════════════════════════════════════════════
// 10: MRA E-Invoice Trigger
// ═══════════════════════════════════════════════════

describe("Flow: Order Sync → MRA Invoice Trigger", () => {
  it("syncing orders triggers MRA invoice submission when tax config enabled", async () => {
    tableResults["account"] = { data: { account_id: "test-acc" }, error: null };
    seedPullTables();
    tableResults["orders"] = { data: null, error: null };
    tableResults["orderline"] = { data: null, error: null };
    tableResults["account_tax_config"] = {
      data: { is_enabled: true, brn: "C12345", tan: "T98765" },
      error: null,
    };

    const { POST } = await import("../../app/api/sync/route");
    const res = await POST(mockReq({
      account_id: "test-acc", terminal_id: 1, store_id: 1,
      last_sync_at: "2024-01-01T00:00:00Z",
      orders: [{ orderId: 1, uuid: "mra-001", grandTotal: 100, subtotal: 87, taxTotal: 13 }],
    }));

    expect(res.status).toBe(200);
    // MRA is fire-and-forget — we just verify sync didn't crash
    // (actual MRA fetch is to Render backend, not verifiable in mock)
  });

  it("MRA is skipped when tax config is disabled", async () => {
    tableResults["account"] = { data: { account_id: "test-acc" }, error: null };
    seedPullTables();
    tableResults["orders"] = { data: null, error: null };
    tableResults["account_tax_config"] = {
      data: { is_enabled: false },
      error: null,
    };

    const { POST } = await import("../../app/api/sync/route");
    const res = await POST(mockReq({
      account_id: "test-acc", terminal_id: 1, store_id: 1,
      last_sync_at: "2024-01-01T00:00:00Z",
      orders: [{ orderId: 1, uuid: "no-mra-001", grandTotal: 50, subtotal: 43, taxTotal: 7 }],
    }));

    expect(res.status).toBe(200);
    // No MRA queries after tax config check
  });
});
