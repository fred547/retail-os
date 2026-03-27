import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SKIP_SCENARIOS, getSupabase, apiUrl, testId } from './helpers';

const ACCOUNT_ID = testId('oa_api');
const OWNER_EMAIL = `oa_${Date.now()}@test.posterita.com`;
const OWNER_PHONE = `+2306${Date.now().toString().slice(-7)}`;
let ownerId: number;

describe.skipIf(SKIP_SCENARIOS)('Scenario: Owner Accounts API (/api/owner/accounts/[id])', () => {
  beforeAll(async () => {
    const db = getSupabase();
    const { data: owner } = await db.from('owner').insert({
      name: 'Owner Acct Test',
      email: OWNER_EMAIL,
      phone: OWNER_PHONE,
      is_active: true,
    }).select().single();
    ownerId = owner!.id;

    await db.from('account').insert({
      account_id: ACCOUNT_ID, businessname: 'Owner Test Brand', type: 'testing',
      status: 'active', currency: 'MUR', owner_id: ownerId,
    });
  }, 60000);

  afterAll(async () => {
    const db = getSupabase();
    await db.from('account').delete().eq('account_id', ACCOUNT_ID);
    if (ownerId) await db.from('owner').delete().eq('id', ownerId);
  }, 60000);

  it('PATCH updates brand with all required fields', async () => {
    const res = await fetch(apiUrl(`/api/owner/accounts/${ACCOUNT_ID}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: OWNER_EMAIL,
        phone: OWNER_PHONE,
        businessname: 'Renamed by Owner',
        type: 'testing',
        status: 'active',
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.account?.businessname).toBe('Renamed by Owner');
  });

  it('PATCH rejects missing businessname', async () => {
    const res = await fetch(apiUrl(`/api/owner/accounts/${ACCOUNT_ID}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: OWNER_EMAIL,
        type: 'testing',
        status: 'active',
      }),
    });
    expect(res.status).toBe(400);
  });

  it('PATCH rejects with wrong owner email', async () => {
    const res = await fetch(apiUrl(`/api/owner/accounts/${ACCOUNT_ID}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'wrong@email.com',
        businessname: 'Should Fail',
        type: 'testing',
        status: 'active',
      }),
    });
    expect([400, 403, 404]).toContain(res.status);
  });

  it('DELETE requires phone verification for active brand', async () => {
    const res = await fetch(apiUrl(`/api/owner/accounts/${ACCOUNT_ID}`), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: OWNER_EMAIL,
        phone: OWNER_PHONE,
        // No verification_phone — should be blocked
      }),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('verification');
  });

  it('DB confirms brand still exists after blocked delete', async () => {
    const db = getSupabase();
    const { data } = await db.from('account')
      .select('account_id, status')
      .eq('account_id', ACCOUNT_ID)
      .single();
    expect(data).toBeTruthy();
    expect(data!.status).toBe('active');
  });
});
