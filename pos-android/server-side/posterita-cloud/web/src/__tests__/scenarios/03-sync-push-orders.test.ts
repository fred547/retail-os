import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getSupabase, apiPost, testId } from './helpers';

const ACCOUNT_ID = testId('sync_order');
const STORE_ID = 9001;
const TERMINAL_ID = 9001;

describe('Scenario: Sync Push Orders', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({ account_id: ACCOUNT_ID, businessname: 'Sync Test', type: 'live', status: 'active', currency: 'MUR' });
    await db.from('store').insert({ store_id: STORE_ID, account_id: ACCOUNT_ID, name: 'Test Store', isactive: 'Y' });
    await db.from('terminal').insert({ terminal_id: TERMINAL_ID, account_id: ACCOUNT_ID, store_id: STORE_ID, name: 'POS 1', isactive: 'Y' });
  });

  afterAll(async () => {
    const db = getSupabase();
    await db.from('payment').delete().eq('account_id', ACCOUNT_ID);
    await db.from('orderline').delete().eq('account_id', ACCOUNT_ID);
    await db.from('orders').delete().eq('account_id', ACCOUNT_ID);
    await db.from('terminal').delete().eq('account_id', ACCOUNT_ID);
    await db.from('store').delete().eq('account_id', ACCOUNT_ID);
    await db.from('account').delete().eq('account_id', ACCOUNT_ID);
  });

  it('pushes a single order via sync', async () => {
    const res = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: '1970-01-01T00:00:00.000Z',
      orders: [{
        order_id: 90001,
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
        uuid: testId('order'),
      }],
      order_lines: [{
        orderline_id: 80001,
        order_id: 90001,
        product_id: 1,
        productname: 'Test Product',
        qty: 3,
        priceactual: 166.67,
        linenetamt: 500.00,
        tax_id: 0,
        taxamt: 65.22,
      }],
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.orders_synced).toBeGreaterThanOrEqual(1);
  });

  it('order exists in Supabase after sync', async () => {
    const db = getSupabase();
    const { data } = await db.from('orders').select('*').eq('account_id', ACCOUNT_ID).eq('order_id', 90001);
    expect(data?.length).toBe(1);
    expect(data![0].grand_total).toBe(500.00);
    expect(data![0].document_no).toBe('TEST-000001');
    expect(data![0].is_paid).toBe(true);
  });

  it('order line exists with correct amounts', async () => {
    const db = getSupabase();
    const { data } = await db.from('orderline').select('*').eq('account_id', ACCOUNT_ID).eq('order_id', 90001);
    expect(data?.length).toBe(1);
    expect(data![0].qty).toBe(3);
    expect(data![0].linenetamt).toBe(500.00);
  });

  it('pushes multiple orders in one sync', async () => {
    const res = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: '1970-01-01T00:00:00.000Z',
      orders: [
        { order_id: 90002, terminal_id: TERMINAL_ID, store_id: STORE_ID, document_no: 'TEST-000002', grand_total: 200, subtotal: 173.91, tax_total: 26.09, qty_total: 1, is_paid: true, doc_status: 'CO', order_type: 'Sale', date_ordered: new Date().toISOString(), uuid: testId('ord2') },
        { order_id: 90003, terminal_id: TERMINAL_ID, store_id: STORE_ID, document_no: 'TEST-000003', grand_total: 750, subtotal: 652.17, tax_total: 97.83, qty_total: 5, is_paid: false, doc_status: 'DR', order_type: 'Sale', date_ordered: new Date().toISOString(), uuid: testId('ord3') },
      ],
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.orders_synced).toBeGreaterThanOrEqual(2);
  });

  it('sync returns products for this account', async () => {
    // First create a product
    const db = getSupabase();
    await db.from('productcategory').insert({ productcategory_id: 9001, account_id: ACCOUNT_ID, name: 'Test Cat', isactive: 'Y' });
    await db.from('product').insert({ product_id: 9001, account_id: ACCOUNT_ID, name: 'Sync Test Product', sellingprice: 100, productcategory_id: 9001, isactive: 'Y' });

    const res = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: '1970-01-01T00:00:00.000Z',
    });
    const body = await res.json();
    expect(body.products?.length).toBeGreaterThanOrEqual(1);
    expect(body.products?.some((p: any) => p.name === 'Sync Test Product')).toBe(true);

    // Cleanup
    await db.from('product').delete().eq('product_id', 9001);
    await db.from('productcategory').delete().eq('productcategory_id', 9001);
  });
});
