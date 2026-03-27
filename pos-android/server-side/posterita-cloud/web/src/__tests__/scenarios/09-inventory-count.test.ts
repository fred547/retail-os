import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SKIP_SCENARIOS, getSupabase, testId } from './helpers';

const ACCOUNT_ID = testId('inv_count');
const STORE_ID = 90000 + Math.floor(Math.random() * 9000);
const TERMINAL_ID = STORE_ID;
let sessionId: number;
let productAId: number;
let productBId: number;

describe.skipIf(SKIP_SCENARIOS)('Scenario: Inventory Count', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({ account_id: ACCOUNT_ID, businessname: 'Inventory Test', type: 'testing', status: 'active', currency: 'MUR' });
    await db.from('store').insert({ store_id: STORE_ID, account_id: ACCOUNT_ID, name: 'Warehouse', isactive: 'Y' });
    await db.from('terminal').insert({ terminal_id: TERMINAL_ID, account_id: ACCOUNT_ID, store_id: STORE_ID, name: 'Scanner 1', isactive: 'Y' });

    // Create two test products
    const { data: catData } = await db.from('productcategory').insert({
      account_id: ACCOUNT_ID, name: 'Inventory Cat', isactive: 'Y', position: 1,
    }).select().single();

    const { data: pA } = await db.from('product').insert({
      account_id: ACCOUNT_ID, name: 'Widget A', sellingprice: 50, productcategory_id: catData!.productcategory_id, isactive: 'Y',
    }).select().single();
    productAId = pA!.product_id;

    const { data: pB } = await db.from('product').insert({
      account_id: ACCOUNT_ID, name: 'Widget B', sellingprice: 75, productcategory_id: catData!.productcategory_id, isactive: 'Y',
    }).select().single();
    productBId = pB!.product_id;
  }, 30000);

  afterAll(async () => {
    const db = getSupabase();
    if (sessionId) {
      await db.from('inventory_count_entry').delete().eq('session_id', sessionId);
      await db.from('inventory_count_session').delete().eq('session_id', sessionId);
    }
    await db.from('product').delete().eq('account_id', ACCOUNT_ID);
    await db.from('productcategory').delete().eq('account_id', ACCOUNT_ID);
    await db.from('terminal').delete().eq('account_id', ACCOUNT_ID);
    await db.from('store').delete().eq('account_id', ACCOUNT_ID);
    await db.from('account').delete().eq('account_id', ACCOUNT_ID);
  }, 30000);

  it('creates an inventory count session', async () => {
    const db = getSupabase();
    const { data, error } = await db.from('inventory_count_session').insert({
      account_id: ACCOUNT_ID,
      store_id: STORE_ID,
      type: 'spot_check',
      name: 'Morning Count',
      status: 'created',
      created_by: 1,
    }).select().single();
    expect(error).toBeNull();
    expect(data.status).toBe('created');
    expect(data.store_id).toBe(STORE_ID);
    sessionId = data.session_id;
  });

  it('adds entries to the session', async () => {
    const db = getSupabase();
    const { error: e1 } = await db.from('inventory_count_entry').insert({
      session_id: sessionId,
      account_id: ACCOUNT_ID,
      product_id: productAId,
      product_name: 'Widget A',
      quantity: 10,
      scanned_by: 1,
      terminal_id: TERMINAL_ID,
    });
    expect(e1).toBeNull();

    const { error: e2 } = await db.from('inventory_count_entry').insert({
      session_id: sessionId,
      account_id: ACCOUNT_ID,
      product_id: productBId,
      product_name: 'Widget B',
      quantity: 5,
      scanned_by: 1,
      terminal_id: TERMINAL_ID,
    });
    expect(e2).toBeNull();
  });

  it('reads entries back with correct quantities', async () => {
    const db = getSupabase();
    const { data } = await db.from('inventory_count_entry')
      .select('*')
      .eq('session_id', sessionId)
      .order('product_id');
    expect(data?.length).toBe(2);
    expect(data![0].quantity).toBe(10);
    expect(data![1].quantity).toBe(5);
  });

  it('transitions session from created to active', async () => {
    const db = getSupabase();
    const { error } = await db.from('inventory_count_session')
      .update({ status: 'active', started_at: new Date().toISOString() })
      .eq('session_id', sessionId);
    expect(error).toBeNull();

    const { data } = await db.from('inventory_count_session')
      .select('status, started_at')
      .eq('session_id', sessionId)
      .single();
    expect(data!.status).toBe('active');
    expect(data!.started_at).toBeTruthy();
  });

  it('completes the session', async () => {
    const db = getSupabase();
    const { error } = await db.from('inventory_count_session')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('session_id', sessionId);
    expect(error).toBeNull();

    const { data } = await db.from('inventory_count_session')
      .select('status, completed_at')
      .eq('session_id', sessionId)
      .single();
    expect(data!.status).toBe('completed');
    expect(data!.completed_at).toBeTruthy();
  });

  it('entries scoped to session — other sessions return empty', async () => {
    const db = getSupabase();
    const { data } = await db.from('inventory_count_entry')
      .select('*')
      .eq('session_id', 999999999);
    expect(data?.length).toBe(0);
  });
});
