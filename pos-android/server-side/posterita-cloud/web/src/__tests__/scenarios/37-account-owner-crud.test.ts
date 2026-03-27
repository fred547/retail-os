import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SKIP_SCENARIOS, getSupabase, apiPatchAuth, apiDeleteAuth, apiGetAuth, testId, cleanupTestAccount } from './helpers';

const ACCOUNT_LIVE = testId('ao_live');
const ACCOUNT_ARCHIVE = testId('ao_arch');
const ACCOUNT_DELETE = testId('ao_del');
let ownerId: number;

describe.skipIf(SKIP_SCENARIOS)('Scenario: Account & Owner CRUD', () => {
  beforeAll(async () => {
    const db = getSupabase();
    // Create an owner
    const { data: owner } = await db.from('owner').insert({
      name: 'Test Owner AO',
      email: `ao_${Date.now()}@test.posterita.com`,
      phone: `+2305${Date.now().toString().slice(-7)}`,
      is_active: true,
    }).select().single();
    ownerId = owner!.id;

    // Create accounts under this owner
    await db.from('account').insert([
      { account_id: ACCOUNT_LIVE, businessname: 'Live Brand', type: 'testing', status: 'active', currency: 'MUR', owner_id: ownerId },
      { account_id: ACCOUNT_ARCHIVE, businessname: 'Archive Brand', type: 'testing', status: 'archived', currency: 'USD', owner_id: ownerId },
      { account_id: ACCOUNT_DELETE, businessname: 'Delete Me', type: 'demo', status: 'testing', currency: 'EUR', owner_id: ownerId },
    ]);

    // Add some data to the delete target
    await db.from('store').insert({ store_id: 37001, account_id: ACCOUNT_DELETE, name: 'Del Store', isactive: 'Y' });
    await db.from('terminal').insert({ terminal_id: 37001, account_id: ACCOUNT_DELETE, store_id: 37001, name: 'Del POS', isactive: 'Y' });
    await db.from('productcategory').insert({ account_id: ACCOUNT_DELETE, name: 'Del Cat', isactive: 'Y', position: 1 });
  }, 60000);

  afterAll(async () => {
    const db = getSupabase();
    for (const id of [ACCOUNT_LIVE, ACCOUNT_ARCHIVE, ACCOUNT_DELETE]) {
      try { await cleanupTestAccount(id); } catch { /* best-effort */ }
    }
    if (ownerId) await db.from('owner').delete().eq('id', ownerId);
  }, 60000);

  // --- Account PATCH & DELETE auth guard ---

  it('PATCH /api/account/[id] requires account manager', async () => {
    const res = await apiPatchAuth(`/api/account/${ACCOUNT_LIVE}`, {
      businessname: 'Renamed',
    }, ACCOUNT_LIVE);
    // Should return 401/403 — cookie auth alone isn't enough for account manager
    expect([401, 403]).toContain(res.status);
  });

  it('DELETE /api/account/[id] requires account manager', async () => {
    const res = await apiDeleteAuth(`/api/account/${ACCOUNT_DELETE}`, ACCOUNT_DELETE);
    expect([401, 403]).toContain(res.status);
  });

  // --- Account CRUD via direct DB (business logic) ---

  it('updates brand name via DB', async () => {
    const db = getSupabase();
    const { error } = await db.from('account')
      .update({ businessname: 'Renamed Live Brand' })
      .eq('account_id', ACCOUNT_LIVE);
    expect(error).toBeNull();

    const { data } = await db.from('account')
      .select('businessname')
      .eq('account_id', ACCOUNT_LIVE)
      .single();
    expect(data!.businessname).toBe('Renamed Live Brand');
  });

  it('cascading delete removes all child records', async () => {
    const db = getSupabase();
    // Delete child records first (mirroring API cascade logic)
    await db.from('productcategory').delete().eq('account_id', ACCOUNT_DELETE);
    await db.from('terminal').delete().eq('account_id', ACCOUNT_DELETE);
    await db.from('store').delete().eq('account_id', ACCOUNT_DELETE);
    await db.from('account').delete().eq('account_id', ACCOUNT_DELETE);

    // Verify all gone
    const { data: acc } = await db.from('account').select('account_id').eq('account_id', ACCOUNT_DELETE);
    expect(acc?.length).toBe(0);
    const { data: stores } = await db.from('store').select('store_id').eq('account_id', ACCOUNT_DELETE);
    expect(stores?.length).toBe(0);
    const { data: terms } = await db.from('terminal').select('terminal_id').eq('account_id', ACCOUNT_DELETE);
    expect(terms?.length).toBe(0);
  });

  it('archived account preserved after deletion of other accounts', async () => {
    const db = getSupabase();
    const { data } = await db.from('account')
      .select('account_id, status')
      .eq('account_id', ACCOUNT_ARCHIVE)
      .single();
    expect(data!.status).toBe('archived');
  });

  // --- Owner CRUD via direct DB ---

  it('GET /api/owner/[id] requires account manager', async () => {
    const res = await apiGetAuth(`/api/owner/${ownerId}`, ACCOUNT_LIVE);
    expect([401, 403]).toContain(res.status);
  });

  it('owner linked to multiple accounts', async () => {
    const db = getSupabase();
    const { data } = await db.from('account')
      .select('account_id')
      .eq('owner_id', ownerId);
    // ACCOUNT_LIVE + ACCOUNT_ARCHIVE still exist (ACCOUNT_DELETE was removed)
    expect(data!.length).toBe(2);
  });

  it('owner email uniqueness enforced', async () => {
    const db = getSupabase();
    const { data: existing } = await db.from('owner')
      .select('email')
      .eq('id', ownerId)
      .single();

    // Try to insert another owner with same email
    const { error } = await db.from('owner').insert({
      name: 'Duplicate',
      email: existing!.email,
      phone: '+23050000000',
      is_active: true,
    });
    // Should fail due to unique constraint
    expect(error).toBeTruthy();
  });

  it('owner update preserves linked accounts', async () => {
    const db = getSupabase();
    await db.from('owner')
      .update({ name: 'Updated Owner Name' })
      .eq('id', ownerId);

    const { data } = await db.from('owner')
      .select('name')
      .eq('id', ownerId)
      .single();
    expect(data!.name).toBe('Updated Owner Name');

    // Accounts still linked
    const { data: accounts } = await db.from('account')
      .select('account_id')
      .eq('owner_id', ownerId);
    expect(accounts!.length).toBe(2);
  });
});
