import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Regression tests for POST /api/auth/signup
 *
 * Tests the signup flow: owner creation, account creation (live + demo),
 * store/terminal seeding, user creation, and error handling.
 */

// ─── Supabase mock ─────────────────────────────────────────────────

let tableResults: Record<string, { data: any; error: any }> = {};
let insertedRows: Array<{ table: string; data: any }> = [];
let supabaseOps: Array<{ table: string; op: string; data?: any; filters: Record<string, any> }> = [];

function createChain(table: string) {
  const state = {
    table,
    op: 'select',
    data: undefined as any,
    filters: {} as Record<string, any>,
  };

  const resolve = () => {
    supabaseOps.push({ ...state });
    const key = Object.keys(state.filters).length > 0
      ? `${table}:${Object.entries(state.filters).map(([k, v]) => `${k}=${v}`).join(',')}`
      : table;
    return tableResults[key] ?? tableResults[table] ?? { data: null, error: null };
  };

  const chain: any = {
    select: (cols?: string) => { state.op = 'select'; return chain; },
    insert: (data: any) => {
      state.op = 'insert';
      state.data = data;
      insertedRows.push({ table, data });
      return chain;
    },
    update: (data: any) => { state.op = 'update'; state.data = data; return chain; },
    upsert: (data: any) => { state.op = 'upsert'; state.data = data; return chain; },
    delete: () => { state.op = 'delete'; return chain; },
    eq: (col: string, val: any) => { state.filters[col] = val; return chain; },
    single: () => resolve(),
    maybeSingle: () => resolve(),
    then: (fn: any) => Promise.resolve(resolve()).then(fn),
    order: () => chain,
    limit: () => chain,
  };
  return chain;
}

const mockSupabase = {
  from: (table: string) => createChain(table),
  auth: {
    admin: {
      createUser: vi.fn().mockResolvedValue({ data: { user: { id: 'auth-uuid-123' } }, error: null }),
    },
  },
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabase,
}));

vi.mock('@/lib/owner-lifecycle', () => ({
  normalizeEmail: (e: any) => (typeof e === 'string' ? e.trim().toLowerCase() : ''),
  normalizePhone: (p: any) => (typeof p === 'string' ? p.trim().replace(/\s+/g, '') : ''),
  findOwnerByIdentity: vi.fn(),
}));

import { findOwnerByIdentity } from '@/lib/owner-lifecycle';

// ─── Import handler ────────────────────────────────────────────────

let POST: any;

beforeEach(async () => {
  vi.resetModules();
  tableResults = {};
  insertedRows = [];
  supabaseOps = [];

  // Default: owner insert succeeds
  tableResults['owner'] = { data: { id: 42 }, error: null };
  // Account inserts succeed
  tableResults['account'] = { data: null, error: null };
  // Store insert returns store_id
  tableResults['store'] = { data: { store_id: 1 }, error: null };
  // Terminal insert succeeds
  tableResults['terminal'] = { data: null, error: null };
  // User insert succeeds
  tableResults['pos_user'] = { data: null, error: null };
  // Tax insert succeeds
  tableResults['tax'] = { data: null, error: null };
  // Category insert succeeds
  tableResults['productcategory'] = { data: [{ productcategory_id: 1, name: 'Food' }], error: null };
  // Product insert succeeds
  tableResults['product'] = { data: null, error: null };
  // Session upsert succeeds
  tableResults['owner_account_session'] = { data: null, error: null };

  // No existing owner by default
  (findOwnerByIdentity as any).mockResolvedValue({ owner: null, error: null });

  const mod = await import('../../app/api/auth/signup/route');
  POST = mod.POST;
});

