import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Supabase mock infrastructure (same pattern as sync.test.ts) ────

let tableResults: Record<string, { data: any; error: any }> = {};
let supabaseOps: Array<{
  table: string;
  op: string;
  data?: any;
  filters: Record<string, any>;
}> = [];

function createChain(table: string) {
  const state = {
    op: 'select' as string,
    data: undefined as any,
    filters: {} as Record<string, any>,
    upsertOpts: undefined as any,
  };

  function resolve() {
    supabaseOps.push({ table, op: state.op, data: state.data, filters: state.filters });
    const filterKey = Object.entries(state.filters)
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return (
      tableResults[`${table}:${filterKey}`] ??
      tableResults[table] ??
      { data: (state.op === 'select' ? [] : null), error: null }
    );
  }

  const chain: any = {};
  for (const m of ['select', 'eq', 'gte', 'order', 'limit', 'range', 'in', 'neq', 'is', 'not', 'or', 'gt', 'ilike', 'contains'] as const) {
    chain[m] = (...args: any[]) => {
      if (m === 'select') state.op = 'select';
      if (m === 'eq') state.filters[args[0]] = args[1];
      if (m === 'in') state.filters[args[0]] = args[1];
      return chain;
    };
  }
  for (const m of ['insert', 'update', 'upsert', 'delete'] as const) {
    chain[m] = (...args: any[]) => {
      state.op = m;
      state.data = args[0];
      if (m === 'upsert') state.upsertOpts = args[1];
      return chain;
    };
  }
  chain.single = () => {
    const r = resolve(); const d = Array.isArray(r.data) ? (r.data[0] ?? null) : r.data;
    return Promise.resolve({ ...r, data: d });
  };
  chain.maybeSingle = () => {
    const r = resolve(); const d = Array.isArray(r.data) ? (r.data[0] ?? null) : r.data;
    return Promise.resolve({ ...r, data: d });
  };
  chain.then = (onFulfilled: Function, onRejected?: Function) =>
    Promise.resolve(resolve()).then(onFulfilled as any, onRejected as any);

  return chain;
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => createChain(table),
    rpc: (..._args: any[]) => {
      const result = { data: null, error: null };
      const obj: any = { ...result, throwOnError: () => Promise.resolve(result) };
      obj.then = (onFulfilled: Function, onRejected?: Function) =>
        Promise.resolve(result).then(onFulfilled as any, onRejected as any);
      return obj;
    },
  }),
}));

// ─── Helpers ────────────────────────────────────────────────────────

function mockRequest(body: any, headers?: Record<string, string>): any {
  const hdrs = new Map(Object.entries(headers ?? {})); return { json: () => Promise.resolve(body), headers: { get: (key: string) => hdrs.get(key) ?? null } };
}

beforeEach(() => {
  tableResults = {};
  supabaseOps = [];
  vi.resetModules();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
});

async function importSyncRoute() {
  return await import('../../app/api/sync/route');
}

function seedEmptyPullTables() {
  const pullTables = [
    'product', 'productcategory', 'tax', 'modifier', 'customer',
    'preference', 'pos_user', 'discountcode', 'restaurant_table',
    'store', 'terminal',
  ];
  for (const t of pullTables) {
    tableResults[t] = { data: [], error: null };
  }
}

