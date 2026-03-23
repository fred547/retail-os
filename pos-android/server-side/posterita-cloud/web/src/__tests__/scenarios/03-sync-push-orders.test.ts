import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SKIP_SCENARIOS, getSupabase, apiPost, testId, testUuid } from './helpers';

const ACCOUNT_ID = testId('sync_order');
const STORE_ID = 60000 + Math.floor(Math.random() * 9000);
const TERMINAL_ID = STORE_ID;
const ORDER_BASE = STORE_ID * 10;

describe.skipIf(SKIP_SCENARIOS)('Scenario: Sync Push Orders', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({ account_id: ACCOUNT_ID, businessname: 'Sync Test', type: 'live', status: 'active', currency: 'MUR' });
    await db.from('store').insert({ store_id: STORE_ID, account_id: ACCOUNT_ID, name: 'Test Store', isactive: 'Y' });
    await db.from('terminal').insert({ terminal_id: TERMINAL_ID, account_id: ACCOUNT_ID, store_id: STORE_ID, name: 'POS 1', isactive: 'Y' });
  }, 30000);

  afterAll(async () => {
    const db = getSupabase();
    await db.from('orders').delete().eq('account_id', ACCOUNT_ID);
    // orderline has no account_id — clean up by order_ids we used
    await db.from('orderline').delete().in('order_id', [ORDER_BASE + 1, ORDER_BASE + 2, ORDER_BASE + 3]);
    await db.from('product').delete().eq('account_id', ACCOUNT_ID);
    await db.from('productcategory').delete().eq('account_id', ACCOUNT_ID);
    await db.from('terminal').delete().eq('account_id', ACCOUNT_ID);
    await db.from('store').delete().eq('account_id', ACCOUNT_ID);
    await db.from('account').delete().eq('account_id', ACCOUNT_ID);
  }, 30000);

  it('pushes a single order via sync', async () => {
    const res = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: '1970-01-01T00:00:00.000Z',
      orders: [{
        order_id: ORDER_BASE + 1,
        terminal_id: TERMINAL_ID,
        store_id: STORE_ID,
        document_no: 'TEST-000001',
        grand_total: 500.00,
        subtotal: 434.78,
        tax_total: 65.22,
        qty_total: 3,
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
        productname: 'Test Product',
        qtyentered: 3,
        priceentered: 166.67,
        lineamt: 500.00,
        linenetamt: 500.00,
        tax_id: 0,
        costamt: 0,
      }],
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.orders_synced).toBeGreaterThanOrEqual(1);
  });

  it('order exists in Supabase after sync', async () => {
    const db = getSupabase();
    const { data } = await db.from('orders').select('*').eq('account_id', ACCOUNT_ID).eq('order_id', ORDER_BASE + 1);
    expect(data?.length).toBe(1);
    expect(data![0].grand_total).toBe(500.00);
    expect(data![0].document_no).toBe('TEST-000001');
    expect(data![0].is_paid).toBe(true);
  });

  it('order line exists with correct amounts', async () => {
    const db = getSupabase();
    const { data } = await db.from('orderline').select('*').eq('order_id', ORDER_BASE + 1);
    expect(data?.length).toBe(1);
    expect(data![0].qtyentered).toBe(3);
    expect(data![0].linenetamt).toBe(500.00);
  });

  it('pushes multiple orders in one sync', async () => {
    const res = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: '1970-01-01T00:00:00.000Z',
      orders: [
        { order_id: ORDER_BASE + 2, terminal_id: TERMINAL_ID, store_id: STORE_ID, document_no: 'TEST-000002', grand_total: 200, subtotal: 173.91, tax_total: 26.09, qty_total: 1, is_paid: true, doc_status: 'CO', order_type: 'Sale', date_ordered: new Date().toISOString(), uuid: testUuid() },
        { order_id: ORDER_BASE + 3, terminal_id: TERMINAL_ID, store_id: STORE_ID, document_no: 'TEST-000003', grand_total: 750, subtotal: 652.17, tax_total: 97.83, qty_total: 5, is_paid: false, doc_status: 'DR', order_type: 'Sale', date_ordered: new Date().toISOString(), uuid: testUuid() },
      ],
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.orders_synced).toBeGreaterThanOrEqual(2);
  });

  it('sync returns products for this account', async () => {
    const db = getSupabase();
    await db.from('productcategory').insert({ productcategory_id: STORE_ID, account_id: ACCOUNT_ID, name: 'Test Cat', isactive: 'Y' });
    await db.from('product').insert({ product_id: STORE_ID, account_id: ACCOUNT_ID, name: 'Sync Test Product', sellingprice: 100, productcategory_id: STORE_ID, isactive: 'Y' });

    const res = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: '1970-01-01T00:00:00.000Z',
    });
    const body = await res.json();
    expect(body.products?.length).toBeGreaterThanOrEqual(1);
    expect(body.products?.some((p: any) => p.name === 'Sync Test Product')).toBe(true);
  });
});
