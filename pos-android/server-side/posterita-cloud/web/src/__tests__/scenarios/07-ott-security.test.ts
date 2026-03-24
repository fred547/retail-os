import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SKIP_SCENARIOS, getSupabase, apiPost, apiPostHmac, testId, testUuid } from './helpers';

const ACCOUNT_ID = testId('ott_sec');
const OTT_STORE_ID = 70000 + Math.floor(Math.random() * 9000);
const OTT_TERMINAL_ID = OTT_STORE_ID;
const SYNC_SECRET = testUuid();
const OTT_BODY = { account_id: ACCOUNT_ID, user_id: 1, store_id: OTT_STORE_ID, terminal_id: OTT_TERMINAL_ID };

describe.skipIf(SKIP_SCENARIOS)('Scenario: OTT Token Security', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({ account_id: ACCOUNT_ID, businessname: 'OTT Test', type: 'live', status: 'active', currency: 'MUR', sync_secret: SYNC_SECRET });
    await db.from('store').insert({ store_id: OTT_STORE_ID, account_id: ACCOUNT_ID, name: 'OTT Store', isactive: 'Y' });
    await db.from('terminal').insert({ terminal_id: OTT_TERMINAL_ID, account_id: ACCOUNT_ID, store_id: OTT_STORE_ID, name: 'POS 1', isactive: 'Y' });
  }, 30000);

  afterAll(async () => {
    try {
      const db = getSupabase();
      await db.from('ott_tokens').delete().eq('account_id', ACCOUNT_ID);
      await Promise.all([
        db.from('terminal').delete().eq('account_id', ACCOUNT_ID),
        db.from('store').delete().eq('account_id', ACCOUNT_ID),
      ]);
      await db.from('account').delete().eq('account_id', ACCOUNT_ID);
    } catch { /* cleanup best-effort */ }
  }, 30000);

  it('generates OTT token with context', async () => {
    const res = await apiPostHmac('/api/auth/ott', OTT_BODY, SYNC_SECRET);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.token).toBeTruthy();
    expect(json.token.length).toBeGreaterThan(10);
  });

  it('validates a fresh OTT token', async () => {
    const body = {
      account_id: ACCOUNT_ID,
      user_id: 1,
      store_id: OTT_STORE_ID,
      terminal_id: OTT_TERMINAL_ID,
    };
    const genRes = await apiPostHmac('/api/auth/ott', body, SYNC_SECRET);
    const { token } = await genRes.json();

    // Validate it (no HMAC needed)
    const valRes = await apiPost('/api/auth/ott/validate', { token });
    expect(valRes.status).toBe(200);
    const valBody = await valRes.json();
    expect(valBody.account_id).toBe(ACCOUNT_ID);
    expect(valBody.user_id).toBe(1);
  });

  it('OTT token is single-use (second validate fails)', async () => {
    const body = {
      account_id: ACCOUNT_ID,
      user_id: 1,
      store_id: OTT_STORE_ID,
      terminal_id: OTT_TERMINAL_ID,
    };
    const genRes = await apiPostHmac('/api/auth/ott', body, SYNC_SECRET);
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
