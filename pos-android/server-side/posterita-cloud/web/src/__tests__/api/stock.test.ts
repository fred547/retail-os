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
  for (const m of ['select', 'eq', 'gte', 'lte', 'order', 'limit', 'range', 'in', 'neq', 'is', 'not', 'or', 'ilike', 'contains'] as const) {
    chain[m] = (...args: any[]) => {
      if (m === 'eq') state.filters[args[0]] = args[1];
      if (m === 'select' && typeof args[1] === 'object' && args[1]?.count) {
        // count query
      }
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

let mockAccountId: string | null = 'test_stock_acc';

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
    json: () => Promise.resolve(body),
    nextUrl: url,
    url: url.toString(),
    headers: { get: () => null },
  };
}

function mockJournalRequest(searchParams?: Record<string, string>): any {
  const url = new URL('http://localhost/api/stock/journal');
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) url.searchParams.set(k, v);
  }
  return {
    method: 'GET',
    json: () => Promise.resolve({}),
    nextUrl: url,
    url: url.toString(),
    headers: { get: () => null },
  };
}

// ─── Tests ──

describe('POST /api/stock — Manual stock adjustment', () => {
  beforeEach(() => {
    tableResults = {};
    supabaseOps = [];
    mockAccountId = 'test_stock_acc';
  });

  it('returns 401 when not authenticated', async () => {
    mockAccountId = null;
    const { POST } = await import('@/app/api/stock/route');
    const res = await POST(mockRequest('POST', { product_id: 1, new_quantity: 10 }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when product_id is missing', async () => {
    const { POST } = await import('@/app/api/stock/route');
    const res = await POST(mockRequest('POST', { new_quantity: 10 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when new_quantity is missing', async () => {
    const { POST } = await import('@/app/api/stock/route');
    const res = await POST(mockRequest('POST', { product_id: 1 }));
    expect(res.status).toBe(400);
  });

  it('adjusts stock and returns delta', async () => {
    tableResults['product'] = {
      data: [{ product_id: 42, quantity_on_hand: 10, track_stock: true }],
      error: null,
    };

    const { POST } = await import('@/app/api/stock/route');
    const res = await POST(mockRequest('POST', {
      product_id: 42,
      store_id: 1,
      new_quantity: 15,
      reason: 'receive',
      notes: 'Shipment arrived',
    }));

    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.old_quantity).toBe(10);
    expect(json.new_quantity).toBe(15);
    expect(json.delta).toBe(5);

    // Verify update was called on product
    const updateOp = supabaseOps.find(o => o.table === 'product' && o.op === 'update');
    expect(updateOp).toBeTruthy();
    expect(updateOp?.data?.quantity_on_hand).toBe(15);

    // Verify journal entry was created
    const journalOp = supabaseOps.find(o => o.table === 'stock_journal' && o.op === 'insert');
    expect(journalOp).toBeTruthy();
    expect(journalOp?.data?.quantity_change).toBe(5);
    expect(journalOp?.data?.quantity_after).toBe(15);
    expect(journalOp?.data?.reason).toBe('receive');
  });

  it('allows negative stock (deducting below zero)', async () => {
    tableResults['product'] = {
      data: [{ product_id: 7, quantity_on_hand: 2, track_stock: true }],
      error: null,
    };

    const { POST } = await import('@/app/api/stock/route');
    const res = await POST(mockRequest('POST', {
      product_id: 7,
      new_quantity: -3,
      reason: 'adjustment',
    }));

    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.new_quantity).toBe(-3);
    expect(json.delta).toBe(-5);
  });

  it('returns 404 when product not found', async () => {
    tableResults['product'] = { data: null, error: { message: 'not found' } };

    const { POST } = await import('@/app/api/stock/route');
    const res = await POST(mockRequest('POST', { product_id: 999, new_quantity: 5 }));
    expect(res.status).toBe(404);
  });
});

describe('GET /api/stock/journal — Stock movement history', () => {
  beforeEach(() => {
    tableResults = {};
    supabaseOps = [];
    mockAccountId = 'test_stock_acc';
  });

  it('returns 401 when not authenticated', async () => {
    mockAccountId = null;
    const { GET } = await import('@/app/api/stock/journal/route');
    const res = await GET(mockJournalRequest());
    expect(res.status).toBe(401);
  });

  it('returns journal entries with count', async () => {
    tableResults['stock_journal'] = {
      data: [
        { id: 1, product_id: 42, quantity_change: -3, quantity_after: 7, reason: 'sale' },
        { id: 2, product_id: 42, quantity_change: 10, quantity_after: 10, reason: 'receive' },
      ],
      error: null,
      count: 2,
    };

    const { GET } = await import('@/app/api/stock/journal/route');
    const res = await GET(mockJournalRequest({ product_id: '42' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(2);
  });

  it('filters by reason', async () => {
    tableResults['stock_journal'] = { data: [], error: null, count: 0 };

    const { GET } = await import('@/app/api/stock/journal/route');
    await GET(mockJournalRequest({ reason: 'sale' }));

    const op = supabaseOps.find(o => o.table === 'stock_journal');
    expect(op?.filters?.reason).toBe('sale');
  });
});
