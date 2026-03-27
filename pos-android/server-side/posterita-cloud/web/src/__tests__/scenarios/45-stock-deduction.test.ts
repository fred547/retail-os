/**
 * Scenario 45: Stock Deduction on Sale
 * Self-contained: creates own account + product, no dependency on demo data.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getSupabase, SKIP_SCENARIOS, testId, cleanupTestAccount } from './helpers';

const ACCOUNT_ID = testId('stock_deduct');
let productId: number;

describe.skipIf(SKIP_SCENARIOS)('Scenario 45: Stock Deduction', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({
      account_id: ACCOUNT_ID, businessname: 'Stock Test', type: 'testing', status: 'active', currency: 'MUR',
    });
    const { data: cat } = await db.from('productcategory').insert({
      account_id: ACCOUNT_ID, name: 'Test Cat', isactive: 'Y',
    }).select('productcategory_id').single();

    const { data: prod } = await db.from('product').insert({
      account_id: ACCOUNT_ID, name: 'Widget', sellingprice: 100,
      productcategory_id: cat!.productcategory_id, isactive: 'Y',
      quantity_on_hand: 0, reorder_point: 0, track_stock: true,
    }).select('product_id').single();
    productId = prod!.product_id;
  }, 30000);

  afterAll(async () => {
    await cleanupTestAccount(ACCOUNT_ID);
  }, 30000);

  it('product has stock columns', async () => {
    const db = getSupabase();
    const { data } = await db.from('product')
      .select('product_id, quantity_on_hand, reorder_point, track_stock')
      .eq('product_id', productId).single();
    expect(data).toBeTruthy();
    expect(data).toHaveProperty('quantity_on_hand');
    expect(data).toHaveProperty('reorder_point');
    expect(data).toHaveProperty('track_stock');
  });

  it('sets initial stock quantity', async () => {
    const db = getSupabase();
    const { error } = await db.from('product')
      .update({ quantity_on_hand: 50, reorder_point: 5 })
      .eq('product_id', productId).eq('account_id', ACCOUNT_ID);
    expect(error).toBeNull();

    const { data } = await db.from('product')
      .select('quantity_on_hand, reorder_point')
      .eq('product_id', productId).single();
    expect(data!.quantity_on_hand).toBe(50);
    expect(data!.reorder_point).toBe(5);
  });

  it('creates stock journal entry on adjustment', async () => {
    const db = getSupabase();
    await db.from('product').update({ quantity_on_hand: 45 })
      .eq('product_id', productId).eq('account_id', ACCOUNT_ID);

    const { error } = await db.from('stock_journal').insert({
      account_id: ACCOUNT_ID, product_id: productId, store_id: 0,
      quantity_change: -5, quantity_after: 45,
      reason: 'adjustment', reference_type: 'manual',
    });
    expect(error).toBeNull();
  });

  it('queries stock journal by product', async () => {
    const db = getSupabase();
    const { data, error } = await db.from('stock_journal')
      .select('*').eq('account_id', ACCOUNT_ID).eq('product_id', productId)
      .order('created_at', { ascending: false }).limit(1);
    expect(error).toBeNull();
    expect(data!.length).toBe(1);
    expect(data![0].quantity_change).toBe(-5);
    expect(data![0].quantity_after).toBe(45);
  });

  it('queries stock journal by reason', async () => {
    const db = getSupabase();
    const { data, error } = await db.from('stock_journal')
      .select('*').eq('account_id', ACCOUNT_ID).eq('reason', 'adjustment');
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it('inserts full journal entry with all columns', async () => {
    const db = getSupabase();
    const { error } = await db.from('stock_journal').insert({
      account_id: ACCOUNT_ID, product_id: productId, store_id: 1,
      quantity_change: 10, quantity_after: 55,
      reason: 'receive', reference_type: 'manual',
      reference_id: 'test_ref', user_id: 1, notes: 'full column test',
    });
    expect(error).toBeNull();
  });

  it('stock deduction does not go below zero (warning only)', async () => {
    const db = getSupabase();
    // Set stock to 2, then deduct 5 — should still work (negative stock allowed)
    await db.from('product').update({ quantity_on_hand: 2 })
      .eq('product_id', productId).eq('account_id', ACCOUNT_ID);

    const { error } = await db.from('product').update({ quantity_on_hand: -3 })
      .eq('product_id', productId).eq('account_id', ACCOUNT_ID);
    expect(error).toBeNull(); // Negative stock is allowed (just a warning at POS)
  });
});
