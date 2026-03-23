import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Supabase mock infrastructure (same pattern as sync.test.ts) ────

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
    upsertOpts: undefined as any,
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
      if (m === 'upsert') state.upsertOpts = args[1];
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

describe('/api/sync/register POST – empty arrays', () => {
  it('registers with empty stores/terminals/users arrays without error', async () => {
    tableResults['account'] = { data: null, error: null };

    const { POST } = await importRegisterRoute();
    const res = await POST(mockRequest({
      account_id: 'empty-arrays-acc',
      businessname: 'Empty Shop',
      stores: [],
      terminals: [],
      users: [],
      taxes: [],
      categories: [],
      products: [],
    }));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.is_new).toBe(true);

    // No upsert operations should have been called for entities
    const upsertOps = supabaseOps.filter(op => op.op === 'upsert');
    expect(upsertOps).toHaveLength(0);
  });
});

describe('/api/sync/register POST – product with tax_id=0 (no tax)', () => {
  it('registers a product with tax_id=0 preserving the zero value', async () => {
    tableResults['account'] = { data: null, error: null };
    tableResults['product'] = { data: null, error: null };

    const { POST } = await importRegisterRoute();
    const res = await POST(mockRequest({
      account_id: 'tax-zero-acc',
      products: [{
        product_id: 1,
        name: 'Tax-Free Item',
        sellingprice: 100,
        tax_id: 0,
        taxamount: 0,
      }],
    }));
    const json = await res.json();

    expect(json.success).toBe(true);

    const productUpsert = supabaseOps.find(op => op.table === 'product' && op.op === 'upsert');
    expect(productUpsert).toBeDefined();
    expect(productUpsert!.data.tax_id).toBe(0);
    expect(productUpsert!.data.taxamount).toBe(0);
  });
});

describe('/api/sync/register POST – duplicate product IDs in same request', () => {
  it('processes each product individually, last write wins', async () => {
    tableResults['account'] = { data: null, error: null };
    tableResults['product'] = { data: null, error: null };

    const { POST } = await importRegisterRoute();
    const res = await POST(mockRequest({
      account_id: 'dup-products-acc',
      products: [
        { product_id: 1, name: 'Burger v1', sellingprice: 100 },
        { product_id: 1, name: 'Burger v2', sellingprice: 150 },
      ],
    }));
    const json = await res.json();

    expect(json.success).toBe(true);

    // Both products should have been upserted (route loops over all without dedup)
    const productUpserts = supabaseOps.filter(op => op.table === 'product' && op.op === 'upsert');
    expect(productUpserts).toHaveLength(2);
    expect(productUpserts[0].data.name).toBe('Burger v1');
    expect(productUpserts[1].data.name).toBe('Burger v2');
  });
});

describe('/api/sync/register POST – mixed camelCase/snake_case store fields', () => {
  it('handles storeId (camelCase) on store', async () => {
    tableResults['account'] = { data: null, error: null };
    tableResults['store'] = { data: null, error: null };

    const { POST } = await importRegisterRoute();
    const res = await POST(mockRequest({
      account_id: 'camel-store-acc',
      stores: [{
        storeId: 5,
        name: 'CamelCase Store',
        city: 'Port Louis',
      }],
    }));
    const json = await res.json();

    expect(json.success).toBe(true);

    const storeUpsert = supabaseOps.find(op => op.table === 'store' && op.op === 'upsert');
    expect(storeUpsert).toBeDefined();
    expect(storeUpsert!.data.store_id).toBe(5);
  });

  it('handles store_id (snake_case) on store', async () => {
    tableResults['account'] = { data: null, error: null };
    tableResults['store'] = { data: null, error: null };

    const { POST } = await importRegisterRoute();
    const res = await POST(mockRequest({
      account_id: 'snake-store-acc',
      stores: [{
        store_id: 7,
        name: 'SnakeCase Store',
        city: 'Curepipe',
      }],
    }));
    const json = await res.json();

    expect(json.success).toBe(true);

    const storeUpsert = supabaseOps.find(op => op.table === 'store' && op.op === 'upsert');
    expect(storeUpsert).toBeDefined();
    expect(storeUpsert!.data.store_id).toBe(7);
  });
});

