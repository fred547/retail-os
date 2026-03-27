/**
 * Scenario 48: Warehouse Workflows
 * Self-contained: creates own account + product + store.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getSupabase, SKIP_SCENARIOS, testId, cleanupTestAccount } from './helpers';

const ACCOUNT_ID = testId('warehouse_wf');
let productId: number;
let storeId: number;

describe.skipIf(SKIP_SCENARIOS)('Scenario 48: Warehouse Workflows', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({
      account_id: ACCOUNT_ID, businessname: 'Warehouse Test', type: 'testing', status: 'active', currency: 'MUR',
    });
    const { data: store } = await db.from('store').insert({
      account_id: ACCOUNT_ID, name: 'Warehouse A', isactive: 'Y',
    }).select('store_id').single();
    storeId = store!.store_id;

    const { data: cat } = await db.from('productcategory').insert({
      account_id: ACCOUNT_ID, name: 'Perishable', isactive: 'Y',
    }).select('productcategory_id').single();

    const { data: prod } = await db.from('product').insert({
      account_id: ACCOUNT_ID, name: 'Milk', sellingprice: 45,
      productcategory_id: cat!.productcategory_id, isactive: 'Y',
      quantity_on_hand: 0, reorder_point: 0, track_stock: true,
    }).select('product_id').single();
    productId = prod!.product_id;
  }, 30000);

  afterAll(async () => {
    await cleanupTestAccount(ACCOUNT_ID);
  }, 30000);

  it('manual stock adjustment updates quantity', async () => {
    const db = getSupabase();
    const { error } = await db.from('product')
      .update({ quantity_on_hand: 100 })
      .eq('product_id', productId).eq('account_id', ACCOUNT_ID);
    expect(error).toBeNull();

    const { data } = await db.from('product')
      .select('quantity_on_hand')
      .eq('product_id', productId).single();
    expect(data!.quantity_on_hand).toBe(100);
  });

  it('stock journal records transfer', async () => {
    const db = getSupabase();
    const { error } = await db.from('stock_journal').insert({
      account_id: ACCOUNT_ID, product_id: productId, store_id: storeId,
      quantity_change: -30, quantity_after: 70,
      reason: 'transfer', reference_type: 'manual',
    });
    expect(error).toBeNull();

    const { data } = await db.from('stock_journal')
      .select('*').eq('product_id', productId).eq('account_id', ACCOUNT_ID)
      .order('created_at', { ascending: false }).limit(1);
    expect(data![0].quantity_change).toBe(-30);
    expect(data![0].reason).toBe('transfer');
  });

  it('low stock filter works', async () => {
    const db = getSupabase();
    await db.from('product').update({ quantity_on_hand: 3, reorder_point: 10 })
      .eq('product_id', productId).eq('account_id', ACCOUNT_ID);

    const { data } = await db.from('product')
      .select('product_id, quantity_on_hand, reorder_point')
      .eq('account_id', ACCOUNT_ID).eq('track_stock', true);
    const low = (data ?? []).filter((p: any) => p.quantity_on_hand <= p.reorder_point);
    expect(low.length).toBeGreaterThan(0);
  });

  it('out of stock filter works', async () => {
    const db = getSupabase();
    await db.from('product').update({ quantity_on_hand: 0 })
      .eq('product_id', productId).eq('account_id', ACCOUNT_ID);

    const { data } = await db.from('product')
      .select('product_id, quantity_on_hand')
      .eq('account_id', ACCOUNT_ID).eq('track_stock', true).lte('quantity_on_hand', 0);
    expect(data!.some((p: any) => p.product_id === productId)).toBe(true);
  });

  it('shelf location and batch number', async () => {
    const db = getSupabase();
    const { error } = await db.from('product').update({
      shelf_location: 'B-4-2', batch_number: 'BATCH-001',
    }).eq('product_id', productId).eq('account_id', ACCOUNT_ID);
    expect(error).toBeNull();

    const { data } = await db.from('product')
      .select('shelf_location, batch_number')
      .eq('product_id', productId).single();
    expect(data!.shelf_location).toBe('B-4-2');
    expect(data!.batch_number).toBe('BATCH-001');
  });

  it('expiry date filter finds products expiring within 30 days', async () => {
    const db = getSupabase();
    const in15d = new Date();
    in15d.setDate(in15d.getDate() + 15);

    await db.from('product').update({
      expiry_date: in15d.toISOString(), quantity_on_hand: 50,
    }).eq('product_id', productId).eq('account_id', ACCOUNT_ID);

    const in30d = new Date();
    in30d.setDate(in30d.getDate() + 30);

    const { data } = await db.from('product')
      .select('product_id, expiry_date')
      .eq('account_id', ACCOUNT_ID).eq('is_deleted', false)
      .not('expiry_date', 'is', null).lte('expiry_date', in30d.toISOString());
    expect(data!.length).toBeGreaterThan(0);
  });
});
