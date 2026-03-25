import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SKIP_SCENARIOS, getSupabase, testId } from './helpers';

const ACCOUNT_ID = testId('mod_mgmt');
let categoryId: number;
let productId: number;

describe.skipIf(SKIP_SCENARIOS)('Scenario: Modifier Management', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({
      account_id: ACCOUNT_ID, businessname: 'Modifier Test', type: 'live', status: 'active', currency: 'MUR',
    });
    const { data: cat } = await db.from('productcategory').insert({
      account_id: ACCOUNT_ID, name: 'Food', isactive: 'Y', position: 1,
    }).select('productcategory_id').single();
    categoryId = cat!.productcategory_id;

    const { data: prod } = await db.from('product').insert({
      account_id: ACCOUNT_ID, name: 'Burger', sellingprice: 250, productcategory_id: categoryId, isactive: 'Y',
    }).select('product_id').single();
    productId = prod!.product_id;
  }, 30000);

  afterAll(async () => {
    const db = getSupabase();
    await db.from('modifier').delete().eq('account_id', ACCOUNT_ID);
    await db.from('product').delete().eq('account_id', ACCOUNT_ID);
    await db.from('productcategory').delete().eq('account_id', ACCOUNT_ID);
    await db.from('account').delete().eq('account_id', ACCOUNT_ID);
  }, 30000);

  it('creates product-level modifiers', async () => {
    const db = getSupabase();
    const { data, error } = await db.from('modifier').insert([
      { account_id: ACCOUNT_ID, product_id: productId, name: 'Extra Cheese', sellingprice: 30, isactive: 'Y', ismodifier: 'Y' },
      { account_id: ACCOUNT_ID, product_id: productId, name: 'Bacon', sellingprice: 50, isactive: 'Y', ismodifier: 'Y' },
      { account_id: ACCOUNT_ID, product_id: productId, name: 'No Onion', sellingprice: 0, isactive: 'Y', ismodifier: 'Y' },
    ]).select();
    expect(error).toBeNull();
    expect(data!.length).toBe(3);
  });

  it('creates category-level modifiers', async () => {
    const db = getSupabase();
    const { data, error } = await db.from('modifier').insert([
      { account_id: ACCOUNT_ID, productcategory_id: categoryId, name: 'Large Size', sellingprice: 40, isactive: 'Y', ismodifier: 'Y' },
      { account_id: ACCOUNT_ID, productcategory_id: categoryId, name: 'Extra Sauce', sellingprice: 15, isactive: 'Y', ismodifier: 'Y' },
    ]).select();
    expect(error).toBeNull();
    expect(data!.length).toBe(2);
  });

  it('queries modifiers for a product', async () => {
    const db = getSupabase();
    const { data } = await db.from('modifier')
      .select('name, sellingprice')
      .eq('account_id', ACCOUNT_ID)
      .eq('product_id', productId)
      .eq('isactive', 'Y');
    expect(data!.length).toBe(3);
    expect(data!.some(m => m.name === 'Extra Cheese' && m.sellingprice === 30)).toBe(true);
  });

  it('queries modifiers for a category', async () => {
    const db = getSupabase();
    const { data } = await db.from('modifier')
      .select('name')
      .eq('account_id', ACCOUNT_ID)
      .eq('productcategory_id', categoryId);
    expect(data!.length).toBe(2);
    expect(data!.some(m => m.name === 'Large Size')).toBe(true);
  });

  it('deactivates a modifier', async () => {
    const db = getSupabase();
    const { data: mods } = await db.from('modifier')
      .select('modifier_id')
      .eq('account_id', ACCOUNT_ID)
      .eq('name', 'No Onion')
      .single();
    const { error } = await db.from('modifier')
      .update({ isactive: 'N' })
      .eq('modifier_id', mods!.modifier_id);
    expect(error).toBeNull();

    const { data: active } = await db.from('modifier')
      .select('*')
      .eq('account_id', ACCOUNT_ID)
      .eq('product_id', productId)
      .eq('isactive', 'Y');
    expect(active!.length).toBe(2);
  });

  it('modifiers scoped to account', async () => {
    const db = getSupabase();
    const { data } = await db.from('modifier')
      .select('*')
      .eq('account_id', 'nonexistent_mod_xyz');
    expect(data!.length).toBe(0);
  });
});
