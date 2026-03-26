/**
 * Scenario 46: Customer Loyalty Program
 * Tests the full loyalty flow: config → earn on purchase → check balance → redeem
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Supabase mock ──

let tableResults: Record<string, { data: any; error: any; count?: number }> = {};
let supabaseOps: Array<{ table: string; op: string; data?: any }> = [];

function createChain(table: string) {
  const state = { op: 'select' as string, data: undefined as any, filters: {} as Record<string, any> };

  function resolve() {
    supabaseOps.push({ table, op: state.op, data: state.data });
    const filterKey = Object.entries(state.filters).map(([k, v]) => `${k}=${v}`).join(',');
    return tableResults[`${table}:${filterKey}`] ?? tableResults[table] ?? { data: state.op === 'select' ? [] : null, error: null, count: 0 };
  }

  const chain: any = {};
  for (const m of ['select', 'eq', 'gte', 'lte', 'gt', 'order', 'limit', 'range', 'in', 'neq', 'is', 'not', 'or', 'ilike'] as const) {
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

let mockAccountId: string | null = 'test_loyalty_scenario';

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (table: string) => createChain(table) }),
}));

vi.mock('@/lib/account-context', () => ({
  getSessionAccountId: () => Promise.resolve(mockAccountId),
}));

beforeEach(() => {
  tableResults = {};
  supabaseOps = [];
  mockAccountId = 'test_loyalty_scenario';
});

describe('Scenario 46: Customer Loyalty Program', () => {
  it('Step 1: Enable loyalty program via config', async () => {
    tableResults['loyalty_config'] = {
      data: { account_id: 'test_loyalty_scenario', points_per_currency: 1, is_active: true, redemption_rate: 0.01, min_redeem_points: 100, welcome_bonus: 0 },
      error: null,
    };
    const { POST } = await import('@/app/api/loyalty/config/route');
    const req = new Request('http://localhost/api/loyalty/config', {
      method: 'POST',
      body: JSON.stringify({ points_per_currency: 1, redemption_rate: 0.01, min_redeem_points: 100, is_active: true }),
    });
    const res = await POST(req as any);
    const body = await res.json();
    expect(body.config.is_active).toBe(true);
  });

  it('Step 2: Customer earns points on purchase', async () => {
    tableResults['loyalty_config'] = {
      data: { is_active: true, points_per_currency: 2, min_redeem_points: 100 },
      error: null,
    };
    tableResults['customer'] = {
      data: { customer_id: 101, loyaltypoints: 0, name: 'Jane Doe' },
      error: null,
    };
    const { POST } = await import('@/app/api/loyalty/route');
    const req = new Request('http://localhost/api/loyalty', {
      method: 'POST',
      body: JSON.stringify({
        action: 'earn',
        customer_id: 101,
        points: 200,
        order_id: 5001,
        description: 'Earned 200 pts on order #5001',
      }),
    });
    const res = await POST(req as any);
    const body = await res.json();
    expect(body.new_balance).toBe(200);
    expect(body.delta).toBe(200);

    // Verify transaction was logged
    const txInsert = supabaseOps.find(op => op.table === 'loyalty_transaction' && op.op === 'insert');
    expect(txInsert).toBeDefined();
    expect(txInsert?.data?.type).toBe('earn');
    expect(txInsert?.data?.points).toBe(200);
  });

  it('Step 3: Customer redeems points at POS', async () => {
    tableResults['loyalty_config'] = {
      data: { is_active: true, min_redeem_points: 100 },
      error: null,
    };
    tableResults['customer'] = {
      data: { customer_id: 101, loyaltypoints: 200, name: 'Jane Doe' },
      error: null,
    };
    const { POST } = await import('@/app/api/loyalty/route');
    const req = new Request('http://localhost/api/loyalty', {
      method: 'POST',
      body: JSON.stringify({
        action: 'redeem',
        customer_id: 101,
        points: 150,
        description: 'Redeemed 150 pts for discount',
      }),
    });
    const res = await POST(req as any);
    const body = await res.json();
    expect(body.new_balance).toBe(50);
    expect(body.delta).toBe(-150);
  });

  it('Step 4: Cannot redeem more than balance', async () => {
    tableResults['loyalty_config'] = {
      data: { is_active: true, min_redeem_points: 10 },
      error: null,
    };
    tableResults['customer'] = {
      data: { customer_id: 101, loyaltypoints: 50, name: 'Jane Doe' },
      error: null,
    };
    const { POST } = await import('@/app/api/loyalty/route');
    const req = new Request('http://localhost/api/loyalty', {
      method: 'POST',
      body: JSON.stringify({ action: 'redeem', customer_id: 101, points: 100 }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Insufficient');
  });

  it('Step 5: Manual adjustment by admin', async () => {
    tableResults['loyalty_config'] = {
      data: { is_active: true, min_redeem_points: 100 },
      error: null,
    };
    tableResults['customer'] = {
      data: { customer_id: 101, loyaltypoints: 50, name: 'Jane Doe' },
      error: null,
    };
    const { POST } = await import('@/app/api/loyalty/route');
    const req = new Request('http://localhost/api/loyalty', {
      method: 'POST',
      body: JSON.stringify({
        action: 'adjust',
        customer_id: 101,
        points: -20,
        description: 'Correction: removed 20 pts',
      }),
    });
    const res = await POST(req as any);
    const body = await res.json();
    expect(body.new_balance).toBe(30);
    expect(body.delta).toBe(-20);
  });

  it('Step 6: View loyalty wallets', async () => {
    tableResults['customer'] = {
      data: [
        { customer_id: 101, name: 'Jane Doe', loyaltypoints: 30, phone1: '+230555', email: null, isactive: 'Y' },
        { customer_id: 102, name: 'John Smith', loyaltypoints: 500, phone1: null, email: 'john@test.com', isactive: 'Y' },
      ],
      error: null,
      count: 2,
    };
    const { GET } = await import('@/app/api/loyalty/wallets/route');
    const req = new Request('http://localhost/api/loyalty/wallets');
    const res = await GET(req as any);
    const body = await res.json();
    expect(body.wallets).toHaveLength(2);
    expect(body.summary.total_points_outstanding).toBe(530);
  });
});