function makeRequest(body: any) {
  return new Request('http://localhost/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  phone: '+23054000001',
  email: 'test@example.com',
  firstname: 'John',
  lastname: 'Doe',
  password: 'pass1234',
  pin: '5678',
  businessname: "John's Cafe",
  country: 'Mauritius',
  currency: 'MUR',
};

// ─── Tests ─────────────────────────────────────────────────────────

describe('POST /api/auth/signup', () => {
  it('creates owner + 2 accounts + returns IDs', async () => {
    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.owner_id).toBe(42);
    expect(json.live_account_id).toMatch(/^live_/);
    expect(json.demo_account_id).toMatch(/^demo_/);
    expect(json.message).toContain('2 brands');
  });

  it('returns 400 when email is missing', async () => {
    const res = await POST(makeRequest({ ...validBody, email: '' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Email');
  });

  it('returns 400 when firstname is missing', async () => {
    const res = await POST(makeRequest({ ...validBody, firstname: '' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('name');
  });

  it('returns 409 when owner already exists', async () => {
    (findOwnerByIdentity as any).mockResolvedValue({
      owner: { id: 99, email: 'test@example.com' },
      error: null,
    });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain('already exists');
  });

  it('creates stores and terminals for both accounts', async () => {
    await POST(makeRequest(validBody));

    const storeInserts = insertedRows.filter(r => r.table === 'store');
    const terminalInserts = insertedRows.filter(r => r.table === 'terminal');

    expect(storeInserts).toHaveLength(2);
    expect(terminalInserts).toHaveLength(2);

    // Live store uses business name
    expect(storeInserts[0].data.name).toBe("John's Cafe");
    // Demo store uses firstname
    expect(storeInserts[1].data.name).toContain('Demo Store');
  });

  it('creates POS users for both accounts with correct fields', async () => {
    await POST(makeRequest(validBody));

    const userInserts = insertedRows.filter(r => r.table === 'pos_user');
    expect(userInserts).toHaveLength(2);

    for (const u of userInserts) {
      expect(u.data.role).toBe('owner');
      expect(u.data.isadmin).toBe('Y');
      expect(u.data.pin).toBe('5678');
      expect(u.data.auth_uid).toBe('auth-uuid-123');
      expect(u.data.email).toBe('test@example.com');
    }
  });

  it('creates taxes for both accounts', async () => {
    await POST(makeRequest(validBody));

    const taxInserts = insertedRows.filter(r => r.table === 'tax');
    // 2 for live + 2 for demo = 4 (but inserted as arrays, so 2 insert calls)
    expect(taxInserts.length).toBeGreaterThanOrEqual(2);
  });

  it('seeds demo products but not live products', async () => {
    await POST(makeRequest(validBody));

    const productInserts = insertedRows.filter(r => r.table === 'product');
    const categoryInserts = insertedRows.filter(r => r.table === 'productcategory');

    // Demo gets categories and products, live gets neither
    expect(categoryInserts).toHaveLength(1); // one bulk insert
    expect(productInserts.length).toBeGreaterThan(0);

    // All products should be for demo account
    for (const p of productInserts) {
      expect(p.data.account_id).toMatch(/^demo_/);
    }
  });

  it('uses correct auth_uid column (not auth_user_id)', async () => {
    await POST(makeRequest(validBody));

    const userInserts = insertedRows.filter(r => r.table === 'pos_user');
    for (const u of userInserts) {
      expect(u.data).toHaveProperty('auth_uid');
      expect(u.data).not.toHaveProperty('auth_user_id');
    }
  });

  it('links owner to auth user', async () => {
    await POST(makeRequest(validBody));

    const ownerInserts = insertedRows.filter(r => r.table === 'owner');
    expect(ownerInserts).toHaveLength(1);
    expect(ownerInserts[0].data.auth_uid).toBe('auth-uuid-123');
    expect(ownerInserts[0].data.name).toBe('John');
    expect(ownerInserts[0].data.is_active).toBe(true);
  });

  it('handles Supabase Auth failure gracefully (non-blocking)', async () => {
    mockSupabase.auth.admin.createUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Auth service unavailable' },
    });

    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    // Signup should still succeed — auth is non-blocking
    expect(res.status).toBe(200);
    expect(json.live_account_id).toMatch(/^live_/);

    // But auth_uid should be null on user records
    const userInserts = insertedRows.filter(r => r.table === 'pos_user');
    for (const u of userInserts) {
      expect(u.data.auth_uid).toBeNull();
    }
  });

  it('returns 500 when owner insert fails', async () => {
    tableResults['owner'] = { data: null, error: { message: 'DB constraint violation' } };

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Operation failed');
  });

  it('defaults businessname to firstname when not provided', async () => {
    const body = { ...validBody, businessname: '' };
    await POST(makeRequest(body));

    const accountInserts = insertedRows.filter(r => r.table === 'account');
    const liveAccount = accountInserts.find(a => a.data.type === 'live');
    expect(liveAccount?.data.businessname).toBe("John's Store");
  });
});
