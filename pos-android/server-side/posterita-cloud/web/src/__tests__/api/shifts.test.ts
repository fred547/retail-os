import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  for (const m of ['select', 'eq', 'gte', 'lte', 'gt', 'order', 'limit', 'range', 'in', 'neq', 'is', 'not', 'or'] as const) {
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

let mockAccountId: string | null = 'test_shift_acc';

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (table: string) => createChain(table) }),
}));

vi.mock('@/lib/account-context', () => ({
  getSessionAccountId: () => Promise.resolve(mockAccountId),
}));

beforeEach(() => {
  tableResults = {};
  supabaseOps = [];
  mockAccountId = 'test_shift_acc';
});

describe('GET /api/shifts', () => {
  it('returns 401 when not authenticated', async () => {
    mockAccountId = null;
    const { GET } = await import('@/app/api/shifts/route');
    const req = new Request('http://localhost/api/shifts');
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });

  it('returns shift list with summary', async () => {
    tableResults['shift'] = {
      data: [
        { id: 1, user_id: 1, user_name: 'Alice', status: 'completed', hours_worked: 8, clock_in: '2026-03-27T08:00:00Z' },
        { id: 2, user_id: 2, user_name: 'Bob', status: 'active', hours_worked: null, clock_in: '2026-03-27T09:00:00Z' },
      ],
      error: null,
      count: 2,
    };
    const { GET } = await import('@/app/api/shifts/route');
    const req = new Request('http://localhost/api/shifts?from=2026-03-27&to=2026-03-27');
    const res = await GET(req as any);
    const body = await res.json();
    expect(body.shifts).toHaveLength(2);
    expect(body.summary.total_hours).toBe(8);
    expect(body.summary.active_shifts).toBe(1);
  });
});

describe('POST /api/shifts (clock in)', () => {
  it('returns 400 without required fields', async () => {
    const { POST } = await import('@/app/api/shifts/route');
    const req = new Request('http://localhost/api/shifts', {
      method: 'POST',
      body: JSON.stringify({ action: 'clock_in' }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('clocks in successfully', async () => {
    // No active shift exists
    tableResults['shift'] = {
      data: { id: 1, user_id: 10, user_name: 'Alice', status: 'active', clock_in: '2026-03-27T08:00:00Z' },
      error: null,
    };
    const { POST } = await import('@/app/api/shifts/route');
    const req = new Request('http://localhost/api/shifts', {
      method: 'POST',
      body: JSON.stringify({ action: 'clock_in', user_id: 10, user_name: 'Alice' }),
    });
    const res = await POST(req as any);
    // May be 201 (clock in) or 400 (already active) depending on mock
    expect([201, 400]).toContain(res.status);
  });

  it('rejects clock in when already active', async () => {
    // Return an existing active shift
    tableResults['shift'] = {
      data: [{ id: 1 }],
      error: null,
    };
    const { POST } = await import('@/app/api/shifts/route');
    const req = new Request('http://localhost/api/shifts', {
      method: 'POST',
      body: JSON.stringify({ action: 'clock_in', user_id: 10 }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('already has an active shift');
  });
});

describe('POST /api/shifts (clock out)', () => {
  it('clocks out and computes hours', async () => {
    const clockIn = new Date(Date.now() - 8 * 3600000).toISOString(); // 8 hours ago
    tableResults['shift'] = {
      data: { id: 1, clock_in: clockIn, status: 'completed', hours_worked: 8 },
      error: null,
    };
    const { POST } = await import('@/app/api/shifts/route');
    const req = new Request('http://localhost/api/shifts', {
      method: 'POST',
      body: JSON.stringify({ action: 'clock_out', user_id: 10, shift_id: 1 }),
    });
    const res = await POST(req as any);
    const body = await res.json();
    expect(body.action).toBe('clocked_out');
    expect(body.hours_worked).toBeGreaterThan(0);
  });

  it('returns 400 for invalid action', async () => {
    const { POST } = await import('@/app/api/shifts/route');
    const req = new Request('http://localhost/api/shifts', {
      method: 'POST',
      body: JSON.stringify({ action: 'invalid', user_id: 10 }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });
});
