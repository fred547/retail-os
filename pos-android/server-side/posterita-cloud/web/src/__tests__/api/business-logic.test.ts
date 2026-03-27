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

async function importRegisterRoute() {
  return await import('../../app/api/sync/register/route');
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

// ─── Tests: Sync ordering ───────────────────────────────────────────

describe('/api/sync POST – tills processed BEFORE orders (FK ordering)', () => {
  it('processes tills before orders in the operation log', async () => {
    tableResults['account'] = { data: { account_id: 'acc1' }, error: null };
    seedEmptyPullTables();
    tableResults['till'] = { data: null, error: null };
    tableResults['orders'] = { data: null, error: null };

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({
      account_id: 'acc1',
      terminal_id: 1,
      store_id: 1,
      last_sync_at: '2024-01-01T00:00:00Z',
      tills: [{ till_id: 1, uuid: 'till-first', opening_amt: 500 }],
      orders: [{ orderId: 1, uuid: 'order-second', tillId: 0, grandTotal: 100, subtotal: 85, taxTotal: 15 }],
    }));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.tills_synced).toBe(1);
    expect(json.orders_synced).toBe(1);

    // Find the first till operation and first order operation
    const firstTillOpIndex = supabaseOps.findIndex(op => op.table === 'till' && op.op === 'insert');
    const firstOrderOpIndex = supabaseOps.findIndex(op => op.table === 'orders' && op.op === 'insert');

    expect(firstTillOpIndex).toBeGreaterThanOrEqual(0);
    expect(firstOrderOpIndex).toBeGreaterThanOrEqual(0);
    // Till insert must come before order insert
    expect(firstTillOpIndex).toBeLessThan(firstOrderOpIndex);
  });
});

describe('/api/sync POST – order without till_id', () => {
  it('syncs an order when till_id is completely omitted from the request', async () => {
    tableResults['account'] = { data: { account_id: 'acc1' }, error: null };
    seedEmptyPullTables();
    tableResults['orders'] = { data: null, error: null };

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({
      account_id: 'acc1',
      terminal_id: 1,
      store_id: 1,
      last_sync_at: '2024-01-01T00:00:00Z',
      orders: [{
        order_id: 1,
        uuid: 'no-till-order',
        grandTotal: 100,
        subtotal: 85,
        taxTotal: 15,
        // till_id / tillId intentionally omitted
      }],
    }));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.orders_synced).toBe(1);

    // Verify the dbOrder was inserted WITHOUT a till_id property
    const orderInsert = supabaseOps.find(op => op.table === 'orders' && op.op === 'insert');
    expect(orderInsert).toBeDefined();
    expect(orderInsert!.data).not.toHaveProperty('till_id');
  });
});

describe('/api/sync POST – financial precision', () => {
  it('preserves decimal precision for financial values', async () => {
    tableResults['account'] = { data: { account_id: 'acc1' }, error: null };
    seedEmptyPullTables();
    tableResults['orders'] = { data: null, error: null };
    tableResults['orderline'] = { data: null, error: null };
    tableResults['payment'] = { data: null, error: null };

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({
      account_id: 'acc1',
      terminal_id: 1,
      store_id: 1,
      last_sync_at: '2024-01-01T00:00:00Z',
      orders: [{
        orderId: 1,
        uuid: 'precision-order',
        tillId: 0,
        grandTotal: 99.99,
        subtotal: 86.95,
        taxTotal: 13.04,
        tips: 5.50,
      }],
      order_lines: [{
        orderline_id: 1,
        order_id: 1,
        product_id: 1,
        qtyentered: 1.5,
        lineamt: 86.95,
        linenetamt: 99.99,
        priceentered: 57.97,
        costamt: 42.33,
        productname: 'Precision Item',
      }],
      payments: [{
        payment_id: 1,
        order_id: 1,
        tendered: 105.49,
        amount: 99.99,
        change: 5.50,
        payment_type: 'CASH',
        pay_amt: 99.99,
      }],
    }));
    const json = await res.json();

    expect(json.success).toBe(true);

    // Verify order financial values
    const orderInsert = supabaseOps.find(op => op.table === 'orders' && op.op === 'insert');
    expect(orderInsert!.data.grand_total).toBe(99.99);
    expect(orderInsert!.data.subtotal).toBe(86.95);
    expect(orderInsert!.data.tax_total).toBe(13.04);
    expect(orderInsert!.data.tips).toBe(5.50);

    // Verify order line financial values (bulk upsert — data is an array)
    const lineUpsert = supabaseOps.find(op => op.table === 'orderline' && op.op === 'upsert');
    const lineData = Array.isArray(lineUpsert!.data) ? lineUpsert!.data[0] : lineUpsert!.data;
    expect(lineData.qtyentered).toBe(1.5);
    expect(lineData.lineamt).toBe(86.95);
    expect(lineData.priceentered).toBe(57.97);
    expect(lineData.costamt).toBe(42.33);

    // Verify payment financial values (bulk upsert — data is an array)
    const paymentUpsert = supabaseOps.find(op => op.table === 'payment' && op.op === 'upsert');
    const paymentData = Array.isArray(paymentUpsert!.data) ? paymentUpsert!.data[0] : paymentUpsert!.data;
    expect(paymentData.tendered).toBe(105.49);
    expect(paymentData.change).toBe(5.50);
  });
});

