/**
 * Scenario 49: Promotions, Delivery & Shifts
 * Self-contained: creates own test data.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getSupabase, SKIP_SCENARIOS, testId, cleanupTestAccount } from './helpers';

const ACCOUNT_ID = testId('promo_dlv_shift');
let storeId: number;
let userId: number;
let promoId: number;
let deliveryId: number;
let shiftId: number;
let scheduleId: number;

describe.skipIf(SKIP_SCENARIOS)('Scenario 49: Promotions, Delivery & Shifts', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({
      account_id: ACCOUNT_ID, businessname: 'PDS Test', type: 'testing', status: 'active', currency: 'MUR',
    });
    const { data: store } = await db.from('store').insert({
      account_id: ACCOUNT_ID, name: 'Main Store', isactive: 'Y',
    }).select('store_id').single();
    storeId = store!.store_id;

    const { data: user } = await db.from('pos_user').insert({
      account_id: ACCOUNT_ID, username: 'tester', firstname: 'Test', pin: '1234',
      role: 'admin', isactive: 'Y',
    }).select('user_id').single();
    userId = user!.user_id;
  }, 30000);

  afterAll(async () => {
    const db = getSupabase();
    if (shiftId) await db.from('shift').delete().eq('id', shiftId);
    if (scheduleId) await db.from('menu_schedule').delete().eq('id', scheduleId);
    if (deliveryId) await db.from('delivery').delete().eq('id', deliveryId);
    if (promoId) await db.from('promotion').delete().eq('id', promoId);
    await cleanupTestAccount(ACCOUNT_ID);
  }, 30000);

  // --- Promotion Tests ---

  it('creates a promotion', async () => {
    const db = getSupabase();
    const { data, error } = await db.from('promotion').insert({
      account_id: ACCOUNT_ID, name: 'Summer 10%',
      type: 'percentage_off', discount_value: 10, applies_to: 'order',
      is_active: true,
    }).select().single();
    expect(error).toBeNull();
    promoId = data!.id;
    expect(data!.type).toBe('percentage_off');
  });

  it('queries active promotions', async () => {
    const db = getSupabase();
    const { data } = await db.from('promotion')
      .select('*').eq('account_id', ACCOUNT_ID).eq('is_active', true).eq('is_deleted', false);
    expect(data!.length).toBeGreaterThan(0);
  });

  it('deactivates a promotion', async () => {
    const db = getSupabase();
    await db.from('promotion').update({ is_active: false }).eq('id', promoId);
    const { data } = await db.from('promotion')
      .select('is_active').eq('id', promoId).single();
    expect(data!.is_active).toBe(false);
    // Re-activate for subsequent tests
    await db.from('promotion').update({ is_active: true }).eq('id', promoId);
  });

  // --- Delivery Tests ---

  it('creates a delivery', async () => {
    const db = getSupabase();
    const { data, error } = await db.from('delivery').insert({
      account_id: ACCOUNT_ID, store_id: storeId,
      customer_name: 'John Doe', customer_phone: '+23054001234',
      delivery_address: '123 Main St', status: 'pending',
    }).select().single();
    expect(error).toBeNull();
    deliveryId = data!.id;
    expect(data!.status).toBe('pending');
  });

  it('updates delivery status to dispatched', async () => {
    const db = getSupabase();
    await db.from('delivery').update({
      status: 'assigned', driver_name: 'Mike',
      assigned_at: new Date().toISOString(),
    }).eq('id', deliveryId);

    const { data } = await db.from('delivery')
      .select('status, driver_name').eq('id', deliveryId).single();
    expect(data!.status).toBe('assigned');
    expect(data!.driver_name).toBe('Mike');
  });

  it('completes delivery', async () => {
    const db = getSupabase();
    await db.from('delivery').update({
      status: 'delivered', actual_delivery_at: new Date().toISOString(),
    }).eq('id', deliveryId);

    const { data } = await db.from('delivery')
      .select('status, actual_delivery_at').eq('id', deliveryId).single();
    expect(data!.status).toBe('delivered');
    expect(data!.actual_delivery_at).toBeTruthy();
  });

  // --- Shift Tests ---

  it('creates a shift (clock in)', async () => {
    const db = getSupabase();
    const { data, error } = await db.from('shift').insert({
      account_id: ACCOUNT_ID, store_id: storeId,
      terminal_id: 1, user_id: userId, user_name: 'Test',
      clock_in: new Date().toISOString(), status: 'active',
    }).select().single();
    expect(error).toBeNull();
    shiftId = data!.id;
    expect(data!.status).toBe('active');
  });

  it('shift clock out completes the shift', async () => {
    const db = getSupabase();
    const { error } = await db.from('shift').update({
      clock_out: new Date().toISOString(), status: 'completed',
      hours_worked: 8.5, break_minutes: 30,
    }).eq('id', shiftId);
    expect(error).toBeNull();

    const { data } = await db.from('shift')
      .select('status, hours_worked, break_minutes').eq('id', shiftId).single();
    expect(data!.status).toBe('completed');
    expect(data!.hours_worked).toBe(8.5);
  });

  // --- Menu Schedule Tests ---

  it('creates a menu schedule', async () => {
    const db = getSupabase();
    const { data, error } = await db.from('menu_schedule').insert({
      account_id: ACCOUNT_ID, store_id: storeId, name: 'Lunch',
      start_time: '11:00', end_time: '14:00', is_active: true, priority: 1,
    }).select().single();
    expect(error).toBeNull();
    scheduleId = data!.id;
    expect(data!.name).toBe('Lunch');
  });

  it('queries active menu schedules', async () => {
    const db = getSupabase();
    const { data } = await db.from('menu_schedule')
      .select('*').eq('account_id', ACCOUNT_ID).eq('is_active', true);
    expect(data!.length).toBeGreaterThan(0);
  });

  it('updates menu schedule', async () => {
    const db = getSupabase();
    await db.from('menu_schedule').update({ name: 'Lunch Special' }).eq('id', scheduleId);
    const { data } = await db.from('menu_schedule')
      .select('name').eq('id', scheduleId).single();
    expect(data!.name).toBe('Lunch Special');
  });

  // --- Account isolation ---

  it('promotions scoped to account', async () => {
    const db = getSupabase();
    const OTHER = testId('pds_other');
    await db.from('account').insert({
      account_id: OTHER, businessname: 'Other', type: 'testing', status: 'active', currency: 'MUR',
    });
    const { data } = await db.from('promotion')
      .select('name').eq('account_id', OTHER);
    expect(data!.length).toBe(0);
    await db.from('account').delete().eq('account_id', OTHER);
  });
});
