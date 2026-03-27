import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SKIP_SCENARIOS, getSupabase, apiPostAuth, testId, cleanupTestAccount } from './helpers';

const ACCOUNT_ID = testId('data_api');
const STORE_ID = 34000 + Math.floor(Math.random() * 9000);
let categoryId: number;
let productId: number;

describe.skipIf(SKIP_SCENARIOS)('Scenario: Data CRUD API (/api/data/*)', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({ account_id: ACCOUNT_ID, businessname: 'Data API Test', type: 'testing', status: 'active', currency: 'MUR' });
    await db.from('store').insert({ store_id: STORE_ID, account_id: ACCOUNT_ID, name: 'API Store', isactive: 'Y' });
  }, 60000);

  afterAll(async () => {
    try { await cleanupTestAccount(ACCOUNT_ID); } catch { /* best-effort */ }
  }, 60000);

  // --- /api/data/insert ---

  it('inserts a category via /api/data/insert', async () => {
    const res = await apiPostAuth('/api/data/insert', {
      table: 'productcategory',
      data: { name: 'API Drinks', isactive: 'Y', position: 1 },
    }, ACCOUNT_ID);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBeNull();
    expect(body.data?.[0]?.name).toBe('API Drinks');
    categoryId = body.data[0].productcategory_id;
  });

  it('inserts a product via /api/data/insert', async () => {
    const res = await apiPostAuth('/api/data/insert', {
      table: 'product',
      data: { name: 'Espresso', sellingprice: 80, productcategory_id: categoryId, isactive: 'Y' },
    }, ACCOUNT_ID);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBeNull();
    expect(body.data?.[0]?.name).toBe('Espresso');
    productId = body.data[0].product_id;
  });

  it('auto-injects account_id on insert', async () => {
    const db = getSupabase();
    const { data } = await db.from('product')
      .select('account_id')
      .eq('product_id', productId)
      .single();
    expect(data!.account_id).toBe(ACCOUNT_ID);
  });

  it('rejects insert to non-whitelisted table', async () => {
    const res = await apiPostAuth('/api/data/insert', {
      table: 'owner',
      data: { name: 'Hacker' },
    }, ACCOUNT_ID);
    expect(res.status).not.toBe(200);
  });

  // --- /api/data (query) ---

  it('queries products via /api/data', async () => {
    const res = await apiPostAuth('/api/data', {
      table: 'product',
      select: 'product_id, name, sellingprice',
    }, ACCOUNT_ID);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data?.length).toBeGreaterThanOrEqual(1);
    expect(body.data?.some((p: any) => p.name === 'Espresso')).toBe(true);
  });

  it('query auto-scopes to account_id', async () => {
    // Query with a different account — should get nothing from our data
    const res = await apiPostAuth('/api/data', {
      table: 'product',
      select: 'name',
      filters: [{ column: 'account_id', op: 'eq', value: 'nonexistent_xyz' }],
    }, ACCOUNT_ID);
    // Should be rejected (account_id filter doesn't match session)
    // or return empty
    const body = await res.json();
    expect(body.data?.length ?? 0).toBe(0);
  });

  it('query with limit and order', async () => {
    // Insert another product first
    await apiPostAuth('/api/data/insert', {
      table: 'product',
      data: { name: 'Latte', sellingprice: 120, productcategory_id: categoryId, isactive: 'Y' },
    }, ACCOUNT_ID);

    const res = await apiPostAuth('/api/data', {
      table: 'product',
      select: 'name, sellingprice',
      order: { column: 'sellingprice', ascending: true },
      limit: 10,
    }, ACCOUNT_ID);
    const body = await res.json();
    expect(body.data?.length).toBe(2);
    expect(body.data[0].name).toBe('Espresso'); // 80 < 120
    expect(body.data[1].name).toBe('Latte');
  });

  // --- /api/data/update ---

  it('updates product price via /api/data/update', async () => {
    const res = await apiPostAuth('/api/data/update', {
      table: 'product',
      id: { column: 'product_id', value: productId },
      updates: { sellingprice: 95 },
    }, ACCOUNT_ID);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBeNull();

    // Verify in DB
    const db = getSupabase();
    const { data } = await db.from('product').select('sellingprice').eq('product_id', productId).single();
    expect(data!.sellingprice).toBe(95);
  });

  // --- /api/data/delete ---

  it('soft-deletes product via /api/data/delete', async () => {
    const res = await apiPostAuth('/api/data/delete', {
      table: 'product',
      id: { column: 'product_id', value: productId },
    }, ACCOUNT_ID);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBeNull();
    expect(body.soft_deleted).toBe(true);

    // Verify in DB — record still exists but marked deleted
    const db = getSupabase();
    const { data } = await db.from('product').select('is_deleted, deleted_at').eq('product_id', productId).single();
    expect(data!.is_deleted).toBe(true);
    expect(data!.deleted_at).toBeTruthy();
  });

  it('soft-deleted product excluded from /api/data query', async () => {
    const res = await apiPostAuth('/api/data', {
      table: 'product',
      select: 'name',
    }, ACCOUNT_ID);
    const body = await res.json();
    const names = (body.data || []).map((p: any) => p.name);
    expect(names).not.toContain('Espresso'); // soft-deleted
    expect(names).toContain('Latte'); // still active
  });

  it('hard-deletes modifier via /api/data/delete', async () => {
    // Insert a modifier first
    const db = getSupabase();
    const { data: mod } = await db.from('modifier').insert({
      account_id: ACCOUNT_ID, name: 'Extra Shot', sellingprice: 20, isactive: 'Y', ismodifier: 'Y',
    }).select().single();

    const res = await apiPostAuth('/api/data/delete', {
      table: 'modifier',
      id: { column: 'modifier_id', value: mod!.modifier_id },
    }, ACCOUNT_ID);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBeNull();

    // Verify hard deleted — no record at all
    const { data } = await db.from('modifier').select('*').eq('modifier_id', mod!.modifier_id);
    expect(data?.length).toBe(0);
  });
});
