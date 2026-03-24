import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SKIP_SCENARIOS, getSupabase, apiPost, testId, testUuid, cleanupTestAccount } from './helpers';

const ACCOUNT_ID = testId('inc_sync');
const STORE_ID = 97000 + Math.floor(Math.random() * 9000);
const TERMINAL_ID = STORE_ID;
let firstSyncTime: string;

describe.skipIf(SKIP_SCENARIOS)('Scenario: Incremental Sync & Request Logging', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({ account_id: ACCOUNT_ID, businessname: 'IncSync Test', type: 'live', status: 'active', currency: 'MUR' });
    await db.from('store').insert({ store_id: STORE_ID, account_id: ACCOUNT_ID, name: 'Sync Store', isactive: 'Y' });
    await db.from('terminal').insert({ terminal_id: TERMINAL_ID, account_id: ACCOUNT_ID, store_id: STORE_ID, name: 'POS 1', isactive: 'Y' });

    // Seed initial data
    const { data: cat } = await db.from('productcategory').insert({
      account_id: ACCOUNT_ID, name: 'Drinks', isactive: 'Y', position: 1,
    }).select().single();

    await db.from('product').insert([
      { account_id: ACCOUNT_ID, name: 'Coffee', sellingprice: 80, productcategory_id: cat!.productcategory_id, isactive: 'Y' },
      { account_id: ACCOUNT_ID, name: 'Tea', sellingprice: 50, productcategory_id: cat!.productcategory_id, isactive: 'Y' },
    ]);

    await db.from('tax').insert({ account_id: ACCOUNT_ID, name: 'VAT 15%', rate: 15, isactive: 'Y' });
  }, 60000);

  afterAll(async () => {
    const db = getSupabase();
    await db.from('sync_request_log').delete().eq('account_id', ACCOUNT_ID);
    try { await cleanupTestAccount(ACCOUNT_ID); } catch { /* best-effort */ }
  }, 60000);

  it('full sync (epoch) returns all data', async () => {
    const res = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: '1970-01-01T00:00:00.000Z',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.products?.length).toBe(2);
    expect(body.product_categories?.length).toBe(1);
    expect(body.taxes?.length).toBeGreaterThanOrEqual(1);
    expect(body.stores?.length).toBeGreaterThanOrEqual(1);
    expect(body.terminals?.length).toBeGreaterThanOrEqual(1);
    firstSyncTime = body.server_time;
    expect(firstSyncTime).toBeTruthy();
  });

  it('delta sync with recent timestamp returns empty (no changes)', async () => {
    const res = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: firstSyncTime,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    // No products changed since last sync
    expect(body.products?.length ?? 0).toBe(0);
    expect(body.product_categories?.length ?? 0).toBe(0);
  });

  it('modifying a product makes it appear in delta sync', async () => {
    const db = getSupabase();
    // Update product after first sync
    await db.from('product')
      .update({ sellingprice: 100, updated_at: new Date().toISOString() })
      .eq('account_id', ACCOUNT_ID)
      .eq('name', 'Coffee');

    const res = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: firstSyncTime,
    });
    const body = await res.json();
    expect(body.products?.length).toBe(1);
    expect(body.products[0].name).toBe('Coffee');
    expect(body.products[0].sellingprice).toBe(100);
  });

  it('adding new product appears in delta sync', async () => {
    const db = getSupabase();
    const { data: cat } = await db.from('productcategory')
      .select('productcategory_id')
      .eq('account_id', ACCOUNT_ID)
      .single();

    await db.from('product').insert({
      account_id: ACCOUNT_ID, name: 'Juice', sellingprice: 120,
      productcategory_id: cat!.productcategory_id, isactive: 'Y',
    });

    const res = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: firstSyncTime,
    });
    const body = await res.json();
    const names = body.products.map((p: any) => p.name);
    expect(names).toContain('Juice');
    expect(names).toContain('Coffee'); // was updated earlier
  });

  it('sync request is logged to sync_request_log', async () => {
    const db = getSupabase();
    const { data } = await db.from('sync_request_log')
      .select('account_id, terminal_id, store_id, status, duration_ms')
      .eq('account_id', ACCOUNT_ID)
      .order('request_at', { ascending: false })
      .limit(1);
    expect(data!.length).toBe(1);
    expect(data![0].terminal_id).toBe(TERMINAL_ID);
    expect(data![0].store_id).toBe(STORE_ID);
    expect(data![0].status).toBeTruthy();
    expect(data![0].duration_ms).toBeGreaterThanOrEqual(0);
  });

  it('multiple syncs create multiple log entries', async () => {
    const db = getSupabase();
    const { data } = await db.from('sync_request_log')
      .select('id')
      .eq('account_id', ACCOUNT_ID);
    // We've done at least 4 syncs in this test suite
    expect(data!.length).toBeGreaterThanOrEqual(4);
  });

  it('sync response includes version and stats', async () => {
    const res = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: '1970-01-01T00:00:00.000Z',
    });
    const body = await res.json();
    expect(body.server_time).toBeTruthy();
    expect(typeof body.orders_synced).toBe('number');
    expect(typeof body.payments_synced).toBe('number');
    // Full sync should return all 3 products now
    expect(body.products?.length).toBe(3);
  });
});
