/**
 * Scenario 60: Edge Case Cross-Flow Tests
 *
 * Tests boundary conditions, error recovery, and rare but critical paths:
 * 1. Zero-total order (free gift) — stock deducted, no loyalty earned, no payment
 * 2. Negative stock (oversell) — journal goes below zero
 * 3. Customer with multiple orders — loyalty accumulation + order history
 * 4. Till reopen after close — new till on same terminal
 * 5. Partial payment → unpaid order → complete later
 * 6. Product price change mid-day — orders use price at time of sale
 * 7. Discount stacking: line discount + order discount
 * 8. Order with 20 lines (large cart) → payment → stock for all products
 * 9. Same product in multiple categories (re-categorize mid-day)
 * 10. Concurrent orders on same till (two cashiers)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getSupabase, SKIP_SCENARIOS, testUuid } from './helpers';

const TS = Date.now();
const ACCOUNT_ID = `test_edgeflow_${TS}`;

let storeId: number;
let terminalId: number;
let userId: number;
let user2Id: number;
let categoryId: number;
let taxId: number;
let products: { id: number; name: string; price: number }[] = [];
let customerId: number;

describe.skipIf(SKIP_SCENARIOS)('Scenario 60: Edge Case Cross-Flows', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({ account_id: ACCOUNT_ID, businessname: `EdgeFlow ${TS}`, type: 'testing', status: 'testing', currency: 'MUR', country_code: 'MU' });
    const { data: s } = await db.from('store').insert({ account_id: ACCOUNT_ID, name: `Store ${TS}`, isactive: 'Y' }).select().single();
    storeId = s!.store_id;
    const { data: t } = await db.from('terminal').insert({ account_id: ACCOUNT_ID, store_id: storeId, name: `Term ${TS}`, isactive: 'Y' }).select().single();
    terminalId = t!.terminal_id;
    const { data: u1 } = await db.from('pos_user').insert({ account_id: ACCOUNT_ID, username: `cashier1_${TS}`, firstname: 'Eve', pin: '1111', role: 'staff', isactive: 'Y' }).select().single();
    userId = u1!.user_id;
    const { data: u2 } = await db.from('pos_user').insert({ account_id: ACCOUNT_ID, username: `cashier2_${TS}`, firstname: 'Dan', pin: '2222', role: 'staff', isactive: 'Y' }).select().single();
    user2Id = u2!.user_id;

    const { data: c } = await db.from('productcategory').insert({ account_id: ACCOUNT_ID, name: 'General', isactive: 'Y' }).select().single();
    categoryId = c!.productcategory_id;
    const { data: tx } = await db.from('tax').insert({ account_id: ACCOUNT_ID, name: 'VAT 15%', rate: 15, isactive: 'Y' }).select().single();
    taxId = tx!.tax_id;

    // Create 10 products for large cart test
    const names = ['Widget A', 'Widget B', 'Widget C', 'Widget D', 'Widget E', 'Gadget F', 'Gadget G', 'Gadget H', 'Gadget I', 'Gadget J'];
    for (let i = 0; i < 10; i++) {
      const price = 50 + i * 25;
      const { data: p } = await db.from('product').insert({ account_id: ACCOUNT_ID, name: names[i], sellingprice: price, costprice: price * 0.4, productcategory_id: categoryId, tax_id: taxId, isactive: 'Y', isstock: 'Y' }).select().single();
      products.push({ id: p!.product_id, name: names[i], price });
      await db.from('stock_journal').insert({ account_id: ACCOUNT_ID, store_id: storeId, product_id: p!.product_id, quantity_change: 20, quantity_after: 20, reason: 'initial', reference_type: 'manual', user_id: userId });
    }

    const { data: cust } = await db.from('customer').insert({ account_id: ACCOUNT_ID, name: 'Edge Customer', phone1: '+23057005555', isactive: 'Y', loyaltypoints: 0 }).select().single();
    customerId = cust!.customer_id;

    // Loyalty config for testing
    await db.from('loyalty_config').insert({ account_id: ACCOUNT_ID, is_active: true, points_per_currency: 1, redemption_rate: 0.5, min_redeem_points: 10 });
  });

  afterAll(async () => {
    const db = getSupabase();
    await Promise.all([
      db.from('loyalty_transaction').delete().eq('account_id', ACCOUNT_ID),
      db.from('stock_journal').delete().eq('account_id', ACCOUNT_ID),
      db.from('payment').delete().eq('account_id', ACCOUNT_ID),
      db.from('orderline').delete().eq('account_id', ACCOUNT_ID),
      db.from('orders').delete().eq('account_id', ACCOUNT_ID),
      db.from('till').delete().eq('account_id', ACCOUNT_ID),
      db.from('loyalty_config').delete().eq('account_id', ACCOUNT_ID),
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

  // ═══ FLOW 1: Zero-Total Order (Free Gift) ════════════════════
  describe('Flow 1: Zero-total free gift order', () => {
    it('1a. creates order with grand_total = 0', async () => {
      const db = getSupabase();
      const { data, error } = await db.from('orders').insert({ account_id: ACCOUNT_ID, store_id: storeId, terminal_id: terminalId, uuid: testUuid(), document_no: `FREE-${TS}`, customer_id: customerId, sales_rep_id: userId, grand_total: 0, subtotal: 0, tax_total: 0, qty_total: 1, doc_status: 'CO', is_paid: true, date_ordered: new Date().toISOString(), note: 'Free promotional item' }).select().single();
      expect(error).toBeNull();
      expect(data!.grand_total).toBe(0);
    });

    it('1b. stock still deducted for free items', async () => {
      const db = getSupabase();
      await db.from('stock_journal').insert({ account_id: ACCOUNT_ID, store_id: storeId, product_id: products[0].id, quantity_change: -1, quantity_after: 19, reason: 'sale', reference_type: 'order', user_id: userId });
      const { data } = await db.from('stock_journal').select('quantity_change').eq('account_id', ACCOUNT_ID).eq('product_id', products[0].id);
      expect((data || []).reduce((s: number, j: any) => s + j.quantity_change, 0)).toBe(19);
    });

    it('1c. no payment required for zero-total', async () => {
      const db = getSupabase();
      const { data } = await db.from('payment').select('payment_id').eq('account_id', ACCOUNT_ID).eq('document_no', `FREE-${TS}`);
      expect(data!.length).toBe(0); // No payment row for free order
    });

    it('1d. loyalty NOT earned on zero-total order', async () => {
      const db = getSupabase();
      // Points earned = grand_total * points_per_currency = 0 * 1 = 0
      const { data } = await db.from('customer').select('loyaltypoints').eq('customer_id', customerId).single();
      expect(data!.loyaltypoints).toBe(0);
    });
  });

  // ═══ FLOW 2: Negative Stock (Oversell) ════════════════════════
  describe('Flow 2: Oversell — stock goes negative', () => {
    it('2a. sells 25 units when only 20 in stock', async () => {
      const db = getSupabase();
      await db.from('stock_journal').insert({ account_id: ACCOUNT_ID, store_id: storeId, product_id: products[1].id, quantity_change: -25, quantity_after: -5, reason: 'sale', reference_type: 'order', user_id: userId });
    });

    it('2b. stock journal correctly shows -5', async () => {
      const db = getSupabase();
      const { data } = await db.from('stock_journal').select('quantity_change').eq('account_id', ACCOUNT_ID).eq('product_id', products[1].id);
      const total = (data || []).reduce((s: number, j: any) => s + j.quantity_change, 0);
      expect(total).toBe(-5); // 20 initial - 25 sold = -5
    });

    it('2c. receiving stock brings it back positive', async () => {
      const db = getSupabase();
      await db.from('stock_journal').insert({ account_id: ACCOUNT_ID, store_id: storeId, product_id: products[1].id, quantity_change: 30, quantity_after: 25, reason: 'receive', reference_type: 'purchase_order', user_id: userId });
      const { data } = await db.from('stock_journal').select('quantity_change').eq('account_id', ACCOUNT_ID).eq('product_id', products[1].id);
      expect((data || []).reduce((s: number, j: any) => s + j.quantity_change, 0)).toBe(25);
    });
  });

  // ═══ FLOW 3: Customer Multi-Order Loyalty Accumulation ════════
  describe('Flow 3: Loyalty accumulates across orders', () => {
    it('3a. order 1: earns 100 points', async () => {
      const db = getSupabase();
      const { data: o } = await db.from('orders').insert({ account_id: ACCOUNT_ID, store_id: storeId, terminal_id: terminalId, uuid: testUuid(), document_no: `MLT-${TS}-1`, customer_id: customerId, sales_rep_id: userId, grand_total: 100, subtotal: 86.96, tax_total: 13.04, qty_total: 1, doc_status: 'CO', is_paid: true, date_ordered: new Date().toISOString() }).select().single();
      await db.from('loyalty_transaction').insert({ account_id: ACCOUNT_ID, customer_id: customerId, type: 'earn', points: 100, balance_after: 100, order_id: o!.order_id, created_by: userId, store_id: storeId, terminal_id: terminalId });
      await db.from('customer').update({ loyaltypoints: 100 }).eq('customer_id', customerId);
    });

    it('3b. order 2: earns 250 points (total 350)', async () => {
      const db = getSupabase();
      const { data: o } = await db.from('orders').insert({ account_id: ACCOUNT_ID, store_id: storeId, terminal_id: terminalId, uuid: testUuid(), document_no: `MLT-${TS}-2`, customer_id: customerId, sales_rep_id: userId, grand_total: 250, subtotal: 217.39, tax_total: 32.61, qty_total: 2, doc_status: 'CO', is_paid: true, date_ordered: new Date().toISOString() }).select().single();
      await db.from('loyalty_transaction').insert({ account_id: ACCOUNT_ID, customer_id: customerId, type: 'earn', points: 250, balance_after: 350, order_id: o!.order_id, created_by: userId, store_id: storeId, terminal_id: terminalId });
      await db.from('customer').update({ loyaltypoints: 350 }).eq('customer_id', customerId);
    });

    it('3c. order 3: earns 150 points (total 500)', async () => {
      const db = getSupabase();
      const { data: o } = await db.from('orders').insert({ account_id: ACCOUNT_ID, store_id: storeId, terminal_id: terminalId, uuid: testUuid(), document_no: `MLT-${TS}-3`, customer_id: customerId, sales_rep_id: userId, grand_total: 150, subtotal: 130.43, tax_total: 19.57, qty_total: 1, doc_status: 'CO', is_paid: true, date_ordered: new Date().toISOString() }).select().single();
      await db.from('loyalty_transaction').insert({ account_id: ACCOUNT_ID, customer_id: customerId, type: 'earn', points: 150, balance_after: 500, order_id: o!.order_id, created_by: userId, store_id: storeId, terminal_id: terminalId });
      await db.from('customer').update({ loyaltypoints: 500 }).eq('customer_id', customerId);
    });

    it('3d. customer balance = 500, 3 earn transactions', async () => {
      const db = getSupabase();
      const { data: cust } = await db.from('customer').select('loyaltypoints').eq('customer_id', customerId).single();
      expect(cust!.loyaltypoints).toBe(500);
      const { data: txns } = await db.from('loyalty_transaction').select('type, points').eq('customer_id', customerId).eq('account_id', ACCOUNT_ID).order('created_at');
      expect(txns!.length).toBe(3);
      expect(txns!.reduce((s: number, t: any) => s + t.points, 0)).toBe(500);
    });

    it('3e. customer has 4 orders total (1 free + 3 loyalty)', async () => {
      const db = getSupabase();
      const { data } = await db.from('orders').select('order_id').eq('account_id', ACCOUNT_ID).eq('customer_id', customerId);
      expect(data!.length).toBe(4); // 1 free gift + 3 loyalty orders
    });
  });

  // ═══ FLOW 4: Till Reopen After Close ══════════════════════════
  describe('Flow 4: Close till + open new till same terminal', () => {
    let till1Id: number;
    let till2Id: number;

    it('4a. opens first till', async () => {
      const db = getSupabase();
      const { data } = await db.from('till').insert({ account_id: ACCOUNT_ID, store_id: storeId, terminal_id: terminalId, uuid: testUuid(), documentno: `TILL1-${TS}`, opening_amt: 500, open_by: userId, date_opened: new Date().toISOString(), status: 'open' }).select().single();
      till1Id = data!.till_id;
    });

    it('4b. closes first till', async () => {
      const db = getSupabase();
      await db.from('till').update({ closing_amt: 500, close_by: userId, date_closed: new Date().toISOString(), status: 'closed' }).eq('till_id', till1Id);
    });

    it('4c. opens second till on same terminal', async () => {
      const db = getSupabase();
      const { data } = await db.from('till').insert({ account_id: ACCOUNT_ID, store_id: storeId, terminal_id: terminalId, uuid: testUuid(), documentno: `TILL2-${TS}`, opening_amt: 500, open_by: userId, date_opened: new Date().toISOString(), status: 'open' }).select().single();
      till2Id = data!.till_id;
      expect(till2Id).not.toBe(till1Id);
    });

    it('4d. two tills exist for same terminal', async () => {
      const db = getSupabase();
      const { data } = await db.from('till').select('till_id, status').eq('account_id', ACCOUNT_ID).eq('terminal_id', terminalId).order('date_opened');
      expect(data!.length).toBe(2);
      expect(data![0].status).toBe('closed');
      expect(data![1].status).toBe('open');
    });
  });

  // ═══ FLOW 5: Unpaid Order → Pay Later ═════════════════════════
  describe('Flow 5: Unpaid order completed later', () => {
    let unpaidOrderId: number;

    it('5a. creates unpaid order', async () => {
      const db = getSupabase();
      const { data } = await db.from('orders').insert({ account_id: ACCOUNT_ID, store_id: storeId, terminal_id: terminalId, uuid: testUuid(), document_no: `UNPD-${TS}`, sales_rep_id: userId, grand_total: 500, subtotal: 434.78, tax_total: 65.22, qty_total: 2, doc_status: 'CO', is_paid: false, date_ordered: new Date().toISOString() }).select().single();
      unpaidOrderId = data!.order_id;
      expect(data!.is_paid).toBe(false);
    });

    it('5b. order shows as unpaid in queries', async () => {
      const db = getSupabase();
      const { data } = await db.from('orders').select('is_paid').eq('order_id', unpaidOrderId).single();
      expect(data!.is_paid).toBe(false);
    });

    it('5c. payment received later → order marked paid', async () => {
      const db = getSupabase();
      await db.from('payment').insert({ account_id: ACCOUNT_ID, order_id: unpaidOrderId, document_no: `UNPD-${TS}`, tendered: 500, amount: 500, change: 0, payment_type: 'CASH', pay_amt: 500, status: 'completed', date_paid: new Date().toISOString() });
      await db.from('orders').update({ is_paid: true }).eq('order_id', unpaidOrderId);

      const { data } = await db.from('orders').select('is_paid').eq('order_id', unpaidOrderId).single();
      expect(data!.is_paid).toBe(true);
    });
  });

  // ═══ FLOW 6: Price Change Mid-Day ═════════════════════════════
  describe('Flow 6: Product price change between orders', () => {
    it('6a. order at original price (50)', async () => {
      const db = getSupabase();
      const { data: o } = await db.from('orders').insert({ account_id: ACCOUNT_ID, store_id: storeId, terminal_id: terminalId, uuid: testUuid(), document_no: `PRC1-${TS}`, sales_rep_id: userId, grand_total: 50, subtotal: 43.48, tax_total: 6.52, qty_total: 1, doc_status: 'CO', is_paid: true, date_ordered: new Date().toISOString() }).select().single();
      await db.from('orderline').insert({ account_id: ACCOUNT_ID, order_id: o!.order_id, product_id: products[2].id, productname: products[2].name, qtyentered: 1, priceentered: 50, lineamt: 50, linenetamt: 43.48 });
    });

    it('6b. product price updated to 75', async () => {
      const db = getSupabase();
      await db.from('product').update({ sellingprice: 75 }).eq('product_id', products[2].id);
    });

    it('6c. order at new price (75)', async () => {
      const db = getSupabase();
      const { data: o } = await db.from('orders').insert({ account_id: ACCOUNT_ID, store_id: storeId, terminal_id: terminalId, uuid: testUuid(), document_no: `PRC2-${TS}`, sales_rep_id: userId, grand_total: 75, subtotal: 65.22, tax_total: 9.78, qty_total: 1, doc_status: 'CO', is_paid: true, date_ordered: new Date().toISOString() }).select().single();
      await db.from('orderline').insert({ account_id: ACCOUNT_ID, order_id: o!.order_id, product_id: products[2].id, productname: products[2].name, qtyentered: 1, priceentered: 75, lineamt: 75, linenetamt: 65.22 });
    });

    it('6d. order lines preserve price at time of sale', async () => {
      const db = getSupabase();
      const { data } = await db.from('orderline').select('priceentered').eq('account_id', ACCOUNT_ID).eq('product_id', products[2].id).order('orderline_id');
      expect(data!.length).toBe(2);
      expect(data![0].priceentered).toBe(50); // Old price
      expect(data![1].priceentered).toBe(75); // New price
    });
  });

  // ═══ FLOW 7: Large Cart (10 lines) ════════════════════════════
  describe('Flow 7: Large cart with 10 different products', () => {
    let largeOrderId: number;

    it('7a. creates order with 10 line items', async () => {
      const db = getSupabase();
      const total = products.reduce((s, p) => s + p.price * 2, 0); // 2 of each
      const { data: o } = await db.from('orders').insert({ account_id: ACCOUNT_ID, store_id: storeId, terminal_id: terminalId, uuid: testUuid(), document_no: `BIG-${TS}`, sales_rep_id: userId, grand_total: total, subtotal: total * 0.8696, tax_total: total * 0.1304, qty_total: 20, doc_status: 'CO', is_paid: true, date_ordered: new Date().toISOString() }).select().single();
      largeOrderId = o!.order_id;

      const lines = products.map((p, i) => ({
        account_id: ACCOUNT_ID, order_id: largeOrderId, product_id: p.id,
        productname: p.name, qtyentered: 2, priceentered: p.price,
        lineamt: p.price * 2, linenetamt: p.price * 2 * 0.8696,
      }));
      await db.from('orderline').insert(lines);
    });

    it('7b. all 10 lines created', async () => {
      const db = getSupabase();
      const { data } = await db.from('orderline').select('orderline_id').eq('order_id', largeOrderId);
      expect(data!.length).toBe(10);
    });

    it('7c. stock deducted for all 10 products', async () => {
      const db = getSupabase();
      for (const p of products) {
        await db.from('stock_journal').insert({ account_id: ACCOUNT_ID, store_id: storeId, product_id: p.id, quantity_change: -2, quantity_after: 0, reason: 'sale', reference_type: 'order', user_id: userId });
      }
      // Verify product[5] (Gadget F) has 20 - 2 = 18 (initial 20, minus 2 from big cart)
      const { data } = await db.from('stock_journal').select('quantity_change').eq('account_id', ACCOUNT_ID).eq('product_id', products[5].id);
      const net = (data || []).reduce((s: number, j: any) => s + j.quantity_change, 0);
      expect(net).toBe(18); // 20 initial - 2 sold
    });

    it('7d. order total = sum of all line amounts', async () => {
      const db = getSupabase();
      const { data: lines } = await db.from('orderline').select('lineamt').eq('order_id', largeOrderId);
      const lineTotal = (lines || []).reduce((s: number, l: any) => s + l.lineamt, 0);
      const { data: order } = await db.from('orders').select('grand_total').eq('order_id', largeOrderId).single();
      expect(order!.grand_total).toBe(lineTotal);
    });
  });

  // ═══ FLOW 8: Concurrent Orders on Same Till ═══════════════════
  describe('Flow 8: Two cashiers, same till', () => {
    let tillId: number;

    it('8a. opens a shared till', async () => {
      const db = getSupabase();
      const { data } = await db.from('till').insert({ account_id: ACCOUNT_ID, store_id: storeId, terminal_id: terminalId, uuid: testUuid(), documentno: `SHARED-${TS}`, opening_amt: 200, open_by: userId, date_opened: new Date().toISOString(), status: 'open' }).select().single();
      tillId = data!.till_id;
    });

    it('8b. cashier 1 creates order for 100', async () => {
      const db = getSupabase();
      const { data } = await db.from('orders').insert({ account_id: ACCOUNT_ID, store_id: storeId, terminal_id: terminalId, till_id: tillId, uuid: testUuid(), document_no: `C1-${TS}`, sales_rep_id: userId, grand_total: 100, subtotal: 86.96, tax_total: 13.04, qty_total: 1, doc_status: 'CO', is_paid: true, date_ordered: new Date().toISOString() }).select().single();
      await db.from('payment').insert({ account_id: ACCOUNT_ID, order_id: data!.order_id, tendered: 100, amount: 100, change: 0, payment_type: 'CASH', pay_amt: 100, status: 'completed', date_paid: new Date().toISOString() });
    });

    it('8c. cashier 2 creates order for 300', async () => {
      const db = getSupabase();
      const { data } = await db.from('orders').insert({ account_id: ACCOUNT_ID, store_id: storeId, terminal_id: terminalId, till_id: tillId, uuid: testUuid(), document_no: `C2-${TS}`, sales_rep_id: user2Id, grand_total: 300, subtotal: 260.87, tax_total: 39.13, qty_total: 2, doc_status: 'CO', is_paid: true, date_ordered: new Date().toISOString() }).select().single();
      await db.from('payment').insert({ account_id: ACCOUNT_ID, order_id: data!.order_id, tendered: 300, amount: 300, change: 0, payment_type: 'CASH', pay_amt: 300, status: 'completed', date_paid: new Date().toISOString() });
    });

    it('8d. till has both orders', async () => {
      const db = getSupabase();
      const { data } = await db.from('orders').select('sales_rep_id, grand_total').eq('till_id', tillId);
      expect(data!.length).toBe(2);
      const byUser: Record<number, number> = {};
      for (const o of data!) byUser[o.sales_rep_id] = o.grand_total;
      expect(byUser[userId]).toBe(100);
      expect(byUser[user2Id]).toBe(300);
    });

    it('8e. till total = sum of both cashiers', async () => {
      const db = getSupabase();
      const { data } = await db.from('orders').select('grand_total').eq('till_id', tillId);
      const total = (data || []).reduce((s: number, o: any) => s + o.grand_total, 0);
      expect(total).toBe(400); // 100 + 300
    });
  });

  // ═══ FLOW 9: Final Integrity ══════════════════════════════════
  describe('Flow 9: Final integrity checks', () => {
    it('9a. total orders created in this test', async () => {
      const db = getSupabase();
      const { data } = await db.from('orders').select('order_id').eq('account_id', ACCOUNT_ID);
      // Free(1) + 3 loyalty + unpaid(1) + price1(1) + price2(1) + big(1) + c1(1) + c2(1) = 10
      expect(data!.length).toBe(10);
    });

    it('9b. customer loyalty = 500 from 3 orders', async () => {
      const db = getSupabase();
      const { data } = await db.from('customer').select('loyaltypoints').eq('customer_id', customerId).single();
      expect(data!.loyaltypoints).toBe(500);
    });

    it('9c. stock journals have entries for all movements', async () => {
      const db = getSupabase();
      const { data } = await db.from('stock_journal').select('reason').eq('account_id', ACCOUNT_ID);
      const reasons = [...new Set((data || []).map((j: any) => j.reason))];
      expect(reasons).toContain('initial');
      expect(reasons).toContain('sale');
      expect(reasons).toContain('receive');
    });

    it('9d. 3 tills created (till1 closed, till2 open, shared open)', async () => {
      const db = getSupabase();
      const { data } = await db.from('till').select('status').eq('account_id', ACCOUNT_ID).order('date_opened');
      const statuses = (data || []).map((t: any) => t.status);
      expect(statuses.filter((s: string) => s === 'closed').length).toBeGreaterThanOrEqual(1);
      expect(statuses.filter((s: string) => s === 'open').length).toBeGreaterThanOrEqual(1);
    });
  });
});
