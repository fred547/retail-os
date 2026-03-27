import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SKIP_SCENARIOS, getSupabase, apiPatchAuth, apiGetAuth, testId } from './helpers';

const ACCOUNT_ID = testId('lc_api');

describe.skipIf(SKIP_SCENARIOS)('Scenario: Account Lifecycle API (/api/account/lifecycle)', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({ account_id: ACCOUNT_ID, businessname: 'Lifecycle API', type: 'testing', status: 'draft', currency: 'MUR' });
  }, 60000);

  afterAll(async () => {
    const db = getSupabase();
    await db.from('account_lifecycle_log').delete().eq('account_id', ACCOUNT_ID);
    await db.from('account').delete().eq('account_id', ACCOUNT_ID);
  }, 60000);

  it('transitions draft → onboarding via API', async () => {
    const res = await apiPatchAuth('/api/account/lifecycle', {
      account_id: ACCOUNT_ID,
      status: 'onboarding',
    }, ACCOUNT_ID);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.from).toBe('draft');
    expect(body.to).toBe('onboarding');
  });

  it('transitions onboarding → active via API', async () => {
    const res = await apiPatchAuth('/api/account/lifecycle', {
      account_id: ACCOUNT_ID,
      status: 'active',
    }, ACCOUNT_ID);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.to).toBe('active');
  });

  it('rejects invalid transition (active → draft)', async () => {
    const res = await apiPatchAuth('/api/account/lifecycle', {
      account_id: ACCOUNT_ID,
      status: 'draft',
    }, ACCOUNT_ID);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Cannot transition');
  });

  it('transitions active → suspended → archived', async () => {
    let res = await apiPatchAuth('/api/account/lifecycle', {
      account_id: ACCOUNT_ID,
      status: 'suspended',
    }, ACCOUNT_ID);
    expect(res.status).toBe(200);

    res = await apiPatchAuth('/api/account/lifecycle', {
      account_id: ACCOUNT_ID,
      status: 'archived',
    }, ACCOUNT_ID);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.to).toBe('archived');
  });

  it('lifecycle history returned via GET', async () => {
    const res = await apiGetAuth(`/api/account/lifecycle?account_id=${ACCOUNT_ID}`, ACCOUNT_ID);
    expect(res.status).toBe(200);
    const body = await res.json();
    // 4 transitions: draft→onboarding, onboarding→active, active→suspended, suspended→archived
    expect(body.data?.length).toBeGreaterThanOrEqual(4);
  });

  it('DB confirms final status is archived', async () => {
    const db = getSupabase();
    const { data } = await db.from('account')
      .select('status')
      .eq('account_id', ACCOUNT_ID)
      .single();
    expect(data!.status).toBe('archived');
  });
});
