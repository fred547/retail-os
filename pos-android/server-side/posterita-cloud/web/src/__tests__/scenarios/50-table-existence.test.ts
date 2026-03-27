/**
 * Scenario 50: Table Existence & API Health
 *
 * Regression guard: ensures all feature tables exist in Supabase
 * and every API route returns 200/201 (not 500 "table not found").
 *
 * Root cause: Migrations 00033–00040 were not applied before deploy,
 * causing 90 "Could not find table in schema cache" errors.
 * This test catches that before it reaches production.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { getSupabase, SKIP_SCENARIOS, apiGetAuth, apiPostAuth } from './helpers';

describe.skipIf(SKIP_SCENARIOS)('Scenario 50: Table Existence & API Health', () => {
  let db: ReturnType<typeof getSupabase>;
  let accountId: string;
  let storeId: number;
  let userId: number;

  beforeAll(async () => {
    db = getSupabase();
    const { data: accounts } = await db.from('account').select('account_id').eq('type', 'demo').limit(1);
    expect(accounts!.length).toBeGreaterThan(0);
    accountId = accounts![0].account_id;

    const { data: stores } = await db.from('store').select('store_id').eq('account_id', accountId).limit(1);
    storeId = stores?.[0]?.store_id ?? 0;

    const { data: users } = await db.from('pos_user').select('user_id').eq('account_id', accountId).limit(1);
    userId = users?.[0]?.user_id ?? 1;
  });

  // ── Part 1: Every feature table must exist in Supabase ──

  const REQUIRED_TABLES = [
    'delivery',
    'shift',
    'supplier',
    'promotion',
    'promotion_usage',
    'purchase_order',
    'purchase_order_line',
    'menu_schedule',
    'loyalty_config',
    'loyalty_transaction',
    'stock_journal',
  ];

  for (const table of REQUIRED_TABLES) {
    it(`table "${table}" exists and is queryable`, async () => {
      const { error } = await db.from(table).select('*').limit(0);
      expect(error).toBeNull();
    });
  }

  // ── Part 2: Every feature GET endpoint returns 200 (not 500) ──

  const GET_ENDPOINTS = [
    '/api/deliveries',
    '/api/shifts',
    '/api/suppliers',
    '/api/promotions',
    '/api/purchase-orders',
    '/api/menu-schedules',
    '/api/loyalty/config',
    '/api/loyalty/wallets',
    '/api/loyalty/transactions?page=1',
    '/api/stock',
  ];

  for (const path of GET_ENDPOINTS) {
    it(`GET ${path} returns 200`, async () => {
      const res = await apiGetAuth(path, accountId);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.error).toBeUndefined();
    });
  }

  // ── Part 3: POST endpoints accept valid payloads (not 500) ──

  it('POST /api/deliveries returns 201', async () => {
    const res = await apiPostAuth('/api/deliveries', {
      delivery_address: 'regression_test_50 address',
      customer_name: 'regression_test_50',
    }, accountId);
    expect(res.status).toBe(201);
    // Cleanup
    const { delivery } = await res.json();
    if (delivery?.id) await db.from('delivery').delete().eq('id', delivery.id);
  });

  it('POST /api/shifts (clock_in) returns 201', async () => {
    const res = await apiPostAuth('/api/shifts', {
      action: 'clock_in',
      user_id: userId,
      user_name: 'regression_test_50',
      store_id: storeId,
    }, accountId);
    // 201 = success, 400 = already has active shift (both are fine — not 500)
    expect([201, 400]).toContain(res.status);
    const json = await res.json();
    // Clock out if we clocked in
    if (res.status === 201 && json.shift?.id) {
      await apiPostAuth('/api/shifts', {
        action: 'clock_out',
        user_id: userId,
        shift_id: json.shift.id,
      }, accountId);
      await db.from('shift').delete().eq('id', json.shift.id);
    }
  });

  it('POST /api/suppliers returns 201', async () => {
    const res = await apiPostAuth('/api/suppliers', {
      name: 'regression_test_50 Supplier',
    }, accountId);
    expect(res.status).toBe(201);
    const { supplier } = await res.json();
    if (supplier?.supplier_id) await db.from('supplier').delete().eq('supplier_id', supplier.supplier_id);
  });

  it('POST /api/promotions returns 201', async () => {
    const res = await apiPostAuth('/api/promotions', {
      name: 'regression_test_50 Promo',
      type: 'percentage_off',
      discount_value: 5,
    }, accountId);
    expect(res.status).toBe(201);
    const { promotion } = await res.json();
    if (promotion?.id) await db.from('promotion').delete().eq('id', promotion.id);
  });

  it('POST /api/menu-schedules returns 201', async () => {
    const res = await apiPostAuth('/api/menu-schedules', {
      name: 'regression_test_50 Schedule',
      start_time: '06:00',
      end_time: '11:00',
    }, accountId);
    expect(res.status).toBe(201);
    const { schedule } = await res.json();
    if (schedule?.id) await db.from('menu_schedule').delete().eq('id', schedule.id);
  });

  it('POST /api/loyalty/config returns 200', async () => {
    const res = await apiPostAuth('/api/loyalty/config', {
      points_per_currency: 1,
      redemption_rate: 0.01,
      min_redeem_points: 100,
      welcome_bonus: 0,
      is_active: true,
    }, accountId);
    expect(res.status).toBe(200);
  });

  // ── Part 4: No open errors with "schema cache" in message ──

  it('no "schema cache" errors in error_logs', async () => {
    const { data } = await db
      .from('error_logs')
      .select('id, message')
      .eq('status', 'open')
      .like('message', '%schema cache%')
      .limit(5);

    expect(data?.length ?? 0).toBe(0);
  });

  it('no "table not allowed" errors in error_logs', async () => {
    const { data } = await db
      .from('error_logs')
      .select('id, message')
      .eq('status', 'open')
      .like('message', '%not allowed%')
      .limit(5);

    expect(data?.length ?? 0).toBe(0);
  });
});
