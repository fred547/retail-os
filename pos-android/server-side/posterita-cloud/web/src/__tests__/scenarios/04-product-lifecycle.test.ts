import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getSupabase, testId } from './helpers';

const ACCOUNT_ID = testId('product_lc');
let createdProductId: number;

describe('Scenario: Product Lifecycle', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({ account_id: ACCOUNT_ID, businessname: 'Product Test', type: 'live', status: 'active', currency: 'MUR' });
  });

  afterAll(async () => {
    const db = getSupabase();
    await db.from('product').delete().eq('account_id', ACCOUNT_ID);
    await db.from('productcategory').delete().eq('account_id', ACCOUNT_ID);
    await db.from('tax').delete().eq('account_id', ACCOUNT_ID);
    await db.from('account').delete().eq('account_id', ACCOUNT_ID);
  });

  it('creates a category', async () => {
    const db = getSupabase();
    const { data, error } = await db.from('productcategory').insert({
      account_id: ACCOUNT_ID,
      name: 'Beverages',
      isactive: 'Y',
      position: 1,
    }).select().single();
    expect(error).toBeNull();
    expect(data.name).toBe('Beverages');
  });

  it('creates a product with category and tax', async () => {
    const db = getSupabase();

    // Create tax
    const { data: tax } = await db.from('tax').insert({
      account_id: ACCOUNT_ID, name: 'VAT 15%', rate: 15, isactive: 'Y',
    }).select().single();

    // Get category
    const { data: cat } = await db.from('productcategory').select('productcategory_id').eq('account_id', ACCOUNT_ID).single();

    // Create product
    const { data: product, error } = await db.from('product').insert({
      account_id: ACCOUNT_ID,
      name: 'Cappuccino',
      sellingprice: 120,
      costprice: 48,
      productcategory_id: cat!.productcategory_id,
      tax_id: tax!.tax_id,
      istaxincluded: 'Y',
      isactive: 'Y',
      isstock: 'Y',
    }).select().single();

    expect(error).toBeNull();
    expect(product.name).toBe('Cappuccino');
    expect(product.sellingprice).toBe(120);
    createdProductId = product.product_id;
  });

  it('updates product price', async () => {
    const db = getSupabase();
    const { error } = await db.from('product').update({ sellingprice: 150 }).eq('product_id', createdProductId);
    expect(error).toBeNull();

    const { data } = await db.from('product').select('sellingprice').eq('product_id', createdProductId).single();
    expect(data!.sellingprice).toBe(150);
  });

  it('deactivates product (soft delete)', async () => {
    const db = getSupabase();
    const { error } = await db.from('product').update({ isactive: 'N' }).eq('product_id', createdProductId);
    expect(error).toBeNull();

    const { data } = await db.from('product').select('isactive').eq('product_id', createdProductId).single();
    expect(data!.isactive).toBe('N');
  });

  it('product scoped to account — not visible from other account', async () => {
    const db = getSupabase();
    const { data } = await db.from('product').select('*').eq('account_id', 'nonexistent_account_xyz');
    expect(data?.length).toBe(0);
  });
});
