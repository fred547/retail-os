import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SKIP_SCENARIOS, getSupabase, apiPost, testId, testUuid, cleanupTestAccount } from './helpers';

const ACCOUNT_ID = testId('soft_del');
const STORE_ID = 85000 + Math.floor(Math.random() * 9000);
const TERMINAL_ID = STORE_ID;
let liveProductId: number;
let deletedProductId: number;
let liveCategoryId: number;
let syncBody: any;

describe.skipIf(SKIP_SCENARIOS)('Scenario: Soft Delete & Sync Filtering', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({ account_id: ACCOUNT_ID, businessname: 'SoftDel Test', type: 'testing', status: 'active', currency: 'MUR' });
    await db.from('store').insert({ store_id: STORE_ID, account_id: ACCOUNT_ID, name: 'SD Store', isactive: 'Y' });
    await db.from('terminal').insert({ terminal_id: TERMINAL_ID, account_id: ACCOUNT_ID, store_id: STORE_ID, name: 'POS 1', isactive: 'Y' });

    const { data: cat } = await db.from('productcategory').insert({
      account_id: ACCOUNT_ID, name: 'SD Category', isactive: 'Y', position: 1,
    }).select().single();
    liveCategoryId = cat!.productcategory_id;

    // Insert both products in parallel
    const [liveRes, deletedRes] = await Promise.all([
      db.from('product').insert({
        account_id: ACCOUNT_ID, name: 'Live Product', sellingprice: 100,
        productcategory_id: liveCategoryId, isactive: 'Y', is_deleted: false,
      }).select().single(),
      db.from('product').insert({
        account_id: ACCOUNT_ID, name: 'Deleted Product', sellingprice: 200,
        productcategory_id: liveCategoryId, isactive: 'Y', is_deleted: true, deleted_at: new Date().toISOString(),
      }).select().single(),
    ]);
    liveProductId = liveRes.data!.product_id;
    deletedProductId = deletedRes.data!.product_id;
  }, 30000);

  afterAll(async () => {
    try { await cleanupTestAccount(ACCOUNT_ID); } catch { /* best-effort */ }
  }, 30000);

  it('soft-deleted product still exists in DB', async () => {
    const db = getSupabase();
    const { data } = await db.from('product')
      .select('*')
      .eq('product_id', deletedProductId)
      .single();
    expect(data).toBeTruthy();
    expect(data!.is_deleted).toBe(true);
    expect(data!.deleted_at).toBeTruthy();
  });

  it('querying with is_deleted=false excludes soft-deleted', async () => {
    const db = getSupabase();
    const { data } = await db.from('product')
      .select('*')
      .eq('account_id', ACCOUNT_ID)
      .eq('is_deleted', false);
    expect(data?.length).toBe(1);
    expect(data![0].name).toBe('Live Product');
  });

  it('sync pull only returns non-deleted products and includes categories', async () => {
    const res = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: '1970-01-01T00:00:00.000Z',
    });
    expect(res.status).toBe(200);
    syncBody = await res.json();
    const productNames = (syncBody.products || []).map((p: any) => p.name);
    expect(productNames).toContain('Live Product');
    expect(productNames).not.toContain('Deleted Product');
    expect(syncBody.product_categories?.length).toBeGreaterThanOrEqual(1);
    expect(syncBody.product_categories?.some((c: any) => c.name === 'SD Category')).toBe(true);
  });

  it('soft-deleting a product sets deleted_at timestamp', async () => {
    const db = getSupabase();
    const now = new Date().toISOString();
    await db.from('product')
      .update({ is_deleted: true, deleted_at: now })
      .eq('product_id', liveProductId);

    const { data } = await db.from('product')
      .select('is_deleted, deleted_at')
      .eq('product_id', liveProductId)
      .single();
    expect(data!.is_deleted).toBe(true);
    expect(data!.deleted_at).toBeTruthy();

    // Restore for next tests
    await db.from('product')
      .update({ is_deleted: false, deleted_at: null })
      .eq('product_id', liveProductId);
  });

  it('soft-deleted order excluded from normal queries', async () => {
    const db = getSupabase();
    const ORDER_ID = STORE_ID * 10 + 1;

    await db.from('orders').insert({
      order_id: ORDER_ID,
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      document_no: 'SD-001',
      grand_total: 100,
      is_paid: true,
      doc_status: 'CO',
      uuid: testUuid(),
      is_deleted: false,
    });

    await db.from('orders')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('order_id', ORDER_ID);

    const { data } = await db.from('orders')
      .select('*')
      .eq('account_id', ACCOUNT_ID)
      .eq('is_deleted', false);
    expect(data?.find((o: any) => o.document_no === 'SD-001')).toBeUndefined();
  });
});
