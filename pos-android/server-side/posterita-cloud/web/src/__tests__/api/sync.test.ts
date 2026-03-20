import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Supabase mock infrastructure ───────────────────────────────────
// The sync route creates a module-level Supabase client via createClient.
// We intercept that with vi.mock so every `supabase.from(table)...` call
// flows through our controllable chain builder.

/**
 * Per-table result map.  Keys follow two patterns:
 *   "table"                → default result for any query on that table
 *   "table:col=val"        → result when .eq(col, val) is in the chain
 *
 * Values are { data, error } objects.
 */
let tableResults: Record<string, { data: any; error: any }> = {};

/** Every operation that hits the mock is recorded here for assertions. */
let supabaseOps: Array<{
  table: string;
  op: string;
  data?: any;
  filters: Record<string, any>;
}> = [];

/**
 * Build a fully-chainable mock that records what was called and resolves
 * to the configured result for the table (+ optional filter key).
 */
function createChain(table: string) {
  const state = {
    op: 'select' as string,
    data: undefined as any,
    filters: {} as Record<string, any>,
    upsertOpts: undefined as any,
  };

  function resolve() {
    supabaseOps.push({ table, op: state.op, data: state.data, filters: state.filters });
    // Build possible lookup keys from most-specific to least
    const filterKey = Object.entries(state.filters)
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    const result =
      tableResults[`${table}:${filterKey}`] ??
      tableResults[table] ??
      { data: (state.op === 'select' ? [] : null), error: null };
    return result;
  }

  const chain: any = {};
  const passthrough = ['select', 'eq', 'gte', 'order', 'limit'] as const;
  for (const m of passthrough) {
    chain[m] = (...args: any[]) => {
      if (m === 'select') state.op = 'select';
      if (m === 'eq') state.filters[args[0]] = args[1];
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
  chain.single = () => Promise.resolve(resolve());
  // Make the chain thenable so `const { data } = await supabase.from(...).select(...)...` works
  chain.then = (onFulfilled: Function, onRejected?: Function) =>
    Promise.resolve(resolve()).then(onFulfilled as any, onRejected as any);

  return chain;
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => createChain(table),
  }),
}));

// ─── Helpers ────────────────────────────────────────────────────────

function mockRequest(body: any): any {
  return { json: () => Promise.resolve(body) };
}

/** Set env vars and reset state before every test. */
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

/** Seed the pull tables with empty arrays so the route doesn't crash. */
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

// ─── Tests ──────────────────────────────────────────────────────────

describe('/api/sync POST – validation', () => {
  it('returns 400 when account_id is missing', async () => {
    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({ terminal_id: 1 }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toContain('account_id');
  });

  it('returns 400 when terminal_id is missing', async () => {
    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({ account_id: 'abc' }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toContain('terminal_id');
  });

  it('auto-creates account when account does not exist', async () => {
    tableResults['account'] = { data: null, error: null };
    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({ account_id: 'no-such', terminal_id: 1 }));
    expect(res.status).toBe(200);
    // The account is auto-created so sync proceeds normally
  });
});

describe('/api/sync POST – pull (cloud → terminal)', () => {
  it('returns empty pull data when nothing changed since last sync', async () => {
    tableResults['account'] = { data: { account_id: 'acc1' }, error: null };
    seedEmptyPullTables();

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({
      account_id: 'acc1',
      terminal_id: 1,
      store_id: 1,
      last_sync_at: '2024-01-01T00:00:00Z',
    }));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.server_time).toBeDefined();
    expect(json.products).toEqual([]);
    expect(json.product_categories).toEqual([]);
    expect(json.taxes).toEqual([]);
    expect(json.modifiers).toEqual([]);
    expect(json.customers).toEqual([]);
    expect(json.preferences).toEqual([]);
    expect(json.users).toEqual([]);
    expect(json.discount_codes).toEqual([]);
    expect(json.restaurant_tables).toEqual([]);
    expect(json.stores).toEqual([]);
    expect(json.terminals).toEqual([]);
    expect(json.orders_synced).toBe(0);
    expect(json.tills_synced).toBe(0);
    expect(json.errors).toEqual([]);
  });

  it('returns products when pull table has data', async () => {
    const mockProducts = [
      { product_id: 1, name: 'Burger', sellingprice: 150 },
      { product_id: 2, name: 'Fries', sellingprice: 60 },
    ];
    tableResults['account'] = { data: { account_id: 'acc1' }, error: null };
    seedEmptyPullTables();
    tableResults['product'] = { data: mockProducts, error: null };

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({
      account_id: 'acc1',
      terminal_id: 1,
      store_id: 1,
      last_sync_at: '2024-01-01T00:00:00Z',
    }));
    const json = await res.json();

    expect(json.products).toEqual(mockProducts);
    expect(json.products).toHaveLength(2);
  });
});

