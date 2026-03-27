import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SKIP_SCENARIOS, getSupabase, apiPostAuth, apiGetAuth, apiPatchAuth, testId, cleanupTestAccount } from './helpers';

const ACCOUNT_ID = testId('inv_api2');
const STORE_ID = 36000 + Math.floor(Math.random() * 9000);
const TERMINAL_ID = STORE_ID;
let sessionId: number;
let productAId: number;
let productBId: number;

describe.skipIf(SKIP_SCENARIOS)('Scenario: Inventory Sessions API (/api/inventory/sessions)', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({ account_id: ACCOUNT_ID, businessname: 'Inv API2 Test', type: 'testing', status: 'active', currency: 'MUR' });
    await db.from('store').insert({ store_id: STORE_ID, account_id: ACCOUNT_ID, name: 'API Warehouse', isactive: 'Y' });
    await db.from('terminal').insert({ terminal_id: TERMINAL_ID, account_id: ACCOUNT_ID, store_id: STORE_ID, name: 'Scanner', isactive: 'Y' });

    const { data: cat } = await db.from('productcategory').insert({
      account_id: ACCOUNT_ID, name: 'Inv Cat', isactive: 'Y', position: 1,
    }).select().single();

    const [pA, pB] = await Promise.all([
      db.from('product').insert({
        account_id: ACCOUNT_ID, name: 'Keyboard', sellingprice: 2000, upc: `KB-${STORE_ID}`,
        productcategory_id: cat!.productcategory_id, isactive: 'Y',
      }).select().single(),
      db.from('product').insert({
        account_id: ACCOUNT_ID, name: 'Monitor', sellingprice: 8000, upc: `MON-${STORE_ID}`,
        productcategory_id: cat!.productcategory_id, isactive: 'Y',
      }).select().single(),
    ]);
    productAId = pA.data!.product_id;
    productBId = pB.data!.product_id;
  }, 60000);

  afterAll(async () => {
    try { await cleanupTestAccount(ACCOUNT_ID); } catch { /* best-effort */ }
  }, 60000);

  // --- POST /api/inventory/sessions (create) ---

  it('creates a session via API', async () => {
    const res = await apiPostAuth('/api/inventory/sessions', {
      store_id: STORE_ID,
      type: 'spot_check',
      name: 'API Count',
      notes: 'Created via scenario test',
      created_by: 1,
    }, ACCOUNT_ID);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data?.session_id).toBeTruthy();
    expect(body.data?.status).toBe('created');
    sessionId = body.data.session_id;
  });

  // --- POST /api/inventory/sessions/[id]/entries (add entries) ---

  it('adds entries via API with upsert', async () => {
    const res = await apiPostAuth(`/api/inventory/sessions/${sessionId}/entries`, {
      entries: [
        { product_id: productAId, product_name: 'Keyboard', upc: `KB-${STORE_ID}`, quantity: 10, scanned_by: 1, terminal_id: TERMINAL_ID },
        { product_id: productBId, product_name: 'Monitor', upc: `MON-${STORE_ID}`, quantity: 3, scanned_by: 1, terminal_id: TERMINAL_ID },
      ],
    }, ACCOUNT_ID);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results?.length).toBe(2);
  });

  it('session auto-transitions to active on first entry', async () => {
    const db = getSupabase();
    const { data } = await db.from('inventory_count_session')
      .select('status, started_at')
      .eq('session_id', sessionId)
      .single();
    expect(data!.status).toBe('active');
    expect(data!.started_at).toBeTruthy();
  });

  it('re-scan increments quantity via upsert', async () => {
    const res = await apiPostAuth(`/api/inventory/sessions/${sessionId}/entries`, {
      entries: [
        { product_id: productAId, product_name: 'Keyboard', quantity: 5, scanned_by: 1, terminal_id: TERMINAL_ID },
      ],
    }, ACCOUNT_ID);
    expect(res.status).toBe(200);

    // Verify total is 10 + 5 = 15
    const db = getSupabase();
    const { data } = await db.from('inventory_count_entry')
      .select('quantity')
      .eq('session_id', sessionId)
      .eq('product_id', productAId)
      .single();
    expect(data!.quantity).toBe(15);
  });

  // --- GET /api/inventory/sessions/[id] (detail with aggregation) ---

  it('gets session detail with aggregated entries', async () => {
    const res = await apiGetAuth(`/api/inventory/sessions/${sessionId}`, ACCOUNT_ID);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data?.session_id).toBe(sessionId);
    expect(body.data?.unique_products).toBe(2);
    expect(body.data?.total_quantity).toBe(18); // 15 keyboards + 3 monitors
  });

  // --- PATCH /api/inventory/sessions/[id] (status transition) ---

  it('completes session via API', async () => {
    const res = await apiPatchAuth(`/api/inventory/sessions/${sessionId}`, {
      status: 'completed',
    }, ACCOUNT_ID);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data?.status).toBe('completed');
    expect(body.data?.completed_at).toBeTruthy();
  });

  it('rejects transition from completed to active', async () => {
    const res = await apiPatchAuth(`/api/inventory/sessions/${sessionId}`, {
      status: 'active',
    }, ACCOUNT_ID);
    expect(res.status).not.toBe(200);
  });

  // --- GET /api/inventory/sessions (list) ---

  it('lists sessions for store', async () => {
    const res = await apiGetAuth(`/api/inventory/sessions?store_id=${STORE_ID}`, ACCOUNT_ID);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data?.length).toBeGreaterThanOrEqual(1);
    expect(body.data?.some((s: any) => s.session_id === sessionId)).toBe(true);
  });
});
