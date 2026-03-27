import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SKIP_SCENARIOS, getSupabase, apiGet, testId } from './helpers';

const OWNER_EMAIL = `scentest_owner_${Date.now()}@test-accounts.com`;
const OWNER_PHONE = `+230${Date.now().toString().slice(-8)}`;
const ACCOUNT_LIVE = testId('oa_live');
const ACCOUNT_DEMO = testId('oa_demo');
const ACCOUNT_ARCHIVED = testId('oa_archived');
let ownerId: string;

describe.skipIf(SKIP_SCENARIOS)('Scenario: Owner Accounts Lookup', () => {
  beforeAll(async () => {
    const db = getSupabase();
    const { data: owner } = await db.from('owner').insert({
      email: OWNER_EMAIL,
      phone: OWNER_PHONE,
      name: 'Owner Lookup Test',
    }).select('id').single();
    ownerId = owner!.id;

    await db.from('account').insert([
      { account_id: ACCOUNT_LIVE, businessname: 'Live Brand', type: 'testing', status: 'active', currency: 'MUR', owner_id: ownerId },
      { account_id: ACCOUNT_DEMO, businessname: 'Demo Brand', type: 'demo', status: 'active', currency: 'MUR', owner_id: ownerId },
      { account_id: ACCOUNT_ARCHIVED, businessname: 'Old Brand', type: 'testing', status: 'archived', currency: 'MUR', owner_id: ownerId },
    ]);
  }, 30000);

  afterAll(async () => {
    const db = getSupabase();
    await db.from('account').delete().in('account_id', [ACCOUNT_LIVE, ACCOUNT_DEMO, ACCOUNT_ARCHIVED]);
    await db.from('owner').delete().eq('id', ownerId);
  }, 30000);

  it('finds accounts by email', async () => {
    const res = await apiGet(`/api/owner/accounts?email=${encodeURIComponent(OWNER_EMAIL)}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.accounts).toBeDefined();
    expect(body.accounts.length).toBeGreaterThanOrEqual(2);
  });

  it('finds accounts by phone', async () => {
    const res = await apiGet(`/api/owner/accounts?phone=${encodeURIComponent(OWNER_PHONE)}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.accounts).toBeDefined();
    expect(body.accounts.length).toBeGreaterThanOrEqual(2);
  });

  it('excludes archived accounts', async () => {
    const res = await apiGet(`/api/owner/accounts?email=${encodeURIComponent(OWNER_EMAIL)}`);
    const body = await res.json();
    const ids = body.accounts.map((a: any) => a.account_id);
    expect(ids).not.toContain(ACCOUNT_ARCHIVED);
  });

  it('returns empty for non-existent owner', async () => {
    const res = await apiGet('/api/owner/accounts?email=nobody_at_all_xyz@fake.com');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.accounts.length).toBe(0);
  });

  it('returns 400 without email or phone', async () => {
    const res = await apiGet('/api/owner/accounts');
    expect([400, 422]).toContain(res.status);
  });
});
