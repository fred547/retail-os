/**
 * Scenario 58: Business Cross-Flow Integration Tests
 *
 * 7 flows + 1 integrity check = 38 tests against real Supabase.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getSupabase, SKIP_SCENARIOS, testUuid } from './helpers';

const TS = Date.now();
const ACCOUNT_ID = `test_bizflow_${TS}`;

let storeId: number;
let terminalId: number;
let userId: number;
let categoryId: number;
let taxId: number;
let productId: number;
let product2Id: number;
let customerId: number;

describe.skipIf(SKIP_SCENARIOS)('Scenario 58: Business Cross-Flow Integration', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({ account_id: ACCOUNT_ID, businessname: `BizFlow ${TS}`, type: 'testing', status: 'testing', currency: 'MUR', country_code: 'MU' });
    const { data: s } = await db.from('store').insert({ account_id: ACCOUNT_ID, name: `Store ${TS}`, isactive: 'Y' }).select().single();
    storeId = s!.store_id;
    const { data: t } = await db.from('terminal').insert({ account_id: ACCOUNT_ID, store_id: storeId, name: `Term ${TS}`, isactive: 'Y' }).select().single();
    terminalId = t!.terminal_id;
    const { data: u } = await db.from('pos_user').insert({ account_id: ACCOUNT_ID, username: `user_${TS}`, firstname: 'Alice', pin: '1234', role: 'staff', isactive: 'Y' }).select().single();
    userId = u!.user_id;
    const { data: c } = await db.from('productcategory').insert({ account_id: ACCOUNT_ID, name: 'Drinks', isactive: 'Y' }).select().single();
    categoryId = c!.productcategory_id;
    const { data: tx } = await db.from('tax').insert({ account_id: ACCOUNT_ID, name: 'VAT 15%', rate: 15, isactive: 'Y' }).select().single();
    taxId = tx!.tax_id;
    const { data: p1 } = await db.from('product').insert({ account_id: ACCOUNT_ID, name: 'Coffee', sellingprice: 50, costprice: 20, productcategory_id: categoryId, tax_id: taxId, isactive: 'Y', isstock: 'Y' }).select().single();
    productId = p1!.product_id;
    const { data: p2 } = await db.from('product').insert({ account_id: ACCOUNT_ID, name: 'Juice', sellingprice: 80, costprice: 30, productcategory_id: categoryId, tax_id: taxId, isactive: 'Y', isstock: 'Y' }).select().single();
    product2Id = p2!.product_id;
    await db.from('stock_journal').insert([
      { account_id: ACCOUNT_ID, store_id: storeId, product_id: productId, quantity_change: 100, quantity_after: 100, reason: 'initial', reference_type: 'manual', user_id: userId },
      { account_id: ACCOUNT_ID, store_id: storeId, product_id: product2Id, quantity_change: 50, quantity_after: 50, reason: 'initial', reference_type: 'manual', user_id: userId },
    ]);
    const { data: cust } = await db.from('customer').insert({ account_id: ACCOUNT_ID, name: 'Jane Doe', phone1: '+23057009876', isactive: 'Y' }).select().single();
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
      db.from('count_scan').delete().eq('account_id', ACCOUNT_ID),
      db.from('count_zone_assignment').delete().eq('account_id', ACCOUNT_ID),
      db.from('count_plan').delete().eq('account_id', ACCOUNT_ID),
      db.from('product_tag').delete().eq('account_id', ACCOUNT_ID),
      db.from('tag').delete().eq('account_id', ACCOUNT_ID),
      db.from('tag_group').delete().eq('account_id', ACCOUNT_ID),
      db.from('shift').delete().eq('account_id', ACCOUNT_ID),
      db.from('public_holiday').delete().eq('account_id', ACCOUNT_ID),
      db.from('labor_config').delete().eq('account_id', ACCOUNT_ID),
      db.from('loyalty_config').delete().eq('account_id', ACCOUNT_ID),
      db.from('promotion').delete().eq('account_id', ACCOUNT_ID),
    ]);
    // PO cleanup — lines reference po_id
    const { data: pos } = await db.from('purchase_order').select('po_id').eq('account_id', ACCOUNT_ID);
    if (pos?.length) {
      const poIds = pos.map((p: any) => p.po_id);
      await db.from('purchase_order_line').delete().in('po_id', poIds);
    }
    await db.from('purchase_order').delete().eq('account_id', ACCOUNT_ID);
    await db.from('supplier').delete().eq('account_id', ACCOUNT_ID);
    // Quotation cleanup — lines reference quotation_id
    const { data: qs } = await db.from('quotation').select('quotation_id').eq('account_id', ACCOUNT_ID);
    if (qs?.length) {
      const qIds = qs.map((q: any) => q.quotation_id);
      await db.from('quotation_line').delete().in('quotation_id', qIds);
    }
    await db.from('quotation').delete().eq('account_id', ACCOUNT_ID);
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

  // ═══ FLOW 1: Loyalty ═══════════════════════════════════════════
  describe('Flow 1: Loyalty lifecycle', () => {
    it('1a. creates loyalty config', async () => {
      const db = getSupabase();
      const { error } = await db.from('loyalty_config').insert({
        account_id: ACCOUNT_ID, is_active: true, points_per_currency: 1, redemption_rate: 0.5, min_redeem_points: 10, welcome_bonus: 5,
      });
      expect(error).toBeNull();
    });

    it('1b. earns 200 points on sale', async () => {
      const db = getSupabase();
      const orderUuid = testUuid();
      await db.from('orders').insert({ account_id: ACCOUNT_ID, store_id: storeId, terminal_id: terminalId, uuid: orderUuid, document_no: `LOY-${TS}`, customer_id: customerId, sales_rep_id: userId, grand_total: 200, subtotal: 173.91, tax_total: 26.09, qty_total: 2, doc_status: 'CO', is_paid: true, date_ordered: new Date().toISOString() });
      // order_id in loyalty_transaction is INTEGER (order PK), not UUID
      const { data: ord } = await db.from('orders').select('order_id').eq('uuid', orderUuid).eq('account_id', ACCOUNT_ID).single();
      await db.from('loyalty_transaction').insert({ account_id: ACCOUNT_ID, customer_id: customerId, type: 'earn', points: 200, balance_after: 200, order_id: ord!.order_id, created_by: userId, store_id: storeId, terminal_id: terminalId });
      await db.from('customer').update({ loyaltypoints: 200 }).eq('customer_id', customerId);
      const { data } = await db.from('customer').select('loyaltypoints').eq('customer_id', customerId).single();
      expect(data!.loyaltypoints).toBe(200);
    });

    it('1c. redeems 50 points', async () => {
      const db = getSupabase();
      await db.from('loyalty_transaction').insert({ account_id: ACCOUNT_ID, customer_id: customerId, type: 'redeem', points: -50, balance_after: 150, created_by: userId, store_id: storeId, terminal_id: terminalId });
      await db.from('customer').update({ loyaltypoints: 150 }).eq('customer_id', customerId);
      const { data } = await db.from('customer').select('loyaltypoints').eq('customer_id', customerId).single();
      expect(data!.loyaltypoints).toBe(150);
    });

    it('1d. transaction history shows earn + redeem', async () => {
      const db = getSupabase();
      const { data } = await db.from('loyalty_transaction').select('type, points').eq('account_id', ACCOUNT_ID).eq('customer_id', customerId).order('created_at');
      expect(data!.length).toBe(2);
      expect(data![0].type).toBe('earn');
      expect(data![1].type).toBe('redeem');
    });
  });

  // ═══ FLOW 2: Promotion ═════════════════════════════════════════
  describe('Flow 2: Promotion usage tracking', () => {
    let promoId: number;

    it('2a. creates promotion with max 2 uses', async () => {
      const db = getSupabase();
      const { data, error } = await db.from('promotion').insert({
        account_id: ACCOUNT_ID, name: '10% Summer', promo_code: 'SUMMER10', type: 'percentage_off', discount_value: 10, applies_to: 'order', is_active: true, max_uses: 2, max_uses_per_customer: 1, start_date: '2026-01-01', end_date: '2026-12-31',
      }).select().single();
      expect(error).toBeNull();
      promoId = data!.id;
    });

    it('2b. tracks first usage', async () => {
      const db = getSupabase();
      const { error } = await db.from('promotion_usage').insert({ account_id: ACCOUNT_ID, promotion_id: promoId, order_id: 1, customer_id: customerId, discount_applied: 20 });
      expect(error).toBeNull();
    });

    it('2c. tracks second usage', async () => {
      const db = getSupabase();
      const { error } = await db.from('promotion_usage').insert({ account_id: ACCOUNT_ID, promotion_id: promoId, order_id: 2, customer_id: 0, discount_applied: 15 });
      expect(error).toBeNull();
    });

    it('2d. usage count = max_uses', async () => {
      const db = getSupabase();
      const { data: usages } = await db.from('promotion_usage').select('id').eq('promotion_id', promoId);
      const { data: promo } = await db.from('promotion').select('max_uses').eq('id', promoId).single();
      expect(usages!.length).toBe(promo!.max_uses);
    });

    it('2e. per-customer limit reached', async () => {
      const db = getSupabase();
      const { data } = await db.from('promotion_usage').select('id').eq('promotion_id', promoId).eq('customer_id', customerId);
      expect(data!.length).toBe(1); // max_uses_per_customer = 1
    });
  });

  // ═══ FLOW 3: Purchase Order ════════════════════════════════════
  describe('Flow 3: PO → GRN → stock', () => {
    let supplierId: number;
    let poId: number;
    let poLine1Id: number;
    let poLine2Id: number;

    it('3a. creates supplier', async () => {
      const db = getSupabase();
      const { data, error } = await db.from('supplier').insert({ account_id: ACCOUNT_ID, name: 'Bean Co.', contact_name: 'John', email: 'john@beanco.test', phone: '+23050001234', is_active: true }).select().single();
      expect(error).toBeNull();
      supplierId = data!.supplier_id;
    });

    it('3b. creates PO with 2 lines', async () => {
      const db = getSupabase();
      const { data: po, error: poErr } = await db.from('purchase_order').insert({ account_id: ACCOUNT_ID, store_id: storeId, supplier_id: supplierId, po_number: `PO-${TS}`, status: 'draft', subtotal: 900 }).select().single();
      expect(poErr).toBeNull();
      poId = po!.po_id;
      const { data: lines, error: lineErr } = await db.from('purchase_order_line').insert([
        { po_id: poId, account_id: ACCOUNT_ID, product_id: productId, product_name: 'Coffee', quantity_ordered: 50, unit_cost: 10, line_total: 500 },
        { po_id: poId, account_id: ACCOUNT_ID, product_id: product2Id, product_name: 'Juice', quantity_ordered: 20, unit_cost: 20, line_total: 400 },
      ]).select();
      expect(lineErr).toBeNull();
      poLine1Id = lines![0].id;
      poLine2Id = lines![1].id;
    });

    it('3c. sends PO', async () => {
      const db = getSupabase();
      const { error } = await db.from('purchase_order').update({ status: 'sent' }).eq('po_id', poId);
      expect(error).toBeNull();
    });

    it('3d. partial receive: 30 of 50 Coffee', async () => {
      const db = getSupabase();
      await db.from('purchase_order_line').update({ quantity_received: 30 }).eq('id', poLine1Id);
      await db.from('purchase_order').update({ status: 'partial' }).eq('po_id', poId);
      await db.from('stock_journal').insert({ account_id: ACCOUNT_ID, store_id: storeId, product_id: productId, quantity_change: 30, quantity_after: 130, reason: 'receive', reference_type: 'purchase_order', reference_id: `PO-${TS}`, user_id: userId });
      const { data } = await db.from('purchase_order_line').select('quantity_received').eq('id', poLine1Id).single();
      expect(data!.quantity_received).toBe(30);
    });

    it('3e. full receive', async () => {
      const db = getSupabase();
      await db.from('purchase_order_line').update({ quantity_received: 50 }).eq('id', poLine1Id);
      await db.from('purchase_order_line').update({ quantity_received: 20 }).eq('id', poLine2Id);
      await db.from('purchase_order').update({ status: 'received' }).eq('po_id', poId);
      await db.from('stock_journal').insert([
        { account_id: ACCOUNT_ID, store_id: storeId, product_id: productId, quantity_change: 20, quantity_after: 150, reason: 'receive', reference_type: 'purchase_order', reference_id: `PO-${TS}`, user_id: userId },
        { account_id: ACCOUNT_ID, store_id: storeId, product_id: product2Id, quantity_change: 20, quantity_after: 70, reason: 'receive', reference_type: 'purchase_order', reference_id: `PO-${TS}`, user_id: userId },
      ]);
      const { data: po } = await db.from('purchase_order').select('status').eq('po_id', poId).single();
      expect(po!.status).toBe('received');
    });

    it('3f. stock reflects PO receives', async () => {
      const db = getSupabase();
      const { data: cj } = await db.from('stock_journal').select('quantity_change').eq('account_id', ACCOUNT_ID).eq('product_id', productId);
      expect((cj || []).reduce((s: number, j: any) => s + j.quantity_change, 0)).toBe(150);
      const { data: jj } = await db.from('stock_journal').select('quantity_change').eq('account_id', ACCOUNT_ID).eq('product_id', product2Id);
      expect((jj || []).reduce((s: number, j: any) => s + j.quantity_change, 0)).toBe(70);
    });
  });

  // ═══ FLOW 4: Shift ═════════════════════════════════════════════
  describe('Flow 4: Shift with effective hours', () => {
    let shiftId: number;

    it('4a. seeds holiday + labor config', async () => {
      const db = getSupabase();
      await db.from('public_holiday').insert({ account_id: ACCOUNT_ID, country_code: 'MU', date: '2026-05-01', name: 'Labour Day', is_recurring: true });
      await db.from('labor_config').insert({ account_id: ACCOUNT_ID, country_code: 'MU', standard_weekly_hours: 45, weekday_multiplier: 1.0, sunday_multiplier: 1.5, public_holiday_multiplier: 2.0 });
    });

    it('4b. clocks in on Labour Day', async () => {
      const db = getSupabase();
      const { data, error } = await db.from('shift').insert({ account_id: ACCOUNT_ID, store_id: storeId, terminal_id: terminalId, user_id: userId, user_name: 'Alice', clock_in: '2026-05-01T08:00:00Z', status: 'active' }).select().single();
      expect(error).toBeNull();
      shiftId = data!.id;
    });

    it('4c. clocks out after 9h (holiday 2x)', async () => {
      const db = getSupabase();
      const { error } = await db.from('shift').update({ clock_out: '2026-05-01T17:00:00Z', break_minutes: 30, hours_worked: 8.5, effective_hours: 17, day_type: 'public_holiday', multiplier: 2.0, status: 'completed' }).eq('id', shiftId);
      expect(error).toBeNull();
    });

    it('4d. effective hours correct', async () => {
      const db = getSupabase();
      const { data } = await db.from('shift').select('hours_worked, effective_hours, day_type, multiplier').eq('id', shiftId).single();
      expect(data!.hours_worked).toBe(8.5);
      expect(data!.effective_hours).toBe(17);
      expect(data!.day_type).toBe('public_holiday');
      expect(data!.multiplier).toBe(2.0);
    });
  });

  // ═══ FLOW 5: Quotation ═════════════════════════════════════════
  describe('Flow 5: Quotation → Order', () => {
    let quoteId: number;

    it('5a. creates quotation', async () => {
      const db = getSupabase();
      const { data, error } = await db.from('quotation').insert({ account_id: ACCOUNT_ID, store_id: storeId, customer_id: customerId, customer_name: 'Jane Doe', document_no: `QT-${TS}`, status: 'draft', subtotal: 210, tax_total: 31.5, grand_total: 241.5, valid_until: '2026-06-30' }).select().single();
      expect(error).toBeNull();
      quoteId = data!.quotation_id;
      await db.from('quotation_line').insert([
        { quotation_id: quoteId, product_id: productId, product_name: 'Coffee', quantity: 2, unit_price: 50, tax_rate: 15, line_total: 100, position: 1 },
        { quotation_id: quoteId, product_id: product2Id, product_name: 'Juice', quantity: 1, unit_price: 80, tax_rate: 15, line_total: 80, position: 2 },
      ]);
    });

    it('5b. sends quotation', async () => {
      const db = getSupabase();
      const { error } = await db.from('quotation').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('quotation_id', quoteId);
      expect(error).toBeNull();
    });

    it('5c. converts to order', async () => {
      const db = getSupabase();
      const { data: order } = await db.from('orders').insert({ account_id: ACCOUNT_ID, store_id: storeId, terminal_id: terminalId, uuid: testUuid(), document_no: `ORD-${TS}-QT`, customer_id: customerId, sales_rep_id: userId, grand_total: 241.5, subtotal: 210, tax_total: 31.5, qty_total: 3, doc_status: 'CO', is_paid: true, date_ordered: new Date().toISOString() }).select().single();
      await db.from('quotation').update({ status: 'converted', converted_order_id: order!.order_id }).eq('quotation_id', quoteId);
      const { data: q } = await db.from('quotation').select('status, converted_order_id').eq('quotation_id', quoteId).single();
      expect(q!.status).toBe('converted');
      expect(q!.converted_order_id).toBe(order!.order_id);
    });

    it('5d. converted quote has linked order', async () => {
      const db = getSupabase();
      const { data: q } = await db.from('quotation').select('converted_order_id').eq('quotation_id', quoteId).single();
      const { data: o } = await db.from('orders').select('order_id').eq('order_id', q!.converted_order_id).single();
      expect(o).not.toBeNull();
    });
  });

  // ═══ FLOW 6: Tags ══════════════════════════════════════════════
  describe('Flow 6: Tags', () => {
    let groupId: number;
    let tag1Id: number;
    let tag2Id: number;

    it('6a. creates tag group', async () => {
      const db = getSupabase();
      const { data, error } = await db.from('tag_group').insert({ account_id: ACCOUNT_ID, name: 'Beverage Type', color: '#3b82f6' }).select().single();
      expect(error).toBeNull();
      groupId = data!.tag_group_id;
    });

    it('6b. creates tags', async () => {
      const db = getSupabase();
      const { data } = await db.from('tag').insert([
        { account_id: ACCOUNT_ID, tag_group_id: groupId, name: 'Hot', color: '#ef4444', position: 1 },
        { account_id: ACCOUNT_ID, tag_group_id: groupId, name: 'Cold', color: '#3b82f6', position: 2 },
      ]).select();
      tag1Id = data![0].tag_id;
      tag2Id = data![1].tag_id;
    });

    it('6c. assigns tags to products', async () => {
      const db = getSupabase();
      const { error } = await db.from('product_tag').insert([
        { account_id: ACCOUNT_ID, product_id: productId, tag_id: tag1Id },
        { account_id: ACCOUNT_ID, product_id: product2Id, tag_id: tag2Id },
      ]);
      expect(error).toBeNull();
    });

    it('6d. many-to-many resolves', async () => {
      const db = getSupabase();
      const { data: ct } = await db.from('product_tag').select('tag_id').eq('product_id', productId).eq('account_id', ACCOUNT_ID);
      expect(ct!.length).toBe(1);
      expect(ct![0].tag_id).toBe(tag1Id);
    });

    it('6e. group has both tags', async () => {
      const db = getSupabase();
      const { data } = await db.from('tag').select('name').eq('tag_group_id', groupId).order('position');
      expect(data!.map((t: any) => t.name)).toEqual(['Hot', 'Cold']);
    });
  });

  // ═══ FLOW 7: Inventory Count ═══════════════════════════════════
  describe('Flow 7: Inventory count', () => {
    let planId: number;
    let zoneId: number;

    it('7a. creates count plan', async () => {
      const db = getSupabase();
      const { data, error } = await db.from('count_plan').insert({ account_id: ACCOUNT_ID, store_id: storeId, name: `Count ${TS}`, status: 'draft', created_by: userId }).select().single();
      expect(error).toBeNull();
      planId = data!.id;
    });

    it('7b. assigns zone', async () => {
      const db = getSupabase();
      const { data, error } = await db.from('count_zone_assignment').insert({ plan_id: planId, account_id: ACCOUNT_ID, user_id: userId, user_name: 'Alice', shelf_start: 1, shelf_end: 10, height_labels: ['A', 'B', 'C'], status: 'pending' }).select().single();
      expect(error).toBeNull();
      zoneId = data!.id;
    });

    it('7c. activates plan', async () => {
      const db = getSupabase();
      await db.from('count_plan').update({ status: 'active', started_at: new Date().toISOString() }).eq('id', planId);
      await db.from('count_zone_assignment').update({ status: 'in_progress', started_at: new Date().toISOString() }).eq('id', zoneId);
    });

    it('7d. submits scans', async () => {
      const db = getSupabase();
      const { error } = await db.from('count_scan').insert([
        { plan_id: planId, account_id: ACCOUNT_ID, user_id: userId, user_name: 'Alice', shelf: 1, height: 'A', product_id: productId, product_name: 'Coffee', quantity: 145 },
        { plan_id: planId, account_id: ACCOUNT_ID, user_id: userId, user_name: 'Alice', shelf: 2, height: 'A', product_id: product2Id, product_name: 'Juice', quantity: 68 },
      ]);
      expect(error).toBeNull();
    });

    it('7e. aggregates per product', async () => {
      const db = getSupabase();
      const { data } = await db.from('count_scan').select('product_id, quantity').eq('plan_id', planId);
      const byProd: Record<number, number> = {};
      for (const s of data || []) byProd[s.product_id] = (byProd[s.product_id] || 0) + s.quantity;
      expect(byProd[productId]).toBe(145); // Journal says 150, counted 145 → variance -5
      expect(byProd[product2Id]).toBe(68); // Journal says 70, counted 68 → variance -2
    });

    it('7f. completes plan', async () => {
      const db = getSupabase();
      await db.from('count_zone_assignment').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', zoneId);
      await db.from('count_plan').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', planId);
      const { data } = await db.from('count_plan').select('status').eq('id', planId).single();
      expect(data!.status).toBe('completed');
    });
  });

  // ═══ FLOW 8: Cross-Module Integrity ════════════════════════════
  describe('Flow 8: Integrity', () => {
    it('8a. customer has 150 loyalty points', async () => {
      const db = getSupabase();
      const { data } = await db.from('customer').select('loyaltypoints').eq('customer_id', customerId).single();
      expect(data!.loyaltypoints).toBe(150);
    });

    it('8b. promotion usage = 2', async () => {
      const db = getSupabase();
      const { data } = await db.from('promotion_usage').select('id').eq('account_id', ACCOUNT_ID);
      expect(data!.length).toBe(2);
    });

    it('8c. stock journals have initial + receives', async () => {
      const db = getSupabase();
      const { data } = await db.from('stock_journal').select('reason').eq('account_id', ACCOUNT_ID).eq('product_id', productId).order('created_at');
      const reasons = (data || []).map((j: any) => j.reason);
      expect(reasons).toContain('initial');
      expect(reasons).toContain('receive');
    });

    it('8d. quotation linked to order', async () => {
      const db = getSupabase();
      const { data } = await db.from('quotation').select('converted_order_id').eq('account_id', ACCOUNT_ID).eq('status', 'converted');
      expect(data!.length).toBe(1);
      const { data: o } = await db.from('orders').select('order_id').eq('order_id', data![0].converted_order_id).single();
      expect(o).not.toBeNull();
    });
  });
});
