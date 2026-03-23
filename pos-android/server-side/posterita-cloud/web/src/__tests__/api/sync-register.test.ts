import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Supabase mock (same pattern as sync.test.ts) ───────────────────

let tableResults: Record<string, { data: any; error: any }> = {};
let supabaseOps: Array<{
  table: string;
  op: string;
  data?: any;
  filters: Record<string, any>;
}> = [];

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

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => createChain(table),
  }),
}));

// ─── Helpers ────────────────────────────────────────────────────────

function mockRequest(body: any, headers?: Record<string, string>): any {
  const hdrs = new Map(Object.entries(headers ?? {})); return { json: () => Promise.resolve(body), headers: { get: (key: string) => hdrs.get(key) ?? null } };
}

beforeEach(() => {
  tableResults = {};
  supabaseOps = [];
  vi.resetModules();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
});

async function importRegisterRoute() {
  return await import('../../app/api/sync/register/route');
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('/api/sync/register POST – validation', () => {
  it('returns 400 when account_id is missing', async () => {
    const { POST } = await importRegisterRoute();
    const res = await POST(mockRequest({ email: 'test@example.com' }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toContain('account_id');
  });
});

describe('/api/sync/register POST – demo account', () => {
  it('registers demo_account so owners can test sync end to end', async () => {
    tableResults['account'] = { data: null, error: null };
    tableResults['account_manager:email=support@posterita.com'] = {
      data: { id: 91, email: 'support@posterita.com' },
      error: null,
    };
    tableResults['owner:email=demo@posterita.com'] = {
      data: null,
      error: { code: 'PGRST116', message: 'No rows found' },
    };
    tableResults['owner'] = { data: { id: 42 }, error: null };

    const { POST } = await importRegisterRoute();
    const res = await POST(mockRequest({
      account_id: 'demo_account',
      businessname: 'Demo Store',
      email: 'demo@posterita.com',
      type: 'demo',
      status: 'testing',
      users: [{ user_id: 1, username: 'demo-owner', firstname: 'Demo', role: 'owner', isactive: 'Y' }],
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.account_id).toBe('demo_account');
    expect(json.is_new).toBe(true);
    expect(
      supabaseOps.some(op => op.table === 'account' && op.op === 'insert' && op.data?.account_id === 'demo_account')
    ).toBe(true);
    expect(
      supabaseOps.some(op => op.table === 'account' && op.op === 'insert' && op.data?.type === 'demo')
    ).toBe(true);
    expect(
      supabaseOps.some(op => op.table === 'account' && op.op === 'insert' && op.data?.status === 'testing')
    ).toBe(true);
    expect(
      supabaseOps.some(op => op.table === 'owner_account_session' && op.op === 'upsert' && op.data?.account_id === 'demo_account')
    ).toBe(true);
  });
});

describe('/api/sync/register POST – new account', () => {
  it('creates a new account and returns is_new: true', async () => {
    // account lookup returns null (not found)
    tableResults['account'] = { data: null, error: null };
    tableResults['account_manager:email=support@posterita.com'] = {
      data: { id: 91, email: 'support@posterita.com' },
      error: null,
    };
    tableResults['owner:email=owner@example.com'] = {
      data: null,
      error: { code: 'PGRST116', message: 'No rows found' },
    };
    tableResults['owner'] = { data: { id: 42 }, error: null };

    const { POST } = await importRegisterRoute();
    const res = await POST(mockRequest({
      account_id: 'new-acc',
      email: 'owner@example.com',
      businessname: 'My Shop',
      currency: 'MUR',
    }));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.account_id).toBe('new-acc');
    expect(json.businessname).toBe('My Shop');
    expect(json.is_new).toBe(true);
  });

  it('uses default businessname when not provided', async () => {
    tableResults['account'] = { data: null, error: null };

    const { POST } = await importRegisterRoute();
    const res = await POST(mockRequest({
      account_id: 'new-acc-2',
    }));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.businessname).toBe('Unnamed Business');
    expect(json.is_new).toBe(true);
  });

  it('creates account with stores, terminals, users, taxes, categories, and products', async () => {
    tableResults['account'] = { data: null, error: null };
    tableResults['store'] = { data: null, error: null };
    tableResults['terminal'] = { data: null, error: null };
    tableResults['pos_user'] = { data: null, error: null };
    tableResults['tax'] = { data: null, error: null };
    tableResults['productcategory'] = { data: null, error: null };
    tableResults['product'] = { data: null, error: null };

    const { POST } = await importRegisterRoute();
    const res = await POST(mockRequest({
      account_id: 'full-acc',
      businessname: 'Full Shop',
      currency: 'USD',
      stores: [{ store_id: 1, name: 'Main Store', city: 'Port Louis' }],
      terminals: [{ terminal_id: 1, store_id: 1, name: 'POS-1', prefix: 'P' }],
      users: [{ user_id: 1, username: 'admin', firstname: 'Admin', pin: '1234', role: 'owner', isadmin: 'Y' }],
      taxes: [{ tax_id: 1, name: 'VAT', rate: 15 }],
      categories: [{ productcategory_id: 1, name: 'Food' }],
      products: [{ product_id: 1, name: 'Burger', sellingprice: 200 }],
    }));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.is_new).toBe(true);

    // Verify that upserts were called for each entity type
    const tablesUpserted = supabaseOps
      .filter(op => op.op === 'upsert')
      .map(op => op.table);
    expect(tablesUpserted).toContain('store');
    expect(tablesUpserted).toContain('terminal');
    expect(tablesUpserted).toContain('pos_user');
    expect(tablesUpserted).toContain('tax');
    expect(tablesUpserted).toContain('productcategory');
    expect(tablesUpserted).toContain('product');
  });

  it('links a newly registered Android account to an owner by phone first', async () => {
    tableResults['account'] = { data: null, error: null };
    tableResults['account_manager:email=support@posterita.com'] = {
      data: { id: 91, email: 'support@posterita.com' },
      error: null,
    };
    tableResults['owner:phone=+23052550000'] = {
      data: null,
      error: { code: 'PGRST116', message: 'No rows found' },
    };
    tableResults['owner'] = { data: { id: 42 }, error: null };

    const { POST } = await importRegisterRoute();
    const res = await POST(mockRequest({
      account_id: 'linked-acc',
      email: 'Owner@Example.com',
      phone: '+23052550000',
      businessname: 'Linked Shop',
      users: [{ user_id: 1, username: 'owner', firstname: 'Owner', pin: '123456', role: 'owner', isactive: 'Y' }],
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    expect(
      supabaseOps.some(
        op => op.table === 'owner' && op.data?.phone === '+23052550000'
      )
    ).toBe(true);
    expect(
      supabaseOps.some(
        op => op.table === 'account' && op.op === 'update' && op.data?.owner_id === 42
      )
    ).toBe(true);
    expect(
      supabaseOps.some(
        op => op.table === 'account' && op.op === 'insert' && op.data?.status === 'testing'
      )
    ).toBe(true);
    expect(
      supabaseOps.some(
        op => op.table === 'owner_account_session' && op.op === 'upsert' && op.data?.account_id === 'linked-acc'
      )
    ).toBe(true);
  });

  it('returns 500 when account insert fails', async () => {
    // account lookup returns null (not found), but insert fails
    tableResults['account'] = { data: null, error: { message: 'Disk full' } };

    const { POST } = await importRegisterRoute();
    const res = await POST(mockRequest({
      account_id: 'fail-acc',
      businessname: 'Fail Shop',
    }));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toContain('Account creation failed');
  });
});

describe('/api/sync/register POST – existing account', () => {
  it('returns is_new: false for an existing account', async () => {
    tableResults['account'] = {
      data: { account_id: 'existing-acc', businessname: 'Old Shop' },
      error: null,
    };

    const { POST } = await importRegisterRoute();
    const res = await POST(mockRequest({
      account_id: 'existing-acc',
    }));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.account_id).toBe('existing-acc');
    expect(json.businessname).toBe('Old Shop');
    expect(json.is_new).toBe(false);
  });

  it('still pushes data for existing account (partial registration recovery)', async () => {
    tableResults['account'] = {
      data: { account_id: 'existing-acc', businessname: 'Old Shop' },
      error: null,
    };
    tableResults['tax'] = { data: null, error: null };
    tableResults['productcategory'] = { data: null, error: null };
    tableResults['product'] = { data: null, error: null };
    tableResults['pos_user'] = { data: null, error: null };
    tableResults['store'] = { data: null, error: null };
    tableResults['terminal'] = { data: null, error: null };

    const { POST } = await importRegisterRoute();
    const res = await POST(mockRequest({
      account_id: 'existing-acc',
      taxes: [{ tax_id: 1, name: 'VAT', rate: 15 }],
      categories: [{ productcategory_id: 1, name: 'Food' }],
      products: [{ product_id: 1, name: 'Burger', sellingprice: 200 }],
      users: [{ user_id: 1, username: 'admin', firstname: 'Admin' }],
      stores: [{ store_id: 1, name: 'Main' }],
      terminals: [{ terminal_id: 1, store_id: 1, name: 'T1' }],
    }));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.is_new).toBe(false);

    // Verify upserts happened even for existing account
    const upsertTables = supabaseOps
      .filter(op => op.op === 'upsert')
      .map(op => op.table);
    expect(upsertTables).toContain('tax');
    expect(upsertTables).toContain('productcategory');
    expect(upsertTables).toContain('product');
    expect(upsertTables).toContain('pos_user');
    expect(upsertTables).toContain('store');
    expect(upsertTables).toContain('terminal');
  });
});
