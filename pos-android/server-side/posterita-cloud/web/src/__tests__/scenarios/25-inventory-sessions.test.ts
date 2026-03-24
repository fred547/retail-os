import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SKIP_SCENARIOS, getSupabase, testId } from './helpers';

const ACCOUNT_ID = testId('inv_api');
const STORE_ID = 95000 + Math.floor(Math.random() * 9000);
const TERMINAL_ID = STORE_ID;
let sessionId: number;
let productAId: number;
let productBId: number;

describe.skipIf(SKIP_SCENARIOS)('Scenario: Inventory Sessions & Entries', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({ account_id: ACCOUNT_ID, businessname: 'Inv API Test', type: 'live', status: 'active', currency: 'MUR' });
    await db.from('store').insert({ store_id: STORE_ID, account_id: ACCOUNT_ID, name: 'Warehouse', isactive: 'Y' });
    await db.from('terminal').insert({ terminal_id: TERMINAL_ID, account_id: ACCOUNT_ID, store_id: STORE_ID, name: 'Scanner', isactive: 'Y' });

    const { data: cat } = await db.from('productcategory').insert({
      account_id: ACCOUNT_ID, name: 'Inv Cat', isactive: 'Y', position: 1,
    }).select().single();

    const [pA, pB] = await Promise.all([
      db.from('product').insert({
        account_id: ACCOUNT_ID, name: 'Laptop', sellingprice: 25000, upc: `UPC-A-${STORE_ID}`,
        productcategory_id: cat!.productcategory_id, isactive: 'Y',
      }).select().single(),
      db.from('product').insert({
        account_id: ACCOUNT_ID, name: 'Mouse', sellingprice: 500, upc: `UPC-B-${STORE_ID}`,
        productcategory_id: cat!.productcategory_id, isactive: 'Y',
      }).select().single(),
    ]);
    productAId = pA.data!.product_id;
    productBId = pB.data!.product_id;
  }, 60000);

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
  }, 60000);

  it('creates a spot check session', async () => {
    const db = getSupabase();
    const { data, error } = await db.from('inventory_count_session').insert({
      account_id: ACCOUNT_ID,
      store_id: STORE_ID,
      type: 'spot_check',
      name: 'Afternoon Count',
      notes: 'Checking laptop and mouse stock',
      status: 'created',
      created_by: 1,
    }).select().single();
    expect(error).toBeNull();
    expect(data.name).toBe('Afternoon Count');
    expect(data.status).toBe('created');
    sessionId = data.session_id;
  });

  it('adds entries with upc codes', async () => {
    const db = getSupabase();
    const entries = [
      { session_id: sessionId, account_id: ACCOUNT_ID, product_id: productAId, product_name: 'Laptop', upc: `UPC-A-${STORE_ID}`, quantity: 5, scanned_by: 1, terminal_id: TERMINAL_ID },
      { session_id: sessionId, account_id: ACCOUNT_ID, product_id: productBId, product_name: 'Mouse', upc: `UPC-B-${STORE_ID}`, quantity: 20, scanned_by: 1, terminal_id: TERMINAL_ID },
    ];
    const { error: e1 } = await db.from('inventory_count_entry').insert(entries[0]);
    expect(e1).toBeNull();
    const { error: e2 } = await db.from('inventory_count_entry').insert(entries[1]);
    expect(e2).toBeNull();
  });

  it('transitions session created → active', async () => {
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

  it('increments quantity for same product (re-scan)', async () => {
    const db = getSupabase();
    // Scan 3 more laptops
    const { data: existing } = await db.from('inventory_count_entry')
      .select('entry_id, quantity')
      .eq('session_id', sessionId)
      .eq('product_id', productAId)
      .single();

    await db.from('inventory_count_entry')
      .update({ quantity: existing!.quantity + 3 })
      .eq('entry_id', existing!.entry_id);

    const { data: updated } = await db.from('inventory_count_entry')
      .select('quantity')
      .eq('entry_id', existing!.entry_id)
      .single();
    expect(updated!.quantity).toBe(8); // 5 + 3
  });

  it('aggregates entries by session', async () => {
    const db = getSupabase();
    const { data } = await db.from('inventory_count_entry')
      .select('product_name, quantity')
      .eq('session_id', sessionId)
      .order('product_name');
    expect(data!.length).toBe(2);
    // Laptop updated to 8, Mouse still 20
    const laptop = data!.find(e => e.product_name === 'Laptop');
    const mouse = data!.find(e => e.product_name === 'Mouse');
    expect(laptop!.quantity).toBe(8);
    expect(mouse!.quantity).toBe(20);
  });

  it('completes session with timestamp', async () => {
    const db = getSupabase();
    const { error } = await db.from('inventory_count_session')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('session_id', sessionId);
    expect(error).toBeNull();

    const { data } = await db.from('inventory_count_session')
      .select('status, completed_at, started_at')
      .eq('session_id', sessionId)
      .single();
    expect(data!.status).toBe('completed');
    expect(data!.completed_at).toBeTruthy();
    expect(data!.started_at).toBeTruthy();
  });

  it('completed session entries are immutable snapshot', async () => {
    const db = getSupabase();
    // Verify the entries still reflect the counts at completion time
    const { data: session } = await db.from('inventory_count_session')
      .select('status')
      .eq('session_id', sessionId)
      .single();
    expect(session!.status).toBe('completed');

    const { data: entries } = await db.from('inventory_count_entry')
      .select('quantity')
      .eq('session_id', sessionId);
    const totalUnits = entries!.reduce((sum, e) => sum + e.quantity, 0);
    expect(totalUnits).toBe(28); // 8 laptops + 20 mice
  });
});
