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
  for (const m of ['select','eq','gte','lte','gt','order','limit','range','in','neq','is','not','or','head','delete'] as const) {
    chain[m] = (...args: any[]) => { if (m === 'eq') state.filters[args[0]] = args[1]; if (m === 'delete') state.op = 'delete'; return chain; };
  }
  for (const m of ['insert','update','upsert'] as const) {
    chain[m] = (...args: any[]) => { state.op = m; state.data = args[0]; return chain; };
  }
  chain.single = () => { const r = resolve(); return Promise.resolve({ ...r, data: Array.isArray(r.data) ? r.data[0] ?? null : r.data }); };
  chain.maybeSingle = chain.single;
  chain.then = (onF: Function, onR?: Function) => Promise.resolve(resolve()).then(onF as any, onR as any);
  return chain;
}

let mockAccountId: string | null = 'test_promo_acc';

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (table: string) => createChain(table) }),
}));
vi.mock('@/lib/account-context', () => ({
  getSessionAccountId: () => Promise.resolve(mockAccountId),
}));

beforeEach(() => { tableResults = {}; supabaseOps = []; mockAccountId = 'test_promo_acc'; });

describe('GET /api/promotions', () => {
  it('returns 401 when not authenticated', async () => {
    mockAccountId = null;
    const { GET } = await import('@/app/api/promotions/route');
    const req = new Request('http://localhost/api/promotions');
    expect((await GET(req as any)).status).toBe(401);
  });

  it('returns promotions with usage counts', async () => {
    tableResults['promotion'] = {
      data: [
        { id: 1, name: '10% Off', type: 'percentage_off', is_active: true },
        { id: 2, name: 'BOGO', type: 'buy_x_get_y', is_active: true },
      ],
      error: null,
    };
    tableResults['promotion_usage'] = {
      data: [{ promotion_id: 1 }, { promotion_id: 1 }, { promotion_id: 2 }],
      error: null,
    };
    const { GET } = await import('@/app/api/promotions/route');
    const res = await GET(new Request('http://localhost/api/promotions') as any);
    const body = await res.json();
    expect(body.promotions).toHaveLength(2);
    expect(body.promotions[0].usage_count).toBe(2);
    expect(body.promotions[1].usage_count).toBe(1);
  });
});

