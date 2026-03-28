/**
 * Scenario 56: Shift Roster — full lifecycle test
 *
 * Tests the complete roster workflow:
 * 1. Create store operating hours
 * 2. Create public holidays
 * 3. Create labor config
 * 4. Create roster template slots
 * 5. Create a roster period
 * 6. Transition period to picking
 * 7. Staff picks shifts
 * 8. Transition to review → approve
 * 9. Verify staff_schedule rows generated
 * 10. Cleanup
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  getSupabase,
  SKIP_SCENARIOS,
  apiPostAuth,
  apiGetAuth,
  apiPatchAuth,
  apiDeleteAuth,
} from './helpers';

const TEST_PREFIX = `roster_${Date.now()}`;
const ACCOUNT_ID = `test_${TEST_PREFIX}`;

let storeId: number;
let userId: number;
let slotId: number;
let periodId: number;
let pickId: number;

describe.skipIf(SKIP_SCENARIOS)('Scenario 56: Shift Roster Lifecycle', () => {
  beforeAll(async () => {
    const db = getSupabase();

    // Create test account
    await db.from('account').insert({
      account_id: ACCOUNT_ID,
      businessname: `Test Roster ${TEST_PREFIX}`,
      type: 'testing',
      status: 'testing',
      currency: 'MUR',
      country_code: 'MU',
    });

    // Create test store
    const { data: store } = await db.from('store').insert({
      account_id: ACCOUNT_ID,
      name: `Store ${TEST_PREFIX}`,
      isactive: 'Y',
    }).select().single();
    storeId = store!.store_id;

    // Create test user
    const { data: user } = await db.from('pos_user').insert({
      account_id: ACCOUNT_ID,
      username: `user_${TEST_PREFIX}`,
      firstname: 'Test',
      pin: '1234',
      role: 'cashier',
      isactive: 'Y',
    }).select().single();
    userId = user!.user_id;
  });

  afterAll(async () => {
    const db = getSupabase();
    // Clean up in reverse dependency order
    await db.from('staff_schedule').delete().eq('account_id', ACCOUNT_ID);
    await db.from('shift_pick').delete().eq('account_id', ACCOUNT_ID);
    await db.from('staffing_requirement').delete().eq('account_id', ACCOUNT_ID);
    await db.from('roster_period').delete().eq('account_id', ACCOUNT_ID);
    await db.from('roster_template_slot').delete().eq('account_id', ACCOUNT_ID);
    await db.from('store_operating_hours').delete().eq('account_id', ACCOUNT_ID);
    await db.from('store_hours_override').delete().eq('account_id', ACCOUNT_ID);
    await db.from('public_holiday').delete().eq('account_id', ACCOUNT_ID);
    await db.from('labor_config').delete().eq('account_id', ACCOUNT_ID);
    await db.from('pos_user').delete().eq('account_id', ACCOUNT_ID);
    await db.from('store').delete().eq('account_id', ACCOUNT_ID);
    await db.from('account').delete().eq('account_id', ACCOUNT_ID);
  });

  // ── 1. Store Operating Hours ───────────────────────────────

  it('creates store operating hours', async () => {
    const db = getSupabase();
    const entries = [
      { account_id: ACCOUNT_ID, store_id: storeId, day_type: 'weekday', open_time: '08:00', close_time: '18:00', is_closed: false },
      { account_id: ACCOUNT_ID, store_id: storeId, day_type: 'saturday', open_time: '09:00', close_time: '14:00', is_closed: false },
      { account_id: ACCOUNT_ID, store_id: storeId, day_type: 'sunday', open_time: null, close_time: null, is_closed: true },
      { account_id: ACCOUNT_ID, store_id: storeId, day_type: 'public_holiday', open_time: null, close_time: null, is_closed: true },
    ];
    const { data, error } = await db.from('store_operating_hours').insert(entries).select();
    expect(error).toBeNull();
    expect(data).toHaveLength(4);
  });

  // ── 2. Public Holidays ─────────────────────────────────────

  it('creates public holidays', async () => {
    const db = getSupabase();
    const { data, error } = await db.from('public_holiday').insert([
      { account_id: ACCOUNT_ID, country_code: 'MU', date: '2026-05-01', name: 'Labour Day', is_recurring: true },
      { account_id: ACCOUNT_ID, country_code: 'MU', date: '2026-12-25', name: 'Christmas', is_recurring: true },
    ]).select();
    expect(error).toBeNull();
    expect(data).toHaveLength(2);
  });

  // ── 3. Labor Config ────────────────────────────────────────

  it('creates labor config with Mauritius defaults', async () => {
    const db = getSupabase();
    const { data, error } = await db.from('labor_config').insert({
      account_id: ACCOUNT_ID,
      country_code: 'MU',
      standard_weekly_hours: 45,
      standard_daily_hours: 9,
      weekday_multiplier: 1.0,
      saturday_multiplier: 1.0,
      sunday_multiplier: 1.5,
      public_holiday_multiplier: 2.0,
      overtime_multiplier: 1.5,
      min_break_minutes: 30,
    }).select().single();
    expect(error).toBeNull();
    expect(data!.sunday_multiplier).toBe(1.5);
  });

  // ── 4. Roster Template Slots ───────────────────────────────

  it('creates a template slot', async () => {
    const db = getSupabase();
    const { data, error } = await db.from('roster_template_slot').insert({
      account_id: ACCOUNT_ID,
      store_id: storeId,
      name: 'Morning Cashier',
      day_of_week: 1, // Monday
      start_time: '08:00',
      end_time: '17:00',
      break_minutes: 30,
      required_role: 'cashier',
      color: '#3b82f6',
    }).select().single();
    expect(error).toBeNull();
    slotId = data!.id;
    expect(data!.name).toBe('Morning Cashier');
  });

  // ── 5. Roster Period ───────────────────────────────────────

  it('creates a roster period', async () => {
    const db = getSupabase();
    const { data, error } = await db.from('roster_period').insert({
      account_id: ACCOUNT_ID,
      store_id: storeId,
      name: 'May 2026',
      start_date: '2026-05-01',
      end_date: '2026-05-31',
      status: 'open',
    }).select().single();
    expect(error).toBeNull();
    periodId = data!.id;
    expect(data!.status).toBe('open');
  });

  // ── 6. Open Picking ────────────────────────────────────────

  it('transitions period to picking', async () => {
    const db = getSupabase();
    const { data, error } = await db.from('roster_period')
      .update({ status: 'picking' })
      .eq('id', periodId)
      .select()
      .single();
    expect(error).toBeNull();
    expect(data!.status).toBe('picking');
  });

  // ── 7. Staff Picks a Shift ─────────────────────────────────

  it('staff picks a Monday shift with weekday multiplier', async () => {
    const db = getSupabase();
    const { data, error } = await db.from('shift_pick').insert({
      account_id: ACCOUNT_ID,
      roster_period_id: periodId,
      slot_id: slotId,
      user_id: userId,
      date: '2026-05-04', // Monday
      status: 'picked',
      effective_hours: 8.5, // (17-8-0.5)*1.0 = 8.5
      day_type: 'weekday',
      multiplier: 1.0,
    }).select().single();
    expect(error).toBeNull();
    pickId = data!.id;
    expect(data!.effective_hours).toBe(8.5);
    expect(data!.day_type).toBe('weekday');
  });

  it('staff picks a Labour Day shift with holiday multiplier', async () => {
    const db = getSupabase();
    const { data, error } = await db.from('shift_pick').insert({
      account_id: ACCOUNT_ID,
      roster_period_id: periodId,
      slot_id: slotId,
      user_id: userId,
      date: '2026-05-01', // Labour Day (public holiday)
      status: 'picked',
      effective_hours: 17.0, // (17-8-0.5)*2.0 = 17.0
      day_type: 'public_holiday',
      multiplier: 2.0,
    }).select().single();
    expect(error).toBeNull();
    expect(data!.effective_hours).toBe(17.0);
    expect(data!.day_type).toBe('public_holiday');
  });

  // ── 8. Review → Approve ────────────────────────────────────

  it('transitions to review', async () => {
    const db = getSupabase();
    const { data, error } = await db.from('roster_period')
      .update({ status: 'review' })
      .eq('id', periodId)
      .select()
      .single();
    expect(error).toBeNull();
    expect(data!.status).toBe('review');
  });

  it('approves picks and generates staff_schedule rows', async () => {
    const db = getSupabase();

    // Approve all picks
    const { error: pickErr } = await db.from('shift_pick')
      .update({ status: 'approved' })
      .eq('roster_period_id', periodId)
      .eq('account_id', ACCOUNT_ID)
      .eq('status', 'picked');
    expect(pickErr).toBeNull();

    // Get approved picks
    const { data: picks } = await db.from('shift_pick')
      .select('*')
      .eq('roster_period_id', periodId)
      .eq('account_id', ACCOUNT_ID)
      .eq('status', 'approved');
    expect(picks!.length).toBeGreaterThanOrEqual(2);

    // Generate staff_schedule rows from picks
    const scheduleRows = picks!.map((p: any) => ({
      account_id: ACCOUNT_ID,
      store_id: storeId,
      user_id: p.user_id,
      date: p.date,
      start_time: '08:00',
      end_time: '17:00',
      break_minutes: 30,
      slot_id: p.slot_id,
      roster_period_id: periodId,
      pick_id: p.id,
      effective_hours: p.effective_hours,
      day_type: p.day_type,
      multiplier: p.multiplier,
    }));

    const { data: schedules, error: schedErr } = await db.from('staff_schedule')
      .insert(scheduleRows)
      .select();
    expect(schedErr).toBeNull();
    expect(schedules!.length).toBeGreaterThanOrEqual(2);

    // Update period to approved
    const { error: periodErr } = await db.from('roster_period')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', periodId);
    expect(periodErr).toBeNull();
  });

  // ── 9. Verify Generated Schedules ──────────────────────────

  it('staff_schedule rows have roster fields populated', async () => {
    const db = getSupabase();
    const { data, error } = await db.from('staff_schedule')
      .select('*')
      .eq('account_id', ACCOUNT_ID)
      .eq('roster_period_id', periodId);
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(2);

    // Check weekday entry
    const weekday = data!.find((s: any) => s.date === '2026-05-04');
    expect(weekday).toBeDefined();
    expect(weekday!.effective_hours).toBe(8.5);
    expect(weekday!.day_type).toBe('weekday');
    expect(weekday!.multiplier).toBe(1.0);
    expect(weekday!.slot_id).toBe(slotId);

    // Check holiday entry
    const holiday = data!.find((s: any) => s.date === '2026-05-01');
    expect(holiday).toBeDefined();
    expect(holiday!.effective_hours).toBe(17.0);
    expect(holiday!.day_type).toBe('public_holiday');
    expect(holiday!.multiplier).toBe(2.0);
  });

  // ── 10. Period Lock ────────────────────────────────────────

  it('locks the period', async () => {
    const db = getSupabase();
    const { data, error } = await db.from('roster_period')
      .update({ status: 'locked' })
      .eq('id', periodId)
      .select()
      .single();
    expect(error).toBeNull();
    expect(data!.status).toBe('locked');
  });
});
