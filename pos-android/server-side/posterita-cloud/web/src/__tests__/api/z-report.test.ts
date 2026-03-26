import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Supabase mock ──

let tableResults: Record<string, { data: any; error: any; count?: number }> = {};
let supabaseOps: Array<{ table: string; op: string; filters: Record<string, any> }> = [];

function createChain(table: string) {
  const state = { op: 'select' as string, filters: {} as Record<string, any> };

  function resolve() {
    supabaseOps.push({ table, op: state.op, filters: state.filters });
    const key = Object.entries(state.filters).map(([k, v]) => `${k}=${v}`).join(',');
    return tableResults[`${table}:${key}`] ?? tableResults[table] ?? { data: [], error: null, count: 0 };
  }

  const chain: any = {};
  for (const m of ['select', 'eq', 'gte', 'lte', 'order', 'limit', 'range', 'in', 'neq', 'is', 'not', 'or', 'ilike'] as const) {
    chain[m] = (...args: any[]) => {
      if (m === 'eq') state.filters[args[0]] = args[1];
      return chain;
    };
  }
  for (const m of ['insert', 'update', 'upsert', 'delete'] as const) {
    chain[m] = () => chain;
  }
  chain.single = () => Promise.resolve({ ...resolve(), data: resolve().data?.[0] ?? null });
  chain.maybeSingle = chain.single;
  chain.then = (onF: Function, onR?: Function) => Promise.resolve(resolve()).then(onF as any, onR as any);
  return chain;
}

let mockAccountId: string | null = 'test_zreport_acc';

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (table: string) => createChain(table) }),
}));

vi.mock('@/lib/account-context', () => ({
  getSessionAccountId: () => Promise.resolve(mockAccountId),
}));

function mockRequest(searchParams?: Record<string, string>): any {
  const url = new URL('http://localhost/api/reports/z-report');
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

describe('GET /api/reports/z-report', () => {
  beforeEach(() => {
    tableResults = {};
    supabaseOps = [];
    mockAccountId = 'test_zreport_acc';
  });

  it('returns 401 when not authenticated', async () => {
    mockAccountId = null;
    const { GET } = await import('@/app/api/reports/z-report/route');
    const res = await GET(mockRequest());
    expect(res.status).toBe(401);
  });

  it('returns Z-report with summary, payment breakdown, and tills', async () => {
    tableResults['orders'] = {
      data: [
        { order_id: 1, grand_total: 100, subtotal: 85, tax_total: 15, discount_total: 0, is_void: false },
        { order_id: 2, grand_total: 200, subtotal: 170, tax_total: 30, discount_total: 10, is_void: false },
        { order_id: 3, grand_total: 50, subtotal: 50, tax_total: 0, discount_total: 0, is_void: true },
      ],
      error: null,
    };

    tableResults['payment'] = {
      data: [
        { payment_id: 1, order_id: 1, payment_type: 'Cash', amount: 100, pay_amt: 100 },
        { payment_id: 2, order_id: 2, payment_type: 'Card', amount: 200, pay_amt: 200 },
        { payment_id: 3, order_id: 3, payment_type: 'Cash', amount: 50, pay_amt: 50 },
      ],
      error: null,
    };

    tableResults['till'] = {
      data: [
        { till_id: 1, documentno: 'TILL-001', opening_amt: 100, closing_amt: 350, cash_amt: 200, card_amt: 150, grand_total: 300, status: 'closed', date_opened: '2026-03-27T08:00:00Z', date_closed: '2026-03-27T22:00:00Z' },
      ],
      error: null,
    };

    const { GET } = await import('@/app/api/reports/z-report/route');
    const res = await GET(mockRequest({ date: '2026-03-27' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.summary).toBeTruthy();
    expect(json.summary.total_sales).toBe(300); // 100 + 200 (void excluded)
    expect(json.summary.order_count).toBe(2);
    expect(json.summary.void_count).toBe(1);
    expect(json.summary.void_total).toBe(50);
    expect(json.summary.total_tax).toBe(45); // 15 + 30
    expect(json.summary.avg_order).toBe(150); // 300 / 2

    // Payment breakdown
    expect(json.payment_breakdown).toHaveLength(2);
    const cash = json.payment_breakdown.find((p: any) => p.payment_type === 'Cash');
    expect(cash.total).toBe(150); // 100 (order 1) + 50 (order 3, void — still tendered)
    const card = json.payment_breakdown.find((p: any) => p.payment_type === 'Card');
    expect(card.total).toBe(200);

    // Tills
    expect(json.tills).toHaveLength(1);
    expect(json.tills[0].status).toBe('closed');

    expect(json.generated_at).toBeTruthy();
  });

  it('returns empty report when no orders', async () => {
    tableResults['orders'] = { data: [], error: null };
    tableResults['payment'] = { data: [], error: null };
    tableResults['till'] = { data: [], error: null };

    const { GET } = await import('@/app/api/reports/z-report/route');
    const res = await GET(mockRequest({ date: '2026-01-01' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.summary.total_sales).toBe(0);
    expect(json.summary.order_count).toBe(0);
    expect(json.payment_breakdown).toHaveLength(0);
  });

  it('returns CSV when format=csv', async () => {
    tableResults['orders'] = {
      data: [{ order_id: 1, grand_total: 100, subtotal: 85, tax_total: 15, discount_total: 0, is_void: false }],
      error: null,
    };
    tableResults['payment'] = {
      data: [{ payment_id: 1, order_id: 1, payment_type: 'Cash', amount: 100, pay_amt: 100 }],
      error: null,
    };
    tableResults['till'] = { data: [], error: null };

    const { GET } = await import('@/app/api/reports/z-report/route');
    const res = await GET(mockRequest({ date: '2026-03-27', format: 'csv' }));

    expect(res.headers.get('Content-Type')).toBe('text/csv');
    const text = await res.text();
    expect(text).toContain('Z-Report: 2026-03-27');
    expect(text).toContain('PAYMENT BREAKDOWN');
    expect(text).toContain('Cash');
  });

  it('defaults to today when no date provided', async () => {
    tableResults['orders'] = { data: [], error: null };
    tableResults['payment'] = { data: [], error: null };
    tableResults['till'] = { data: [], error: null };

    const { GET } = await import('@/app/api/reports/z-report/route');
    const res = await GET(mockRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.summary.date).toBe(new Date().toISOString().split('T')[0]);
  });
});
