import { describe, it, expect, vi, beforeEach } from 'vitest';

let tableResults: Record<string, { data: any; error: any; count?: number }> = {};
let supabaseOps: Array<{ table: string; op: string; data?: any }> = [];

function createChain(table: string) {
  const state = { op: 'select' as string, data: undefined as any, filters: {} as Record<string, any> };
  function resolve() {
    supabaseOps.push({ table, op: state.op, data: state.data });
    const fk = Object.entries(state.filters).map(([k, v]) => `${k}=${v}`).join(',');
    return tableResults[`${table}:${fk}`] ?? tableResults[table] ?? { data: state.op === 'select' ? [] : null, error: null, count: 0 };
  }
  const chain: any = {};
  for (const m of ['select','eq','gte','lte','gt','order','limit','range','in','neq','is','not','or'] as const) {
    chain[m] = (...args: any[]) => { if (m === 'eq') state.filters[args[0]] = args[1]; return chain; };
  }
  for (const m of ['insert','update','upsert','delete'] as const) {
    chain[m] = (...args: any[]) => { state.op = m; state.data = args[0]; return chain; };
  }
  chain.single = () => { const r = resolve(); return Promise.resolve({ ...r, data: Array.isArray(r.data) ? r.data[0] ?? null : r.data }); };
  chain.maybeSingle = chain.single;
  chain.then = (onF: Function, onR?: Function) => Promise.resolve(resolve()).then(onF as any, onR as any);
  return chain;
}

let mockAccountId: string | null = 'test_delivery_acc';

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (table: string) => createChain(table) }),
}));
vi.mock('@/lib/account-context', () => ({
  getSessionAccountId: () => Promise.resolve(mockAccountId),
}));

beforeEach(() => { tableResults = {}; supabaseOps = []; mockAccountId = 'test_delivery_acc'; });

describe('GET /api/deliveries', () => {
  it('returns 401 when not authenticated', async () => {
    mockAccountId = null;
    const { GET } = await import('@/app/api/deliveries/route');
    const req = new Request('http://localhost/api/deliveries');
    expect((await GET(req as any)).status).toBe(401);
  });

  it('returns delivery list with summary', async () => {
    tableResults['delivery'] = {
      data: [
        { id: 1, status: 'pending', customer_name: 'Alice' },
        { id: 2, status: 'in_transit', customer_name: 'Bob' },
        { id: 3, status: 'delivered', customer_name: 'Carol' },
      ],
      error: null, count: 3,
    };
    const { GET } = await import('@/app/api/deliveries/route');
    const res = await GET(new Request('http://localhost/api/deliveries') as any);
    const body = await res.json();
    expect(body.deliveries).toHaveLength(3);
    expect(body.summary.pending).toBe(1);
    expect(body.summary.delivered).toBe(1);
  });
});

describe('POST /api/deliveries', () => {
  it('returns 400 without address', async () => {
    const { POST } = await import('@/app/api/deliveries/route');
    const req = new Request('http://localhost/api/deliveries', {
      method: 'POST', body: JSON.stringify({}),
    });
    expect((await POST(req as any)).status).toBe(400);
  });

  it('creates delivery', async () => {
    tableResults['delivery'] = {
      data: { id: 1, status: 'pending', delivery_address: '123 Main St' },
      error: null,
    };
    const { POST } = await import('@/app/api/deliveries/route');
    const req = new Request('http://localhost/api/deliveries', {
      method: 'POST',
      body: JSON.stringify({ delivery_address: '123 Main St', customer_name: 'Alice' }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.delivery.delivery_address).toBe('123 Main St');
  });

  it('creates delivery with driver pre-assigned', async () => {
    tableResults['delivery'] = {
      data: { id: 1, status: 'assigned', driver_id: 5 },
      error: null,
    };
    const { POST } = await import('@/app/api/deliveries/route');
    const req = new Request('http://localhost/api/deliveries', {
      method: 'POST',
      body: JSON.stringify({ delivery_address: '456 Oak Ave', driver_id: 5, driver_name: 'Dave' }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(201);
    const insertOp = supabaseOps.find(op => op.table === 'delivery' && op.op === 'insert');
    expect(insertOp?.data?.status).toBe('assigned');
  });
});

describe('PATCH /api/deliveries/[id]', () => {
  it('updates status with timestamp', async () => {
    tableResults['delivery'] = {
      data: { id: 1, status: 'delivered', actual_delivery_at: new Date().toISOString() },
      error: null,
    };
    const { PATCH } = await import('@/app/api/deliveries/[id]/route');
    const req = new Request('http://localhost/api/deliveries/1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'delivered' }),
    });
    const res = await PATCH(req as any, { params: Promise.resolve({ id: '1' }) });
    const body = await res.json();
    expect(body.delivery.status).toBe('delivered');
    const updateOp = supabaseOps.find(op => op.table === 'delivery' && op.op === 'update');
    expect(updateOp?.data?.actual_delivery_at).toBeDefined();
  });

  it('assigns driver', async () => {
    tableResults['delivery'] = {
      data: { id: 1, status: 'assigned', driver_id: 5 },
      error: null,
    };
    const { PATCH } = await import('@/app/api/deliveries/[id]/route');
    const req = new Request('http://localhost/api/deliveries/1', {
      method: 'PATCH',
      body: JSON.stringify({ driver_id: 5, driver_name: 'Dave' }),
    });
    const res = await PATCH(req as any, { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(200);
  });
});