describe('/api/sync POST – push orders', () => {
  it('processes an order push with camelCase field names', async () => {
    tableResults['account'] = { data: { account_id: 'acc1' }, error: null };
    seedEmptyPullTables();
    // insertOrUpdate: insert succeeds (no error)
    tableResults['orders'] = { data: null, error: null };
    // till existence check returns null (no till)
    tableResults['till'] = { data: null, error: null };

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({
      account_id: 'acc1',
      terminal_id: 1,
      store_id: 1,
      last_sync_at: '2024-01-01T00:00:00Z',
      orders: [{
        orderId: 1,
        customerId: 5,
        salesRepId: 2,
        tillId: 100,
        terminalId: 1,
        storeId: 1,
        orderType: 'dine_in',
        documentNo: 'POS-001',
        docStatus: 'CO',
        isPaid: true,
        taxTotal: 30.0,
        grandTotal: 230.0,
        qtyTotal: 3.0,
        subtotal: 200.0,
        dateOrdered: '2024-01-15T10:30:00Z',
        uuid: 'order-uuid-1',
        currency: 'MUR',
        tips: 10.0,
        note: 'Test order',
      }],
    }));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.orders_synced).toBe(1);
  });

  it('processes an order push with snake_case field names', async () => {
    tableResults['account'] = { data: { account_id: 'acc1' }, error: null };
    seedEmptyPullTables();
    tableResults['orders'] = { data: null, error: null };
    tableResults['till'] = { data: null, error: null };

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({
      account_id: 'acc1',
      terminal_id: 1,
      store_id: 1,
      last_sync_at: '2024-01-01T00:00:00Z',
      orders: [{
        order_id: 1,
        customer_id: 5,
        sales_rep_id: 2,
        till_id: 0,
        terminal_id: 1,
        store_id: 1,
        order_type: 'takeaway',
        document_no: 'POS-002',
        doc_status: 'CO',
        is_paid: true,
        tax_total: 15.0,
        grand_total: 115.0,
        qty_total: 1.0,
        subtotal: 100.0,
        date_ordered: '2024-01-16T12:00:00Z',
        uuid: 'order-uuid-2',
        currency: 'MUR',
        tips: 0,
        note: null,
      }],
    }));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.orders_synced).toBe(1);
  });
});

describe('/api/sync POST – push tills', () => {
  it('syncs a till with snake_case fields', async () => {
    tableResults['account'] = { data: { account_id: 'acc1' }, error: null };
    seedEmptyPullTables();
    tableResults['till'] = { data: null, error: null };

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({
      account_id: 'acc1',
      terminal_id: 1,
      store_id: 1,
      last_sync_at: '2024-01-01T00:00:00Z',
      tills: [{
        till_id: 100,
        store_id: 1,
        terminal_id: 1,
        open_by: 1,
        close_by: 1,
        opening_amt: 500.0,
        closing_amt: 1250.0,
        date_opened: '2024-01-15T08:00:00Z',
        date_closed: '2024-01-15T18:00:00Z',
        uuid: 'till-uuid-1',
        documentno: 'TILL-001',
        cash_amt: 750.0,
        card_amt: 500.0,
        subtotal: 1200.0,
        tax_total: 50.0,
        grand_total: 1250.0,
      }],
    }));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.tills_synced).toBe(1);
  });

  it('accumulates errors without aborting the batch', async () => {
    tableResults['account'] = { data: { account_id: 'acc1' }, error: null };
    seedEmptyPullTables();
    // Make till insert fail
    tableResults['till'] = { data: null, error: { message: 'Insert failed', code: '42000' } };

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({
      account_id: 'acc1',
      terminal_id: 1,
      store_id: 1,
      last_sync_at: '2024-01-01T00:00:00Z',
      tills: [
        { till_id: 1, uuid: 'till-1', opening_amt: 100 },
        { till_id: 2, uuid: 'till-2', opening_amt: 200 },
      ],
    }));
    const json = await res.json();

    expect(json.success).toBe(false);
    expect(json.errors.length).toBeGreaterThan(0);
    expect(json.tills_synced).toBe(0);
  });
});

describe('/api/sync POST – push order lines', () => {
  it('upserts order lines', async () => {
    tableResults['account'] = { data: { account_id: 'acc1' }, error: null };
    seedEmptyPullTables();
    tableResults['orderline'] = { data: null, error: null };

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({
      account_id: 'acc1',
      terminal_id: 1,
      store_id: 1,
      last_sync_at: '2024-01-01T00:00:00Z',
      order_lines: [{
        orderline_id: 1,
        order_id: 1,
        product_id: 101,
        productcategory_id: 10,
        tax_id: 1,
        qtyentered: 2.0,
        lineamt: 400.0,
        linenetamt: 460.0,
        priceentered: 200.0,
        costamt: 160.0,
        productname: 'Burger',
      }],
    }));
    const json = await res.json();

    expect(json.order_lines_synced).toBe(1);
  });

  it('records error when order line upsert fails', async () => {
    tableResults['account'] = { data: { account_id: 'acc1' }, error: null };
    seedEmptyPullTables();
    tableResults['orderline'] = { data: null, error: { message: 'FK violation' } };

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({
      account_id: 'acc1',
      terminal_id: 1,
      store_id: 1,
      last_sync_at: '2024-01-01T00:00:00Z',
      order_lines: [{
        orderline_id: 99,
        order_id: 999,
        product_id: 1,
        qtyentered: 1,
        lineamt: 100,
        linenetamt: 115,
        priceentered: 100,
        productname: 'Ghost',
      }],
    }));
    const json = await res.json();

    expect(json.order_lines_synced).toBe(0);
    expect(json.errors.length).toBe(1);
    expect(json.errors[0]).toContain('OrderLine');
  });
});

