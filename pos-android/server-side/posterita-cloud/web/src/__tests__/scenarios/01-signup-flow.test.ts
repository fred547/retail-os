import { describe, it, expect, afterAll } from 'vitest';
import { getSupabase, apiPost, testId, cleanupTestAccount } from './helpers';

const TEST_ACCOUNT_ID = testId('scenario');
const TEST_EMAIL = `scenario-${Date.now()}@test.posterita.com`;
const TEST_PHONE = `+230${Math.floor(1000000 + Math.random() * 9000000)}`;

describe('Scenario: Signup Flow', () => {
  afterAll(async () => {
    // Clean up test owner and auth user
    const db = getSupabase();
    await cleanupTestAccount(TEST_ACCOUNT_ID);
    // Also clean up any accounts created by signup API
    const { data: owner } = await db.from('owner').select('id').eq('email', TEST_EMAIL).single();
    if (owner) {
      const { data: accounts } = await db.from('account').select('account_id').eq('owner_id', owner.id);
      for (const acc of accounts || []) {
        await cleanupTestAccount(acc.account_id);
      }
      await db.from('owner_account_session').delete().eq('owner_id', owner.id);
      await db.from('owner').delete().eq('id', owner.id);
    }
    // Clean up Supabase Auth user
    const { data: authUsers } = await db.auth.admin.listUsers();
    const authUser = authUsers?.users?.find(u => u.email === TEST_EMAIL);
    if (authUser) await db.auth.admin.deleteUser(authUser.id);
  });

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
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.live_account_id).toBeTruthy();
    expect(body.demo_account_id).toBeTruthy();
    expect(body.owner_id).toBeGreaterThan(0);
    expect(body.live_account_id).not.toBe('null');
  });

  it('owner record exists with correct email', async () => {
    const db = getSupabase();
    const { data: owner } = await db.from('owner').select('*').eq('email', TEST_EMAIL).single();
    expect(owner).toBeTruthy();
    expect(owner.phone).toBe(TEST_PHONE);
    expect(owner.is_active).toBe(true);
  });

  it('live brand has store + terminal + user', async () => {
    const db = getSupabase();
    const { data: accounts } = await db.from('account').select('account_id, type').eq('businessname', 'Scenario Test Cafe');
    const live = accounts?.find(a => a.type === 'live');
    expect(live).toBeTruthy();

    const { data: stores } = await db.from('store').select('*').eq('account_id', live!.account_id);
    expect(stores?.length).toBeGreaterThanOrEqual(1);

    const { data: terminals } = await db.from('terminal').select('*').eq('account_id', live!.account_id);
    expect(terminals?.length).toBeGreaterThanOrEqual(1);

    const { data: users } = await db.from('pos_user').select('*').eq('account_id', live!.account_id);
    expect(users?.length).toBeGreaterThanOrEqual(1);
    expect(users?.[0].role).toBe('owner');
    expect(users?.[0].pin).toBe('9999');
  });

  it('default taxes are created', async () => {
    const db = getSupabase();
    const { data: accounts } = await db.from('account').select('account_id, type').eq('businessname', 'Scenario Test Cafe');
    const live = accounts?.find(a => a.type === 'live');

    const { data: taxes } = await db.from('tax').select('*').eq('account_id', live!.account_id);
    expect(taxes?.length).toBeGreaterThanOrEqual(2);
    expect(taxes?.some(t => t.name === 'VAT 15%' && t.rate === 15)).toBe(true);
    expect(taxes?.some(t => t.name === 'No Tax' && t.rate === 0)).toBe(true);
  });

  it('duplicate signup returns 409', async () => {
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
