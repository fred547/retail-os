import { describe, it, expect, afterAll } from 'vitest';
import { SKIP_SCENARIOS, getSupabase, apiPost, testId, cleanupTestAccount } from './helpers';

const TEST_ACCOUNT_ID = testId('scenario');
const TEST_EMAIL = `scenario-${Date.now()}@test.posterita.com`;
const TEST_PHONE = `+230${Math.floor(1000000 + Math.random() * 9000000)}`;
let signupAuthUid: string | undefined;
let signupComplete = false;

describe.skipIf(SKIP_SCENARIOS)('Scenario: Signup Flow', () => {
  afterAll(async () => {
    if (!signupComplete) return; // nothing to clean up
    try {
      const db = getSupabase();
      const { data: owner } = await db.from('owner').select('id, auth_uid').eq('email', TEST_EMAIL).single();
      if (owner) {
        signupAuthUid = signupAuthUid || owner.auth_uid;
        const { data: accounts } = await db.from('account').select('account_id').eq('owner_id', owner.id);
        await Promise.all([
          ...(accounts || []).map(acc => cleanupTestAccount(acc.account_id)),
          cleanupTestAccount(TEST_ACCOUNT_ID),
        ]);
        await Promise.all([
          db.from('owner_account_session').delete().eq('owner_id', owner.id),
          db.from('owner').delete().eq('id', owner.id),
        ]);
      }
      if (signupAuthUid) {
        await db.auth.admin.deleteUser(signupAuthUid);
      }
    } catch { /* cleanup best-effort */ }
  }, 120000);

  it('creates owner + live brand + demo brand', async () => {
    const res = await apiPost('/api/auth/signup', {
      email: TEST_EMAIL,
      phone: TEST_PHONE,
      firstname: 'Scenario',
      lastname: 'Tester',
      password: 'Test1234!',
      pin: '9999',
      businessname: 'Scenario Test Cafe',
      country: 'Mauritius',
      currency: 'MUR',
    }, 90000);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.live_account_id).toBeTruthy();
    expect(body.demo_account_id).toBeTruthy();
    expect(body.owner_id).toBeGreaterThan(0);
    expect(body.live_account_id).not.toBe('null');
    signupAuthUid = body.auth_uid;
    signupComplete = true;
  }, 120000);

  it('owner record exists with correct email', async () => {
    if (!signupComplete) return; // skip if signup failed
    const db = getSupabase();
    const { data: owner } = await db.from('owner').select('*').eq('email', TEST_EMAIL).single();
    expect(owner).toBeTruthy();
    expect(owner.phone).toBe(TEST_PHONE);
    expect(owner.is_active).toBe(true);
  });

  it('live brand has store + terminal + user', async () => {
    if (!signupComplete) return;
    const db = getSupabase();
    const { data: accounts } = await db.from('account').select('account_id, type').eq('businessname', 'Scenario Test Cafe');
    const live = accounts?.find(a => a.type === 'live');
    expect(live).toBeTruthy();

    const [stores, terminals, users] = await Promise.all([
      db.from('store').select('*').eq('account_id', live!.account_id),
      db.from('terminal').select('*').eq('account_id', live!.account_id),
      db.from('pos_user').select('*').eq('account_id', live!.account_id),
    ]);
    expect(stores.data?.length).toBeGreaterThanOrEqual(1);
    expect(terminals.data?.length).toBeGreaterThanOrEqual(1);
    expect(users.data?.length).toBeGreaterThanOrEqual(1);
    expect(users.data?.[0].role).toBe('owner');
    expect(users.data?.[0].pin).toBe('9999');
  });

  it('default taxes are created', async () => {
    if (!signupComplete) return;
    const db = getSupabase();
    const { data: accounts } = await db.from('account').select('account_id, type').eq('businessname', 'Scenario Test Cafe');
    const live = accounts?.find(a => a.type === 'live');

    const { data: taxes } = await db.from('tax').select('*').eq('account_id', live!.account_id);
    expect(taxes?.length).toBeGreaterThanOrEqual(2);
    expect(taxes?.some(t => t.name === 'VAT 15%' && t.rate === 15)).toBe(true);
    expect(taxes?.some(t => t.name === 'No Tax' && t.rate === 0)).toBe(true);
  });

  it('duplicate signup returns 409', async () => {
    if (!signupComplete) return;
    const res = await apiPost('/api/auth/signup', {
      email: TEST_EMAIL,
      phone: TEST_PHONE,
      firstname: 'Dup',
      password: 'Test1234!',
      pin: '0000',
      businessname: 'Duplicate',
      country: 'Mauritius',
      currency: 'MUR',
    });
    expect(res.status).toBe(409);
  });
});
