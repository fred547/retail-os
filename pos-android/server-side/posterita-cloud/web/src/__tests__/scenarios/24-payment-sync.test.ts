import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SKIP_SCENARIOS, getSupabase, apiPost, testId, testUuid } from './helpers';

const ACCOUNT_ID = testId('pay_sync');
const STORE_ID = 94000 + Math.floor(Math.random() * 9000);
const TERMINAL_ID = STORE_ID;
const ORDER_BASE = STORE_ID * 10;
const PAYMENT_BASE = STORE_ID * 100;

describe.skipIf(SKIP_SCENARIOS)('Scenario: Payment Sync & Order Totals', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({ account_id: ACCOUNT_ID, businessname: 'Payment Test', type: 'testing', status: 'active', currency: 'MUR' });
    await db.from('store').insert({ store_id: STORE_ID, account_id: ACCOUNT_ID, name: 'Payment Store', isactive: 'Y' });
    await db.from('terminal').insert({ terminal_id: TERMINAL_ID, account_id: ACCOUNT_ID, store_id: STORE_ID, name: 'POS 1', isactive: 'Y' });
  }, 60000);

  afterAll(async () => {
    const db = getSupabase();
    await db.from('payment').delete().eq('account_id', ACCOUNT_ID);
    await db.from('orderline').delete().in('order_id', [ORDER_BASE + 1, ORDER_BASE + 2]);
    await db.from('orders').delete().eq('account_id', ACCOUNT_ID);
    await db.from('terminal').delete().eq('account_id', ACCOUNT_ID);
    await db.from('store').delete().eq('account_id', ACCOUNT_ID);
    await db.from('account').delete().eq('account_id', ACCOUNT_ID);
  }, 60000);

  it('pushes an order with payment via sync', async () => {
    const res = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: '1970-01-01T00:00:00.000Z',
      orders: [{
        order_id: ORDER_BASE + 1,
        terminal_id: TERMINAL_ID,
        store_id: STORE_ID,
        document_no: 'PAY-001',
        grand_total: 1000,
        subtotal: 869.57,
        tax_total: 130.43,
        qty_total: 2,
        is_paid: true,
        doc_status: 'CO',
        order_type: 'Sale',
        date_ordered: new Date().toISOString(),
        uuid: testUuid(),
      }],
      order_lines: [
        { orderline_id: PAYMENT_BASE + 1, order_id: ORDER_BASE + 1, product_id: 1, productname: 'Widget A', qtyentered: 1, priceentered: 600, lineamt: 600, linenetamt: 600, tax_id: 0, costamt: 200 },
        { orderline_id: PAYMENT_BASE + 2, order_id: ORDER_BASE + 1, product_id: 2, productname: 'Widget B', qtyentered: 1, priceentered: 400, lineamt: 400, linenetamt: 400, tax_id: 0, costamt: 150 },
      ],
      payments: [{
        payment_id: PAYMENT_BASE + 1,
        order_id: ORDER_BASE + 1,
        document_no: 'PAY-001',
        tendered: 1000,
        amount: 1000,
        change: 0,
        payment_type: 'Cash',
        date_paid: new Date().toISOString(),
        pay_amt: 1000,
        status: 'completed',
      }],
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.orders_synced).toBeGreaterThanOrEqual(1);
    expect(body.payments_synced).toBeGreaterThanOrEqual(1);
  });

  it('payment record exists with correct amounts', async () => {
    const db = getSupabase();
    const { data } = await db.from('payment')
      .select('*')
      .eq('payment_id', PAYMENT_BASE + 1)
      .single();
    expect(data).toBeTruthy();
    expect(data!.amount).toBe(1000);
    expect(data!.tendered).toBe(1000);
    expect(data!.change).toBe(0);
    expect(data!.payment_type).toBe('Cash');
    expect(data!.order_id).toBe(ORDER_BASE + 1);
  });

  it('order lines have correct cost amounts', async () => {
    const db = getSupabase();
    const { data } = await db.from('orderline')
      .select('productname, qtyentered, priceentered, costamt')
      .eq('order_id', ORDER_BASE + 1)
      .order('orderline_id');
    expect(data!.length).toBe(2);
    expect(data![0].productname).toBe('Widget A');
    expect(data![0].costamt).toBe(200);
    expect(data![1].productname).toBe('Widget B');
    expect(data![1].costamt).toBe(150);
  });

  it('pushes split payment on single order', async () => {
    const res = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: '1970-01-01T00:00:00.000Z',
      orders: [{
        order_id: ORDER_BASE + 2,
        terminal_id: TERMINAL_ID,
        store_id: STORE_ID,
        document_no: 'PAY-002',
        grand_total: 500,
        subtotal: 434.78,
        tax_total: 65.22,
        qty_total: 1,
        is_paid: true,
        doc_status: 'CO',
        order_type: 'Sale',
        date_ordered: new Date().toISOString(),
        uuid: testUuid(),
      }],
      payments: [
        { payment_id: PAYMENT_BASE + 2, order_id: ORDER_BASE + 2, document_no: 'PAY-002', tendered: 300, amount: 300, change: 0, payment_type: 'Cash', date_paid: new Date().toISOString(), pay_amt: 300, status: 'completed' },
        { payment_id: PAYMENT_BASE + 3, order_id: ORDER_BASE + 2, document_no: 'PAY-002', tendered: 200, amount: 200, change: 0, payment_type: 'Card', date_paid: new Date().toISOString(), pay_amt: 200, status: 'completed' },
      ],
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.payments_synced).toBeGreaterThanOrEqual(2);
  });

  it('split payments sum to order total', async () => {
    const db = getSupabase();
    const { data: payments } = await db.from('payment')
      .select('amount, payment_type')
      .eq('order_id', ORDER_BASE + 2)
      .order('payment_id');
    expect(payments!.length).toBe(2);
    const total = payments!.reduce((sum, p) => sum + p.amount, 0);
    expect(total).toBe(500);
    expect(payments![0].payment_type).toBe('Cash');
    expect(payments![1].payment_type).toBe('Card');
  });

  it('payment upsert updates existing record', async () => {
    // Re-push same payment with changed amount (refund scenario)
    const res = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: '1970-01-01T00:00:00.000Z',
      payments: [{
        payment_id: PAYMENT_BASE + 1,
        order_id: ORDER_BASE + 1,
        document_no: 'PAY-001',
        tendered: 1000,
        amount: 1000,
        change: 0,
        payment_type: 'Cash',
        date_paid: new Date().toISOString(),
        pay_amt: 1000,
        status: 'voided',
      }],
    });
    expect(res.status).toBe(200);

    const db = getSupabase();
    const { data } = await db.from('payment')
      .select('status')
      .eq('payment_id', PAYMENT_BASE + 1)
      .single();
    expect(data!.status).toBe('voided');
  });
});
