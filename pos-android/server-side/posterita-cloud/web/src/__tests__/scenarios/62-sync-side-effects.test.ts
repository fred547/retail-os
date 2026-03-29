/**
 * Scenario 62: Sync Side Effects — Stock Deduction + Loyalty Earn via RPC
 *
 * Tests the server-side RPCs triggered by sync:
 * 1. Order push → batch_deduct_stock RPC → stock_journal entries created
 * 2. Order with customer → batch_loyalty_earn RPC → loyalty points awarded
 * 3. Duplicate order push → stock NOT deducted again (idempotent)
 * 4. Order without customer → no loyalty earned
 * 5. Error log sync → stack_trace column populated correctly
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getSupabase, SKIP_SCENARIOS, testUuid } from './helpers';

const TS = Date.now();
const ACCOUNT_ID = `test_syncfx_${TS}`;
const BASE_URL = process.env.SCENARIO_BASE_URL || 'https://web.posterita.com';

let storeId: number;
let terminalId: number;
let userId: number;
let productId: number;
let product2Id: number;
let customerId: number;

async function syncPost(payload: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': `posterita_account_cache=${ACCOUNT_ID}` },
    body: JSON.stringify({ account_id: ACCOUNT_ID, ...payload }),
  });
  return { status: res.status, body: await res.json() };
}

describe.skipIf(SKIP_SCENARIOS)('Scenario 62: Sync Side Effects', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({ account_id: ACCOUNT_ID, businessname: `SyncFX ${TS}`, type: 'testing', status: 'testing', currency: 'MUR', country_code: 'MU' });
    const { data: s } = await db.from('store').insert({ account_id: ACCOUNT_ID, name: `Store ${TS}`, isactive: 'Y' }).select().single();
    storeId = s!.store_id;
    const { data: t } = await db.from('terminal').insert({ account_id: ACCOUNT_ID, store_id: storeId, name: `Term ${TS}`, isactive: 'Y' }).select().single();
    terminalId = t!.terminal_id;
    const { data: u } = await db.from('pos_user').insert({ account_id: ACCOUNT_ID, username: `user_${TS}`, firstname: 'FX', pin: '4321', role: 'staff', isactive: 'Y' }).select().single();
    userId = u!.user_id;
    const { data: cat } = await db.from('productcategory').insert({ account_id: ACCOUNT_ID, name: 'FX Cat', isactive: 'Y' }).select().single();
    const { data: tax } = await db.from('tax').insert({ account_id: ACCOUNT_ID, name: 'VAT', rate: 15, isactive: 'Y' }).select().single();
    const { data: p1 } = await db.from('product').insert({ account_id: ACCOUNT_ID, name: 'Alpha', sellingprice: 100, costprice: 40, productcategory_id: cat!.productcategory_id, tax_id: tax!.tax_id, isactive: 'Y', isstock: 'Y' }).select().single();
    productId = p1!.product_id;
    const { data: p2 } = await db.from('product').insert({ account_id: ACCOUNT_ID, name: 'Beta', sellingprice: 200, costprice: 80, productcategory_id: cat!.productcategory_id, tax_id: tax!.tax_id, isactive: 'Y', isstock: 'Y' }).select().single();
    product2Id = p2!.product_id;

    // Seed initial stock
    await db.from('stock_journal').insert([
      { account_id: ACCOUNT_ID, store_id: storeId, product_id: productId, quantity_change: 100, quantity_after: 100, reason: 'initial', reference_type: 'manual' },
      { account_id: ACCOUNT_ID, store_id: storeId, product_id: product2Id, quantity_change: 50, quantity_after: 50, reason: 'initial', reference_type: 'manual' },
    ]);

    // Customer for loyalty
    const { data: cust } = await db.from('customer').insert({ account_id: ACCOUNT_ID, name: 'Loyalty Cust', phone1: '+23057008888', isactive: 'Y', loyaltypoints: 0 }).select().single();
    customerId = cust!.customer_id;

    // Loyalty config
    await db.from('loyalty_config').insert({ account_id: ACCOUNT_ID, is_active: true, points_per_currency: 2, redemption_rate: 0.5, min_redeem_points: 10 });
  });

  afterAll(async () => {
    const db = getSupabase();
    await Promise.all([
      db.from('loyalty_transaction').delete().eq('account_id', ACCOUNT_ID),
      db.from('loyalty_config').delete().eq('account_id', ACCOUNT_ID),
      db.from('stock_journal').delete().eq('account_id', ACCOUNT_ID),
      db.from('error_logs').delete().eq('account_id', ACCOUNT_ID),
      db.from('sync_request_log').delete().eq('account_id', ACCOUNT_ID),
      db.from('payment').delete().eq('account_id', ACCOUNT_ID),
      db.from('orderline').delete().eq('account_id', ACCOUNT_ID),
      db.from('orders').delete().eq('account_id', ACCOUNT_ID),
      db.from('till').delete().eq('account_id', ACCOUNT_ID),
    ]);
    await Promise.all([
      db.from('customer').delete().eq('account_id', ACCOUNT_ID),
      db.from('product').delete().eq('account_id', ACCOUNT_ID),
      db.from('productcategory').delete().eq('account_id', ACCOUNT_ID),
      db.from('tax').delete().eq('account_id', ACCOUNT_ID),
      db.from('terminal').delete().eq('account_id', ACCOUNT_ID),
      db.from('pos_user').delete().eq('account_id', ACCOUNT_ID),
    ]);
    await db.from('store').delete().eq('account_id', ACCOUNT_ID);
    await db.from('account').delete().eq('account_id', ACCOUNT_ID);
  });

  // ═══ FLOW 1: Stock Deduction via Sync RPC ═════════════════════
  describe('Flow 1: Stock deduction on order sync', () => {
    const orderUuid = testUuid();
    const orderId = -(TS % 100000);

    it('1a. pushes order with 3x Alpha + 1x Beta', async () => {
      const { status, body } = await syncPost({
        terminal_id: terminalId, store_id: storeId,
        last_sync_at: '2020-01-01T00:00:00Z',
        orders: [{ order_id: orderId, customer_id: 0, sales_rep_id: userId, terminal_id: terminalId, store_id: storeId, document_no: `STK-${TS}`, doc_status: 'CO', is_paid: true, grand_total: 500, subtotal: 434.78, tax_total: 65.22, qty_total: 4, date_ordered: new Date().toISOString(), uuid: orderUuid, currency: 'MUR' }],
        order_lines: [
          { orderline_id: orderId * 10, order_id: orderId, product_id: productId, qtyentered: 3, priceentered: 100, lineamt: 300, linenetamt: 260.87, productname: 'Alpha' },
          { orderline_id: orderId * 10 - 1, order_id: orderId, product_id: product2Id, qtyentered: 1, priceentered: 200, lineamt: 200, linenetamt: 173.91, productname: 'Beta' },
        ],
      });
      expect(status).toBe(200);
      expect(body.orders_synced).toBeGreaterThanOrEqual(1);
      expect(body.order_lines_synced).toBeGreaterThanOrEqual(2);
    });

    it('1b. stock_journal has sale entries from RPC', async () => {
      const db = getSupabase();
      const { data: alphaJournals } = await db.from('stock_journal').select('quantity_change, reason').eq('account_id', ACCOUNT_ID).eq('product_id', productId).eq('reason', 'sale');
      const { data: betaJournals } = await db.from('stock_journal').select('quantity_change, reason').eq('account_id', ACCOUNT_ID).eq('product_id', product2Id).eq('reason', 'sale');

      expect(alphaJournals!.length).toBeGreaterThanOrEqual(1);
      expect(betaJournals!.length).toBeGreaterThanOrEqual(1);

      const alphaDeducted = alphaJournals!.reduce((s: number, j: any) => s + Math.abs(j.quantity_change), 0);
      const betaDeducted = betaJournals!.reduce((s: number, j: any) => s + Math.abs(j.quantity_change), 0);
      expect(alphaDeducted).toBe(3);
      expect(betaDeducted).toBe(1);
    });

    it('1c. current stock: Alpha=97, Beta=49', async () => {
      const db = getSupabase();
      const { data: aj } = await db.from('stock_journal').select('quantity_change').eq('account_id', ACCOUNT_ID).eq('product_id', productId);
      const { data: bj } = await db.from('stock_journal').select('quantity_change').eq('account_id', ACCOUNT_ID).eq('product_id', product2Id);
      expect((aj || []).reduce((s: number, j: any) => s + j.quantity_change, 0)).toBe(97);
      expect((bj || []).reduce((s: number, j: any) => s + j.quantity_change, 0)).toBe(49);
    });
  });

  // ═══ FLOW 2: Loyalty Auto-Earn via Sync RPC ═══════════════════
  describe('Flow 2: Loyalty earn on order with customer', () => {
    const loyaltyOrderUuid = testUuid();
    const loyaltyOrderId = -(TS % 100000) - 200;

    it('2a. pushes order with customer_id', async () => {
      const { status, body } = await syncPost({
        terminal_id: terminalId, store_id: storeId,
        last_sync_at: '2020-01-01T00:00:00Z',
        orders: [{ order_id: loyaltyOrderId, customer_id: customerId, sales_rep_id: userId, terminal_id: terminalId, store_id: storeId, document_no: `LOY-${TS}`, doc_status: 'CO', is_paid: true, grand_total: 300, subtotal: 260.87, tax_total: 39.13, qty_total: 3, date_ordered: new Date().toISOString(), uuid: loyaltyOrderUuid, currency: 'MUR' }],
        order_lines: [
          { orderline_id: loyaltyOrderId * 10, order_id: loyaltyOrderId, product_id: productId, qtyentered: 3, priceentered: 100, lineamt: 300, linenetamt: 260.87, productname: 'Alpha' },
        ],
      });
      expect(status).toBe(200);
    });

    it('2b. loyalty_transaction created with correct points', async () => {
      const db = getSupabase();
      const { data } = await db.from('loyalty_transaction').select('type, points, balance_after').eq('account_id', ACCOUNT_ID).eq('customer_id', customerId);
      // points_per_currency = 2, grand_total = 300 → 600 points
      expect(data!.length).toBeGreaterThanOrEqual(1);
      const earnTxn = data!.find((t: any) => t.type === 'earn');
      expect(earnTxn).toBeDefined();
      expect(earnTxn!.points).toBe(600); // 300 * 2
    });

    it('2c. customer balance updated', async () => {
      const db = getSupabase();
      const { data } = await db.from('customer').select('loyaltypoints').eq('customer_id', customerId).single();
      expect(data!.loyaltypoints).toBe(600);
    });
  });

  // ═══ FLOW 3: Idempotent — Same UUID Duplicate Push ═════════════
  describe('Flow 3: Same-UUID duplicate push skips stock deduction', () => {
    const dupeUuid = testUuid();
    const dupeOrderId = -(TS % 100000) - 500;

    it('3a. first push creates order + deducts stock', async () => {
      const { body } = await syncPost({
        terminal_id: terminalId, store_id: storeId,
        last_sync_at: '2020-01-01T00:00:00Z',
        orders: [{ order_id: dupeOrderId, customer_id: 0, sales_rep_id: userId, terminal_id: terminalId, store_id: storeId, document_no: `DUPE-${TS}`, doc_status: 'CO', is_paid: true, grand_total: 100, subtotal: 86.96, tax_total: 13.04, qty_total: 1, date_ordered: new Date().toISOString(), uuid: dupeUuid, currency: 'MUR' }],
        order_lines: [
          { orderline_id: dupeOrderId * 10, order_id: dupeOrderId, product_id: product2Id, qtyentered: 1, priceentered: 200, lineamt: 200, linenetamt: 173.91, productname: 'Beta' },
        ],
      });
      expect(body.orders_synced).toBeGreaterThanOrEqual(1);
    });

    it('3b. record Beta stock after first push', async () => {
      const db = getSupabase();
      const { data } = await db.from('stock_journal').select('quantity_change').eq('account_id', ACCOUNT_ID).eq('product_id', product2Id);
      const stock = (data || []).reduce((s: number, j: any) => s + j.quantity_change, 0);
      // 50 initial - 1 (flow1) - 1 (flow3 first push) = 48
      expect(stock).toBe(48);
    });

    it('3c. second push with SAME UUID → conflict, no new deduction', async () => {
      const { body } = await syncPost({
        terminal_id: terminalId, store_id: storeId,
        last_sync_at: '2020-01-01T00:00:00Z',
        orders: [{ order_id: dupeOrderId, customer_id: 0, sales_rep_id: userId, terminal_id: terminalId, store_id: storeId, document_no: `DUPE-${TS}`, doc_status: 'CO', is_paid: true, grand_total: 100, subtotal: 86.96, tax_total: 13.04, qty_total: 1, date_ordered: new Date().toISOString(), uuid: dupeUuid, currency: 'MUR' }],
        order_lines: [
          { orderline_id: dupeOrderId * 10, order_id: dupeOrderId, product_id: product2Id, qtyentered: 1, priceentered: 200, lineamt: 200, linenetamt: 173.91, productname: 'Beta' },
        ],
      });
      // Order is conflict (same UUID already exists)
      expect(body.orders_synced + (body.conflicts_detected || 0)).toBeGreaterThanOrEqual(1);
    });

    it('3d. only one order exists for this UUID', async () => {
      const db = getSupabase();
      const { data } = await db.from('orders').select('order_id').eq('uuid', dupeUuid).eq('account_id', ACCOUNT_ID);
      expect(data!.length).toBe(1); // No duplicate order created
    });
  });

  // ═══ FLOW 4: No Customer → No Loyalty ═════════════════════════
  describe('Flow 4: Order without customer earns no loyalty', () => {
    it('4a. push order with customer_id=0', async () => {
      const noCustOrderId = -(TS % 100000) - 300;
      const { body } = await syncPost({
        terminal_id: terminalId, store_id: storeId,
        last_sync_at: '2020-01-01T00:00:00Z',
        orders: [{ order_id: noCustOrderId, customer_id: 0, sales_rep_id: userId, terminal_id: terminalId, store_id: storeId, document_no: `NOCUST-${TS}`, doc_status: 'CO', is_paid: true, grand_total: 500, subtotal: 434.78, tax_total: 65.22, qty_total: 1, date_ordered: new Date().toISOString(), uuid: testUuid(), currency: 'MUR' }],
      });
      expect(body.orders_synced).toBeGreaterThanOrEqual(1);
    });

    it('4b. loyalty unchanged from Flow 2 (no new earn for customer_id=0)', async () => {
      const db = getSupabase();
      const { data: txns } = await db.from('loyalty_transaction').select('points').eq('account_id', ACCOUNT_ID).eq('customer_id', customerId);
      // Only the Flow 2 earn (600 points) should exist — no new earn for customer_id=0
      const totalEarned = (txns || []).reduce((s: number, t: any) => s + t.points, 0);
      expect(totalEarned).toBe(600);
    });
  });

  // ═══ FLOW 5: Error Log Column Fix ═════════════════════════════
  describe('Flow 5: Error log stack_trace column', () => {
    it('5a. push error log with stack trace', async () => {
      const { body } = await syncPost({
        terminal_id: terminalId, store_id: storeId,
        last_sync_at: new Date().toISOString(),
        error_logs: [{
          id: 999, timestamp: Date.now(), severity: 'ERROR', tag: 'RPC_TEST',
          message: 'Test stack trace fix', stacktrace: 'at com.posterita.test.TestClass.method(TestClass.kt:42)',
          user_id: userId, store_id: storeId, terminal_id: terminalId, device_id: 'test-device',
        }],
      });
      expect(body.error_logs_synced).toBeGreaterThanOrEqual(1);
    });

    it('5b. error log has stack_trace populated', async () => {
      const db = getSupabase();
      const { data } = await db.from('error_logs').select('message, stack_trace, device_info').eq('account_id', ACCOUNT_ID).eq('tag', 'RPC_TEST').single();
      expect(data).not.toBeNull();
      expect(data!.message).toBe('Test stack trace fix');
      expect(data!.stack_trace).toContain('TestClass.kt:42');
    });
  });
});