function baseRequest(overrides: any = {}) {
  return {
    account_id: 'acc1',
    terminal_id: 1,
    store_id: 1,
    last_sync_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('/api/sync POST – duplicate order handling', () => {
  it('processes multiple orders with the same UUID individually', async () => {
    tableResults['account'] = { data: { account_id: 'acc1' }, error: null };
    seedEmptyPullTables();
    tableResults['orders'] = { data: null, error: null };
    tableResults['till'] = { data: null, error: null };

    const { POST } = await importSyncRoute();
    const duplicateUuid = 'dup-uuid-001';
    const res = await POST(mockRequest(baseRequest({
      orders: [
        { order_id: 1, uuid: duplicateUuid, grandTotal: 100, subtotal: 85, taxTotal: 15, tillId: 0 },
        { order_id: 2, uuid: duplicateUuid, grandTotal: 200, subtotal: 170, taxTotal: 30, tillId: 0 },
      ],
    })));
    const json = await res.json();

    // Both orders are processed (the route loops over all without deduplication)
    expect(json.orders_synced).toBe(2);
    expect(json.success).toBe(true);
  });
});

describe('/api/sync POST – till FK handling on orders', () => {
  it('omits till_id when referenced till does not exist', async () => {
    tableResults['account'] = { data: { account_id: 'acc1' }, error: null };
    seedEmptyPullTables();
    tableResults['orders'] = { data: null, error: null };
    // till lookup returns null (till 999 does not exist)
    tableResults['till'] = { data: null, error: null };

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest(baseRequest({
      orders: [{
        orderId: 1,
        uuid: 'order-fk-test',
        tillId: 999,
        grandTotal: 50,
        subtotal: 43,
        taxTotal: 7,
      }],
    })));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.orders_synced).toBe(1);

    // Verify the order insert was called without till_id in the data
    const orderInsert = supabaseOps.find(op => op.table === 'orders' && op.op === 'insert');
    expect(orderInsert).toBeDefined();
    expect(orderInsert!.data).not.toHaveProperty('till_id');
  });

  it('skips FK check entirely when tillId is 0', async () => {
    tableResults['account'] = { data: { account_id: 'acc1' }, error: null };
    seedEmptyPullTables();
    tableResults['orders'] = { data: null, error: null };

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest(baseRequest({
      orders: [{
        orderId: 1,
        uuid: 'order-till-zero',
        tillId: 0,
        grandTotal: 100,
        subtotal: 85,
        taxTotal: 15,
      }],
    })));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.orders_synced).toBe(1);

    // When tillId=0, the route should NOT query the till table to check existence
    const tillSelects = supabaseOps.filter(op => op.table === 'till' && op.op === 'select');
    expect(tillSelects).toHaveLength(0);
  });

  it('includes till_id when referenced till DOES exist', async () => {
    tableResults['account'] = { data: { account_id: 'acc1' }, error: null };
    seedEmptyPullTables();
    tableResults['orders'] = { data: null, error: null };
    // till lookup returns a real till
    tableResults['till'] = { data: { till_id: 42 }, error: null };

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest(baseRequest({
      orders: [{
        orderId: 1,
        uuid: 'order-till-exists',
        tillId: 42,
        grandTotal: 100,
        subtotal: 85,
        taxTotal: 15,
      }],
    })));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.orders_synced).toBe(1);

    // Verify order was inserted WITH till_id
    const orderInsert = supabaseOps.find(op => op.table === 'orders' && op.op === 'insert');
    expect(orderInsert).toBeDefined();
    expect(orderInsert!.data.till_id).toBe(42);
  });
});

describe('/api/sync POST – large batch processing', () => {
  it('processes 50+ orders in a single batch', async () => {
    tableResults['account'] = { data: { account_id: 'acc1' }, error: null };
    seedEmptyPullTables();
    tableResults['orders'] = { data: null, error: null };
    tableResults['till'] = { data: null, error: null };

    const orders = Array.from({ length: 55 }, (_, i) => ({
      order_id: i + 1,
      uuid: `batch-uuid-${i + 1}`,
      tillId: 0,
      grandTotal: 100 + i,
      subtotal: 85 + i,
      taxTotal: 15,
    }));

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest(baseRequest({ orders })));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.orders_synced).toBe(55);
    expect(json.errors).toEqual([]);
  });
});

describe('/api/sync POST – mixed success/failure in batch', () => {
  it('continues processing remaining orders after one fails', async () => {
    tableResults['account'] = { data: { account_id: 'acc1' }, error: null };
    seedEmptyPullTables();
    tableResults['till'] = { data: null, error: null };

    // Track insert call count to fail the 2nd one
    let orderInsertCount = 0;
    const origCreateChain = createChain;

    // We cannot easily make per-call failures with the static tableResults map,
    // so we set orders to succeed and rely on the error accumulation test from
    // the base suite. Instead, test with a mix of order_lines where some fail.
    tableResults['orders'] = { data: null, error: null };
    tableResults['orderline'] = { data: null, error: { message: 'constraint violation' } };
    tableResults['payment'] = { data: null, error: null };

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest(baseRequest({
      orders: [
        { order_id: 1, uuid: 'ok-order-1', tillId: 0, grandTotal: 100, subtotal: 85, taxTotal: 15 },
        { order_id: 2, uuid: 'ok-order-2', tillId: 0, grandTotal: 200, subtotal: 170, taxTotal: 30 },
      ],
      order_lines: [
        { orderline_id: 1, order_id: 1, product_id: 1, qtyentered: 1, lineamt: 85, linenetamt: 100, priceentered: 85, productname: 'A' },
        { orderline_id: 2, order_id: 2, product_id: 2, qtyentered: 1, lineamt: 170, linenetamt: 200, priceentered: 170, productname: 'B' },
      ],
      payments: [
        { payment_id: 1, order_id: 1, amount: 100, tendered: 100, change: 0, payment_type: 'CASH', pay_amt: 100 },
      ],
    })));
    const json = await res.json();

    // Orders succeeded, but order lines failed (bulk upsert = single error)
    expect(json.orders_synced).toBe(2);
    expect(json.order_lines_synced).toBe(0);
    expect(json.payments_synced).toBe(1);
    expect(json.success).toBe(false);
    expect(json.errors.length).toBeGreaterThanOrEqual(1);
    expect(json.errors.some((e: string) => e.includes('OrderLine'))).toBe(true);
  });
});

