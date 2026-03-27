import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SKIP_SCENARIOS, getSupabase, apiPost, apiPatch, testId, cleanupTestAccount } from './helpers';

const ACCOUNT_LIVE = testId('acc_mgmt_l');
const ACCOUNT_DEMO = testId('acc_mgmt_d');
const ACCOUNT_ARCHIVE = testId('acc_mgmt_a');

describe.skipIf(SKIP_SCENARIOS)('Scenario: Account Management', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert([
      { account_id: ACCOUNT_LIVE, businessname: 'Live Brand', type: 'testing', status: 'active', currency: 'MUR' },
      { account_id: ACCOUNT_DEMO, businessname: 'Demo Brand', type: 'demo', status: 'active', currency: 'MUR' },
      { account_id: ACCOUNT_ARCHIVE, businessname: 'Archive Brand', type: 'testing', status: 'archived', currency: 'EUR' },
    ]);
  }, 30000);

  afterAll(async () => {
    try {
      const db = getSupabase();
      await db.from('account').delete().in('account_id', [ACCOUNT_LIVE, ACCOUNT_DEMO, ACCOUNT_ARCHIVE]);
    } catch { /* best-effort */ }
  }, 30000);

  it('updates brand name via DB', async () => {
    const db = getSupabase();
    const { error } = await db.from('account')
      .update({ businessname: 'Live Brand Renamed' })
      .eq('account_id', ACCOUNT_LIVE);
    expect(error).toBeNull();

    const { data } = await db.from('account')
      .select('businessname')
      .eq('account_id', ACCOUNT_LIVE)
      .single();
    expect(data!.businessname).toBe('Live Brand Renamed');
  });

  it('demo brand has correct type', async () => {
    const db = getSupabase();
    const { data } = await db.from('account')
      .select('type, status')
      .eq('account_id', ACCOUNT_DEMO)
      .single();
    expect(data!.type).toBe('demo');
    expect(data!.status).toBe('active');
  });

  it('archived brand queryable with status filter', async () => {
    const db = getSupabase();
    const { data: active } = await db.from('account')
      .select('account_id')
      .in('account_id', [ACCOUNT_LIVE, ACCOUNT_DEMO, ACCOUNT_ARCHIVE])
      .eq('status', 'active');
    expect(active!.length).toBe(2);

    const { data: archived } = await db.from('account')
      .select('account_id')
      .in('account_id', [ACCOUNT_LIVE, ACCOUNT_DEMO, ACCOUNT_ARCHIVE])
      .eq('status', 'archived');
    expect(archived!.length).toBe(1);
    expect(archived![0].account_id).toBe(ACCOUNT_ARCHIVE);
  });

  it('brand currency independent per account', async () => {
    const db = getSupabase();
    const { data } = await db.from('account')
      .select('account_id, currency')
      .in('account_id', [ACCOUNT_LIVE, ACCOUNT_ARCHIVE])
      .order('account_id');
    expect(data!.find(a => a.account_id === ACCOUNT_LIVE)!.currency).toBe('MUR');
    expect(data!.find(a => a.account_id === ACCOUNT_ARCHIVE)!.currency).toBe('EUR');
  });

  it('account deletion removes record', async () => {
    const db = getSupabase();
    // Delete the archived brand
    const { error } = await db.from('account').delete().eq('account_id', ACCOUNT_ARCHIVE);
    expect(error).toBeNull();

    const { data } = await db.from('account')
      .select('account_id')
      .eq('account_id', ACCOUNT_ARCHIVE);
    expect(data?.length).toBe(0);

    // Re-insert for cleanup consistency
    await db.from('account').insert({ account_id: ACCOUNT_ARCHIVE, businessname: 'Archive Brand', type: 'testing', status: 'archived', currency: 'EUR' });
  });
});
