import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getSupabase, apiPost, testId } from './helpers';

const ACCOUNT_ID = testId('ott_sec');

describe('Scenario: OTT Token Security', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({ account_id: ACCOUNT_ID, businessname: 'OTT Test', type: 'live', status: 'active', currency: 'MUR' });
    await db.from('store').insert({ store_id: 7001, account_id: ACCOUNT_ID, name: 'OTT Store', isactive: 'Y' });
    await db.from('terminal').insert({ terminal_id: 7001, account_id: ACCOUNT_ID, store_id: 7001, name: 'POS 1', isactive: 'Y' });
  });

  afterAll(async () => {
    const db = getSupabase();
    await db.from('ott_tokens').delete().eq('account_id', ACCOUNT_ID);
    await db.from('terminal').delete().eq('account_id', ACCOUNT_ID);
    await db.from('store').delete().eq('account_id', ACCOUNT_ID);
    await db.from('account').delete().eq('account_id', ACCOUNT_ID);
  });

  it('generates OTT token with context', async () => {
    const res = await apiPost('/api/auth/ott', {
      account_id: ACCOUNT_ID,
      user_id: 1,
      store_id: 7001,
      terminal_id: 7001,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBeTruthy();
    expect(body.token.length).toBeGreaterThan(10);
  });

  it('validates a fresh OTT token', async () => {
    // Generate token
    const genRes = await apiPost('/api/auth/ott', {
      account_id: ACCOUNT_ID,
      user_id: 1,
      store_id: 7001,
      terminal_id: 7001,
    });
    const { token } = await genRes.json();

    // Validate it
    const valRes = await apiPost('/api/auth/ott/validate', { token });
    expect(valRes.status).toBe(200);
    const valBody = await valRes.json();
    expect(valBody.account_id).toBe(ACCOUNT_ID);
    expect(valBody.user_id).toBe(1);
  });

  it('OTT token is single-use (second validate fails)', async () => {
    const genRes = await apiPost('/api/auth/ott', {
      account_id: ACCOUNT_ID,
      user_id: 1,
      store_id: 7001,
      terminal_id: 7001,
    });
    const { token } = await genRes.json();

    // First use
    await apiPost('/api/auth/ott/validate', { token });

    // Second use should fail
    const res2 = await apiPost('/api/auth/ott/validate', { token });
    expect(res2.status).not.toBe(200);
  });

  it('rejects fabricated OTT token', async () => {
    const res = await apiPost('/api/auth/ott/validate', { token: 'fabricated_fake_token_xyz' });
    expect([400, 401, 404]).toContain(res.status);
  });
});
