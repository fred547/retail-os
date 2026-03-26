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
  for (const m of ['select', 'eq', 'gte', 'lte', 'gt', 'order', 'limit', 'range', 'in', 'neq', 'is', 'not', 'or', 'ilike', 'contains'] as const) {
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

let mockAccountId: string | null = 'test_loyalty_acc';

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (table: string) => createChain(table) }),
}));

vi.mock('@/lib/account-context', () => ({
  getSessionAccountId: () => Promise.resolve(mockAccountId),
}));

beforeEach(() => {
  tableResults = {};
  supabaseOps = [];
  mockAccountId = 'test_loyalty_acc';
});

// ─── Loyalty Config Tests ──

describe('GET /api/loyalty/config', () => {
  it('returns 401 when not authenticated', async () => {
    mockAccountId = null;
    const { GET } = await import('@/app/api/loyalty/config/route');
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns default config when none exists', async () => {
    tableResults['loyalty_config'] = { data: null, error: null };
    const { GET } = await import('@/app/api/loyalty/config/route');
    const res = await GET();
    const body = await res.json();
    expect(body.config).toBeDefined();
    expect(body.config.is_active).toBe(false);
    expect(body.config.points_per_currency).toBe(1);
  });

  it('returns existing config', async () => {
    tableResults['loyalty_config'] = {
      data: { account_id: 'test_loyalty_acc', points_per_currency: 2, is_active: true, redemption_rate: 0.05, min_redeem_points: 50, welcome_bonus: 10 },
      error: null,
    };
    const { GET } = await import('@/app/api/loyalty/config/route');
    const res = await GET();
    const body = await res.json();
    expect(body.config.points_per_currency).toBe(2);
    expect(body.config.is_active).toBe(true);
  });
});

describe('POST /api/loyalty/config', () => {
  it('saves config via upsert', async () => {
    tableResults['loyalty_config'] = {
      data: { account_id: 'test_loyalty_acc', points_per_currency: 3, is_active: true },
      error: null,
    };
    const { POST } = await import('@/app/api/loyalty/config/route');
    const req = new Request('http://localhost/api/loyalty/config', {
      method: 'POST',
      body: JSON.stringify({ points_per_currency: 3, is_active: true }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const upsertOp = supabaseOps.find(op => op.table === 'loyalty_config' && op.op === 'upsert');
    expect(upsertOp).toBeDefined();
  });
});

// ─── Loyalty Operations Tests ──

describe('POST /api/loyalty (earn/redeem)', () => {
  it('returns 401 when not authenticated', async () => {
    mockAccountId = null;
    const { POST } = await import('@/app/api/loyalty/route');
    const req = new Request('http://localhost/api/loyalty', {
      method: 'POST',
      body: JSON.stringify({ action: 'earn', customer_id: 1, points: 50 }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it('returns 400 for missing fields', async () => {
    const { POST } = await import('@/app/api/loyalty/route');
    const req = new Request('http://localhost/api/loyalty', {
      method: 'POST',
      body: JSON.stringify({ action: 'earn' }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('returns 400 when loyalty is inactive', async () => {
    tableResults['loyalty_config'] = { data: { is_active: false }, error: null };
    const { POST } = await import('@/app/api/loyalty/route');
    const req = new Request('http://localhost/api/loyalty', {
      method: 'POST',
      body: JSON.stringify({ action: 'earn', customer_id: 1, points: 50 }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('not active');
  });

  it('earns points successfully', async () => {
    tableResults['loyalty_config'] = {
      data: { is_active: true, points_per_currency: 1, min_redeem_points: 100 },
      error: null,
    };
    tableResults['customer'] = {
      data: { customer_id: 1, loyaltypoints: 100, name: 'Test Customer' },
      error: null,
    };
    const { POST } = await import('@/app/api/loyalty/route');
    const req = new Request('http://localhost/api/loyalty', {
      method: 'POST',
      body: JSON.stringify({ action: 'earn', customer_id: 1, points: 50 }),
    });
    const res = await POST(req as any);
    const body = await res.json();
    expect(body.previous_balance).toBe(100);
    expect(body.delta).toBe(50);
    expect(body.new_balance).toBe(150);
  });

  it('redeems points successfully', async () => {
    tableResults['loyalty_config'] = {
      data: { is_active: true, min_redeem_points: 50 },
      error: null,
    };
    tableResults['customer'] = {
      data: { customer_id: 1, loyaltypoints: 200, name: 'Test Customer' },
      error: null,
    };
    const { POST } = await import('@/app/api/loyalty/route');
    const req = new Request('http://localhost/api/loyalty', {
      method: 'POST',
      body: JSON.stringify({ action: 'redeem', customer_id: 1, points: 100 }),
    });
    const res = await POST(req as any);
    const body = await res.json();
    expect(body.previous_balance).toBe(200);
    expect(body.delta).toBe(-100);
    expect(body.new_balance).toBe(100);
  });

  it('rejects redeem with insufficient points', async () => {
    tableResults['loyalty_config'] = {
      data: { is_active: true, min_redeem_points: 10 },
      error: null,
    };
    tableResults['customer'] = {
      data: { customer_id: 1, loyaltypoints: 30, name: 'Test Customer' },
      error: null,
    };
    const { POST } = await import('@/app/api/loyalty/route');
    const req = new Request('http://localhost/api/loyalty', {
      method: 'POST',
      body: JSON.stringify({ action: 'redeem', customer_id: 1, points: 50 }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Insufficient');
  });
});

// ─── Wallets Tests ──

describe('GET /api/loyalty/wallets', () => {
  it('returns 401 when not authenticated', async () => {
    mockAccountId = null;
    const { GET } = await import('@/app/api/loyalty/wallets/route');
    const req = new Request('http://localhost/api/loyalty/wallets');
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });

  it('returns wallet list with summary', async () => {
    tableResults['customer'] = {
      data: [
        { customer_id: 1, name: 'Alice', loyaltypoints: 500, phone1: '+230', email: null, isactive: 'Y' },
        { customer_id: 2, name: 'Bob', loyaltypoints: 200, phone1: null, email: 'bob@test.com', isactive: 'Y' },
      ],
      error: null,
      count: 2,
    };
    const { GET } = await import('@/app/api/loyalty/wallets/route');
    const req = new Request('http://localhost/api/loyalty/wallets');
    const res = await GET(req as any);
    const body = await res.json();
    expect(body.wallets).toHaveLength(2);
    expect(body.summary.total_members).toBe(2);
    expect(body.summary.total_points_outstanding).toBe(700);
  });
});

// ─── Transactions Tests ──

describe('GET /api/loyalty/transactions', () => {
  it('returns 401 when not authenticated', async () => {
    mockAccountId = null;
    const { GET } = await import('@/app/api/loyalty/transactions/route');
    const req = new Request('http://localhost/api/loyalty/transactions');
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });

  it('returns transaction list with customer names', async () => {
    tableResults['loyalty_transaction'] = {
      data: [
        { id: 1, customer_id: 1, type: 'earn', points: 50, balance_after: 50, description: 'Earned 50 pts', created_at: '2026-03-27T10:00:00Z' },
      ],
      error: null,
      count: 1,
    };
    tableResults['customer'] = {
      data: [{ customer_id: 1, name: 'Alice' }],
      error: null,
    };
    const { GET } = await import('@/app/api/loyalty/transactions/route');
    const req = new Request('http://localhost/api/loyalty/transactions');
    const res = await GET(req as any);
    const body = await res.json();
    expect(body.transactions).toHaveLength(1);
    expect(body.transactions[0].customer_name).toBe('Alice');
  });
});
