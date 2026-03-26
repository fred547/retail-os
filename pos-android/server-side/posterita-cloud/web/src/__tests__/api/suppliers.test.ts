import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  for (const m of ['select', 'eq', 'gte', 'lte', 'gt', 'order', 'limit', 'range', 'in', 'neq', 'is', 'not', 'or', 'ilike', 'head'] as const) {
    chain[m] = (...args: any[]) => { if (m === 'eq') state.filters[args[0]] = args[1]; return chain; };
  }
  for (const m of ['insert', 'update', 'upsert', 'delete'] as const) {
    chain[m] = (...args: any[]) => { state.op = m; state.data = args[0]; return chain; };
  }
  chain.single = () => { const r = resolve(); return Promise.resolve({ ...r, data: Array.isArray(r.data) ? r.data[0] ?? null : r.data }); };
  chain.maybeSingle = chain.single;
  chain.then = (onF: Function, onR?: Function) => Promise.resolve(resolve()).then(onF as any, onR as any);
  return chain;
}

let mockAccountId: string | null = 'test_supplier_acc';

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (table: string) => createChain(table) }),
}));

vi.mock('@/lib/account-context', () => ({
  getSessionAccountId: () => Promise.resolve(mockAccountId),
}));

beforeEach(() => {
  tableResults = {};
  supabaseOps = [];
  mockAccountId = 'test_supplier_acc';
});

describe('GET /api/suppliers', () => {
  it('returns 401 when not authenticated', async () => {
    mockAccountId = null;
    const { GET } = await import('@/app/api/suppliers/route');
    const req = new Request('http://localhost/api/suppliers');
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });

  it('returns supplier list', async () => {
    tableResults['supplier'] = {
      data: [
        { supplier_id: 1, name: 'Acme Corp', phone: '+230555', is_active: true },
        { supplier_id: 2, name: 'Beta Ltd', phone: '+230666', is_active: true },
      ],
      error: null,
      count: 2,
    };
    const { GET } = await import('@/app/api/suppliers/route');
    const req = new Request('http://localhost/api/suppliers');
    const res = await GET(req as any);
    const body = await res.json();
    expect(body.suppliers).toHaveLength(2);
    expect(body.total).toBe(2);
  });
});

describe('POST /api/suppliers', () => {
  it('returns 400 without name', async () => {
    const { POST } = await import('@/app/api/suppliers/route');
    const req = new Request('http://localhost/api/suppliers', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('creates supplier', async () => {
    tableResults['supplier'] = {
      data: { supplier_id: 1, name: 'New Supplier', account_id: 'test_supplier_acc' },
      error: null,
    };
    const { POST } = await import('@/app/api/suppliers/route');
    const req = new Request('http://localhost/api/suppliers', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Supplier', phone: '+230111' }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.supplier.name).toBe('New Supplier');
  });
});

describe('POST /api/purchase-orders', () => {
  it('returns 401 when not authenticated', async () => {
    mockAccountId = null;
    const { POST } = await import('@/app/api/purchase-orders/route');
    const req = new Request('http://localhost/api/purchase-orders', {
      method: 'POST',
      body: JSON.stringify({ supplier_id: 1, lines: [{ product_id: 1, quantity_ordered: 10, unit_cost: 5 }] }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it('returns 400 without supplier_id', async () => {
    const { POST } = await import('@/app/api/purchase-orders/route');
    const req = new Request('http://localhost/api/purchase-orders', {
      method: 'POST',
      body: JSON.stringify({ lines: [] }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('creates PO with lines', async () => {
    tableResults['purchase_order'] = {
      data: { po_id: 1, po_number: 'PO-00001', status: 'draft', grand_total: 50 },
      error: null,
      count: 0,
    };
    const { POST } = await import('@/app/api/purchase-orders/route');
    const req = new Request('http://localhost/api/purchase-orders', {
      method: 'POST',
      body: JSON.stringify({
        supplier_id: 1,
        lines: [{ product_id: 10, product_name: 'Widget A', quantity_ordered: 10, unit_cost: 5 }],
      }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.po_number).toBe('PO-00001');
  });
});

describe('GET /api/purchase-orders', () => {
  it('returns PO list with supplier names', async () => {
    tableResults['purchase_order'] = {
      data: [{ po_id: 1, po_number: 'PO-00001', supplier_id: 1, status: 'draft', grand_total: 50, order_date: '2026-03-27' }],
      error: null,
      count: 1,
    };
    tableResults['supplier'] = {
      data: [{ supplier_id: 1, name: 'Acme Corp' }],
      error: null,
    };
    const { GET } = await import('@/app/api/purchase-orders/route');
    const req = new Request('http://localhost/api/purchase-orders');
    const res = await GET(req as any);
    const body = await res.json();
    expect(body.orders).toHaveLength(1);
    expect(body.orders[0].supplier_name).toBe('Acme Corp');
  });
});
