import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SKIP_SCENARIOS, getSupabase, apiPostAuth, testId, cleanupTestAccount } from './helpers';

const ACCOUNT_ID = testId('ai_save');

describe.skipIf(SKIP_SCENARIOS)('Scenario: AI Import Save (/api/ai-import/save)', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({ account_id: ACCOUNT_ID, businessname: 'AI Import Test', type: 'testing', status: 'active', currency: 'MUR' });
  }, 60000);

  afterAll(async () => {
    try { await cleanupTestAccount(ACCOUNT_ID); } catch { /* best-effort */ }
  }, 60000);

  it('saves AI-discovered products with categories', async () => {
    const res = await apiPostAuth('/api/ai-import/save', {
      account_id: ACCOUNT_ID,
      store_name: 'AI Coffee Shop',
      tax_name: 'VAT 15%',
      tax_rate: 15,
      categories: [
        {
          name: 'Hot Drinks',
          products: [
            { name: 'Americano', price: 80, description: 'Black coffee' },
            { name: 'Flat White', price: 110, description: 'Smooth espresso' },
          ],
        },
        {
          name: 'Pastries',
          products: [
            { name: 'Croissant', price: 60, description: 'Butter croissant' },
          ],
        },
      ],
    }, ACCOUNT_ID);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.categories_created).toBe(2);
    expect(body.products_created).toBe(3);
  });

  it('products exist in DB with correct prices', async () => {
    const db = getSupabase();
    const { data } = await db.from('product')
      .select('name, sellingprice, source')
      .eq('account_id', ACCOUNT_ID)
      .order('name');
    expect(data!.length).toBe(3);
    expect(data!.find(p => p.name === 'Americano')!.sellingprice).toBe(80);
    expect(data!.find(p => p.name === 'Flat White')!.sellingprice).toBe(110);
    expect(data!.every(p => p.source === 'ai_import')).toBe(true);
  });

  it('categories created for each group', async () => {
    const db = getSupabase();
    const { data } = await db.from('productcategory')
      .select('name')
      .eq('account_id', ACCOUNT_ID)
      .order('name');
    expect(data!.length).toBe(2);
    expect(data!.map(c => c.name)).toEqual(['Hot Drinks', 'Pastries']);
  });

  it('taxes created for account', async () => {
    const db = getSupabase();
    const { data } = await db.from('tax')
      .select('name, rate')
      .eq('account_id', ACCOUNT_ID);
    expect(data!.length).toBe(2); // VAT 15% + No Tax
    expect(data!.some(t => t.name === 'VAT 15%' && t.rate === 15)).toBe(true);
  });

  it('account businessname updated', async () => {
    const db = getSupabase();
    const { data } = await db.from('account')
      .select('businessname, status')
      .eq('account_id', ACCOUNT_ID)
      .single();
    expect(data!.businessname).toBe('AI Coffee Shop');
    expect(data!.status).toBe('active');
  });

  it('rejects save without categories', async () => {
    const res = await apiPostAuth('/api/ai-import/save', {
      account_id: ACCOUNT_ID,
      categories: [],
    }, ACCOUNT_ID);
    expect(res.status).toBe(400);
  });

  it('rejects save without account_id', async () => {
    const res = await apiPostAuth('/api/ai-import/save', {
      categories: [{ name: 'Test', products: [] }],
    }, ACCOUNT_ID);
    expect(res.status).toBe(400);
  });
});