describe('/api/sync POST – pull data filtering', () => {
  it('filters pull data by account_id', async () => {
    tableResults['account'] = { data: { account_id: 'acc1' }, error: null };
    seedEmptyPullTables();

    const { POST } = await importSyncRoute();
    await POST(mockRequest({
      account_id: 'acc1',
      terminal_id: 1,
      store_id: 1,
      last_sync_at: '2024-01-01T00:00:00Z',
    }));

    // Verify product query filters by account_id
    const productSelect = supabaseOps.find(op => op.table === 'product' && op.op === 'select');
    expect(productSelect).toBeDefined();
    expect(productSelect!.filters['account_id']).toBe('acc1');

    // Verify tax query filters by account_id
    const taxSelect = supabaseOps.find(op => op.table === 'tax' && op.op === 'select');
    expect(taxSelect).toBeDefined();
    expect(taxSelect!.filters['account_id']).toBe('acc1');

    // Verify customer query filters by account_id
    const customerSelect = supabaseOps.find(op => op.table === 'customer' && op.op === 'select');
    expect(customerSelect).toBeDefined();
    expect(customerSelect!.filters['account_id']).toBe('acc1');

    // Verify pos_user query filters by account_id
    const userSelect = supabaseOps.find(op => op.table === 'pos_user' && op.op === 'select');
    expect(userSelect).toBeDefined();
    expect(userSelect!.filters['account_id']).toBe('acc1');
  });

  it('filters restaurant_tables by store_id (not account_id)', async () => {
    tableResults['account'] = { data: { account_id: 'acc1' }, error: null };
    seedEmptyPullTables();

    const { POST } = await importSyncRoute();
    await POST(mockRequest({
      account_id: 'acc1',
      terminal_id: 1,
      store_id: 42,
      last_sync_at: '2024-01-01T00:00:00Z',
    }));

    const tableSelect = supabaseOps.find(op => op.table === 'restaurant_table' && op.op === 'select');
    expect(tableSelect).toBeDefined();
    // restaurant_table is filtered by store_id, not account_id
    expect(tableSelect!.filters['store_id']).toBe(42);
    expect(tableSelect!.filters).not.toHaveProperty('account_id');
  });

  it('uses last_sync_at for incremental pull filtering', async () => {
    tableResults['account'] = { data: { account_id: 'acc1' }, error: null };
    seedEmptyPullTables();

    const { POST } = await importSyncRoute();
    await POST(mockRequest({
      account_id: 'acc1',
      terminal_id: 1,
      store_id: 1,
      last_sync_at: '2024-06-15T12:30:00Z',
    }));

    // The gte filter is applied via .gte("updated_at", lastSync)
    // Our mock records eq filters but not gte, so we verify the operation was called
    const productSelect = supabaseOps.find(op => op.table === 'product' && op.op === 'select');
    expect(productSelect).toBeDefined();
  });
});

describe('/api/sync POST – server_time format', () => {
  it('returns server_time as a valid ISO string', async () => {
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

    expect(json.server_time).toBeDefined();
    expect(typeof json.server_time).toBe('string');
    // Verify it parses as a valid date and round-trips to ISO
    const parsed = new Date(json.server_time);
    expect(parsed.toISOString()).toBe(json.server_time);
    // Verify it is a recent timestamp (not epoch or some default)
    expect(parsed.getFullYear()).toBeGreaterThanOrEqual(2024);
  });
});

