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
  for (const m of ['select', 'eq', 'gte', 'lte', 'gt', 'order', 'limit', 'range', 'in', 'neq', 'is', 'not', 'or', 'ilike', 'delete'] as const) {
    chain[m] = (...args: any[]) => { if (m === 'eq') state.filters[args[0]] = args[1]; if (m === 'delete') state.op = 'delete'; return chain; };
  }
  for (const m of ['insert', 'update', 'upsert'] as const) {
    chain[m] = (...args: any[]) => { state.op = m; state.data = args[0]; return chain; };
  }
  chain.single = () => { const r = resolve(); return Promise.resolve({ ...r, data: Array.isArray(r.data) ? r.data[0] ?? null : r.data }); };
  chain.maybeSingle = chain.single;
  chain.then = (onF: Function, onR?: Function) => Promise.resolve(resolve()).then(onF as any, onR as any);
  return chain;
}

let mockAccountId: string | null = 'test_menu_acc';

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (table: string) => createChain(table) }),
}));

vi.mock('@/lib/account-context', () => ({
  getSessionAccountId: () => Promise.resolve(mockAccountId),
}));

beforeEach(() => {
  tableResults = {};
  supabaseOps = [];
  mockAccountId = 'test_menu_acc';
});

describe('GET /api/menu-schedules', () => {
  it('returns 401 when not authenticated', async () => {
    mockAccountId = null;
    const { GET } = await import('@/app/api/menu-schedules/route');
    const req = new Request('http://localhost/api/menu-schedules');
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });

  it('returns schedule list', async () => {
    tableResults['menu_schedule'] = {
      data: [
        { id: 1, name: 'Breakfast', start_time: '06:00', end_time: '11:00', is_active: true },
        { id: 2, name: 'Lunch', start_time: '11:00', end_time: '15:00', is_active: true },
      ],
      error: null,
    };
    const { GET } = await import('@/app/api/menu-schedules/route');
    const req = new Request('http://localhost/api/menu-schedules');
    const res = await GET(req as any);
    const body = await res.json();
    expect(body.schedules).toHaveLength(2);
  });
});

describe('POST /api/menu-schedules', () => {
  it('returns 400 without required fields', async () => {
    const { POST } = await import('@/app/api/menu-schedules/route');
    const req = new Request('http://localhost/api/menu-schedules', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test' }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('creates schedule', async () => {
    tableResults['menu_schedule'] = {
      data: { id: 1, name: 'Dinner', start_time: '18:00', end_time: '22:00', is_active: true },
      error: null,
    };
    const { POST } = await import('@/app/api/menu-schedules/route');
    const req = new Request('http://localhost/api/menu-schedules', {
      method: 'POST',
      body: JSON.stringify({ name: 'Dinner', start_time: '18:00', end_time: '22:00' }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.schedule.name).toBe('Dinner');
  });
});

describe('GET /api/menu-schedules/active', () => {
  it('filters schedules by time and day', async () => {
    tableResults['menu_schedule'] = {
      data: [
        { id: 1, name: 'Breakfast', start_time: '06:00', end_time: '11:00', days_of_week: [1,2,3,4,5], category_ids: [1, 2], is_active: true },
        { id: 2, name: 'Lunch', start_time: '11:00', end_time: '15:00', days_of_week: [1,2,3,4,5,6,7], category_ids: [3, 4], is_active: true },
      ],
      error: null,
    };
    const { GET } = await import('@/app/api/menu-schedules/active/route');
    const req = new Request('http://localhost/api/menu-schedules/active?time=09:30&day=3');
    const res = await GET(req as any);
    const body = await res.json();
    // 09:30 on Wed(3) should match Breakfast only
    expect(body.active_schedules).toHaveLength(1);
    expect(body.active_schedules[0].name).toBe('Breakfast');
    expect(body.category_ids).toEqual([1, 2]);
  });

  it('returns empty when no schedule matches', async () => {
    tableResults['menu_schedule'] = {
      data: [
        { id: 1, name: 'Breakfast', start_time: '06:00', end_time: '11:00', days_of_week: [1,2,3,4,5], category_ids: [1], is_active: true },
      ],
      error: null,
    };
    const { GET } = await import('@/app/api/menu-schedules/active/route');
    // Saturday at 14:00 — breakfast doesn't cover this
    const req = new Request('http://localhost/api/menu-schedules/active?time=14:00&day=6');
    const res = await GET(req as any);
    const body = await res.json();
    expect(body.active_schedules).toHaveLength(0);
  });
});

describe('PATCH /api/menu-schedules/[id]', () => {
  it('updates schedule', async () => {
    tableResults['menu_schedule'] = {
      data: { id: 1, name: 'Updated Breakfast', is_active: false },
      error: null,
    };
    const { PATCH } = await import('@/app/api/menu-schedules/[id]/route');
    const req = new Request('http://localhost/api/menu-schedules/1', {
      method: 'PATCH',
      body: JSON.stringify({ is_active: false }),
    });
    const res = await PATCH(req as any, { params: Promise.resolve({ id: '1' }) });
    const body = await res.json();
    expect(body.schedule.is_active).toBe(false);
  });
});

describe('DELETE /api/menu-schedules/[id]', () => {
  it('deletes schedule', async () => {
    tableResults['menu_schedule'] = { data: null, error: null };
    const { DELETE } = await import('@/app/api/menu-schedules/[id]/route');
    const req = new Request('http://localhost/api/menu-schedules/1', { method: 'DELETE' });
    const res = await DELETE(req as any, { params: Promise.resolve({ id: '1' }) });
    const body = await res.json();
    expect(body.deleted).toBe(true);
  });
});