describe('/api/sync/register POST – product with all boolean flags', () => {
  it('registers product with all boolean flags set', async () => {
    tableResults['account'] = { data: null, error: null };
    tableResults['product'] = { data: null, error: null };

    const { POST } = await importRegisterRoute();
    const res = await POST(mockRequest({
      account_id: 'bool-flags-acc',
      products: [{
        product_id: 1,
        name: 'Full Flags Product',
        sellingprice: 250,
        isactive: 'Y',
        istaxincluded: 'Y',
        isstock: 'N',
        isvariableitem: 'Y',
        iskitchenitem: 'Y',
        ismodifier: 'Y',
        isfavourite: 'Y',
      }],
    }));
    const json = await res.json();

    expect(json.success).toBe(true);

    const productUpsert = supabaseOps.find(op => op.table === 'product' && op.op === 'upsert');
    expect(productUpsert).toBeDefined();
    expect(productUpsert!.data.isactive).toBe('Y');
    expect(productUpsert!.data.istaxincluded).toBe('Y');
    expect(productUpsert!.data.isstock).toBe('N');
    expect(productUpsert!.data.isvariableitem).toBe('Y');
    expect(productUpsert!.data.iskitchenitem).toBe('Y');
    expect(productUpsert!.data.ismodifier).toBe('Y');
    expect(productUpsert!.data.isfavourite).toBe('Y');
  });

  it('defaults boolean flags when not provided', async () => {
    tableResults['account'] = { data: null, error: null };
    tableResults['product'] = { data: null, error: null };

    const { POST } = await importRegisterRoute();
    const res = await POST(mockRequest({
      account_id: 'default-flags-acc',
      products: [{
        product_id: 1,
        name: 'No Flags Product',
        sellingprice: 100,
        // All boolean flags omitted
      }],
    }));
    const json = await res.json();

    expect(json.success).toBe(true);

    const productUpsert = supabaseOps.find(op => op.table === 'product' && op.op === 'upsert');
    expect(productUpsert).toBeDefined();
    expect(productUpsert!.data.isactive).toBe('Y');
    expect(productUpsert!.data.istaxincluded).toBe('N');
    expect(productUpsert!.data.isstock).toBe('Y');
    expect(productUpsert!.data.isvariableitem).toBe('N');
    expect(productUpsert!.data.iskitchenitem).toBe('N');
    expect(productUpsert!.data.ismodifier).toBe('N');
    expect(productUpsert!.data.isfavourite).toBe('N');
  });
});

describe('/api/sync/register POST – missing optional fields (currency default)', () => {
  it('defaults currency to MUR when not provided', async () => {
    tableResults['account'] = { data: null, error: null };

    const { POST } = await importRegisterRoute();
    const res = await POST(mockRequest({
      account_id: 'no-currency-acc',
      businessname: 'No Currency Shop',
      // currency intentionally omitted
    }));
    const json = await res.json();

    expect(json.success).toBe(true);

    const accountInsert = supabaseOps.find(op => op.table === 'account' && op.op === 'insert');
    expect(accountInsert).toBeDefined();
    expect(accountInsert!.data.currency).toBe('MUR');
  });

  it('defaults store currency to MUR when neither store nor request currency provided', async () => {
    tableResults['account'] = { data: null, error: null };
    tableResults['store'] = { data: null, error: null };

    const { POST } = await importRegisterRoute();
    const res = await POST(mockRequest({
      account_id: 'no-store-currency-acc',
      stores: [{
        store_id: 1,
        name: 'Default Currency Store',
        // no currency on store or request
      }],
    }));
    const json = await res.json();

    expect(json.success).toBe(true);

    const storeUpsert = supabaseOps.find(op => op.table === 'store' && op.op === 'upsert');
    expect(storeUpsert).toBeDefined();
    expect(storeUpsert!.data.currency).toBe('MUR');
  });
});

