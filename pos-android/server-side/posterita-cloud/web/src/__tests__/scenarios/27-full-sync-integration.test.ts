import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SKIP_SCENARIOS, getSupabase, apiPost, testId, testUuid, cleanupTestAccount } from './helpers';

const ACCOUNT_ID = testId('full_sync');
const STORE_ID = 97000 + Math.floor(Math.random() * 9000);
const TERMINAL_ID = STORE_ID;
const ORDER_BASE = STORE_ID * 10;

describe.skipIf(SKIP_SCENARIOS)('Scenario: Full Sync Integration', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({ account_id: ACCOUNT_ID, businessname: 'Full Sync', type: 'testing', status: 'active', currency: 'MUR' });
    await db.from('store').insert({ store_id: STORE_ID, account_id: ACCOUNT_ID, name: 'Main Store', isactive: 'Y' });
    await db.from('terminal').insert({ terminal_id: TERMINAL_ID, account_id: ACCOUNT_ID, store_id: STORE_ID, name: 'POS 1', isactive: 'Y' });

    // Seed pull data
    const { data: cat } = await db.from('productcategory').insert({
      account_id: ACCOUNT_ID, name: 'Main', isactive: 'Y', position: 1,
    }).select().single();
    await Promise.all([
      db.from('product').insert([
        { account_id: ACCOUNT_ID, name: 'Coffee', sellingprice: 50, productcategory_id: cat!.productcategory_id, isactive: 'Y' },
        { account_id: ACCOUNT_ID, name: 'Tea', sellingprice: 35, productcategory_id: cat!.productcategory_id, isactive: 'Y' },
      ]),
      db.from('tax').insert([
        { account_id: ACCOUNT_ID, name: 'VAT 15%', rate: 15, isactive: 'Y' },
        { account_id: ACCOUNT_ID, name: 'No Tax', rate: 0, isactive: 'Y' },
      ]),
    ]);
  }, 30000);

  afterAll(async () => {
    try {
      const db = getSupabase();
      await db.from('customer').delete().eq('account_id', ACCOUNT_ID);
      await cleanupTestAccount(ACCOUNT_ID);
    } catch { /* best-effort */ }
  }, 30000);

  it('pushes orders + customers + till in single sync', async () => {
    const res = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: '1970-01-01T00:00:00.000Z',
      orders: [{
        order_id: ORDER_BASE + 1,
        terminal_id: TERMINAL_ID,
        store_id: STORE_ID,
        document_no: 'FS-001',
        grand_total: 150,
        subtotal: 130.43,
        tax_total: 19.57,
        qty_total: 2,
        is_paid: true,
        doc_status: 'CO',
        order_type: 'Sale',
        date_ordered: new Date().toISOString(),
        uuid: testUuid(),
      }],
      order_lines: [{
        orderline_id: ORDER_BASE + 101,
        order_id: ORDER_BASE + 1,
        product_id: 1,
        productname: 'Coffee',
        qtyentered: 2,
        priceentered: 50,
        lineamt: 100,
        linenetamt: 100,
        tax_id: 0,
        costamt: 0,
      }],
      customers: [{
        customer_id: STORE_ID + 500,
        name: 'Jane Doe',
        email: `jane-${Date.now()}@test.com`,
        phone1: '+2305550001',
        account_id: ACCOUNT_ID,
      }],
      tills: [{
        till_id: STORE_ID,
        terminal_id: TERMINAL_ID,
        store_id: STORE_ID,
        opening_amt: 1000,
        date_opened: new Date().toISOString(),
        document_no: 'TILL-FS-001',
        uuid: testUuid(),
        open_by: 1,
      }],
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.orders_synced).toBeGreaterThanOrEqual(1);
    expect(body.tills_synced).toBeGreaterThanOrEqual(1);
  });

  it('pull returns all entity types', async () => {
    const res = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: '1970-01-01T00:00:00.000Z',
    });
    expect(res.status).toBe(200);
    const body = await res.json();

    // Verify all pull categories are present
    expect(body.products?.length).toBeGreaterThanOrEqual(2);
    expect(body.product_categories?.length).toBeGreaterThanOrEqual(1);
    expect(body.taxes?.length).toBeGreaterThanOrEqual(2);
    expect(body.stores?.length).toBeGreaterThanOrEqual(1);
    expect(body.terminals?.length).toBeGreaterThanOrEqual(1);
    expect(body.customers?.length).toBeGreaterThanOrEqual(1);
  });

  it('incremental sync only returns changes after timestamp', async () => {
    // Get server time from a full sync first
    const fullRes = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: '1970-01-01T00:00:00.000Z',
    });
    const fullBody = await fullRes.json();
    const serverTime = fullBody.server_time;

    // Now do incremental sync — nothing changed, so should get empty/minimal data
    const incRes = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: serverTime,
    });
    expect(incRes.status).toBe(200);
    const incBody = await incRes.json();
    // Products haven't changed since serverTime, so should be empty
    expect(incBody.products?.length ?? 0).toBe(0);
  });

  it('pushed customer exists in Supabase', async () => {
    const db = getSupabase();
    const { data } = await db.from('customer')
      .select('*')
      .eq('account_id', ACCOUNT_ID)
      .eq('name', 'Jane Doe');
    expect(data?.length).toBe(1);
    expect(data![0].phone1).toBe('+2305550001');
  });

  it('pushed order and orderline exist in Supabase', async () => {
    const db = getSupabase();
    const [orders, lines] = await Promise.all([
      db.from('orders').select('*').eq('account_id', ACCOUNT_ID).eq('document_no', 'FS-001'),
      db.from('orderline').select('*').eq('order_id', ORDER_BASE + 1),
    ]);
    expect(orders.data?.length).toBe(1);
    expect(orders.data![0].grand_total).toBe(150);
    expect(lines.data?.length).toBe(1);
    expect(lines.data![0].productname).toBe('Coffee');
  });

  it('sync response includes server_time for next sync', async () => {
    const res = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: '1970-01-01T00:00:00.000Z',
    });
    const body = await res.json();
    expect(body.server_time).toBeTruthy();
    // server_time should be a valid ISO date
    const parsed = new Date(body.server_time);
    expect(parsed.getTime()).toBeGreaterThan(0);
  });
});
