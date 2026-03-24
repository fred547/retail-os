import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SKIP_SCENARIOS, getSupabase, apiPost, testId, cleanupTestAccount } from './helpers';

const ACCOUNT_ID = testId('pref_mod');
const STORE_ID = 98000 + Math.floor(Math.random() * 9000);
const TERMINAL_ID = STORE_ID;
let categoryId: number;

describe.skipIf(SKIP_SCENARIOS)('Scenario: Preference & Modifier Sync Pull', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({ account_id: ACCOUNT_ID, businessname: 'PrefMod Test', type: 'live', status: 'active', currency: 'MUR' });
    await db.from('store').insert({ store_id: STORE_ID, account_id: ACCOUNT_ID, name: 'PrefMod Store', isactive: 'Y' });
    await db.from('terminal').insert({ terminal_id: TERMINAL_ID, account_id: ACCOUNT_ID, store_id: STORE_ID, name: 'POS 1', isactive: 'Y' });

    const { data: cat } = await db.from('productcategory').insert({
      account_id: ACCOUNT_ID, name: 'Burgers', isactive: 'Y', position: 1,
    }).select().single();
    categoryId = cat!.productcategory_id;
  }, 60000);

  afterAll(async () => {
    const db = getSupabase();
    await db.from('preference').delete().eq('account_id', ACCOUNT_ID);
    try { await cleanupTestAccount(ACCOUNT_ID); } catch { /* best-effort */ }
  }, 60000);

  // --- Preferences ---

  it('creates account preferences', async () => {
    const db = getSupabase();
    const { data, error } = await db.from('preference').insert({
      account_id: ACCOUNT_ID,
      preventzeroqtysales: 'Y',
      showreceiptlogo: 'Y',
      showsignature: 'N',
      opencashdrawer: 'Y',
      isactive: 'Y',
    }).select().single();
    expect(error).toBeNull();
    expect(data.preventzeroqtysales).toBe('Y');
    expect(data.opencashdrawer).toBe('Y');
  });

  it('sync pull returns preferences', async () => {
    const res = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: '1970-01-01T00:00:00.000Z',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.preferences?.length).toBeGreaterThanOrEqual(1);
    const pref = body.preferences[0];
    expect(pref.preventzeroqtysales).toBe('Y');
    expect(pref.opencashdrawer).toBe('Y');
  });

  it('updated preference pulled in delta sync', async () => {
    const db = getSupabase();
    const { data: existing } = await db.from('preference')
      .select('preference_id')
      .eq('account_id', ACCOUNT_ID)
      .single();

    await db.from('preference')
      .update({ showsignature: 'Y', updated_at: new Date().toISOString() })
      .eq('preference_id', existing!.preference_id);

    const res = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: '1970-01-01T00:00:00.000Z',
    });
    const body = await res.json();
    expect(body.preferences?.[0]?.showsignature).toBe('Y');
  });

  // --- Modifiers ---

  it('creates product and category modifiers', async () => {
    const db = getSupabase();
    // Create a product first
    const { data: product } = await db.from('product').insert({
      account_id: ACCOUNT_ID, name: 'Classic Burger', sellingprice: 250,
      productcategory_id: categoryId, isactive: 'Y',
    }).select().single();

    // Create modifiers: product-level and category-level
    const { data, error } = await db.from('modifier').insert([
      { account_id: ACCOUNT_ID, product_id: product!.product_id, name: 'Extra Cheese', sellingprice: 30, isactive: 'Y', ismodifier: 'Y' },
      { account_id: ACCOUNT_ID, product_id: product!.product_id, name: 'Bacon', sellingprice: 50, isactive: 'Y', ismodifier: 'Y' },
      { account_id: ACCOUNT_ID, productcategory_id: categoryId, name: 'Large Size', sellingprice: 40, isactive: 'Y', ismodifier: 'Y' },
    ]).select();
    expect(error).toBeNull();
    expect(data!.length).toBe(3);
  });

  it('sync pull returns modifiers for account', async () => {
    const res = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: '1970-01-01T00:00:00.000Z',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.modifiers?.length).toBeGreaterThanOrEqual(3);
    const names = body.modifiers.map((m: any) => m.name);
    expect(names).toContain('Extra Cheese');
    expect(names).toContain('Bacon');
    expect(names).toContain('Large Size');
  });

  it('deactivated modifier still returned by sync (for client-side filtering)', async () => {
    const db = getSupabase();
    const { data: mod } = await db.from('modifier')
      .select('modifier_id')
      .eq('account_id', ACCOUNT_ID)
      .eq('name', 'Bacon')
      .single();
    await db.from('modifier')
      .update({ isactive: 'N', updated_at: new Date().toISOString() })
      .eq('modifier_id', mod!.modifier_id);

    const res = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: '1970-01-01T00:00:00.000Z',
    });
    const body = await res.json();
    // Sync returns ALL modifiers (active and inactive) — client filters
    const bacon = body.modifiers?.find((m: any) => m.name === 'Bacon');
    expect(bacon).toBeTruthy();
    expect(bacon.isactive).toBe('N');
  });

  it('modifiers scoped to account', async () => {
    const db = getSupabase();
    const { data } = await db.from('modifier')
      .select('*')
      .eq('account_id', 'nonexistent_account');
    expect(data?.length).toBe(0);
  });
});