describe('/api/sync/register POST – re-register (upsert without error)', () => {
  it('re-registers same account: data gets upserted, returns existing businessname', async () => {
    tableResults['account'] = {
      data: { account_id: 'reregister-acc', businessname: 'Original Name' },
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
      account_id: 'reregister-acc',
      businessname: 'New Name Attempt',
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
    // Existing businessname is preserved, not overwritten
    expect(json.businessname).toBe('Original Name');

    // Verify all entity types were upserted
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

describe('/api/sync/register POST – user with all permission fields', () => {
  it('registers user with all permission-related fields populated', async () => {
    tableResults['account'] = { data: null, error: null };
    tableResults['pos_user'] = { data: null, error: null };

    const { POST } = await importRegisterRoute();
    const res = await POST(mockRequest({
      account_id: 'user-perms-acc',
      users: [{
        user_id: 1,
        username: 'manager',
        firstname: 'Jane',
        lastname: 'Doe',
        email: 'jane@example.com',
        pin: '9876',
        role: 'manager',
        isadmin: 'N',
        issalesrep: 'Y',
        permissions: 'refund,discount,void,reports',
        discountlimit: 25,
        isactive: 'Y',
      }],
    }));
    const json = await res.json();

    expect(json.success).toBe(true);

    const userUpsert = supabaseOps.find(op => op.table === 'pos_user' && op.op === 'upsert');
    expect(userUpsert).toBeDefined();
    expect(userUpsert!.data.username).toBe('manager');
    expect(userUpsert!.data.role).toBe('manager');
    expect(userUpsert!.data.isadmin).toBe('N');
    expect(userUpsert!.data.issalesrep).toBe('Y');
    expect(userUpsert!.data.permissions).toBe('refund,discount,void,reports');
    expect(userUpsert!.data.discountlimit).toBe(25);
    expect(userUpsert!.data.pin).toBe('9876');
  });
});

describe('/api/sync/register POST – terminal with cashUpSequence variants', () => {
  it('handles cash_up_sequence (snake_case)', async () => {
    tableResults['account'] = { data: null, error: null };
    tableResults['terminal'] = { data: null, error: null };

    const { POST } = await importRegisterRoute();
    const res = await POST(mockRequest({
      account_id: 'terminal-snake-acc',
      terminals: [{
        terminal_id: 1,
        store_id: 1,
        name: 'POS-1',
        prefix: 'P',
        cash_up_sequence: 42,
      }],
    }));
    const json = await res.json();

    expect(json.success).toBe(true);

    const terminalUpsert = supabaseOps.find(op => op.table === 'terminal' && op.op === 'upsert');
    expect(terminalUpsert).toBeDefined();
    expect(terminalUpsert!.data.cash_up_sequence).toBe(42);
  });

  it('handles cashUpSequence (camelCase)', async () => {
    tableResults['account'] = { data: null, error: null };
    tableResults['terminal'] = { data: null, error: null };

    const { POST } = await importRegisterRoute();
    const res = await POST(mockRequest({
      account_id: 'terminal-camel-acc',
      terminals: [{
        terminal_id: 2,
        store_id: 1,
        name: 'POS-2',
        prefix: 'Q',
        cashUpSequence: 99,
      }],
    }));
    const json = await res.json();

    expect(json.success).toBe(true);

    const terminalUpsert = supabaseOps.find(op => op.table === 'terminal' && op.op === 'upsert');
    expect(terminalUpsert).toBeDefined();
    expect(terminalUpsert!.data.cash_up_sequence).toBe(99);
  });

  it('handles terminalId (camelCase) on terminal', async () => {
    tableResults['account'] = { data: null, error: null };
    tableResults['terminal'] = { data: null, error: null };

    const { POST } = await importRegisterRoute();
    const res = await POST(mockRequest({
      account_id: 'terminal-camelid-acc',
      terminals: [{
        terminalId: 3,
        storeId: 1,
        name: 'POS-3',
        prefix: 'R',
      }],
    }));
    const json = await res.json();

    expect(json.success).toBe(true);

    const terminalUpsert = supabaseOps.find(op => op.table === 'terminal' && op.op === 'upsert');
    expect(terminalUpsert).toBeDefined();
    expect(terminalUpsert!.data.terminal_id).toBe(3);
    expect(terminalUpsert!.data.store_id).toBe(1);
  });
});

describe('/api/sync/register POST – product with empty string fields', () => {
  it('handles product with empty string image/upc/barcode', async () => {
    tableResults['account'] = { data: null, error: null };
    tableResults['product'] = { data: null, error: null };

    const { POST } = await importRegisterRoute();
    const res = await POST(mockRequest({
      account_id: 'empty-strings-acc',
      products: [{
        product_id: 1,
        name: 'No Image Product',
        sellingprice: 50,
        image: '',
        upc: '',
        itemcode: '',
        barcodetype: '',
      }],
    }));
    const json = await res.json();

    expect(json.success).toBe(true);

    const productUpsert = supabaseOps.find(op => op.table === 'product' && op.op === 'upsert');
    expect(productUpsert).toBeDefined();
    // Empty strings are falsy, so || "" defaults kick in, but result is still ""
    expect(productUpsert!.data.image).toBe('');
    expect(productUpsert!.data.upc).toBe('');
    expect(productUpsert!.data.itemcode).toBe('');
    expect(productUpsert!.data.barcodetype).toBe('');
  });
});

describe('/api/sync/register POST – category with position=0', () => {
  it('preserves position=0 on category (not defaulted)', async () => {
    tableResults['account'] = { data: null, error: null };
    tableResults['productcategory'] = { data: null, error: null };

    const { POST } = await importRegisterRoute();
    const res = await POST(mockRequest({
      account_id: 'cat-position-acc',
      categories: [{
        productcategory_id: 1,
        name: 'First Category',
        position: 0,
      }],
    }));
    const json = await res.json();

    expect(json.success).toBe(true);

    const catUpsert = supabaseOps.find(op => op.table === 'productcategory' && op.op === 'upsert');
    expect(catUpsert).toBeDefined();
    // position uses ?? so 0 should be preserved
    expect(catUpsert!.data.position).toBe(0);
  });
});