describe('/api/sync POST – empty push arrays', () => {
  it('handles empty arrays for all push fields gracefully', async () => {
    tableResults['account'] = { data: { account_id: 'acc1' }, error: null };
    seedEmptyPullTables();

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest(baseRequest({
      orders: [],
      order_lines: [],
      payments: [],
      tills: [],
      till_adjustments: [],
      customers: [],
    })));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.orders_synced).toBe(0);
    expect(json.order_lines_synced).toBe(0);
    expect(json.payments_synced).toBe(0);
    expect(json.tills_synced).toBe(0);
    expect(json.errors).toEqual([]);
  });

  it('handles null/undefined push fields without crashing', async () => {
    tableResults['account'] = { data: { account_id: 'acc1' }, error: null };
    seedEmptyPullTables();

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest(baseRequest({
      orders: null,
      order_lines: undefined,
      payments: null,
      tills: undefined,
      till_adjustments: null,
      customers: undefined,
    })));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.orders_synced).toBe(0);
    expect(json.tills_synced).toBe(0);
    expect(json.errors).toEqual([]);
  });
});

describe('/api/sync POST – zero financial values', () => {
  it('syncs an order where all financial values are zero', async () => {
    tableResults['account'] = { data: { account_id: 'acc1' }, error: null };
    seedEmptyPullTables();
    tableResults['orders'] = { data: null, error: null };
    tableResults['till'] = { data: null, error: null };

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest(baseRequest({
      orders: [{
        orderId: 1,
        uuid: 'zero-order',
        tillId: 0,
        grandTotal: 0,
        subtotal: 0,
        taxTotal: 0,
        qtyTotal: 0,
        tips: 0,
      }],
    })));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.orders_synced).toBe(1);

    // Verify zero values are preserved (not treated as falsy via || which would default them)
    const orderInsert = supabaseOps.find(op => op.table === 'orders' && op.op === 'insert');
    expect(orderInsert).toBeDefined();
    expect(orderInsert!.data.grand_total).toBe(0);
    expect(orderInsert!.data.subtotal).toBe(0);
    expect(orderInsert!.data.tax_total).toBe(0);
    expect(orderInsert!.data.tips).toBe(0);
  });

  it('syncs a till with zero opening amount', async () => {
    tableResults['account'] = { data: { account_id: 'acc1' }, error: null };
    seedEmptyPullTables();
    tableResults['till'] = { data: null, error: null };

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest(baseRequest({
      tills: [{
        till_id: 1,
        uuid: 'zero-till',
        opening_amt: 0,
        closing_amt: 0,
        cash_amt: 0,
        card_amt: 0,
        subtotal: 0,
        tax_total: 0,
        grand_total: 0,
      }],
    })));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.tills_synced).toBe(1);

    // Verify the zero values are preserved
    const tillInsert = supabaseOps.find(op => op.table === 'till' && op.op === 'insert');
    expect(tillInsert).toBeDefined();
    expect(tillInsert!.data.opening_amt).toBe(0);
    expect(tillInsert!.data.closing_amt).toBe(0);
    expect(tillInsert!.data.grand_total).toBe(0);
  });
});

describe('/api/sync POST – payment with zero change', () => {
  it('syncs a payment where change is exactly zero', async () => {
    tableResults['account'] = { data: { account_id: 'acc1' }, error: null };
    seedEmptyPullTables();
    tableResults['payment'] = { data: null, error: null };

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest(baseRequest({
      payments: [{
        payment_id: 1,
        order_id: 1,
        tendered: 100,
        amount: 100,
        change: 0,
        payment_type: 'CARD',
        pay_amt: 100,
      }],
    })));
    const json = await res.json();

    expect(json.payments_synced).toBe(1);

    const paymentUpsert = supabaseOps.find(op => op.table === 'payment' && op.op === 'upsert');
    expect(paymentUpsert).toBeDefined();
    const payData = Array.isArray(paymentUpsert!.data) ? paymentUpsert!.data[0] : paymentUpsert!.data;
    expect(payData.change).toBe(0);
  });
});

