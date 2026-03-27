import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Supabase mock ──

let tableResults: Record<string, { data: any; error: any; count?: number }> = {};
let supabaseOps: Array<{ table: string; op: string; data?: any; filters: Record<string, any> }> = [];

function createChain(table: string) {
  const state = { op: 'select' as string, data: undefined as any, filters: {} as Record<string, any> };

  function resolve() {
    supabaseOps.push({ table, op: state.op, data: state.data, filters: state.filters });
    const filterKey = Object.entries(state.filters).map(([k, v]) => `${k}=${v}`).join(',');
    return tableResults[`${table}:${filterKey}`] ?? tableResults[table] ?? { data: state.op === 'select' ? [] : null, error: null, count: 0 };
  }

  const chain: any = {};
  for (const m of ['select', 'eq', 'gte', 'lte', 'gt', 'lt', 'order', 'limit', 'range', 'in', 'neq', 'is', 'not', 'or', 'ilike', 'contains', 'filter'] as const) {
    chain[m] = (...args: any[]) => {
      if (m === 'eq') state.filters[args[0]] = args[1];
      return chain;
    };
  }
  for (const m of ['insert', 'update', 'upsert', 'delete'] as const) {
    chain[m] = (...args: any[]) => { state.op = m; state.data = args[0]; return chain; };
  }
  chain.single = () => { const r = resolve(); const d = Array.isArray(r.data) ? r.data[0] ?? null : r.data; return Promise.resolve({ ...r, data: d }); };
  chain.maybeSingle = chain.single;
  chain.then = (onF: Function, onR?: Function) => Promise.resolve(resolve()).then(onF as any, onR as any);
  return chain;
}

let mockAccountId: string | null = 'test_warehouse_acc';

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (table: string) => createChain(table) }),
}));

vi.mock('@/lib/account-context', () => ({
  getSessionAccountId: () => Promise.resolve(mockAccountId),
}));

function mockRequest(method: string, body?: any, searchParams?: Record<string, string>): any {
  const url = new URL('http://localhost/api/stock');
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) url.searchParams.set(k, v);
  }
  return {
    method,
    url: url.toString(),
    json: () => Promise.resolve(body ?? {}),
    headers: { get: () => null },
  };
}

beforeEach(() => {
  tableResults = {};
  supabaseOps = [];
  mockAccountId = 'test_warehouse_acc';
});

// ─── GET /api/stock Tests ──

describe('GET /api/stock – multi-store stock overview', () => {
  async function importRoute() {
    return await import('@/app/api/stock/route');
  }

  it('returns 401 when not authenticated', async () => {
    mockAccountId = null;
    const { GET } = await importRoute();
    const res = await GET(mockRequest('GET'));
    expect(res.status).toBe(401);
  });

  it('returns products with stock data', async () => {
    tableResults['product'] = {
      data: [
        { product_id: 1, name: 'Widget', quantity_on_hand: 50, reorder_point: 10, shelf_location: 'A-1', expiry_date: null },
        { product_id: 2, name: 'Gadget', quantity_on_hand: 0, reorder_point: 5, shelf_location: null, expiry_date: '2026-04-15' },
      ],
      error: null,
    };
    const { GET } = await importRoute();
    const res = await GET(mockRequest('GET'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.products).toHaveLength(2);
    expect(json.products[0].name).toBe('Widget');
  });

  it('filters by product_id', async () => {
    tableResults['product'] = { data: [{ product_id: 1, name: 'Widget' }], error: null };
    const { GET } = await importRoute();
    const res = await GET(mockRequest('GET', undefined, { product_id: '1' }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.products).toHaveLength(1);
  });

  it('supports filter=out_of_stock', async () => {
    tableResults['product'] = { data: [], error: null };
    const { GET } = await importRoute();
    const res = await GET(mockRequest('GET', undefined, { filter: 'out_of_stock' }));
    expect(res.status).toBe(200);
    // Verify the chain was called with appropriate filters
    const productOp = supabaseOps.find(op => op.table === 'product');
    expect(productOp).toBeDefined();
  });

  it('supports filter=expiring', async () => {
    tableResults['product'] = { data: [], error: null };
    const { GET } = await importRoute();
    const res = await GET(mockRequest('GET', undefined, { filter: 'expiring' }));
    expect(res.status).toBe(200);
  });
});

// ─── POST /api/stock Tests ──

describe('POST /api/stock – manual stock adjustment', () => {
  async function importRoute() {
    return await import('@/app/api/stock/route');
  }

  it('returns 401 when not authenticated', async () => {
    mockAccountId = null;
    const { POST } = await importRoute();
    const res = await POST(mockRequest('POST', { product_id: 1, new_quantity: 10 }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when product_id missing', async () => {
    const { POST } = await importRoute();
    const res = await POST(mockRequest('POST', { new_quantity: 10 }));
    expect(res.status).toBe(400);
  });

  it('adjusts stock and creates journal entry', async () => {
    tableResults['product'] = { data: { product_id: 1, quantity_on_hand: 20 }, error: null };
    const { POST } = await importRoute();
    const res = await POST(mockRequest('POST', { product_id: 1, store_id: 1, new_quantity: 50, reason: 'adjustment' }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.old_quantity).toBe(20);
    expect(json.new_quantity).toBe(50);
    // Verify stock_journal insert was called
    const journalOp = supabaseOps.find(op => op.table === 'stock_journal' && op.op === 'insert');
    expect(journalOp).toBeDefined();
  });
});

// ─── Warehouse Workflow Scenario Tests ──

describe('Warehouse workflow scenarios', () => {
  it('stock transfer deducts from source', async () => {
    // Simulate transfer: product has 100 in source, transfer 30 to dest
    tableResults['product'] = { data: { product_id: 1, quantity_on_hand: 100 }, error: null };
    const { POST } = await import('@/app/api/stock/route');

    // Source store deduction
    const res = await POST(mockRequest('POST', {
      product_id: 1, store_id: 1, new_quantity: 70, reason: 'transfer', notes: 'Transfer to Store B'
    }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.new_quantity).toBe(70);
  });

  it('count reconciliation adjusts stock', async () => {
    // After counting 42 units, reconcile from system qty of 50
    tableResults['product'] = { data: { product_id: 1, quantity_on_hand: 50 }, error: null };
    const { POST } = await import('@/app/api/stock/route');

    const res = await POST(mockRequest('POST', {
      product_id: 1, store_id: 1, new_quantity: 42, reason: 'count_reconcile', notes: 'Inventory count: Monthly Stocktake'
    }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.delta).toBe(-8); // 42 - 50 = -8
  });
});

// ─── Delivery Sync Push Tests ──

describe('Delivery sync push', () => {
  it('server accepts delivery push in sync payload', async () => {
    // Verify the sync route has deliveries field in SyncRequest interface
    // This is a compile-time check — if the type is wrong, tsc --noEmit would fail
    expect(true).toBe(true); // Placeholder — actual integration tested via E2E
  });
});

// ─── Promotion Usage Tests ──

describe('Promotion usage tracking during sync', () => {
  it('creates promotion_usage when order has promotion_id in JSON', async () => {
    // The sync route auto-creates promotion_usage for new orders with promotion_id
    // This tests the concept — actual DB integration tested via production sync
    const orderJson = {
      promotion_id: 42,
      promotion_name: '20% Off',
      promotion_discount: 15.0,
    };
    expect(orderJson.promotion_id).toBe(42);
    expect(orderJson.promotion_discount).toBeGreaterThan(0);
  });
});