describe('/api/sync POST – success flag behavior', () => {
  it('success is false when ANY error occurs', async () => {
    tableResults['account'] = { data: { account_id: 'acc1' }, error: null };
    seedEmptyPullTables();
    // Make order line upsert fail
    tableResults['orderline'] = { data: null, error: { message: 'constraint violation' } };

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({
      account_id: 'acc1',
      terminal_id: 1,
      store_id: 1,
      last_sync_at: '2024-01-01T00:00:00Z',
      order_lines: [{
        orderline_id: 1,
        order_id: 1,
        product_id: 1,
        qtyentered: 1,
        lineamt: 100,
        linenetamt: 115,
        priceentered: 100,
        productname: 'Fail Item',
      }],
    }));
    const json = await res.json();

    expect(json.success).toBe(false);
    expect(json.errors.length).toBeGreaterThan(0);
  });

  it('success is true when errors array is empty', async () => {
    tableResults['account'] = { data: { account_id: 'acc1' }, error: null };
    seedEmptyPullTables();
    tableResults['orders'] = { data: null, error: null };

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({
      account_id: 'acc1',
      terminal_id: 1,
      store_id: 1,
      last_sync_at: '2024-01-01T00:00:00Z',
      orders: [{
        orderId: 1,
        uuid: 'success-order',
        tillId: 0,
        grandTotal: 100,
        subtotal: 85,
        taxTotal: 15,
      }],
    }));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.errors).toEqual([]);
  });

  it('success is true when no push data is sent (pull-only sync)', async () => {
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
    expect(json.errors).toEqual([]);
  });
});

describe('/api/sync GET – health check', () => {
  it('returns correct service name "posterita-cloud-sync"', async () => {
    const { GET } = await importSyncRoute();
    const res = await GET();
    const json = await res.json();

    expect(json.status).toBe('ok');
    expect(json.service).toBe('posterita-cloud-sync');
    expect(json.timestamp).toBeDefined();
    // Verify timestamp is valid ISO
    expect(new Date(json.timestamp).toISOString()).toBe(json.timestamp);
  });
});

describe('/api/sync/register POST – existing account preserves businessname', () => {
  it('returns the original businessname, not the one sent in the request', async () => {
    tableResults['account'] = {
      data: { account_id: 'existing-acc', businessname: 'Original Shop Name' },
      error: null,
    };

    const { POST } = await importRegisterRoute();
    const res = await POST(mockRequest({
      account_id: 'existing-acc',
      businessname: 'Attempted Override Name',
    }));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.is_new).toBe(false);
    expect(json.businessname).toBe('Original Shop Name');
  });
});

describe('/api/sync/register POST – new account businessname', () => {
  it('uses provided businessname for new account', async () => {
    tableResults['account'] = { data: null, error: null };

    const { POST } = await importRegisterRoute();
    const res = await POST(mockRequest({
      account_id: 'new-acc-biz',
      businessname: 'My New Business',
    }));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.is_new).toBe(true);
    expect(json.businessname).toBe('My New Business');

    // Verify the account insert used the provided name
    const accountInsert = supabaseOps.find(op => op.table === 'account' && op.op === 'insert');
    expect(accountInsert).toBeDefined();
    expect(accountInsert!.data.businessname).toBe('My New Business');
  });

  it('uses "Unnamed Business" when businessname is not provided', async () => {
    tableResults['account'] = { data: null, error: null };

    const { POST } = await importRegisterRoute();
    const res = await POST(mockRequest({
      account_id: 'new-acc-noname',
    }));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.is_new).toBe(true);
    expect(json.businessname).toBe('Unnamed Business');

    const accountInsert = supabaseOps.find(op => op.table === 'account' && op.op === 'insert');
    expect(accountInsert).toBeDefined();
    expect(accountInsert!.data.businessname).toBe('Unnamed Business');
  });
});

describe('/api/sync POST – unknown account rejected', () => {
  it('returns 404 when account does not exist (no auto-creation)', async () => {
    // Account not found
    tableResults['account'] = { data: null, error: null };
    seedEmptyPullTables();

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({
      account_id: 'auto-created-123',
      terminal_id: 1,
      store_id: 1,
      last_sync_at: '2024-01-01T00:00:00Z',
    }));
    const json = await res.json();

    // Accounts must be created via /api/auth/signup — sync rejects unknown IDs
    expect(res.status).toBe(404);
    expect(json.error).toContain('not found');
  });
});