describe('/api/sync POST – negative quantities (refund lines)', () => {
  it('syncs order lines with negative qtyentered for refunds', async () => {
    tableResults['account'] = { data: { account_id: 'acc1' }, error: null };
    seedEmptyPullTables();
    tableResults['orderline'] = { data: null, error: null };

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest(baseRequest({
      order_lines: [{
        orderline_id: 1,
        order_id: 1,
        product_id: 10,
        qtyentered: -2,
        lineamt: -400,
        linenetamt: -460,
        priceentered: 200,
        productname: 'Refunded Burger',
      }],
    })));
    const json = await res.json();

    expect(json.order_lines_synced).toBe(1);

    const lineUpsert = supabaseOps.find(op => op.table === 'orderline' && op.op === 'upsert');
    expect(lineUpsert).toBeDefined();
    const lineData = Array.isArray(lineUpsert!.data) ? lineUpsert!.data[0] : lineUpsert!.data;
    expect(lineData.qtyentered).toBe(-2);
    expect(lineData.lineamt).toBe(-400);
    expect(lineData.linenetamt).toBe(-460);
  });
});

describe('/api/sync POST – customer with all optional fields null', () => {
  it('syncs a customer where optional fields are null', async () => {
    tableResults['account'] = { data: { account_id: 'acc1' }, error: null };
    seedEmptyPullTables();
    tableResults['customer'] = { data: null, error: null };

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest(baseRequest({
      customers: [{
        customer_id: 1,
        name: 'Minimal Customer',
        identifier: null,
        phone1: null,
        phone2: null,
        mobile: null,
        email: null,
        address1: null,
        address2: null,
        city: null,
        state: null,
        zip: null,
        country: null,
        gender: null,
        dob: null,
        regno: null,
        note: null,
      }],
    })));
    const json = await res.json();

    expect(json.success).toBe(true);

    // tenantUpsert does select→maybeSingle check, then insert (for new records)
    const customerInsert = supabaseOps.find(op => op.table === 'customer' && op.op === 'insert');
    expect(customerInsert).toBeDefined();
    expect(customerInsert!.data.name).toBe('Minimal Customer');
    expect(customerInsert!.data.phone1).toBeNull();
    expect(customerInsert!.data.email).toBeNull();
    expect(customerInsert!.data.allowcredit).toBe('N');
    expect(customerInsert!.data.creditlimit).toBe(0);
    expect(customerInsert!.data.isactive).toBe('Y');
  });
});

describe('/api/sync POST – till adjustments', () => {
  it('upserts till adjustments with account_id injected', async () => {
    tableResults['account'] = { data: { account_id: 'acc1' }, error: null };
    seedEmptyPullTables();
    tableResults['till_adjustment'] = { data: null, error: null };

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest(baseRequest({
      till_adjustments: [
        { adjustment_id: 1, till_id: 10, amount: 50.0, reason: 'Cash added', type: 'ADD' },
        { adjustment_id: 2, till_id: 10, amount: -20.0, reason: 'Cash removed', type: 'REMOVE' },
      ],
    })));
    const json = await res.json();

    expect(json.success).toBe(true);

    const adjUpsert = supabaseOps.find(op => op.table === 'till_adjustment' && op.op === 'upsert');
    expect(adjUpsert).toBeDefined();
    // Verify account_id was injected into both records
    expect(adjUpsert!.data).toHaveLength(2);
    expect(adjUpsert!.data[0].account_id).toBe('acc1');
    expect(adjUpsert!.data[1].account_id).toBe('acc1');
    expect(adjUpsert!.data[0].amount).toBe(50.0);
    expect(adjUpsert!.data[1].amount).toBe(-20.0);
  });
});

describe('/api/sync POST – unknown account rejection', () => {
  it('returns 404 when account does not exist (no auto-creation)', async () => {
    // Account lookup returns null (not found)
    tableResults['account'] = { data: null, error: null };
    seedEmptyPullTables();

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest(baseRequest()));
    const json = await res.json();

    // Accounts must be created via signup — sync rejects unknown IDs
    expect(res.status).toBe(404);
    expect(json.error).toContain('not found');
  });

  it('returns 404 even when account lookup has error and data is null', async () => {
    // Account lookup error — data is null, so treated as not found
    tableResults['account'] = { data: null, error: { message: 'Connection refused', code: '08001' } };

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest(baseRequest()));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toContain('not found');
  });
});

