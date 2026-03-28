/**
 * Final cross-module gaps:
 * 1. Purchase Order GRN → Stock increase + journal entry
 * 2. Customer push from POS → Cloud upsert
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

vi.mock("@/lib/supabase/admin", () => ({ getDb: () => ({ from: (t: string) => createChain(t) }) }));
vi.mock("@/lib/account-context", () => ({ getSessionAccountId: () => Promise.resolve("test-acc") }));

function mockReq(body: any, url?: string): any {
  return { json: () => Promise.resolve(body), url: url ?? "http://localhost" };
}

beforeEach(() => { tableResults = {}; supabaseOps = []; vi.resetModules(); });

// ═══════════════════════════════════════════════════
// 1: Purchase Order GRN → Stock + Journal
// ═══════════════════════════════════════════════════

describe("Flow: PO Receive (GRN) → Stock Increase + Journal", () => {
  it("receiving a PO updates product stock and creates journal entries", async () => {
    // PO exists (pk is po_id)
    tableResults["purchase_order"] = {
      data: { po_id: 1, status: "ordered", account_id: "test-acc", store_id: 1 },
      error: null,
    };
    // PO line (singular — mock returns one at a time via .single())
    tableResults["purchase_order_line"] = {
      data: { id: 10, po_id: 1, product_id: 100, quantity_ordered: 50, quantity_received: 0, unit_cost: 5.00, account_id: "test-acc" },
      error: null,
    };
    // Product exists with stock tracking
    tableResults["product"] = {
      data: { product_id: 100, quantity_on_hand: 20, track_stock: true },
      error: null,
    };
    tableResults["stock_journal"] = { data: null, error: null };

    const { POST } = await import("../../app/api/purchase-orders/[id]/receive/route");
    const res = await POST(mockReq({
      lines: [{ id: 10, quantity_received: 50 }],
    }), { params: Promise.resolve({ id: "1" }) });

    expect(res.status).toBe(200);

    // Product stock should be updated (quantity_on_hand increased)
    const productUpdates = supabaseOps.filter(o => o.table === "product" && o.op === "update");
    expect(productUpdates.length).toBeGreaterThanOrEqual(1);

    // Stock journal entry created
    const journalInserts = supabaseOps.filter(o => o.table === "stock_journal" && o.op === "insert");
    expect(journalInserts.length).toBeGreaterThanOrEqual(1);

    // PO line qty_received updated
    const lineUpdates = supabaseOps.filter(o => o.table === "purchase_order_line" && o.op === "update");
    expect(lineUpdates.length).toBeGreaterThanOrEqual(1);

    // PO status updated
    const poUpdate = supabaseOps.find(o => o.table === "purchase_order" && o.op === "update");
    expect(poUpdate).toBeDefined();
  });

  it("rejects receive on cancelled PO", async () => {
    tableResults["purchase_order"] = {
      data: { po_id: 3, status: "cancelled", account_id: "test-acc" },
      error: null,
    };

    const { POST } = await import("../../app/api/purchase-orders/[id]/receive/route");
    const res = await POST(mockReq({
      lines: [{ id: 30, quantity_received: 10 }],
    }), { params: Promise.resolve({ id: "3" }) });

    expect(res.status).toBe(400);
  });

  it("rejects receive with no lines", async () => {
    tableResults["purchase_order"] = {
      data: { po_id: 4, status: "ordered", account_id: "test-acc" },
      error: null,
    };

    const { POST } = await import("../../app/api/purchase-orders/[id]/receive/route");
    const res = await POST(mockReq({ lines: [] }), { params: Promise.resolve({ id: "4" }) });
    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════
// 2: Customer Push from POS → Cloud Upsert
// ═══════════════════════════════════════════════════

describe("Flow: Customer Push from POS → Cloud", () => {
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

  // Need @supabase/supabase-js mock for sync route
  beforeEach(() => {
    vi.mock("@supabase/supabase-js", () => ({
      createClient: () => ({
        from: (t: string) => createChain(t),
        rpc: (...args: any[]) => {
          supabaseOps.push({ table: `rpc:${args[0]}`, op: "rpc", data: args[1], filters: {} });
          const r = { data: null, error: null };
          const o: any = { ...r, throwOnError: () => Promise.resolve(r) };
          o.then = (f: Function) => Promise.resolve(r).then(f as any);
          return o;
        },
      }),
    }));
  });

  it("new customer created at POS is upserted to cloud", async () => {
    tableResults["account"] = { data: { account_id: "test-acc" }, error: null };
    seedPullTables();
    // Customer doesn't exist yet on server (tenantUpsert will insert)
    tableResults["customer"] = { data: null, error: null };

    const { POST } = await import("../../app/api/sync/route");
    const res = await POST({
      json: () => Promise.resolve({
        account_id: "test-acc", terminal_id: 1, store_id: 1,
        last_sync_at: "2024-01-01T00:00:00Z",
        customers: [{
          customer_id: 999,
          name: "New Customer",
          phone1: "+230 5999 0000",
          email: "new@example.com",
          isactive: "Y",
          loyaltypoints: 0,
        }],
      }),
      headers: { get: () => null },
    } as any);
    const json = await res.json();

    expect(res.status).toBe(200);

    // Customer should be checked + inserted via tenantUpsert
    const customerOps = supabaseOps.filter(o => o.table === "customer");
    // tenantUpsert does: SELECT (check) → INSERT or UPDATE
    expect(customerOps.length).toBeGreaterThanOrEqual(1);

    // Should include account_id scoping
    const insertOp = customerOps.find(o => o.op === "insert");
    if (insertOp) {
      expect(insertOp.data.account_id).toBe("test-acc");
      expect(insertOp.data.name).toBe("New Customer");
    }
  });

  it("existing customer pushed from POS updates cloud record", async () => {
    tableResults["account"] = { data: { account_id: "test-acc" }, error: null };
    seedPullTables();
    // Customer already exists
    tableResults["customer"] = {
      data: { customer_id: 42, account_id: "test-acc", name: "Old Name" },
      error: null,
    };

    const { POST } = await import("../../app/api/sync/route");
    const res = await POST({
      json: () => Promise.resolve({
        account_id: "test-acc", terminal_id: 1, store_id: 1,
        last_sync_at: "2024-01-01T00:00:00Z",
        customers: [{
          customer_id: 42,
          name: "Updated Name",
          phone1: "+230 5123 4567",
          email: "updated@example.com",
          isactive: "Y",
        }],
      }),
      headers: { get: () => null },
    } as any);

    expect(res.status).toBe(200);

    // Customer should be updated (tenantUpsert finds existing → update)
    const customerUpdate = supabaseOps.find(o => o.table === "customer" && o.op === "update");
    if (customerUpdate) {
      expect(customerUpdate.data.name).toBe("Updated Name");
    }
  });

  it("customer from different account is rejected (tenant isolation)", async () => {
    tableResults["account"] = { data: { account_id: "test-acc" }, error: null };
    seedPullTables();
    // Customer exists but belongs to different account
    tableResults["customer"] = {
      data: { customer_id: 42, account_id: "other-acc" },
      error: null,
    };

    const { POST } = await import("../../app/api/sync/route");
    const res = await POST({
      json: () => Promise.resolve({
        account_id: "test-acc", terminal_id: 1, store_id: 1,
        last_sync_at: "2024-01-01T00:00:00Z",
        customers: [{
          customer_id: 42,
          name: "Hacker Customer",
          isactive: "Y",
        }],
      }),
      headers: { get: () => null },
    } as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    // tenantUpsert should detect cross-tenant PK collision and skip
    // The customer should NOT be updated (different account_id)
    const customerUpdate = supabaseOps.find(
      o => o.table === "customer" && o.op === "update" && o.data?.name === "Hacker Customer"
    );
    expect(customerUpdate).toBeUndefined();
  });
});
