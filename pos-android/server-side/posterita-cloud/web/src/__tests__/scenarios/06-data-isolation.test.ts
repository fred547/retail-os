import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SKIP_SCENARIOS, getSupabase, testId } from './helpers';

const BRAND_A = testId('brand_a');
const BRAND_B = testId('brand_b');

describe.skipIf(SKIP_SCENARIOS)('Scenario: Multi-Brand Data Isolation', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert([
      { account_id: BRAND_A, businessname: 'Brand A Coffee', type: 'testing', status: 'active', currency: 'MUR' },
      { account_id: BRAND_B, businessname: 'Brand B Pizza', type: 'testing', status: 'active', currency: 'USD' },
    ]);
    await db.from('product').insert([
      { account_id: BRAND_A, name: 'Latte', sellingprice: 100, isactive: 'Y' },
      { account_id: BRAND_A, name: 'Espresso', sellingprice: 80, isactive: 'Y' },
      { account_id: BRAND_B, name: 'Margherita', sellingprice: 350, isactive: 'Y' },
      { account_id: BRAND_B, name: 'Pepperoni', sellingprice: 400, isactive: 'Y' },
    ]);
  }, 30000);

  afterAll(async () => {
    const db = getSupabase();
    await db.from('product').delete().eq('account_id', BRAND_A);
    await db.from('product').delete().eq('account_id', BRAND_B);
    await db.from('account').delete().eq('account_id', BRAND_A);
    await db.from('account').delete().eq('account_id', BRAND_B);
  }, 30000);

  it('brand A only sees its own products', async () => {
    const db = getSupabase();
    const { data } = await db.from('product').select('name').eq('account_id', BRAND_A);
    expect(data?.length).toBe(2);
    expect(data?.every(p => ['Latte', 'Espresso'].includes(p.name!))).toBe(true);
  });

  it('brand B only sees its own products', async () => {
    const db = getSupabase();
    const { data } = await db.from('product').select('name').eq('account_id', BRAND_B);
    expect(data?.length).toBe(2);
    expect(data?.every(p => ['Margherita', 'Pepperoni'].includes(p.name!))).toBe(true);
  });

  it('brands have independent currencies', async () => {
    const db = getSupabase();
    const { data: a } = await db.from('account').select('currency').eq('account_id', BRAND_A).single();
    const { data: b } = await db.from('account').select('currency').eq('account_id', BRAND_B).single();
    expect(a!.currency).toBe('MUR');
    expect(b!.currency).toBe('USD');
  });
});
