import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock infrastructure ────────────────────────────────────────────
// The platform/create-account route depends on:
//   1. @supabase/supabase-js  (createClient for auth admin ops)
//   2. @/lib/super-admin      (isSuperAdmin)
//   3. @/lib/supabase/server  (createServerSupabaseAdmin — RLS-bypassed client)
//
// We mock all three so tests run without any external dependencies.

let tableResults: Record<string, { data: any; error: any }> = {};
let supabaseOps: Array<{ table: string; op: string; data?: any; filters: Record<string, any> }> = [];
let isSuperAdminValue = true;
let currentSuperAdminValue: any = {
  id: 11,
  auth_uid: 'support-auth-uid',
  email: 'support@posterita.com',
  name: 'Support Team',
};
let authCreateUserResult: { data: any; error: any } = { data: null, error: null };
let authGenerateLinkResult: { error: any } = { error: null };

function createChain(table: string) {
  const state = {
    op: 'select' as string,
    data: undefined as any,
    filters: {} as Record<string, any>,
  };

  function resolve() {
    supabaseOps.push({ table, op: state.op, data: state.data, filters: state.filters });
    const filterKey = Object.entries(state.filters)
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return (
      tableResults[`${table}:${filterKey}`] ??
      tableResults[table] ??
      { data: (state.op === 'select' ? [] : null), error: null }
    );
  }

  const chain: any = {};
  for (const m of ['select', 'eq', 'gte', 'order', 'limit'] as const) {
    chain[m] = (...args: any[]) => {
      if (m === 'select') state.op = 'select';
      if (m === 'eq') state.filters[args[0]] = args[1];
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
  chain.single = () => Promise.resolve(resolve());
  chain.then = (onFulfilled: Function, onRejected?: Function) =>
    Promise.resolve(resolve()).then(onFulfilled as any, onRejected as any);

  return chain;
}

// Mock @supabase/supabase-js — used for the service-role client (auth admin)
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => createChain(table),
    auth: {
      admin: {
        createUser: () => Promise.resolve(authCreateUserResult),
        generateLink: () => Promise.resolve(authGenerateLinkResult),
      },
    },
  }),
}));

// Mock the super-admin check
vi.mock('@/lib/super-admin', () => ({
  isSuperAdmin: () => Promise.resolve(isSuperAdminValue),
  getCurrentSuperAdminRecord: () => Promise.resolve(currentSuperAdminValue),
}));

// Mock the server Supabase admin client (same shape as the service-role one)
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseAdmin: () =>
    Promise.resolve({
      from: (table: string) => createChain(table),
    }),
}));

// ─── Helpers ────────────────────────────────────────────────────────

function mockRequest(body: any): any {
  return { json: () => Promise.resolve(body) };
}

beforeEach(() => {
  tableResults = {};
  supabaseOps = [];
  isSuperAdminValue = true;
  currentSuperAdminValue = {
    id: 11,
    auth_uid: 'support-auth-uid',
    email: 'support@posterita.com',
    name: 'Support Team',
  };
  authCreateUserResult = {
    data: { user: { id: 'auth-uid-123' } },
    error: null,
  };
  authGenerateLinkResult = { error: null };
  vi.resetModules();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
});

async function importRoute() {
  return await import('../../app/api/platform/create-account/route');
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('/api/platform/create-account POST – authorization', () => {
  it('returns 401 when caller is not a super admin', async () => {
    isSuperAdminValue = false;
    const { POST } = await importRoute();
    const res = await POST(mockRequest({
      account_id: 'acc1',
      businessname: 'Shop',
      email: 'owner@example.com',
    }));
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
  });
});

describe('/api/platform/create-account POST – validation', () => {
  it('returns 400 when businessname is missing', async () => {
    const { POST } = await importRoute();
    const res = await POST(mockRequest({
      email: 'owner@example.com',
    }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toContain('businessname');
  });

  it('returns 400 when phone and email are both missing', async () => {
    const { POST } = await importRoute();
    const res = await POST(mockRequest({
      businessname: 'Shop',
    }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toContain('phone or email');
  });
});

describe('/api/platform/create-account POST – success', () => {
  it('creates account, auth user, pos_user, and assigns the owner to an account manager', async () => {
    // account lookup returns null (new account)
    tableResults['account'] = { data: null, error: null };
    tableResults['pos_user'] = { data: null, error: null };
    tableResults['account_manager:email=support@posterita.com'] = {
      data: { id: 91, email: 'support@posterita.com' },
      error: null,
    };
    tableResults['owner:email=owner@newshop.com'] = {
      data: null,
      error: { code: 'PGRST116', message: 'No rows found' },
    };
    tableResults['owner'] = { data: { id: 42 }, error: null };

    const { POST } = await importRoute();
    const res = await POST(mockRequest({
      businessname: 'New Shop',
      currency: 'USD',
      email: 'owner@newshop.com',
    }));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.account_id).toMatch(/^trial_/);
    expect(json.businessname).toBe('New Shop');
    expect(json.owner_email).toBe('owner@newshop.com');
    expect(json.account_manager_id).toBe(91);
    expect(json.temp_password).toBeDefined();
    // Temp password should match Word-Word-NNNN pattern
    expect(json.temp_password).toMatch(/^[A-Z][a-z]+-[A-Z][a-z]+-\d{4}$/);
    expect(json.message).toContain('owner@newshop.com');
    expect(
      supabaseOps.some(
        op => op.table === 'owner' && op.data?.account_manager_id === 91
      )
    ).toBe(true);
  });

  it('cleans up account if auth user creation fails', async () => {
    tableResults['account'] = { data: null, error: null };
    tableResults['account_manager:email=support@posterita.com'] = {
      data: { id: 91, email: 'support@posterita.com' },
      error: null,
    };
    tableResults['owner:email=dupe@example.com'] = {
      data: null,
      error: { code: 'PGRST116', message: 'No rows found' },
    };
    authCreateUserResult = {
      data: null,
      error: { message: 'Email already registered' },
    };

    const { POST } = await importRoute();
    const res = await POST(mockRequest({
      businessname: 'Cleanup Shop',
      email: 'dupe@example.com',
    }));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toContain('User creation failed');

    // Verify a delete was issued to clean up the account
    const deleteOps = supabaseOps.filter(
      op => op.table === 'account' && op.op === 'delete'
    );
    expect(deleteOps.length).toBeGreaterThan(0);
  });

  it('returns 500 when account insert fails', async () => {
    tableResults['account'] = { data: null, error: { message: 'DB error' } };
    tableResults['account_manager:email=support@posterita.com'] = {
      data: { id: 91, email: 'support@posterita.com' },
      error: null,
    };

    const { POST } = await importRoute();
    const res = await POST(mockRequest({
      businessname: 'Err Shop',
      email: 'err@example.com',
    }));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toContain('Account creation failed');
  });
});
