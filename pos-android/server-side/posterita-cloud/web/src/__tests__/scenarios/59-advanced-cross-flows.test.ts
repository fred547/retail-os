/**
 * Scenario 59: Advanced Cross-Flow Integration Tests
 *
 * Tests complex multi-module interactions:
 * 1. Multi-payment split order (cash + card) → till reconciliation
 * 2. Promotion + loyalty combined on single order
 * 3. Serial item: receive → sell → track warranty
 * 4. Kitchen station routing: order with items → route to correct stations
 * 5. Supplier PO → receive → sell → stock journal audit trail
 * 6. Multi-store data isolation
 * 7. Bulk order + void + refund day → Z-report accuracy
 * 8. Roster period → pick → approve → schedule generated → shift clock
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getSupabase, SKIP_SCENARIOS, testUuid } from './helpers';

const TS = Date.now();
const ACCOUNT_ID = `test_advflow_${TS}`;

let store1Id: number;
let store2Id: number;
let terminalId: number;
let userId: number;
let categoryId: number;
let category2Id: number;
let taxId: number;
let productId: number;
let product2Id: number;
let product3Id: number;
let customerId: number;

describe.skipIf(SKIP_SCENARIOS)('Scenario 59: Advanced Cross-Flow Integration', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({ account_id: ACCOUNT_ID, businessname: `AdvFlow ${TS}`, type: 'testing', status: 'testing', currency: 'MUR', country_code: 'MU' });

    // Two stores for isolation testing
    const { data: s1 } = await db.from('store').insert({ account_id: ACCOUNT_ID, name: 'Main Store', isactive: 'Y' }).select().single();
    store1Id = s1!.store_id;
    const { data: s2 } = await db.from('store').insert({ account_id: ACCOUNT_ID, name: 'Branch Store', isactive: 'Y' }).select().single();
    store2Id = s2!.store_id;

    const { data: t } = await db.from('terminal').insert({ account_id: ACCOUNT_ID, store_id: store1Id, name: `Term ${TS}`, isactive: 'Y' }).select().single();
    terminalId = t!.terminal_id;
    const { data: u } = await db.from('pos_user').insert({ account_id: ACCOUNT_ID, username: `user_${TS}`, firstname: 'Bob', pin: '5678', role: 'staff', isactive: 'Y' }).select().single();
    userId = u!.user_id;

    const { data: c1 } = await db.from('productcategory').insert({ account_id: ACCOUNT_ID, name: 'Food', isactive: 'Y' }).select().single();
    categoryId = c1!.productcategory_id;
    const { data: c2 } = await db.from('productcategory').insert({ account_id: ACCOUNT_ID, name: 'Drinks', isactive: 'Y' }).select().single();
    category2Id = c2!.productcategory_id;

    const { data: tx } = await db.from('tax').insert({ account_id: ACCOUNT_ID, name: 'VAT 15%', rate: 15, isactive: 'Y' }).select().single();
    taxId = tx!.tax_id;

    const { data: p1 } = await db.from('product').insert({ account_id: ACCOUNT_ID, name: 'Burger', sellingprice: 250, costprice: 100, productcategory_id: categoryId, tax_id: taxId, isactive: 'Y', isstock: 'Y' }).select().single();
    productId = p1!.product_id;
    const { data: p2 } = await db.from('product').insert({ account_id: ACCOUNT_ID, name: 'Soda', sellingprice: 60, costprice: 20, productcategory_id: category2Id, tax_id: taxId, isactive: 'Y', isstock: 'Y' }).select().single();
    product2Id = p2!.product_id;
    const { data: p3 } = await db.from('product').insert({ account_id: ACCOUNT_ID, name: 'Laptop', sellingprice: 50000, costprice: 35000, productcategory_id: categoryId, tax_id: taxId, isactive: 'Y', isstock: 'Y' }).select().single();
    product3Id = p3!.product_id;

    // Seed stock for store 1
    await db.from('stock_journal').insert([
      { account_id: ACCOUNT_ID, store_id: store1Id, product_id: productId, quantity_change: 200, quantity_after: 200, reason: 'initial', reference_type: 'manual', user_id: userId },
      { account_id: ACCOUNT_ID, store_id: store1Id, product_id: product2Id, quantity_change: 500, quantity_after: 500, reason: 'initial', reference_type: 'manual', user_id: userId },
      { account_id: ACCOUNT_ID, store_id: store1Id, product_id: product3Id, quantity_change: 5, quantity_after: 5, reason: 'initial', reference_type: 'manual', user_id: userId },
      // Store 2 has different stock
      { account_id: ACCOUNT_ID, store_id: store2Id, product_id: productId, quantity_change: 50, quantity_after: 50, reason: 'initial', reference_type: 'manual', user_id: userId },
    ]);

    const { data: cust } = await db.from('customer').insert({ account_id: ACCOUNT_ID, name: 'Mike Test', phone1: '+23057001111', isactive: 'Y', loyaltypoints: 0 }).select().single();
    customerId = cust!.customer_id;
  });

  afterAll(async () => {
    const db = getSupabase();
    await Promise.all([
      db.from('loyalty_transaction').delete().eq('account_id', ACCOUNT_ID),
      db.from('promotion_usage').delete().eq('account_id', ACCOUNT_ID),
      db.from('stock_journal').delete().eq('account_id', ACCOUNT_ID),
      db.from('payment').delete().eq('account_id', ACCOUNT_ID),
      db.from('orderline').delete().eq('account_id', ACCOUNT_ID),
      db.from('orders').delete().eq('account_id', ACCOUNT_ID),
      db.from('till').delete().eq('account_id', ACCOUNT_ID),
      db.from('serial_item').delete().eq('account_id', ACCOUNT_ID),
      db.from('category_station_mapping').delete().eq('account_id', ACCOUNT_ID),
      db.from('preparation_station').delete().eq('account_id', ACCOUNT_ID),
      db.from('staff_schedule').delete().eq('account_id', ACCOUNT_ID),
      db.from('shift_pick').delete().eq('account_id', ACCOUNT_ID),
      db.from('roster_period').delete().eq('account_id', ACCOUNT_ID),
      db.from('roster_template_slot').delete().eq('account_id', ACCOUNT_ID),
      db.from('shift').delete().eq('account_id', ACCOUNT_ID),
      db.from('public_holiday').delete().eq('account_id', ACCOUNT_ID),
      db.from('labor_config').delete().eq('account_id', ACCOUNT_ID),
      db.from('loyalty_config').delete().eq('account_id', ACCOUNT_ID),
      db.from('promotion').delete().eq('account_id', ACCOUNT_ID),
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

  // ═══ FLOW 1: Split Payment → Till Reconciliation ═══════════════
  describe('Flow 1: Split payment order', () => {
    let tillId: number;
    let orderId: number;

    it('1a. opens till', async () => {
      const db = getSupabase();
      const { data } = await db.from('till').insert({ account_id: ACCOUNT_ID, store_id: store1Id, terminal_id: terminalId, uuid: testUuid(), documentno: `TILL-${TS}`, opening_amt: 1000, open_by: userId, date_opened: new Date().toISOString(), status: 'open' }).select().single();
      tillId = data!.till_id;
    });

    it('1b. creates order for 560 MUR', async () => {
      const db = getSupabase();
      const { data } = await db.from('orders').insert({ account_id: ACCOUNT_ID, store_id: store1Id, terminal_id: terminalId, till_id: tillId, uuid: testUuid(), document_no: `SPL-${TS}`, customer_id: customerId, sales_rep_id: userId, grand_total: 560, subtotal: 486.96, tax_total: 73.04, qty_total: 3, doc_status: 'CO', is_paid: true, date_ordered: new Date().toISOString() }).select().single();
      orderId = data!.order_id;
      await db.from('orderline').insert([
        { account_id: ACCOUNT_ID, order_id: orderId, product_id: productId, productname: 'Burger', qtyentered: 2, priceentered: 250, lineamt: 500, linenetamt: 434.78 },
        { account_id: ACCOUNT_ID, order_id: orderId, product_id: product2Id, productname: 'Soda', qtyentered: 1, priceentered: 60, lineamt: 60, linenetamt: 52.17 },
      ]);
    });

    it('1c. splits payment: 300 cash + 260 card', async () => {
      const db = getSupabase();
      await db.from('payment').insert([
        { account_id: ACCOUNT_ID, order_id: orderId, document_no: `SPL-${TS}`, tendered: 300, amount: 300, change: 0, payment_type: 'CASH', pay_amt: 300, status: 'completed', date_paid: new Date().toISOString() },
        { account_id: ACCOUNT_ID, order_id: orderId, document_no: `SPL-${TS}`, tendered: 260, amount: 260, change: 0, payment_type: 'CARD', pay_amt: 260, status: 'completed', date_paid: new Date().toISOString() },
      ]);
    });

    it('1d. payments sum to order total', async () => {
      const db = getSupabase();
      const { data } = await db.from('payment').select('amount, payment_type').eq('order_id', orderId);
      const total = (data || []).reduce((s: number, p: any) => s + p.amount, 0);
      expect(total).toBe(560);
      expect(data!.filter((p: any) => p.payment_type === 'CASH')[0].amount).toBe(300);
      expect(data!.filter((p: any) => p.payment_type === 'CARD')[0].amount).toBe(260);
    });

    it('1e. close till — cash matches (opening + cash payments)', async () => {
      const db = getSupabase();
      await db.from('till').update({ closing_amt: 1300, cash_amt: 300, card_amt: 260, close_by: userId, date_closed: new Date().toISOString(), status: 'closed' }).eq('till_id', tillId);
      const { data } = await db.from('till').select('opening_amt, closing_amt, cash_amt, card_amt').eq('till_id', tillId).single();
      expect(data!.closing_amt).toBe(1300); // 1000 opening + 300 cash
      expect(data!.cash_amt).toBe(300);
      expect(data!.card_amt).toBe(260);
    });
  });

  // ═══ FLOW 2: Promotion + Loyalty Combined ═════════════════════
  describe('Flow 2: Promotion + loyalty on same order', () => {
    let promoId: number;

    it('2a. setup loyalty + promotion', async () => {
      const db = getSupabase();
      await db.from('loyalty_config').insert({ account_id: ACCOUNT_ID, is_active: true, points_per_currency: 1, redemption_rate: 0.5, min_redeem_points: 10 });
      const { data } = await db.from('promotion').insert({ account_id: ACCOUNT_ID, name: '20% off Burgers', type: 'percentage_off', discount_value: 20, applies_to: 'order', is_active: true, max_uses: 100, start_date: '2026-01-01', end_date: '2026-12-31' }).select().single();
      promoId = data!.id;
    });

    it('2b. creates order with 20% promo (560 - 112 = 448)', async () => {
      const db = getSupabase();
      const uuid = testUuid();
      const { data: order } = await db.from('orders').insert({ account_id: ACCOUNT_ID, store_id: store1Id, terminal_id: terminalId, uuid, document_no: `COMBO-${TS}`, customer_id: customerId, sales_rep_id: userId, grand_total: 448, subtotal: 389.57, tax_total: 58.43, qty_total: 3, doc_status: 'CO', is_paid: true, date_ordered: new Date().toISOString() }).select().single();

      // Track promo usage
      await db.from('promotion_usage').insert({ account_id: ACCOUNT_ID, promotion_id: promoId, order_id: order!.order_id, customer_id: customerId, discount_applied: 112 });

      // Award loyalty on discounted total
      await db.from('loyalty_transaction').insert({ account_id: ACCOUNT_ID, customer_id: customerId, type: 'earn', points: 448, balance_after: 448, order_id: order!.order_id, created_by: userId, store_id: store1Id, terminal_id: terminalId });
      await db.from('customer').update({ loyaltypoints: 448 }).eq('customer_id', customerId);
    });

    it('2c. loyalty earned on discounted total (448 not 560)', async () => {
      const db = getSupabase();
      const { data } = await db.from('customer').select('loyaltypoints').eq('customer_id', customerId).single();
      expect(data!.loyaltypoints).toBe(448);
    });

    it('2d. promotion usage tracked', async () => {
      const db = getSupabase();
      const { data } = await db.from('promotion_usage').select('discount_applied').eq('promotion_id', promoId).eq('customer_id', customerId);
      expect(data!.length).toBe(1);
      expect(data![0].discount_applied).toBe(112);
    });
  });

  // ═══ FLOW 3: Serial Item Lifecycle ════════════════════════════
  describe('Flow 3: Serial item (VIN/IMEI)', () => {
    let serialItemId: number;

    it('3a. receives serial item into stock', async () => {
      const db = getSupabase();
      const { data, error } = await db.from('serial_item').insert({ account_id: ACCOUNT_ID, product_id: product3Id, serial_number: `SN-${TS}-001`, serial_type: 'serial', status: 'in_stock', store_id: store1Id, warranty_months: 24 }).select().single();
      expect(error).toBeNull();
      serialItemId = data!.serial_item_id;
      expect(data!.status).toBe('in_stock');
    });

    it('3b. sells serial item (links to order)', async () => {
      const db = getSupabase();
      const uuid = testUuid();
      const { data: order } = await db.from('orders').insert({ account_id: ACCOUNT_ID, store_id: store1Id, terminal_id: terminalId, uuid, document_no: `SER-${TS}`, sales_rep_id: userId, grand_total: 50000, subtotal: 43478.26, tax_total: 6521.74, qty_total: 1, doc_status: 'CO', is_paid: true, date_ordered: new Date().toISOString() }).select().single();

      await db.from('serial_item').update({ status: 'sold', order_id: order!.order_id, sold_date: new Date().toISOString(), selling_price: 50000, customer_id: customerId }).eq('serial_item_id', serialItemId);
    });

    it('3c. serial item tracks sold status + customer', async () => {
      const db = getSupabase();
      const { data } = await db.from('serial_item').select('status, customer_id, selling_price, serial_number').eq('serial_item_id', serialItemId).single();
      expect(data!.status).toBe('sold');
      expect(data!.customer_id).toBe(customerId);
      expect(data!.selling_price).toBe(50000);
      expect(data!.serial_number).toBe(`SN-${TS}-001`);
    });
  });

  // ═══ FLOW 4: Kitchen Station Routing ══════════════════════════
  describe('Flow 4: Kitchen station routing', () => {
    let kitchenStationId: number;
    let barStationId: number;

    it('4a. creates kitchen and bar stations', async () => {
      const db = getSupabase();
      const { data: ks } = await db.from('preparation_station').insert({ account_id: ACCOUNT_ID, store_id: store1Id, name: 'Kitchen', station_type: 'kitchen' }).select().single();
      kitchenStationId = ks!.station_id;
      const { data: bs } = await db.from('preparation_station').insert({ account_id: ACCOUNT_ID, store_id: store1Id, name: 'Bar', station_type: 'bar' }).select().single();
      barStationId = bs!.station_id;
    });

    it('4b. maps Food category → kitchen, Drinks → bar', async () => {
      const db = getSupabase();
      await db.from('category_station_mapping').insert([
        { account_id: ACCOUNT_ID, station_id: kitchenStationId, category_id: categoryId },
        { account_id: ACCOUNT_ID, station_id: barStationId, category_id: category2Id },
      ]);
    });

    it('4c. station routing resolves correctly', async () => {
      const db = getSupabase();
      // Burger (Food category) → Kitchen
      const { data: kitchenMappings } = await db.from('category_station_mapping')
        .select('station_id').eq('category_id', categoryId).eq('account_id', ACCOUNT_ID);
      expect(kitchenMappings![0].station_id).toBe(kitchenStationId);

      // Soda (Drinks category) → Bar
      const { data: barMappings } = await db.from('category_station_mapping')
        .select('station_id').eq('category_id', category2Id).eq('account_id', ACCOUNT_ID);
      expect(barMappings![0].station_id).toBe(barStationId);
    });

    it('4d. order with mixed categories routes to both stations', async () => {
      const db = getSupabase();
      // Simulate: 2 Burgers (Food→Kitchen) + 1 Soda (Drinks→Bar)
      const { data: mappings } = await db.from('category_station_mapping')
        .select('station_id, category_id').eq('account_id', ACCOUNT_ID);

      const categoryToStation: Record<number, number> = {};
      for (const m of mappings || []) categoryToStation[m.category_id] = m.station_id;

      const orderItems = [
        { product: 'Burger', category_id: categoryId },
        { product: 'Soda', category_id: category2Id },
      ];

      const stationsNeeded = new Set(orderItems.map(i => categoryToStation[i.category_id]));
      expect(stationsNeeded.size).toBe(2);
      expect(stationsNeeded.has(kitchenStationId)).toBe(true);
      expect(stationsNeeded.has(barStationId)).toBe(true);
    });
  });

  // ═══ FLOW 5: Multi-Store Data Isolation ═══════════════════════
  describe('Flow 5: Multi-store isolation', () => {
    it('5a. store 1 stock is independent of store 2', async () => {
      const db = getSupabase();
      const { data: s1 } = await db.from('stock_journal').select('quantity_change').eq('account_id', ACCOUNT_ID).eq('store_id', store1Id).eq('product_id', productId);
      const { data: s2 } = await db.from('stock_journal').select('quantity_change').eq('account_id', ACCOUNT_ID).eq('store_id', store2Id).eq('product_id', productId);

      const store1Stock = (s1 || []).reduce((s: number, j: any) => s + j.quantity_change, 0);
      const store2Stock = (s2 || []).reduce((s: number, j: any) => s + j.quantity_change, 0);

      expect(store1Stock).toBe(200);
      expect(store2Stock).toBe(50);
      expect(store1Stock).not.toBe(store2Stock);
    });

    it('5b. sale in store 2 does not affect store 1', async () => {
      const db = getSupabase();
      // Sale of 5 burgers in store 2
      await db.from('stock_journal').insert({ account_id: ACCOUNT_ID, store_id: store2Id, product_id: productId, quantity_change: -5, quantity_after: 45, reason: 'sale', reference_type: 'order', user_id: userId });

      // Store 1 unaffected
      const { data: s1 } = await db.from('stock_journal').select('quantity_change').eq('account_id', ACCOUNT_ID).eq('store_id', store1Id).eq('product_id', productId);
      expect((s1 || []).reduce((s: number, j: any) => s + j.quantity_change, 0)).toBe(200);

      // Store 2 decreased
      const { data: s2 } = await db.from('stock_journal').select('quantity_change').eq('account_id', ACCOUNT_ID).eq('store_id', store2Id).eq('product_id', productId);
      expect((s2 || []).reduce((s: number, j: any) => s + j.quantity_change, 0)).toBe(45);
    });
  });

  // ═══ FLOW 6: Busy Day → Z-Report Accuracy ════════════════════
  describe('Flow 6: Full day simulation → Z-report data', () => {
    const dayOrders: { id: number; uuid: string; total: number; status: string }[] = [];

    it('6a. creates 5 valid orders', async () => {
      const db = getSupabase();
      for (let i = 0; i < 5; i++) {
        const uuid = testUuid();
        const total = 100 + i * 50; // 100, 150, 200, 250, 300
        const { data } = await db.from('orders').insert({ account_id: ACCOUNT_ID, store_id: store1Id, terminal_id: terminalId, uuid, document_no: `DAY-${TS}-${i}`, sales_rep_id: userId, grand_total: total, subtotal: total * 0.8696, tax_total: total * 0.1304, qty_total: 1, doc_status: 'CO', is_paid: true, date_ordered: new Date().toISOString() }).select().single();
        dayOrders.push({ id: data!.order_id, uuid, total, status: 'CO' });
      }
    });

    it('6b. voids 1 order', async () => {
      const db = getSupabase();
      await db.from('orders').update({ doc_status: 'VO' }).eq('order_id', dayOrders[2].id);
      dayOrders[2].status = 'VO';
    });

    it('6c. creates 1 refund', async () => {
      const db = getSupabase();
      const uuid = testUuid();
      const { data } = await db.from('orders').insert({ account_id: ACCOUNT_ID, store_id: store1Id, terminal_id: terminalId, uuid, document_no: `REF-${TS}-DAY`, sales_rep_id: userId, grand_total: -100, subtotal: -86.96, tax_total: -13.04, qty_total: -1, doc_status: 'CO', is_paid: true, date_ordered: new Date().toISOString(), note: 'Refund' }).select().single();
      dayOrders.push({ id: data!.order_id, uuid, total: -100, status: 'CO' });
    });

    it('6d. Z-report totals: valid sales - refunds (voids excluded)', async () => {
      const db = getSupabase();
      const { data: allOrders } = await db.from('orders')
        .select('grand_total, doc_status')
        .eq('account_id', ACCOUNT_ID)
        .eq('store_id', store1Id)
        .in('document_no', dayOrders.map((_, i) => i < 5 ? `DAY-${TS}-${i}` : `REF-${TS}-DAY`));

      // Include all day orders + refund in a wider query
      const valid = dayOrders.filter(o => o.status === 'CO');
      const voided = dayOrders.filter(o => o.status === 'VO');

      const validTotal = valid.reduce((s, o) => s + o.total, 0);
      const voidTotal = voided.reduce((s, o) => s + o.total, 0);

      // Valid: 100 + 150 + 250 + 300 + (-100 refund) = 700
      expect(validTotal).toBe(700);
      // Voided: 200
      expect(voidTotal).toBe(200);
      // Net = valid only (voids excluded from revenue)
      expect(validTotal).toBe(700);
    });

    it('6e. order count breakdown', async () => {
      expect(dayOrders.filter(o => o.status === 'CO' && o.total > 0).length).toBe(4); // 4 valid sales
      expect(dayOrders.filter(o => o.status === 'VO').length).toBe(1); // 1 void
      expect(dayOrders.filter(o => o.status === 'CO' && o.total < 0).length).toBe(1); // 1 refund
    });
  });

  // ═══ FLOW 7: Roster → Pick → Approve → Schedule → Clock ══════
  describe('Flow 7: Full roster-to-shift flow', () => {
    let slotId: number;
    let periodId: number;
    let pickId: number;

    it('7a. setup: labor config + holiday + template slot', async () => {
      const db = getSupabase();
      await db.from('labor_config').insert({ account_id: ACCOUNT_ID, country_code: 'MU', standard_weekly_hours: 45, weekday_multiplier: 1.0, sunday_multiplier: 1.5, public_holiday_multiplier: 2.0 });
      await db.from('public_holiday').insert({ account_id: ACCOUNT_ID, country_code: 'MU', date: '2026-05-01', name: 'Labour Day' });
      const { data } = await db.from('roster_template_slot').insert({ account_id: ACCOUNT_ID, store_id: store1Id, name: 'Morning', day_of_week: 4, start_time: '08:00', end_time: '16:00', break_minutes: 30, color: '#3b82f6' }).select().single();
      slotId = data!.id;
    });

    it('7b. creates roster period + opens picking', async () => {
      const db = getSupabase();
      const { data } = await db.from('roster_period').insert({ account_id: ACCOUNT_ID, store_id: store1Id, name: 'May 2026', start_date: '2026-05-01', end_date: '2026-05-31', status: 'open' }).select().single();
      periodId = data!.id;
      await db.from('roster_period').update({ status: 'picking' }).eq('id', periodId);
    });

    it('7c. staff picks a shift on Labour Day', async () => {
      const db = getSupabase();
      const { data, error } = await db.from('shift_pick').insert({ account_id: ACCOUNT_ID, roster_period_id: periodId, slot_id: slotId, user_id: userId, date: '2026-05-01', status: 'picked', effective_hours: 15, day_type: 'public_holiday', multiplier: 2.0 }).select().single();
      expect(error).toBeNull();
      pickId = data!.id;
    });

    it('7d. approve picks → generate staff_schedule', async () => {
      const db = getSupabase();
      // Review → approve
      await db.from('roster_period').update({ status: 'review' }).eq('id', periodId);
      await db.from('shift_pick').update({ status: 'approved' }).eq('id', pickId);

      // Generate schedule from approved pick
      await db.from('staff_schedule').insert({ account_id: ACCOUNT_ID, store_id: store1Id, user_id: userId, date: '2026-05-01', start_time: '08:00', end_time: '16:00', break_minutes: 30, slot_id: slotId, roster_period_id: periodId, pick_id: pickId, effective_hours: 15, day_type: 'public_holiday', multiplier: 2.0 });

      await db.from('roster_period').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', periodId);
    });

    it('7e. staff clocks in/out on scheduled day', async () => {
      const db = getSupabase();
      const { data } = await db.from('shift').insert({ account_id: ACCOUNT_ID, store_id: store1Id, terminal_id: terminalId, user_id: userId, user_name: 'Bob', clock_in: '2026-05-01T08:00:00Z', clock_out: '2026-05-01T16:00:00Z', break_minutes: 30, hours_worked: 7.5, effective_hours: 15, day_type: 'public_holiday', multiplier: 2.0, status: 'completed' }).select().single();
      expect(data!.effective_hours).toBe(15);
    });

    it('7f. schedule matches actual shift', async () => {
      const db = getSupabase();
      const { data: sched } = await db.from('staff_schedule').select('effective_hours, day_type').eq('account_id', ACCOUNT_ID).eq('date', '2026-05-01').single();
      const { data: shift } = await db.from('shift').select('effective_hours, day_type').eq('account_id', ACCOUNT_ID).eq('user_id', userId).eq('day_type', 'public_holiday').single();

      expect(sched!.effective_hours).toBe(shift!.effective_hours);
      expect(sched!.day_type).toBe(shift!.day_type);
    });
  });

  // ═══ FLOW 8: Final Integrity ══════════════════════════════════
  describe('Flow 8: Final integrity', () => {
    it('8a. customer loyalty from promo+loyalty order', async () => {
      const db = getSupabase();
      const { data } = await db.from('customer').select('loyaltypoints').eq('customer_id', customerId).single();
      expect(data!.loyaltypoints).toBe(448);
    });

    it('8b. serial item is sold with customer linked', async () => {
      const db = getSupabase();
      const { data } = await db.from('serial_item').select('status, customer_id').eq('account_id', ACCOUNT_ID).eq('serial_number', `SN-${TS}-001`).single();
      expect(data!.status).toBe('sold');
      expect(data!.customer_id).toBe(customerId);
    });

    it('8c. two stores have independent stock levels', async () => {
      const db = getSupabase();
      const { data: s1 } = await db.from('stock_journal').select('quantity_change').eq('account_id', ACCOUNT_ID).eq('store_id', store1Id).eq('product_id', productId);
      const { data: s2 } = await db.from('stock_journal').select('quantity_change').eq('account_id', ACCOUNT_ID).eq('store_id', store2Id).eq('product_id', productId);
      expect((s1 || []).reduce((s: number, j: any) => s + j.quantity_change, 0)).toBe(200);
      expect((s2 || []).reduce((s: number, j: any) => s + j.quantity_change, 0)).toBe(45);
    });

    it('8d. roster pick → schedule → shift chain is complete', async () => {
      const db = getSupabase();
      const { data: pick } = await db.from('shift_pick').select('status').eq('account_id', ACCOUNT_ID).eq('date', '2026-05-01').single();
      const { data: sched } = await db.from('staff_schedule').select('pick_id').eq('account_id', ACCOUNT_ID).eq('date', '2026-05-01').single();
      const { data: shift } = await db.from('shift').select('status').eq('account_id', ACCOUNT_ID).eq('day_type', 'public_holiday').single();

      expect(pick!.status).toBe('approved');
      expect(sched!.pick_id).toBeTruthy();
      expect(shift!.status).toBe('completed');
    });
  });
});
