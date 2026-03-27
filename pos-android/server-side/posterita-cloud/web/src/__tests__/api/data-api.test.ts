import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Supabase mock ────────────────────────────────────────────────
let tableResults: Record<string, { data: any; error: any; count?: number }> = {};
let supabaseOps: Array<{ table: string; op: string; filters: Record<string, any> }> = [];

function createChain(table: string) {
  const state = {
    op: 'select' as string,
    data: undefined as any,
    filters: {} as Record<string, any>,
  };

  function resolve() {
    supabaseOps.push({ table, op: state.op, filters: state.filters });
    const result = tableResults[table] ?? { data: [], error: null, count: 0 };
    return { ...result, count: result.count ?? (result.data?.length ?? 0) };
  }

  const chain: any = {};
  const methods = ['select', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'or', 'order', 'limit', 'range', 'in', 'is', 'not', 'contains'] as const;
  for (const m of methods) {
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
    auth: { getUser: () => Promise.resolve({ data: { user: { id: 'test-uid', email: 'test@test.com' } }, error: null }) },
  }),
}));

vi.mock('@/lib/account-context', () => ({
  getSessionAccountId: () => Promise.resolve('test-account-id'),
  getSessionUserId: () => Promise.resolve('test-user-id'),
}));

function mockRequest(body: any, headers?: Record<string, string>): any {
  const hdrs = new Map(Object.entries(headers ?? {})); return { json: () => Promise.resolve(body), headers: { get: (key: string) => hdrs.get(key) ?? null } };
}

beforeEach(() => {
  tableResults = {};
  supabaseOps = [];
  vi.resetModules();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

// ─── Data API Tests ───────────────────────────────────────────────

describe('/api/data POST – table whitelist', () => {
  it('rejects queries to non-whitelisted tables', async () => {
    const { POST } = await import('../../app/api/data/route');
    const res = await POST(mockRequest({ table: 'auth_users', select: '*' }));
    const json = await res.json();
    expect(json.error).toContain("not allowed");
  });

  it('allows queries to whitelisted tables', async () => {
    tableResults['product'] = { data: [{ product_id: 1, name: 'Burger' }], error: null };
    const { POST } = await import('../../app/api/data/route');
    const res = await POST(mockRequest({ table: 'product', select: '*' }));
    const json = await res.json();
    expect(json.data).toBeDefined();
    expect(json.error).toBeNull();
  });

  it('allows queries to view tables', async () => {
    tableResults['v_daily_sales'] = { data: [{ date: '2024-01-15', total: 5000 }], error: null };
    const { POST } = await import('../../app/api/data/route');
    const res = await POST(mockRequest({ table: 'v_daily_sales' }));
    const json = await res.json();
    expect(json.error).toBeNull();
  });
});

describe('/api/data POST – single query', () => {
  it('returns single result for non-array body', async () => {
    tableResults['orders'] = { data: [{ order_id: 1 }], error: null };
    const { POST } = await import('../../app/api/data/route');
    const res = await POST(mockRequest({ table: 'orders', select: '*' }));
    const json = await res.json();
    // Single query returns single result object, not array
    expect(json.data).toBeDefined();
    expect(Array.isArray(json)).toBe(false);
  });
});

describe('/api/data POST – batch queries', () => {
  it('processes multiple queries in parallel', async () => {
    tableResults['product'] = { data: [{ product_id: 1 }], error: null };
    tableResults['tax'] = { data: [{ tax_id: 1 }], error: null };

    const { POST } = await import('../../app/api/data/route');
    const res = await POST(mockRequest([
      { table: 'product', select: '*' },
      { table: 'tax', select: '*' },
    ]));
    const json = await res.json();

    expect(Array.isArray(json)).toBe(true);
    expect(json).toHaveLength(2);
    expect(json[0].error).toBeNull();
    expect(json[1].error).toBeNull();
  });

  it('returns error for blocked table within batch', async () => {
    tableResults['product'] = { data: [{ product_id: 1 }], error: null };

    const { POST } = await import('../../app/api/data/route');
    const res = await POST(mockRequest([
      { table: 'product', select: '*' },
      { table: 'secret_table', select: '*' },
    ]));
    const json = await res.json();

    expect(json[0].error).toBeNull();
    expect(json[1].error).toContain('not allowed');
  });
});

describe('/api/data POST – filters', () => {
  it('applies eq filter', async () => {
    tableResults['orders'] = { data: [{ order_id: 1, doc_status: 'CO' }], error: null };
    const { POST } = await import('../../app/api/data/route');
    const res = await POST(mockRequest({
      table: 'orders',
      filters: [{ column: 'doc_status', op: 'eq', value: 'CO' }],
    }));
    const json = await res.json();
    expect(json.error).toBeNull();
    // Verify filter was applied (check supabase ops)
    const orderOps = supabaseOps.filter(op => op.table === 'orders');
    expect(orderOps.length).toBeGreaterThan(0);
  });

  it('handles multiple filters', async () => {
    tableResults['orders'] = { data: [], error: null };
    const { POST } = await import('../../app/api/data/route');
    await POST(mockRequest({
      table: 'orders',
      filters: [
        { column: 'doc_status', op: 'eq', value: 'CO' },
        { column: 'grand_total', op: 'gte', value: 100 },
      ],
    }));
    // Should not crash with multiple filters
    expect(supabaseOps.length).toBeGreaterThan(0);
  });
});

describe('/api/data POST – error handling', () => {
  it('handles malformed JSON', async () => {
    const { POST } = await import('../../app/api/data/route');
    const req = { json: () => Promise.reject(new Error('Invalid JSON')) };
    const res = await POST(req as any);
    expect(res.status).toBe(500);
  });
});

// ─── Data Update API Tests ────────────────────────────────────────

describe('/api/data/update POST – table whitelist', () => {
  it('rejects updates to non-whitelisted tables', async () => {
    const { POST } = await import('../../app/api/data/update/route');
    const res = await POST(mockRequest({
      table: 'auth_users',
      id: { column: 'id', value: 1 },
      updates: { name: 'hacked' },
    }));
    const json = await res.json();
    expect(res.status).toBe(403);
    expect(json.error).toContain('not allowed');
  });

  it('allows updates to whitelisted tables', async () => {
    tableResults['product'] = { data: null, error: null };
    const { POST } = await import('../../app/api/data/update/route');
    const res = await POST(mockRequest({
      table: 'product',
      id: { column: 'product_id', value: 1 },
      updates: { name: 'Updated Burger' },
    }));
    const json = await res.json();
    expect(json.error).toBeNull();
  });
});

describe('/api/data/update POST – validation', () => {
  it('returns 400 when id is missing', async () => {
    const { POST } = await import('../../app/api/data/update/route');
    const res = await POST(mockRequest({
      table: 'product',
      updates: { name: 'test' },
    }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when updates is missing', async () => {
    const { POST } = await import('../../app/api/data/update/route');
    const res = await POST(mockRequest({
      table: 'product',
      id: { column: 'product_id', value: 1 },
    }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when id.column is missing', async () => {
    const { POST } = await import('../../app/api/data/update/route');
    const res = await POST(mockRequest({
      table: 'product',
      id: { value: 1 },
      updates: { name: 'test' },
    }));
    expect(res.status).toBe(400);
  });
});

describe('/api/data/update POST – error handling', () => {
  it('handles malformed JSON', async () => {
    const { POST } = await import('../../app/api/data/update/route');
    const req = { json: () => Promise.reject(new Error('Bad request')) };
    const res = await POST(req as any);
    expect(res.status).toBe(500);
  });
});