describe('/api/sync POST – push payments', () => {
  it('upserts a payment', async () => {
    tableResults['account'] = { data: { account_id: 'acc1' }, error: null };
    seedEmptyPullTables();
    tableResults['payment'] = { data: null, error: null };

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({
      account_id: 'acc1',
      terminal_id: 1,
      store_id: 1,
      last_sync_at: '2024-01-01T00:00:00Z',
      payments: [{
        payment_id: 1,
        order_id: 1,
        tendered: 300.0,
        amount: 230.0,
        change: 70.0,
        payment_type: 'CASH',
        pay_amt: 230.0,
      }],
    }));
    const json = await res.json();

    expect(json.payments_synced).toBe(1);
  });
});

describe('/api/sync POST – push customers', () => {
  it('upserts a customer', async () => {
    tableResults['account'] = { data: { account_id: 'acc1' }, error: null };
    seedEmptyPullTables();

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({
      account_id: 'acc1',
      terminal_id: 1,
      store_id: 1,
      last_sync_at: '2024-01-01T00:00:00Z',
      customers: [{
        customer_id: 1,
        name: 'John Doe',
        phone1: '+23012345678',
        email: 'john@example.com',
        allowcredit: 'Y',
        creditlimit: 5000,
        isactive: 'Y',
      }],
    }));
    const json = await res.json();

    expect(json.success).toBe(true);
  });
});

describe('/api/sync POST – combined push + pull', () => {
  it('handles a full sync with orders, tills, order lines, payments, and pull data', async () => {
    tableResults['account'] = { data: { account_id: 'acc1' }, error: null };
    // Pull tables with some data
    tableResults['product'] = { data: [{ product_id: 1, name: 'New Product' }], error: null };
    tableResults['productcategory'] = { data: [], error: null };
    tableResults['tax'] = { data: [{ tax_id: 1, name: 'VAT', rate: 15 }], error: null };
    tableResults['modifier'] = { data: [], error: null };
    tableResults['customer'] = { data: [], error: null };
    tableResults['preference'] = { data: [], error: null };
    tableResults['pos_user'] = { data: [], error: null };
    tableResults['discountcode'] = { data: [], error: null };
    tableResults['restaurant_table'] = { data: [], error: null };
    tableResults['store'] = { data: [], error: null };
    tableResults['terminal'] = { data: [], error: null };
    // Push tables succeed
    tableResults['till'] = { data: null, error: null };
    tableResults['orders'] = { data: null, error: null };
    tableResults['orderline'] = { data: null, error: null };
    tableResults['payment'] = { data: null, error: null };

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({
      account_id: 'acc1',
      terminal_id: 1,
      store_id: 1,
      last_sync_at: '2024-01-01T00:00:00Z',
      tills: [{ till_id: 1, uuid: 'till-1', opening_amt: 500 }],
      orders: [{ orderId: 1, uuid: 'ord-1', tillId: 0, grandTotal: 100, subtotal: 85, taxTotal: 15 }],
      order_lines: [{ orderline_id: 1, order_id: 1, product_id: 1, qtyentered: 1, lineamt: 85, linenetamt: 100, priceentered: 85, productname: 'New Product' }],
      payments: [{ payment_id: 1, order_id: 1, amount: 100, tendered: 100, change: 0, payment_type: 'CASH', pay_amt: 100 }],
    }));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.tills_synced).toBe(1);
    expect(json.orders_synced).toBe(1);
    expect(json.order_lines_synced).toBe(1);
    expect(json.payments_synced).toBe(1);
    // Pull data present
    expect(json.products).toHaveLength(1);
    expect(json.taxes).toHaveLength(1);
  });
});

describe('/api/sync GET (health check)', () => {
  it('returns ok status with service name and timestamp', async () => {
    const { GET } = await importSyncRoute();
    const res = await GET();
    const json = await res.json();

    expect(json.status).toBe('ok');
    expect(json.service).toBe('posterita-cloud-sync');
    expect(json.timestamp).toBeDefined();
    // timestamp should be a valid ISO string
    expect(new Date(json.timestamp).toISOString()).toBe(json.timestamp);
  });
});