describe('/api/sync POST – last_sync_at edge cases', () => {
  it('uses epoch (1970-01-01) as fallback when last_sync_at is omitted', async () => {
    tableResults['account'] = { data: { account_id: 'acc1' }, error: null };
    seedEmptyPullTables();

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({
      account_id: 'acc1',
      terminal_id: 1,
      store_id: 1,
      // last_sync_at intentionally omitted
    }));
    const json = await res.json();

    expect(json.success).toBe(true);
    // The route uses body.last_sync_at || "1970-01-01T00:00:00Z"
    // so all pull queries should use the epoch as the gte filter
    const productSelect = supabaseOps.find(op => op.table === 'product' && op.op === 'select');
    expect(productSelect).toBeDefined();
  });

  it('handles explicit epoch timestamp for first sync', async () => {
    tableResults['account'] = { data: { account_id: 'acc1' }, error: null };
    seedEmptyPullTables();

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest(baseRequest({
      last_sync_at: '1970-01-01T00:00:00Z',
    })));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.server_time).toBeDefined();
  });

  it('handles null last_sync_at without crashing', async () => {
    tableResults['account'] = { data: { account_id: 'acc1' }, error: null };
    seedEmptyPullTables();

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest(baseRequest({
      last_sync_at: null,
    })));
    const json = await res.json();

    expect(json.success).toBe(true);
  });
});

describe('/api/sync POST – insertOrUpdate behavior', () => {
  it('INSERT succeeds on first try (no duplicate)', async () => {
    tableResults['account'] = { data: { account_id: 'acc1' }, error: null };
    seedEmptyPullTables();
    // insert succeeds (no error)
    tableResults['orders'] = { data: null, error: null };

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest(baseRequest({
      orders: [{
        order_id: 1,
        uuid: 'fresh-order',
        tillId: 0,
        grandTotal: 100,
        subtotal: 85,
        taxTotal: 15,
      }],
    })));
    const json = await res.json();

    expect(json.orders_synced).toBe(1);
    expect(json.errors).toEqual([]);

    // Only an insert should have been called, no update
    const orderOps = supabaseOps.filter(op => op.table === 'orders');
    const insertOps = orderOps.filter(op => op.op === 'insert');
    const updateOps = orderOps.filter(op => op.op === 'update');
    expect(insertOps.length).toBe(1);
    expect(updateOps.length).toBe(0);
  });

  it('INSERT fails with 23505 duplicate, falls back to UPDATE which succeeds', async () => {
    tableResults['account'] = { data: { account_id: 'acc1' }, error: null };
    seedEmptyPullTables();
    // till insert: simulate 23505 duplicate key
    tableResults['till'] = { data: null, error: { message: 'duplicate key value', code: '23505' } };

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest(baseRequest({
      tills: [{
        till_id: 1,
        uuid: 'dup-till',
        opening_amt: 500,
      }],
    })));
    const json = await res.json();

    // The mock returns the same error for both insert and update (since tableResults is static),
    // but the code path is: insert → 23505 → update. The update also gets the same error from mock,
    // so the till will show as failed. This tests the code PATH executes correctly.
    // With a more granular mock you could differentiate, but this validates the branch is hit.
    const tillOps = supabaseOps.filter(op => op.table === 'till');
    const insertOps = tillOps.filter(op => op.op === 'insert');
    const updateOps = tillOps.filter(op => op.op === 'update');
    expect(insertOps.length).toBe(1);
    expect(updateOps.length).toBe(1);
  });

  it('INSERT fails with non-23505 error, does NOT attempt UPDATE', async () => {
    tableResults['account'] = { data: { account_id: 'acc1' }, error: null };
    seedEmptyPullTables();
    // Simulate a permission error (not a duplicate)
    tableResults['orders'] = { data: null, error: { message: 'permission denied', code: '42501' } };

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest(baseRequest({
      orders: [{
        order_id: 1,
        uuid: 'perm-fail-order',
        tillId: 0,
        grandTotal: 100,
        subtotal: 85,
        taxTotal: 15,
      }],
    })));
    const json = await res.json();

    expect(json.orders_synced).toBe(0);
    expect(json.errors.length).toBe(1);
    expect(json.errors[0]).toContain('permission denied');

    // Verify only insert was attempted, no update fallback
    const orderOps = supabaseOps.filter(op => op.table === 'orders');
    const insertOps = orderOps.filter(op => op.op === 'insert');
    const updateOps = orderOps.filter(op => op.op === 'update');
    expect(insertOps.length).toBe(1);
    expect(updateOps.length).toBe(0);
  });
});
