import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SKIP_SCENARIOS, getSupabase, apiPost, cleanupTestAccount } from './helpers';

const TEST_EMAIL = `login-${Date.now()}@test.posterita.com`;
const TEST_PASSWORD = 'LoginTest2026!';
let liveAccountId: string;
let signupAuthUid: string | undefined;
let setupComplete = false;

describe.skipIf(SKIP_SCENARIOS)('Scenario: Lookup & Login', () => {
  beforeAll(async () => {
    const res = await apiPost('/api/auth/signup', {
      email: TEST_EMAIL,
      firstname: 'Login',
      password: TEST_PASSWORD,
      pin: '1111',
      businessname: 'Login Test Shop',
      country: 'Mauritius',
      currency: 'MUR',
    });
    if (res.status === 200) {
      const body = await res.json();
      liveAccountId = body.live_account_id;
      signupAuthUid = body.auth_uid;
      setupComplete = true;
    }
  }, 120000);

  afterAll(async () => {
    if (!setupComplete) return;
    try {
      const db = getSupabase();
      const { data: owner } = await db.from('owner').select('id, auth_uid').eq('email', TEST_EMAIL).single();
      if (owner) {
        signupAuthUid = signupAuthUid || owner.auth_uid;
        const { data: accounts } = await db.from('account').select('account_id').eq('owner_id', owner.id);
        await Promise.all((accounts || []).map(acc => cleanupTestAccount(acc.account_id)));
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

  it('lookup by email returns live account', async () => {
    if (!setupComplete) return;
    const res = await apiPost('/api/auth/lookup', { email: TEST_EMAIL });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.live_account_id).toBeTruthy();
    expect(body.live_account_id).not.toBe('null');
    expect(body.owner_id).toBeGreaterThan(0);
  });

  it('lookup with unknown email returns 404', async () => {
    const res = await apiPost('/api/auth/lookup', { email: 'nonexistent-xyz@test.posterita.com' });
    expect(res.status).toBe(404);
  });

  it('login with correct credentials succeeds', async () => {
    if (!setupComplete) return;
    const res = await apiPost('/api/auth/login', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.live_account_id).toBe(liveAccountId);
  });

  it('login with wrong password fails', async () => {
    if (!setupComplete) return;
    const res = await apiPost('/api/auth/login', {
      email: TEST_EMAIL,
      password: 'WrongPassword!',
    });
    expect(res.status).not.toBe(200);
  });
});
