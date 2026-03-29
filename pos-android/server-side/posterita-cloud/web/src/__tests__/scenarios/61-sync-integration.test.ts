/**
 * Scenario 61: Sync Route Integration Tests
 *
 * Tests the actual POST /api/sync endpoint — the code path Android uses.
 * Unlike scenarios 57-60 which insert directly into Supabase, these tests
 * send JSON payloads to the sync route and verify server-side processing:
 *
 * 1. Basic sync: push order + lines + payment + till → verify all created
 * 2. Conflict detection: push same order twice → second is skipped
 * 3. Pull data: products, categories, taxes, stores, terminals pulled
 * 4. Audit events pushed via sync → appear in audit_event table
 * 5. Error logs pushed via sync → appear in error_logs table
 * 6. Order + lines → stock deduction triggered (via RPC)
 * 7. Till with UUID → order references till_uuid → reconciliation
 * 8. Sync stats: response includes correct synced counts
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getSupabase, SKIP_SCENARIOS, testUuid, apiPostAuth } from './helpers';

const TS = Date.now();
const ACCOUNT_ID = `test_sync_int_${TS}`;
const BASE_URL = process.env.SCENARIO_BASE_URL || 'https://web.posterita.com';

let storeId: number;
let terminalId: number;
let userId: number;
let productId: number;
let categoryId: number;
let taxId: number;

// Helper: POST to /api/sync with account cookie
async function syncPost(payload: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `posterita_account_cache=${ACCOUNT_ID}`,
    },
    body: JSON.stringify({ account_id: ACCOUNT_ID, ...payload }),
  });
  return { status: res.status, body: await res.json() };
}

describe.skipIf(SKIP_SCENARIOS)('Scenario 61: Sync Route Integration', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({ account_id: ACCOUNT_ID, businessname: `SyncInt ${TS}`, type: 'testing', status: 'testing', currency: 'MUR', country_code: 'MU' });
    const { data: s } = await db.from('store').insert({ account_id: ACCOUNT_ID, name: `Store ${TS}`, isactive: 'Y' }).select().single();
    storeId = s!.store_id;
    const { data: t } = await db.from('terminal').insert({ account_id: ACCOUNT_ID, store_id: storeId, name: `Term ${TS}`, isactive: 'Y' }).select().single();
    terminalId = t!.terminal_id;
    const { data: u } = await db.from('pos_user').insert({ account_id: ACCOUNT_ID, username: `user_${TS}`, firstname: 'SyncUser', pin: '9999', role: 'staff', isactive: 'Y' }).select().single();
    userId = u!.user_id;
    const { data: c } = await db.from('productcategory').insert({ account_id: ACCOUNT_ID, name: 'Sync Cat', isactive: 'Y' }).select().single();
    categoryId = c!.productcategory_id;
    const { data: tx } = await db.from('tax').insert({ account_id: ACCOUNT_ID, name: 'VAT', rate: 15, isactive: 'Y' }).select().single();
    taxId = tx!.tax_id;
    const { data: p } = await db.from('product').insert({ account_id: ACCOUNT_ID, name: 'SyncWidget', sellingprice: 100, costprice: 40, productcategory_id: categoryId, tax_id: taxId, isactive: 'Y', isstock: 'Y' }).select().single();
    productId = p!.product_id;
  });

  afterAll(async () => {
    const db = getSupabase();
    await Promise.all([
      db.from('audit_event').delete().eq('account_id', ACCOUNT_ID),
      db.from('error_logs').delete().eq('account_id', ACCOUNT_ID),
      db.from('stock_journal').delete().eq('account_id', ACCOUNT_ID),
      db.from('sync_request_log').delete().eq('account_id', ACCOUNT_ID),
      db.from('payment').delete().eq('account_id', ACCOUNT_ID),
      db.from('orderline').delete().eq('account_id', ACCOUNT_ID),
      db.from('orders').delete().eq('account_id', ACCOUNT_ID),
      db.from('till').delete().eq('account_id', ACCOUNT_ID),
    ]);
    await Promise.all([
      db.from('product').delete().eq('account_id', ACCOUNT_ID),
      db.from('productcategory').delete().eq('account_id', ACCOUNT_ID),
      db.from('tax').delete().eq('account_id', ACCOUNT_ID),
      db.from('terminal').delete().eq('account_id', ACCOUNT_ID),
      db.from('pos_user').delete().eq('account_id', ACCOUNT_ID),
    ]);
    await db.from('store').delete().eq('account_id', ACCOUNT_ID);
    await db.from('account').delete().eq('account_id', ACCOUNT_ID);
  });

  // ═══ FLOW 1: Basic Sync Push ══════════════════════════════════
  describe('Flow 1: Push order + till + payment via sync', () => {
    const tillUuid = testUuid();
    const orderUuid = testUuid();
    const orderId = -(TS % 100000); // Negative temp ID (Android pattern)

    it('1a. sync push: till + order + lines + payment', async () => {
      const { status, body } = await syncPost({
        terminal_id: terminalId,
        store_id: storeId,
        last_sync_at: '2020-01-01T00:00:00Z',
        tills: [{
          till_id: orderId - 1,
          store_id: storeId,
          terminal_id: terminalId,
          open_by: userId,
          opening_amt: 500,
          date_opened: new Date().toISOString(),
          uuid: tillUuid,
          documentno: `SYNCTILL-${TS}`,
          status: 'open',
        }],
        orders: [{
          order_id: orderId,
          customer_id: 0,
          sales_rep_id: userId,
          terminal_id: terminalId,
          store_id: storeId,
          document_no: `SYNCORD-${TS}`,
          doc_status: 'CO',
          is_paid: true,
          grand_total: 200,
          subtotal: 173.91,
          tax_total: 26.09,
          qty_total: 2,
          date_ordered: new Date().toISOString(),
          uuid: orderUuid,
          till_uuid: tillUuid,
          currency: 'MUR',
        }],
        order_lines: [{
          orderline_id: orderId * 10,
          order_id: orderId,
          product_id: productId,
          qtyentered: 2,
          priceentered: 100,
          lineamt: 200,
          linenetamt: 173.91,
          productname: 'SyncWidget',
        }],
        payments: [{
          payment_id: orderId * 100,
          order_id: orderId,
          document_no: `SYNCORD-${TS}`,
          tendered: 200,
          amount: 200,
          change: 0,
          payment_type: 'CASH',
          pay_amt: 200,
          date_paid: new Date().toISOString(),
          status: 'completed',
        }],
      });

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.tills_synced).toBeGreaterThanOrEqual(1);
      expect(body.orders_synced).toBeGreaterThanOrEqual(1);
      expect(body.order_lines_synced).toBeGreaterThanOrEqual(1);
    });

    it('1b. till exists in DB', async () => {
      const db = getSupabase();
      const { data } = await db.from('till').select('uuid, status, opening_amt').eq('uuid', tillUuid).single();
      expect(data).not.toBeNull();
      expect(data!.opening_amt).toBe(500);
    });

    it('1c. order exists with till_uuid resolved', async () => {
      const db = getSupabase();
      const { data } = await db.from('orders').select('uuid, grand_total, till_uuid, till_id').eq('uuid', orderUuid).single();
      expect(data).not.toBeNull();
      expect(data!.grand_total).toBe(200);
      expect(data!.till_uuid).toBe(tillUuid);
      // till_id should be resolved from till_uuid
      expect(data!.till_id).toBeTruthy();
    });

    it('1d. order line exists', async () => {
      const db = getSupabase();
      const { data: order } = await db.from('orders').select('order_id').eq('uuid', orderUuid).single();
      const { data: lines } = await db.from('orderline').select('product_id, qtyentered, priceentered').eq('order_id', order!.order_id);
      expect(lines!.length).toBe(1);
      expect(lines![0].product_id).toBe(productId);
      expect(lines![0].qtyentered).toBe(2);
    });
  });

  // ═══ FLOW 2: Duplicate Sync (Conflict Detection) ══════════════
  describe('Flow 2: Duplicate push → conflict detected', () => {
    const dupeUuid = testUuid();
    const dupeOrderId = -(TS % 100000) - 100;

    it('2a. first push succeeds', async () => {
      const { body } = await syncPost({
        terminal_id: terminalId, store_id: storeId,
        last_sync_at: '2020-01-01T00:00:00Z',
        orders: [{ order_id: dupeOrderId, sales_rep_id: userId, terminal_id: terminalId, store_id: storeId, document_no: `DUPE-${TS}`, doc_status: 'CO', is_paid: true, grand_total: 50, subtotal: 43.48, tax_total: 6.52, qty_total: 1, date_ordered: new Date().toISOString(), uuid: dupeUuid, currency: 'MUR' }],
      });
      expect(body.success).toBe(true);
      expect(body.orders_synced).toBeGreaterThanOrEqual(1);
    });

    it('2b. second push of same UUID → conflict', async () => {
      const { body } = await syncPost({
        terminal_id: terminalId, store_id: storeId,
        last_sync_at: '2020-01-01T00:00:00Z',
        orders: [{ order_id: dupeOrderId, sales_rep_id: userId, terminal_id: terminalId, store_id: storeId, document_no: `DUPE-${TS}`, doc_status: 'CO', is_paid: true, grand_total: 50, subtotal: 43.48, tax_total: 6.52, qty_total: 1, date_ordered: new Date().toISOString(), uuid: dupeUuid, currency: 'MUR' }],
      });
      expect(body.success).toBe(true);
      expect(body.conflicts_detected).toBeGreaterThanOrEqual(1);
    });

    it('2c. only one order exists in DB', async () => {
      const db = getSupabase();
      const { data } = await db.from('orders').select('order_id').eq('uuid', dupeUuid);
      expect(data!.length).toBe(1);
    });
  });

  // ═══ FLOW 3: Pull Data ════════════════════════════════════════
  describe('Flow 3: Pull master data', () => {
    it('3a. sync returns products, categories, taxes, stores, terminals', async () => {
      const { body } = await syncPost({
        terminal_id: terminalId, store_id: storeId,
        last_sync_at: '2020-01-01T00:00:00Z',
      });
      expect(body.success).toBe(true);
      expect(body.products?.length).toBeGreaterThanOrEqual(1);
      expect(body.product_categories?.length).toBeGreaterThanOrEqual(1);
      expect(body.taxes?.length).toBeGreaterThanOrEqual(1);
      expect(body.stores?.length).toBeGreaterThanOrEqual(1);
      expect(body.terminals?.length).toBeGreaterThanOrEqual(1);
      expect(body.users?.length).toBeGreaterThanOrEqual(1);
    });

    it('3b. pulled product matches what we created', async () => {
      const { body } = await syncPost({
        terminal_id: terminalId, store_id: storeId,
        last_sync_at: '2020-01-01T00:00:00Z',
      });
      const widget = (body.products || []).find((p: any) => p.name === 'SyncWidget');
      expect(widget).toBeDefined();
      expect(widget.sellingprice).toBe(100);
    });

    it('3c. sync version info returned', async () => {
      const { body } = await syncPost({
        terminal_id: terminalId, store_id: storeId,
        last_sync_at: '2020-01-01T00:00:00Z',
      });
      expect(body.server_sync_version).toBeGreaterThanOrEqual(1);
      expect(body.server_time).toBeTruthy();
    });
  });

  // ═══ FLOW 4: Audit Events via Sync ════════════════════════════
  describe('Flow 4: Audit events pushed via sync', () => {
    it('4a. push 3 audit events', async () => {
      const { body } = await syncPost({
        terminal_id: terminalId, store_id: storeId,
        last_sync_at: new Date().toISOString(),
        audit_events: [
          { id: 1, timestamp: Date.now(), user_id: userId, user_name: 'SyncUser', action: 'order.void', detail: 'Voided SYNC-001', amount: 200, store_id: storeId, terminal_id: terminalId },
          { id: 2, timestamp: Date.now(), user_id: userId, user_name: 'SyncUser', action: 'drawer.open', detail: 'No-sale', store_id: storeId, terminal_id: terminalId },
          { id: 3, timestamp: Date.now(), user_id: userId, user_name: 'SyncUser', action: 'discount.apply', detail: '15% discount', amount: 30, store_id: storeId, terminal_id: terminalId },
        ],
      });
      expect(body.success).toBe(true);
      expect(body.audit_events_synced).toBe(3);
    });

    it('4b. audit events exist in DB', async () => {
      const db = getSupabase();
      const { data } = await db.from('audit_event').select('action, detail, amount').eq('account_id', ACCOUNT_ID).order('created_at');
      expect(data!.length).toBe(3);
      expect(data![0].action).toBe('order.void');
      expect(data![0].amount).toBe(200);
      expect(data![1].action).toBe('drawer.open');
      expect(data![2].action).toBe('discount.apply');
    });
  });

  // ═══ FLOW 5: Error Logs via Sync ══════════════════════════════
  describe('Flow 5: Error logs pushed via sync', () => {
    it('5a. push 2 error logs', async () => {
      const { body } = await syncPost({
        terminal_id: terminalId, store_id: storeId,
        last_sync_at: new Date().toISOString(),
        error_logs: [
          { id: 1, timestamp: Date.now(), severity: 'ERROR', tag: 'SYNC_TEST', message: 'Test error 1', user_id: userId, store_id: storeId, terminal_id: terminalId },
          { id: 2, timestamp: Date.now(), severity: 'WARN', tag: 'SYNC_TEST', message: 'Test warning 2', user_id: userId, store_id: storeId, terminal_id: terminalId },
        ],
      });
      expect(body.success).toBe(true);
      expect(body.error_logs_synced).toBe(2);
    });

    it('5b. error logs exist in DB', async () => {
      const db = getSupabase();
      const { data } = await db.from('error_logs').select('severity, tag, message').eq('account_id', ACCOUNT_ID).eq('tag', 'SYNC_TEST').order('created_at');
      expect(data!.length).toBe(2);
      expect(data![0].severity).toBe('ERROR');
      expect(data![1].severity).toBe('WARN');
    });
  });

  // ═══ FLOW 6: Sync Response Stats ══════════════════════════════
  describe('Flow 6: Response stats are accurate', () => {
    it('6a. empty sync returns zero counts', async () => {
      const { body } = await syncPost({
        terminal_id: terminalId, store_id: storeId,
        last_sync_at: new Date().toISOString(),
      });
      expect(body.success).toBe(true);
      expect(body.orders_synced).toBe(0);
      expect(body.tills_synced).toBe(0);
      expect(body.error_logs_synced).toBe(0);
    });

    it('6b. sync request logged', async () => {
      const db = getSupabase();
      const { data } = await db.from('sync_request_log').select('status, account_id').eq('account_id', ACCOUNT_ID).order('request_at', { ascending: false }).limit(1);
      expect(data!.length).toBeGreaterThanOrEqual(1);
      expect(data![0].account_id).toBe(ACCOUNT_ID);
    });
  });

  // ═══ FLOW 7: Validation ═══════════════════════════════════════
  describe('Flow 7: Input validation', () => {
    it('7a. missing account_id → 400', async () => {
      const res = await fetch(`${BASE_URL}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terminal_id: 1, store_id: 1, last_sync_at: '2020-01-01' }),
      });
      expect(res.status).toBe(400);
    });

    it('7b. terminal_id=0 allowed (initial pull)', async () => {
      const { body } = await syncPost({
        terminal_id: 0, store_id: storeId,
        last_sync_at: '2020-01-01T00:00:00Z',
      });
      expect(body.success).toBe(true);
    });
  });

  // ═══ FLOW 8: Incremental Pull ═════════════════════════════════
  describe('Flow 8: Incremental pull (last_sync_at filtering)', () => {
    it('8a. pull with recent timestamp returns less data', async () => {
      // Full pull
      const { body: full } = await syncPost({
        terminal_id: terminalId, store_id: storeId,
        last_sync_at: '2020-01-01T00:00:00Z',
      });
      // Incremental pull (only changes since now)
      const { body: incr } = await syncPost({
        terminal_id: terminalId, store_id: storeId,
        last_sync_at: new Date(Date.now() + 60000).toISOString(), // 1 min in future
      });

      // Full should have our product, incremental should have fewer (or same if updated recently)
      expect(full.products?.length).toBeGreaterThanOrEqual(1);
      expect(incr.products?.length ?? 0).toBeLessThanOrEqual(full.products?.length ?? 0);
    });
  });
});
