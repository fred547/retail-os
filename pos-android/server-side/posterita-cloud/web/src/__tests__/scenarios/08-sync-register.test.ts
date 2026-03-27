import { describe, it, expect, afterAll } from 'vitest';
import { SKIP_SCENARIOS, getSupabase, apiPost, testId } from './helpers';

const ACCOUNT_ID = testId('reg');

describe.skipIf(SKIP_SCENARIOS)('Scenario: Sync Registration', () => {
  afterAll(async () => {
    const db = getSupabase();
    await db.from('terminal').delete().eq('account_id', ACCOUNT_ID);
    await db.from('pos_user').delete().eq('account_id', ACCOUNT_ID);
    await db.from('store').delete().eq('account_id', ACCOUNT_ID);
    await db.from('tax').delete().eq('account_id', ACCOUNT_ID);
    await db.from('owner_account_session').delete().eq('account_id', ACCOUNT_ID);
    await db.from('account').delete().eq('account_id', ACCOUNT_ID);
    const { data: owner } = await db.from('owner').select('id').eq('email', `reg-${ACCOUNT_ID}@test.posterita.com`).single();
    if (owner) await db.from('owner').delete().eq('id', owner.id);
  }, 30000);

  it('registers a new account with initial data', async () => {
    const res = await apiPost('/api/sync/register', {
      account_id: ACCOUNT_ID,
      businessname: 'Register Test',
      currency: 'MUR',
      email: `reg-${ACCOUNT_ID}@test.posterita.com`,
      stores: [{ store_id: 6001, name: 'Main Store', country: 'Mauritius' }],
      terminals: [{ terminal_id: 6001, store_id: 6001, name: 'POS 1', prefix: 'REG' }],
      users: [{ user_id: 1, username: 'admin', firstname: 'Admin', role: 'owner', isadmin: 'Y', isactive: 'Y' }],
      taxes: [{ tax_id: 6001, name: 'VAT 15%', rate: 15, isactive: 'Y' }],
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.is_new).toBe(true);
  });

  it('account exists with pushed data', async () => {
    const db = getSupabase();
    const { data: account } = await db.from('account').select('*').eq('account_id', ACCOUNT_ID).single();
    expect(account).toBeTruthy();
    expect(account.businessname).toBe('Register Test');

    const { data: stores } = await db.from('store').select('*').eq('account_id', ACCOUNT_ID);
    expect(stores?.length).toBe(1);

    const { data: terminals } = await db.from('terminal').select('*').eq('account_id', ACCOUNT_ID);
    expect(terminals?.length).toBe(1);
  });

  it('re-registration does not duplicate or downgrade', async () => {
    const db = getSupabase();
    // Set to live
    await db.from('account').update({ type: 'testing' }).eq('account_id', ACCOUNT_ID);

    const res = await apiPost('/api/sync/register', {
      account_id: ACCOUNT_ID,
      businessname: 'Register Test',
      currency: 'MUR',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.is_new).toBe(false);

    // Type should still be live (not downgraded to trial)
    const { data } = await db.from('account').select('type').eq('account_id', ACCOUNT_ID).single();
    expect(data!.type).toBe('testing');
  });
});