describe('POST /api/promotions', () => {
  it('returns 400 without name/type', async () => {
    const { POST } = await import('@/app/api/promotions/route');
    const req = new Request('http://localhost/api/promotions', {
      method: 'POST', body: JSON.stringify({}),
    });
    expect((await POST(req as any)).status).toBe(400);
  });

  it('creates percentage_off promotion', async () => {
    tableResults['promotion'] = {
      data: { id: 1, name: 'Summer Sale', type: 'percentage_off', discount_value: 15 },
      error: null,
    };
    const { POST } = await import('@/app/api/promotions/route');
    const req = new Request('http://localhost/api/promotions', {
      method: 'POST',
      body: JSON.stringify({ name: 'Summer Sale', type: 'percentage_off', discount_value: 15 }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.promotion.name).toBe('Summer Sale');
  });

  it('rejects invalid type', async () => {
    const { POST } = await import('@/app/api/promotions/route');
    const req = new Request('http://localhost/api/promotions', {
      method: 'POST',
      body: JSON.stringify({ name: 'Bad', type: 'invalid_type' }),
    });
    expect((await POST(req as any)).status).toBe(400);
  });
});

describe('POST /api/promotions/validate', () => {
  it('returns 401 when not authenticated', async () => {
    mockAccountId = null;
    const { POST } = await import('@/app/api/promotions/validate/route');
    const req = new Request('http://localhost/api/promotions/validate', {
      method: 'POST', body: JSON.stringify({ order_total: 100 }),
    });
    expect((await POST(req as any)).status).toBe(401);
  });

  it('returns applicable promotions', async () => {
    tableResults['promotion'] = {
      data: [
        {
          id: 1, name: '10% Off', type: 'percentage_off', discount_value: 10,
          is_active: true, is_deleted: false, promo_code: null, store_id: 0,
          start_date: null, end_date: null, days_of_week: [1,2,3,4,5,6,7],
          start_time: null, end_time: null, min_order_amount: null,
          max_discount_amount: null, max_uses: null, max_uses_per_customer: null,
        },
      ],
      error: null,
    };
    const { POST } = await import('@/app/api/promotions/validate/route');
    const req = new Request('http://localhost/api/promotions/validate', {
      method: 'POST',
      body: JSON.stringify({ order_total: 100 }),
    });
    const res = await POST(req as any);
    const body = await res.json();
    expect(body.applicable_promotions).toHaveLength(1);
    expect(body.applicable_promotions[0].discount).toBe(10);
    expect(body.total_discount).toBe(10);
  });

  it('filters by promo code', async () => {
    tableResults['promotion'] = {
      data: [
        {
          id: 1, name: 'Code Only', type: 'promo_code', discount_value: 20,
          promo_code: 'SAVE20', is_active: true, is_deleted: false, store_id: 0,
          start_date: null, end_date: null, days_of_week: [1,2,3,4,5,6,7],
          start_time: null, end_time: null, min_order_amount: null,
          max_discount_amount: null, max_uses: null, max_uses_per_customer: null,
        },
      ],
      error: null,
    };
    const { POST } = await import('@/app/api/promotions/validate/route');

    // Without code — should not apply
    const req1 = new Request('http://localhost/api/promotions/validate', {
      method: 'POST', body: JSON.stringify({ order_total: 100 }),
    });
    const body1 = await (await POST(req1 as any)).json();
    expect(body1.applicable_promotions).toHaveLength(0);

    // With correct code — should apply
    const req2 = new Request('http://localhost/api/promotions/validate', {
      method: 'POST', body: JSON.stringify({ order_total: 100, promo_code: 'SAVE20' }),
    });
    const body2 = await (await POST(req2 as any)).json();
    expect(body2.applicable_promotions).toHaveLength(1);
    expect(body2.total_discount).toBe(20);
  });

  it('respects min order amount', async () => {
    tableResults['promotion'] = {
      data: [
        {
          id: 1, name: 'Big Order', type: 'fixed_off', discount_value: 50,
          promo_code: null, is_active: true, is_deleted: false, store_id: 0,
          start_date: null, end_date: null, days_of_week: [1,2,3,4,5,6,7],
          start_time: null, end_time: null, min_order_amount: 200,
          max_discount_amount: null, max_uses: null, max_uses_per_customer: null,
        },
      ],
      error: null,
    };
    const { POST } = await import('@/app/api/promotions/validate/route');

    // Below min — no discount
    const req1 = new Request('http://localhost/api/promotions/validate', {
      method: 'POST', body: JSON.stringify({ order_total: 100 }),
    });
    expect((await (await POST(req1 as any)).json()).applicable_promotions).toHaveLength(0);

    // Above min — gets discount
    const req2 = new Request('http://localhost/api/promotions/validate', {
      method: 'POST', body: JSON.stringify({ order_total: 250 }),
    });
    expect((await (await POST(req2 as any)).json()).total_discount).toBe(50);
  });
});

describe('PATCH /api/promotions/[id]', () => {
  it('updates promotion', async () => {
    tableResults['promotion'] = {
      data: { id: 1, name: 'Updated', is_active: false },
      error: null,
    };
    const { PATCH } = await import('@/app/api/promotions/[id]/route');
    const req = new Request('http://localhost/api/promotions/1', {
      method: 'PATCH', body: JSON.stringify({ is_active: false }),
    });
    const res = await PATCH(req as any, { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(200);
  });
});

describe('DELETE /api/promotions/[id]', () => {
  it('soft deletes', async () => {
    tableResults['promotion'] = { data: null, error: null };
    const { DELETE } = await import('@/app/api/promotions/[id]/route');
    const req = new Request('http://localhost/api/promotions/1', { method: 'DELETE' });
    const res = await DELETE(req as any, { params: Promise.resolve({ id: '1' }) });
    const body = await res.json();
    expect(body.deleted).toBe(true);
  });
});
