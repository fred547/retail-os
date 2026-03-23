import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getSupabase, apiPost } from './helpers';

const TEST_EMAIL = `login-${Date.now()}@test.posterita.com`;
const TEST_PASSWORD = 'LoginTest2026!';
let liveAccountId: string;

describe('Scenario: Lookup & Login', () => {
  beforeAll(async () => {
    // Create test account via signup
    const res = await apiPost('/api/auth/signup', {
      email: TEST_EMAIL,
      firstname: 'Login',
      password: TEST_PASSWORD,
      pin: '1111',
      businessname: 'Login Test Shop',
      country: 'Mauritius',
      currency: 'MUR',
    });
    const body = await res.json();
    liveAccountId = body.live_account_id;
  });

  afterAll(async () => {
    const db = getSupabase();
    const { data: owner } = await db.from('owner').select('id').eq('email', TEST_EMAIL).single();
    if (owner) {
      const { data: accounts } = await db.from('account').select('account_id').eq('owner_id', owner.id);
      for (const acc of accounts || []) {
        await db.from('terminal').delete().eq('account_id', acc.account_id);
        await db.from('pos_user').delete().eq('account_id', acc.account_id);
        await db.from('store').delete().eq('account_id', acc.account_id);
        await db.from('tax').delete().eq('account_id', acc.account_id);
        await db.from('account').delete().eq('account_id', acc.account_id);
      }
      await db.from('owner_account_session').delete().eq('owner_id', owner.id);
      await db.from('owner').delete().eq('id', owner.id);
    }
    const { data: authUsers } = await db.auth.admin.listUsers();
    const authUser = authUsers?.users?.find(u => u.email === TEST_EMAIL);
    if (authUser) await db.auth.admin.deleteUser(authUser.id);
  });

  it('lookup by email returns live account', async () => {
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
    const res = await apiPost('/api/auth/login', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.live_account_id).toBe(liveAccountId);
  });

  it('login with wrong password fails', async () => {
    const res = await apiPost('/api/auth/login', {
      email: TEST_EMAIL,
      password: 'WrongPassword!',
    });
    expect(res.status).not.toBe(200);
  });
});
