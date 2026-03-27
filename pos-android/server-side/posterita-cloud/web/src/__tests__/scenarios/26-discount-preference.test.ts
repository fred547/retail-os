import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SKIP_SCENARIOS, getSupabase, apiPost, testId, cleanupTestAccount } from './helpers';

const ACCOUNT_ID = testId('disc_pref');
const STORE_ID = 96000 + Math.floor(Math.random() * 9000);
const TERMINAL_ID = STORE_ID;

describe.skipIf(SKIP_SCENARIOS)('Scenario: Discount Codes & Preferences', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({ account_id: ACCOUNT_ID, businessname: 'Discount Test', type: 'testing', status: 'active', currency: 'MUR' });
    await db.from('store').insert({ store_id: STORE_ID, account_id: ACCOUNT_ID, name: 'Promo Store', isactive: 'Y' });
    await db.from('terminal').insert({ terminal_id: TERMINAL_ID, account_id: ACCOUNT_ID, store_id: STORE_ID, name: 'POS 1', isactive: 'Y' });
  }, 30000);

  afterAll(async () => {
    try {
      const db = getSupabase();
      await Promise.all([
        db.from('discountcode').delete().eq('account_id', ACCOUNT_ID),
        db.from('preference').delete().eq('account_id', ACCOUNT_ID),
      ]);
      await cleanupTestAccount(ACCOUNT_ID);
    } catch { /* best-effort */ }
  }, 30000);

  it('creates discount codes', async () => {
    const db = getSupabase();
    const { data, error } = await db.from('discountcode').insert([
      { account_id: ACCOUNT_ID, name: 'SUMMER10', value: 10, isactive: 'Y' },
      { account_id: ACCOUNT_ID, name: 'VIP20', value: 20, isactive: 'Y' },
      { account_id: ACCOUNT_ID, name: 'EXPIRED5', value: 5, isactive: 'N' },
    ]).select();
    expect(error).toBeNull();
    expect(data!.length).toBe(3);
  });

  it('queries active discount codes only', async () => {
    const db = getSupabase();
    const { data } = await db.from('discountcode')
      .select('*')
      .eq('account_id', ACCOUNT_ID)
      .eq('isactive', 'Y');
    expect(data!.length).toBe(2);
    expect(data!.map(d => d.name).sort()).toEqual(['SUMMER10', 'VIP20']);
  });

  it('sync pulls discount codes', async () => {
    const res = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: '1970-01-01T00:00:00.000Z',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.discount_codes?.length).toBeGreaterThanOrEqual(3);
    expect(body.discount_codes?.some((d: any) => d.name === 'SUMMER10')).toBe(true);
  });

  it('creates preferences for account', async () => {
    const db = getSupabase();
    const { error } = await db.from('preference').insert({
      account_id: ACCOUNT_ID,
      showunitprice: 'Y',
      opencashdrawer: 'N',
    });
    expect(error).toBeNull();
  });

  it('sync pulls preferences', async () => {
    const res = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: '1970-01-01T00:00:00.000Z',
    });
    const body = await res.json();
    expect(body.preferences?.length).toBeGreaterThanOrEqual(1);
    expect(body.preferences?.[0]?.showunitprice).toBe('Y');
  });

  it('discount codes scoped to account', async () => {
    const db = getSupabase();
    const { data } = await db.from('discountcode')
      .select('*')
      .eq('account_id', 'nonexistent_account');
    expect(data?.length).toBe(0);
  });
});
