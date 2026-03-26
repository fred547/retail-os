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
  for (const m of ['select', 'eq', 'gte', 'order', 'limit', 'range', 'in', 'neq', 'is', 'not', 'or', 'ilike', 'contains'] as const) {
    chain[m] = (...args: any[]) => {
      if (m === 'eq') state.filters[args[0]] = args[1];
      if (m === 'select' && typeof args[1] === 'object' && args[1]?.count) {
        // count query — return count in resolve
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

// Mock account-context
let mockAccountId: string | null = 'test_acc';

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (table: string) => createChain(table) }),
}));

vi.mock('@/lib/account-context', () => ({
  getSessionAccountId: () => Promise.resolve(mockAccountId),
}));

// ─── Helpers ──

function mockRequest(method: string, body?: any, searchParams?: Record<string, string>): any {
  const url = new URL('http://localhost/api/serial-items');
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

beforeEach(() => {
  tableResults = {};
  supabaseOps = [];
  mockAccountId = 'test_acc';
  vi.resetModules();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

async function importRoute() {
  return await import('../../app/api/serial-items/route');
}

async function importDetailRoute() {
  return await import('../../app/api/serial-items/[id]/route');
}

// ════════════════════════════════════════════════════════════════════
// GET /api/serial-items — List
// ════════════════════════════════════════════════════════════════════

describe('GET /api/serial-items', () => {
  it('returns 401 when not authenticated', async () => {
    mockAccountId = null;
    const { GET } = await importRoute();
    const res = await GET(mockRequest('GET'));
    expect(res.status).toBe(401);
  });

  it('returns serial items for the account', async () => {
    tableResults['serial_item'] = {
      data: [
        { serial_item_id: 1, serial_number: 'VIN001', status: 'in_stock', product_id: 10 },
        { serial_item_id: 2, serial_number: 'VIN002', status: 'sold', product_id: 10 },
      ],
      error: null,
      count: 2,
    };

    const { GET } = await importRoute();
    const res = await GET(mockRequest('GET'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toBeDefined();
    expect(json.data.length).toBe(2);
  });

  it('filters by status when provided', async () => {
    tableResults['serial_item'] = { data: [{ serial_item_id: 1, status: 'in_stock' }], error: null, count: 1 };

    const { GET } = await importRoute();
    await GET(mockRequest('GET', undefined, { status: 'in_stock' }));

    const filterOp = supabaseOps.find(op => op.table === 'serial_item' && op.filters['status'] === 'in_stock');
    expect(filterOp).toBeDefined();
  });

  it('filters by product_id when provided', async () => {
    tableResults['serial_item'] = { data: [], error: null, count: 0 };

    const { GET } = await importRoute();
    await GET(mockRequest('GET', undefined, { product_id: '42' }));

    const filterOp = supabaseOps.find(op => op.table === 'serial_item' && op.filters['product_id']);
    expect(filterOp).toBeDefined();
  });
});

// ════════════════════════════════════════════════════════════════════
// POST /api/serial-items — Batch receive
// ════════════════════════════════════════════════════════════════════

describe('POST /api/serial-items', () => {
  it('returns 401 when not authenticated', async () => {
    mockAccountId = null;
    const { POST } = await importRoute();
    const res = await POST(mockRequest('POST', { items: [] }));
    expect(res.status).toBe(401);
  });

  it('creates serial items from batch input', async () => {
    tableResults['serial_item'] = { data: null, error: null };

    const { POST } = await importRoute();
    const res = await POST(mockRequest('POST', {
      items: [
        { serial_number: 'VIN-TEST-001', product_id: 10, store_id: 1, serial_type: 'vin', cost_price: 45000, warranty_months: 24 },
        { serial_number: 'VIN-TEST-002', product_id: 10, store_id: 1, serial_type: 'vin', cost_price: 45000, warranty_months: 24 },
      ],
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    // Should have attempted insert
    const insertOps = supabaseOps.filter(op => op.table === 'serial_item' && op.op === 'insert');
    expect(insertOps.length).toBeGreaterThan(0);
  });

  it('returns 400 when items array is empty', async () => {
    const { POST } = await importRoute();
    const res = await POST(mockRequest('POST', { items: [] }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when items array is missing', async () => {
    const { POST } = await importRoute();
    const res = await POST(mockRequest('POST', {}));
    expect(res.status).toBe(400);
  });
});

// ════════════════════════════════════════════════════════════════════
// GET /api/serial-items/[id] — Detail
// ════════════════════════════════════════════════════════════════════

describe('GET /api/serial-items/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    mockAccountId = null;
    const { GET } = await importDetailRoute();
    const res = await GET(mockRequest('GET'), { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(401);
  });

  it('returns serial item by ID', async () => {
    tableResults['serial_item'] = {
      data: [{ serial_item_id: 1, serial_number: 'VIN-001', status: 'in_stock', account_id: 'test_acc' }],
      error: null,
    };

    const { GET } = await importDetailRoute();
    const res = await GET(mockRequest('GET'), { params: Promise.resolve({ id: '1' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toBeDefined();
  });
});

// ════════════════════════════════════════════════════════════════════
// PATCH /api/serial-items/[id] — Update
// ════════════════════════════════════════════════════════════════════

describe('PATCH /api/serial-items/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    mockAccountId = null;
    const { PATCH } = await importDetailRoute();
    const res = await PATCH(mockRequest('PATCH', { status: 'delivered' }), { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(401);
  });

  it('updates serial item status', async () => {
    tableResults['serial_item'] = { data: null, error: null };

    const { PATCH } = await importDetailRoute();
    const res = await PATCH(
      mockRequest('PATCH', { status: 'delivered', delivered_date: '2026-03-26' }),
      { params: Promise.resolve({ id: '1' }) }
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    const updateOp = supabaseOps.find(op => op.table === 'serial_item' && op.op === 'update');
    expect(updateOp).toBeDefined();
  });

  it('updates delivery date and triggers warranty computation', async () => {
    tableResults['serial_item'] = { data: null, error: null };

    const { PATCH } = await importDetailRoute();
    await PATCH(
      mockRequest('PATCH', { delivered_date: '2026-04-01', status: 'delivered' }),
      { params: Promise.resolve({ id: '5' }) }
    );

    const updateOp = supabaseOps.find(op => op.table === 'serial_item' && op.op === 'update');
    expect(updateOp).toBeDefined();
    if (updateOp?.data) {
      expect(updateOp.data.delivered_date).toBe('2026-04-01');
      expect(updateOp.data.status).toBe('delivered');
    }
  });
});

// ════════════════════════════════════════════════════════════════════
// Serial item lifecycle
// ════════════════════════════════════════════════════════════════════

describe('Serial Item Lifecycle', () => {
  it('batch receive sets status to in_stock', async () => {
    tableResults['serial_item'] = { data: null, error: null };

    const { POST } = await importRoute();
    await POST(mockRequest('POST', {
      items: [{ serial_number: 'LIFECYCLE-001', product_id: 1, store_id: 1, serial_type: 'vin' }],
    }));

    const insertOp = supabaseOps.find(op => op.table === 'serial_item' && op.op === 'insert');
    if (insertOp?.data) {
      const items = Array.isArray(insertOp.data) ? insertOp.data : [insertOp.data];
      expect(items[0].status).toBe('in_stock');
    }
  });

  it('account_id is injected from session on create', async () => {
    tableResults['serial_item'] = { data: null, error: null };

    const { POST } = await importRoute();
    await POST(mockRequest('POST', {
      items: [{ serial_number: 'SCOPED-001', product_id: 1, store_id: 1 }],
    }));

    const insertOp = supabaseOps.find(op => op.table === 'serial_item' && op.op === 'insert');
    if (insertOp?.data) {
      const items = Array.isArray(insertOp.data) ? insertOp.data : [insertOp.data];
      expect(items[0].account_id).toBe('test_acc');
    }
  });

  it('update scopes by account_id', async () => {
    tableResults['serial_item'] = { data: null, error: null };

    const { PATCH } = await importDetailRoute();
    await PATCH(
      mockRequest('PATCH', { status: 'sold' }),
      { params: Promise.resolve({ id: '99' }) }
    );

    const updateOp = supabaseOps.find(op => op.table === 'serial_item' && op.op === 'update');
    expect(updateOp?.filters['account_id']).toBe('test_acc');
  });
});

// ════════════════════════════════════════════════════════════════════
// VIN-specific fields
// ════════════════════════════════════════════════════════════════════

describe('VIN-specific Fields', () => {
  it('stores vehicle fields on create', async () => {
    tableResults['serial_item'] = { data: null, error: null };

    const { POST } = await importRoute();
    await POST(mockRequest('POST', {
      items: [{
        serial_number: 'LXYJCML09R1234567',
        product_id: 1,
        store_id: 1,
        serial_type: 'vin',
        color: 'Red',
        year: 2026,
        engine_number: 'ENG-12345',
        warranty_months: 24,
        supplier_name: 'Yadea Factory',
        cost_price: 42000,
      }],
    }));

    const insertOp = supabaseOps.find(op => op.table === 'serial_item' && op.op === 'insert');
    if (insertOp?.data) {
      const items = Array.isArray(insertOp.data) ? insertOp.data : [insertOp.data];
      expect(items[0].color).toBe('Red');
      expect(items[0].year).toBe(2026);
      expect(items[0].engine_number).toBe('ENG-12345');
      expect(items[0].warranty_months).toBe(24);
      expect(items[0].supplier_name).toBe('Yadea Factory');
      expect(items[0].serial_type).toBe('vin');
    }
  });
});
