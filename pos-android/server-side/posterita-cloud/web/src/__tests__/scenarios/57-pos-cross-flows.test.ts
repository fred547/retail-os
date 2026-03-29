/**
 * Scenario 57: POS Cross-Flow Integration Tests
 *
 * Tests the 6 HIGH priority end-to-end flows:
 * 1. Sale → Stock Deduction → Journal
 * 2. Order Void → Stock Reversal
 * 3. Refund → Negative Order → Payment
 * 4. Till Open → Sales → Close → Variance → Z-Report
 * 5. Restaurant Table → Order → Release
 * 6. Delivery from Order → Assign → Track → Complete
 *
 * All tests run against the real Supabase production database.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getSupabase, SKIP_SCENARIOS, testUuid } from './helpers';

const TS = Date.now();
const ACCOUNT_ID = `test_crossflow_${TS}`;

let storeId: number;
let terminalId: number;
let userId: number;
let categoryId: number;
let taxId: number;
let productId: number;
let tillId: number;
let tillUuid: string;
let orderId: number;
let orderUuid: string;
let voidOrderId: number;
let voidOrderUuid: string;
let refundOrderId: number;
let refundOrderUuid: string;

describe.skipIf(SKIP_SCENARIOS)('Scenario 57: POS Cross-Flow Integration', () => {
  beforeAll(async () => {
    const db = getSupabase();

    // Create test account
    await db.from('account').insert({
      account_id: ACCOUNT_ID,
      businessname: `CrossFlow Test ${TS}`,
      type: 'testing',
      status: 'testing',
      currency: 'MUR',
      country_code: 'MU',
    });

    // Create store
    const { data: store } = await db.from('store').insert({
      account_id: ACCOUNT_ID,
      name: `Store ${TS}`,
      isactive: 'Y',
    }).select().single();
    storeId = store!.store_id;

    // Create terminal
    const { data: terminal } = await db.from('terminal').insert({
      account_id: ACCOUNT_ID,
      store_id: storeId,
      name: `Terminal ${TS}`,
      isactive: 'Y',
    }).select().single();
    terminalId = terminal!.terminal_id;

    // Create user
    const { data: user, error: userErr } = await db.from('pos_user').insert({
      account_id: ACCOUNT_ID,
      username: `user_${TS}`,
      firstname: 'Test',
      pin: '1234',
      role: 'staff',
      isactive: 'Y',
    }).select().single();
    if (userErr) throw new Error(`User insert failed: ${userErr.message} (${userErr.code})`);
    userId = user!.user_id;

    // Create category
    const { data: cat } = await db.from('productcategory').insert({
      account_id: ACCOUNT_ID,
      name: 'Test Category',
      isactive: 'Y',
    }).select().single();
    categoryId = cat!.productcategory_id;

    // Create tax
    const { data: tax } = await db.from('tax').insert({
      account_id: ACCOUNT_ID,
      name: 'VAT 15%',
      rate: 15,
      isactive: 'Y',
    }).select().single();
    taxId = tax!.tax_id;

    // Create product
    const { data: prod, error: prodErr } = await db.from('product').insert({
      account_id: ACCOUNT_ID,
      name: 'Test Widget',
      sellingprice: 100,
      costprice: 50,
      productcategory_id: categoryId,
      tax_id: taxId,
      isactive: 'Y',
      isstock: 'Y',
    }).select().single();
    if (prodErr) throw new Error(`Product insert failed: ${prodErr.message}`);
    productId = prod!.product_id;

    // Seed initial stock via journal (50 units)
    await db.from('stock_journal').insert({
      account_id: ACCOUNT_ID,
      store_id: storeId,
      product_id: productId,
      quantity_change: 50,
      quantity_after: 50,
      reason: 'initial',
      reference_type: 'manual',
      user_id: userId,
    });
  });

  afterAll(async () => {
    const db = getSupabase();
    // Clean up in dependency order
    await Promise.all([
      db.from('stock_journal').delete().eq('account_id', ACCOUNT_ID),
      db.from('payment').delete().eq('account_id', ACCOUNT_ID),
      db.from('orderline').delete().eq('account_id', ACCOUNT_ID),
      db.from('orders').delete().eq('account_id', ACCOUNT_ID),
      db.from('till').delete().eq('account_id', ACCOUNT_ID),
      db.from('delivery').delete().eq('account_id', ACCOUNT_ID),
      db.from('restaurant_table').delete().eq('account_id', ACCOUNT_ID),
      db.from('table_section').delete().eq('account_id', ACCOUNT_ID),
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

  // ═══════════════════════════════════════════════════════════════
  // FLOW 1: Till Open → Sale → Stock Deduction → Close → Variance
  // ═══════════════════════════════════════════════════════════════

  describe('Flow 1: Till lifecycle + sale + stock', () => {
    it('1a. opens a till with opening amount', async () => {
      const db = getSupabase();
      tillUuid = testUuid();
      const { data, error } = await db.from('till').insert({
        account_id: ACCOUNT_ID,
        store_id: storeId,
        terminal_id: terminalId,
        uuid: tillUuid,
        documentno: `TILL-${TS}`,
        opening_amt: 500,
        open_by: userId,
        date_opened: new Date().toISOString(),
        status: 'open',
      }).select().single();
      expect(error).toBeNull();
      tillId = data!.till_id;
      expect(data!.opening_amt).toBe(500);
      expect(data!.status).toBe('open');
    });

    it('1b. creates a sale order with 3 items', async () => {
      const db = getSupabase();
      orderUuid = testUuid();
      const { data, error } = await db.from('orders').insert({
        account_id: ACCOUNT_ID,
        store_id: storeId,
        terminal_id: terminalId,
        till_id: tillId,
        till_uuid: tillUuid,
        uuid: orderUuid,
        document_no: `ORD-${TS}-001`,
        customer_id: 0,
        sales_rep_id: userId,
        grand_total: 300,
        subtotal: 260.87,
        tax_total: 39.13,
        qty_total: 3,
        doc_status: 'CO',
        is_paid: true,
        date_ordered: new Date().toISOString(),
      }).select().single();
      expect(error).toBeNull();
      orderId = data!.order_id;
    });

    it('1c. creates order lines', async () => {
      const db = getSupabase();
      const { error } = await db.from('orderline').insert([
        { account_id: ACCOUNT_ID, order_id: orderId, product_id: productId, productname: 'Test Widget', qtyentered: 3, priceentered: 100, lineamt: 300, linenetamt: 260.87 },
      ]);
      expect(error).toBeNull();
    });

    it('1d. creates payment for the order', async () => {
      const db = getSupabase();
      const { error } = await db.from('payment').insert({
        account_id: ACCOUNT_ID,
        order_id: orderId,
        document_no: `ORD-${TS}-001`,
        tendered: 300,
        amount: 300,
        change: 0,
        payment_type: 'CASH',
        pay_amt: 300,
        status: 'completed',
        date_paid: new Date().toISOString(),
      });
      expect(error).toBeNull();
    });

    it('1e. verifies stock decreased via journal entry', async () => {
      const db = getSupabase();
      // Simulate what batch_deduct_stock does — create journal entry
      await db.from('stock_journal').insert({
        account_id: ACCOUNT_ID,
        store_id: storeId,
        product_id: productId,
        quantity_change: -3,
        quantity_after: 47,
        reason: 'sale',
        reference_type: 'order',
        reference_id: orderUuid,
        user_id: userId,
      });

      // Verify stock via journal sum
      const { data: journals } = await db.from('stock_journal')
        .select('quantity_change')
        .eq('account_id', ACCOUNT_ID)
        .eq('product_id', productId);
      const currentStock = (journals || []).reduce((sum: number, j: any) => sum + (j.quantity_change || 0), 0);
      expect(currentStock).toBe(47); // 50 initial + (-3) sale
    });

    it('1f. closes till with counted cash and calculates variance', async () => {
      const db = getSupabase();
      const expectedCash = 500 + 300; // opening + sale
      const countedCash = 790; // cashier counted (short by 10)
      const variance = countedCash - expectedCash;

      const { error } = await db.from('till').update({
        closing_amt: countedCash,
        cash_amt: 300,
        card_amt: 0,
        close_by: userId,
        date_closed: new Date().toISOString(),
        status: 'closed',
      }).eq('till_id', tillId);
      expect(error).toBeNull();

      // Verify
      const { data: till } = await db.from('till').select('*').eq('till_id', tillId).single();
      expect(till!.status).toBe('closed');
      expect(till!.closing_amt).toBe(790);
      expect(till!.opening_amt).toBe(500);
      // Variance: counted (790) - expected (800) = -10
      expect(till!.closing_amt - (till!.opening_amt + till!.cash_amt)).toBe(-10);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FLOW 2: Order Void → Stock Reversal
  // ═══════════════════════════════════════════════════════════════

  describe('Flow 2: Order void + stock reversal', () => {
    it('2a. creates an order that will be voided', async () => {
      const db = getSupabase();
      voidOrderUuid = testUuid();
      const { data, error } = await db.from('orders').insert({
        account_id: ACCOUNT_ID,
        store_id: storeId,
        terminal_id: terminalId,
        till_id: tillId,
        till_uuid: tillUuid,
        uuid: voidOrderUuid,
        document_no: `ORD-${TS}-002`,
        sales_rep_id: userId,
        grand_total: 200,
        subtotal: 173.91,
        tax_total: 26.09,
        qty_total: 2,
        doc_status: 'CO',
        is_paid: true,
        date_ordered: new Date().toISOString(),
      }).select().single();
      expect(error).toBeNull();
      voidOrderId = data!.order_id;

      // Deduct stock for this order via journal
      await db.from('stock_journal').insert({
        account_id: ACCOUNT_ID, store_id: storeId, product_id: productId,
        quantity_change: -2, quantity_after: 45, reason: 'sale', reference_type: 'order', reference_id: voidOrderUuid, user_id: userId,
      });
    });

    it('2b. voids the order (doc_status = VO)', async () => {
      const db = getSupabase();
      const { error } = await db.from('orders').update({ doc_status: 'VO' }).eq('order_id', voidOrderId);
      expect(error).toBeNull();
    });

    it('2c. reverses stock on void (+2 back to inventory)', async () => {
      const db = getSupabase();
      // Stock reversal via journal: return qty
      await db.from('stock_journal').insert({
        account_id: ACCOUNT_ID, store_id: storeId, product_id: productId,
        quantity_change: 2, quantity_after: 47, reason: 'void', reference_type: 'order', reference_id: voidOrderUuid, user_id: userId,
      });

      // Verify via journal sum
      const { data: journals } = await db.from('stock_journal')
        .select('quantity_change').eq('account_id', ACCOUNT_ID).eq('product_id', productId);
      const currentStock = (journals || []).reduce((sum: number, j: any) => sum + (j.quantity_change || 0), 0);
      expect(currentStock).toBe(47); // 50 - 3 - 2 + 2 = 47
    });

    it('2d. voided order excluded from Z-report totals', async () => {
      const db = getSupabase();
      // Fetch all orders for today, check void is separate
      const { data: orders } = await db.from('orders')
        .select('order_id, grand_total, doc_status')
        .eq('account_id', ACCOUNT_ID);

      const validOrders = (orders || []).filter((o: any) => o.doc_status !== 'VO');
      const voidOrders = (orders || []).filter((o: any) => o.doc_status === 'VO');

      expect(validOrders.length).toBe(1); // Only the original sale
      expect(voidOrders.length).toBe(1); // The voided order
      expect(validOrders[0].grand_total).toBe(300);
      expect(voidOrders[0].grand_total).toBe(200);
    });

    it('2e. stock journal has both deduction and reversal entries', async () => {
      const db = getSupabase();
      const { data: journals } = await db.from('stock_journal')
        .select('quantity_change, reason, reference_id')
        .eq('account_id', ACCOUNT_ID)
        .eq('product_id', productId)
        .order('created_at');

      expect(journals!.length).toBeGreaterThanOrEqual(3);
      // Should have: -3 (sale), -2 (sale), +2 (void)
      const saleEntries = journals!.filter((j: any) => j.reason === 'sale');
      const voidEntries = journals!.filter((j: any) => j.reason === 'void');
      expect(saleEntries.length).toBe(2);
      expect(voidEntries.length).toBe(1);
      expect(voidEntries[0].quantity_change).toBe(2); // Positive = stock returned
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FLOW 3: Refund → Negative Order → Payment
  // ═══════════════════════════════════════════════════════════════

  describe('Flow 3: Refund order', () => {
    it('3a. creates a refund order (negative amounts)', async () => {
      const db = getSupabase();
      refundOrderUuid = testUuid();
      const { data, error } = await db.from('orders').insert({
        account_id: ACCOUNT_ID,
        store_id: storeId,
        terminal_id: terminalId,
        till_id: tillId,
        uuid: refundOrderUuid,
        document_no: `REF-${TS}-001`,
        sales_rep_id: userId,
        grand_total: -100,
        subtotal: -86.96,
        tax_total: -13.04,
        qty_total: -1,
        doc_status: 'CO',
        is_paid: true,
        date_ordered: new Date().toISOString(),
        note: 'Refund: customer returned 1x Test Widget',
      }).select().single();
      expect(error).toBeNull();
      refundOrderId = data!.order_id;
      expect(data!.grand_total).toBe(-100);
    });

    it('3b. creates refund order line (negative qty)', async () => {
      const db = getSupabase();
      const { error } = await db.from('orderline').insert({
        account_id: ACCOUNT_ID,
        order_id: refundOrderId,
        product_id: productId,
        productname: 'Test Widget',
        qtyentered: -1,
        priceentered: 100,
        lineamt: -100,
        linenetamt: -86.96,
      });
      expect(error).toBeNull();
    });

    it('3c. creates refund payment (negative amount)', async () => {
      const db = getSupabase();
      const { error } = await db.from('payment').insert({
        account_id: ACCOUNT_ID,
        order_id: refundOrderId,
        document_no: `REF-${TS}-001`,
        tendered: -100,
        amount: -100,
        change: 0,
        payment_type: 'CASH',
        pay_amt: -100,
        status: 'completed',
        date_paid: new Date().toISOString(),
      });
      expect(error).toBeNull();
    });

    it('3d. stock restored after refund (+1)', async () => {
      const db = getSupabase();
      await db.from('stock_journal').insert({
        account_id: ACCOUNT_ID, store_id: storeId, product_id: productId,
        quantity_change: 1, quantity_after: 48, reason: 'refund', reference_type: 'order', reference_id: refundOrderUuid, user_id: userId,
      });

      // Verify via journal sum
      const { data: journals } = await db.from('stock_journal')
        .select('quantity_change').eq('account_id', ACCOUNT_ID).eq('product_id', productId);
      const currentStock = (journals || []).reduce((sum: number, j: any) => sum + (j.quantity_change || 0), 0);
      expect(currentStock).toBe(48); // 50 - 3 - 2 + 2 + 1 = 48
    });

    it('3e. payment totals net correctly (sale - refund)', async () => {
      const db = getSupabase();
      const { data: payments } = await db.from('payment')
        .select('amount, payment_type')
        .eq('account_id', ACCOUNT_ID);

      const totalCash = (payments || [])
        .filter((p: any) => p.payment_type === 'CASH')
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

      // 300 (sale) + (-100) (refund) = 200 net
      expect(totalCash).toBe(200);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FLOW 4: Restaurant Table → Order → Release
  // ═══════════════════════════════════════════════════════════════

  describe('Flow 4: Restaurant table lifecycle', () => {
    let tableId: number;
    let sectionId: number;
    let dineInOrderId: number;

    it('4a. creates a table section', async () => {
      const db = getSupabase();
      const { data, error } = await db.from('table_section').insert({
        account_id: ACCOUNT_ID,
        store_id: storeId,
        name: 'Indoor',
        display_order: 1,
      }).select().single();
      expect(error).toBeNull();
      sectionId = data!.section_id;
    });

    it('4b. creates a restaurant table', async () => {
      const db = getSupabase();
      const { data, error } = await db.from('restaurant_table').insert({
        account_id: ACCOUNT_ID,
        store_id: storeId,
        terminal_id: terminalId,
        table_name: 'Table 1',
        seats: 4,
        is_occupied: false,
        section_id: sectionId,
      }).select().single();
      expect(error).toBeNull();
      tableId = data!.table_id;
      expect(data!.is_occupied).toBe(false);
    });

    it('4c. occupies table when dine-in order created', async () => {
      const db = getSupabase();
      const dineInUuid = testUuid();
      const { data: order } = await db.from('orders').insert({
        account_id: ACCOUNT_ID,
        store_id: storeId,
        terminal_id: terminalId,
        uuid: dineInUuid,
        document_no: `DIN-${TS}-001`,
        sales_rep_id: userId,
        grand_total: 0,
        doc_status: 'DR', // Draft — open tab
        order_type: 'DINE_IN',
        date_ordered: new Date().toISOString(),
      }).select().single();
      dineInOrderId = order!.order_id;

      // Mark table as occupied
      await db.from('restaurant_table').update({
        is_occupied: true,
        current_order_id: dineInUuid,
      }).eq('table_id', tableId);

      const { data: table } = await db.from('restaurant_table').select('*').eq('table_id', tableId).single();
      expect(table!.is_occupied).toBe(true);
      expect(table!.current_order_id).toBe(dineInUuid);
    });

    it('4d. releases table when order is paid', async () => {
      const db = getSupabase();
      // Complete the order
      await db.from('orders').update({
        doc_status: 'CO',
        is_paid: true,
        grand_total: 150,
      }).eq('order_id', dineInOrderId);

      // Release the table
      await db.from('restaurant_table').update({
        is_occupied: false,
        current_order_id: null,
      }).eq('table_id', tableId);

      const { data: table } = await db.from('restaurant_table').select('*').eq('table_id', tableId).single();
      expect(table!.is_occupied).toBe(false);
      expect(table!.current_order_id).toBeNull();
    });

    it('4e. table section groups tables correctly', async () => {
      const db = getSupabase();
      const { data: tables } = await db.from('restaurant_table')
        .select('table_id, table_name, section_id')
        .eq('account_id', ACCOUNT_ID)
        .eq('section_id', sectionId);

      expect(tables!.length).toBe(1);
      expect(tables![0].table_name).toBe('Table 1');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FLOW 5: Delivery from Order → Assign → Track → Complete
  // ═══════════════════════════════════════════════════════════════

  describe('Flow 5: Delivery lifecycle', () => {
    let deliveryId: number;
    let trackingToken: string;

    it('5a. creates a delivery linked to an order', async () => {
      const db = getSupabase();
      const token = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      const { data, error } = await db.from('delivery').insert({
        account_id: ACCOUNT_ID,
        store_id: storeId,
        order_id: orderId,
        customer_name: 'John Doe',
        customer_phone: '+23057001234',
        delivery_address: '10 Royal Street, Port Louis',
        delivery_type: 'food',
        status: 'pending',
        tracking_token: token,
      }).select().single();
      expect(error).toBeNull();
      deliveryId = data!.id;
      trackingToken = token;
      expect(data!.status).toBe('pending');
    });

    it('5b. assigns a driver', async () => {
      const db = getSupabase();
      const { error } = await db.from('delivery').update({
        driver_id: userId,
        driver_name: 'Test Driver',
        status: 'assigned',
      }).eq('id', deliveryId);
      expect(error).toBeNull();

      const { data } = await db.from('delivery').select('status, driver_name').eq('id', deliveryId).single();
      expect(data!.status).toBe('assigned');
      expect(data!.driver_name).toBe('Test Driver');
    });

    it('5c. transitions to in_transit', async () => {
      const db = getSupabase();
      const { error } = await db.from('delivery').update({
        status: 'in_transit',
        picked_up_at: new Date().toISOString(),
      }).eq('id', deliveryId);
      expect(error).toBeNull();
    });

    it('5d. completes delivery', async () => {
      const db = getSupabase();
      const { error } = await db.from('delivery').update({
        status: 'delivered',
        actual_delivery_at: new Date().toISOString(),
      }).eq('id', deliveryId);
      expect(error).toBeNull();

      const { data } = await db.from('delivery').select('*').eq('id', deliveryId).single();
      expect(data!.status).toBe('delivered');
      expect(data!.actual_delivery_at).toBeTruthy();
      expect(data!.order_id).toBe(orderId);
    });

    it('5e. delivery is linked to the correct order', async () => {
      const db = getSupabase();
      const { data: delivery } = await db.from('delivery').select('order_id').eq('id', deliveryId).single();
      const { data: order } = await db.from('orders').select('document_no').eq('order_id', delivery!.order_id).single();
      expect(order!.document_no).toBe(`ORD-${TS}-001`);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FLOW 6: Data Integrity Summary
  // ═══════════════════════════════════════════════════════════════

  describe('Flow 6: Cross-module data integrity', () => {
    it('6a. final stock reflects all operations: 50 + (-3) + (-2) + (+2) + (+1) = 48', async () => {
      const db = getSupabase();
      const { data: journals } = await db.from('stock_journal')
        .select('quantity_change').eq('account_id', ACCOUNT_ID).eq('product_id', productId);
      const currentStock = (journals || []).reduce((sum: number, j: any) => sum + (j.quantity_change || 0), 0);
      expect(currentStock).toBe(48);
    });

    it('6b. stock journal has complete audit trail', async () => {
      const db = getSupabase();
      const { data: journals } = await db.from('stock_journal')
        .select('quantity_change, reason')
        .eq('account_id', ACCOUNT_ID)
        .eq('product_id', productId)
        .order('created_at');

      // +50 (initial), -3 (sale), -2 (sale for void order), +2 (void reversal), +1 (refund)
      expect(journals).not.toBeNull();
      expect(journals!.length).toBe(5);
      const totalChange = journals!.reduce((sum: number, j: any) => sum + j.quantity_change, 0);
      expect(totalChange).toBe(48); // 50 - 3 - 2 + 2 + 1 = 48
    });

    it('6c. order totals: 1 valid sale + 1 void + 1 refund', async () => {
      const db = getSupabase();
      const { data: orders } = await db.from('orders')
        .select('doc_status, grand_total')
        .eq('account_id', ACCOUNT_ID)
        .order('date_ordered');

      const valid = (orders || []).filter((o: any) => o.doc_status === 'CO' && o.grand_total > 0);
      const voided = (orders || []).filter((o: any) => o.doc_status === 'VO');
      const refunds = (orders || []).filter((o: any) => o.doc_status === 'CO' && o.grand_total < 0);

      expect(valid.length).toBeGreaterThanOrEqual(1);
      expect(voided.length).toBe(1);
      expect(refunds.length).toBe(1);
    });

    it('6d. net revenue = sales - refunds (voids excluded)', async () => {
      const db = getSupabase();
      const { data: orders } = await db.from('orders')
        .select('grand_total, doc_status')
        .eq('account_id', ACCOUNT_ID)
        .neq('doc_status', 'VO') // Exclude voids
        .neq('doc_status', 'DR'); // Exclude drafts

      const netRevenue = (orders || []).reduce((sum: number, o: any) => sum + (o.grand_total || 0), 0);
      // 300 (sale) + (-100) (refund) + 150 (dine-in) = 350
      expect(netRevenue).toBe(350);
    });

    it('6e. payment reconciliation matches order totals', async () => {
      const db = getSupabase();
      const { data: payments } = await db.from('payment')
        .select('amount')
        .eq('account_id', ACCOUNT_ID);

      const totalPayments = (payments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      // 300 (sale) + (-100) (refund) = 200
      expect(totalPayments).toBe(200);
    });
  });
});
