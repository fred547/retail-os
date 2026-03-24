import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SKIP_SCENARIOS, getSupabase, apiGetAuth, apiPostAuth, testId, cleanupTestAccount } from './helpers';

const ACCOUNT_ID = testId('intake');
const STORE_ID = 41000 + Math.floor(Math.random() * 9000);
let batchId: number;
let categoryId: number;
let widgetItemId: number;
let gadgetItemId: number;

describe.skipIf(SKIP_SCENARIOS)('Scenario: Product Intake Pipeline', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({ account_id: ACCOUNT_ID, businessname: 'Intake Test', type: 'live', status: 'active', currency: 'MUR' });
    await db.from('store').insert({ store_id: STORE_ID, account_id: ACCOUNT_ID, name: 'Intake Store', isactive: 'Y' });

    const { data: cat } = await db.from('productcategory').insert({
      account_id: ACCOUNT_ID, name: 'Imported', isactive: 'Y', position: 1,
    }).select().single();
    categoryId = cat!.productcategory_id;

    // Create batch via direct DB
    const { data: batch } = await db.from('intake_batch').insert({
      account_id: ACCOUNT_ID,
      source: 'csv',
      source_ref: 'test-upload.csv',
      supplier_name: 'Test Supplier Co',
      notes: 'Scenario test batch',
      status: 'in_review',
    }).select().single();
    batchId = batch!.batch_id;

    // Seed intake items
    const { data: items } = await db.from('intake_item').insert([
      { batch_id: batchId, account_id: ACCOUNT_ID, name: 'Imported Widget', selling_price: 250, category_name: 'Imported', match_type: 'new', status: 'pending' },
      { batch_id: batchId, account_id: ACCOUNT_ID, name: 'Imported Gadget', selling_price: 500, category_name: 'Imported', match_type: 'new', status: 'pending' },
    ]).select();
    widgetItemId = items!.find(i => i.name === 'Imported Widget')!.item_id;
    gadgetItemId = items!.find(i => i.name === 'Imported Gadget')!.item_id;
  }, 60000);

  afterAll(async () => {
    const db = getSupabase();
    if (batchId) {
      await db.from('intake_item').delete().eq('batch_id', batchId);
      await db.from('intake_batch').delete().eq('batch_id', batchId);
    }
    try { await cleanupTestAccount(ACCOUNT_ID); } catch { /* best-effort */ }
  }, 60000);

  // --- Batch exists in DB ---

  it('batch created with correct metadata', async () => {
    const db = getSupabase();
    const { data } = await db.from('intake_batch')
      .select('*')
      .eq('batch_id', batchId)
      .single();
    expect(data!.source).toBe('csv');
    expect(data!.supplier_name).toBe('Test Supplier Co');
    expect(data!.status).toBe('in_review');
    expect(data!.account_id).toBe(ACCOUNT_ID);
  });

  it('items seeded with correct fields', async () => {
    const db = getSupabase();
    const { data } = await db.from('intake_item')
      .select('name, selling_price, match_type, status')
      .eq('batch_id', batchId)
      .order('item_id');
    expect(data!.length).toBe(2);
    expect(data![0].name).toBe('Imported Widget');
    expect(data![0].selling_price).toBe(250);
    expect(data![0].match_type).toBe('new');
    expect(data![0].status).toBe('pending');
  });

  // --- GET /api/intake/[batchId] ---

  it('gets batch detail with items via API', async () => {
    const res = await apiGetAuth(`/api/intake/${batchId}`, ACCOUNT_ID);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.batch?.batch_id).toBe(batchId);
    expect(body.items?.length).toBe(2);
  });

  // --- POST /api/intake/[batchId]/review ---

  it('approves and rejects intake items via API', async () => {
    const res = await apiPostAuth(`/api/intake/${batchId}/review`, {
      actions: [
        { item_id: widgetItemId, action: 'approve', overrides: { category_id: categoryId } },
        { item_id: gadgetItemId, action: 'reject' },
      ],
    }, ACCOUNT_ID);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.approved).toBe(1);
    expect(body.rejected).toBe(1);
  });

  it('approved item creates product in DB', async () => {
    const db = getSupabase();
    const { data } = await db.from('product')
      .select('name, sellingprice')
      .eq('account_id', ACCOUNT_ID)
      .eq('name', 'Imported Widget');
    expect(data!.length).toBe(1);
    expect(data![0].sellingprice).toBe(250);
  });

  it('rejected item not created as product', async () => {
    const db = getSupabase();
    const { data } = await db.from('product')
      .select('name')
      .eq('account_id', ACCOUNT_ID)
      .eq('name', 'Imported Gadget');
    expect(data!.length).toBe(0);
  });

  it('batch status updated after all items reviewed', async () => {
    const db = getSupabase();
    const { data } = await db.from('intake_batch')
      .select('status, approved_count, rejected_count')
      .eq('batch_id', batchId)
      .single();
    expect(data!.status).toBe('committed');
    expect(data!.approved_count).toBe(1);
    expect(data!.rejected_count).toBe(1);
  });
});
