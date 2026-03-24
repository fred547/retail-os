import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SKIP_SCENARIOS, getSupabase, apiPost, testId, testUuid, cleanupTestAccount } from './helpers';

const ACCOUNT_ID = testId('till_recon');
const STORE_ID = 50000 + Math.floor(Math.random() * 9000);
const TERMINAL_ID = STORE_ID;
const TILL_ID = STORE_ID;
const TILL_UUID = testUuid();

describe.skipIf(SKIP_SCENARIOS)('Scenario: Till Reconciliation', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({ account_id: ACCOUNT_ID, businessname: 'Till Test', type: 'live', status: 'active', currency: 'MUR' });
    await db.from('store').insert({ store_id: STORE_ID, account_id: ACCOUNT_ID, name: 'Till Store', isactive: 'Y' });
    await db.from('terminal').insert({ terminal_id: TERMINAL_ID, account_id: ACCOUNT_ID, store_id: STORE_ID, name: 'POS 1', isactive: 'Y' });
  }, 30000);

  afterAll(async () => {
    try { await cleanupTestAccount(ACCOUNT_ID); } catch { /* best-effort */ }
  }, 30000);

  it('syncs an open till', async () => {
    const res = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: '1970-01-01T00:00:00.000Z',
      tills: [{
        till_id: TILL_ID,
        terminal_id: TERMINAL_ID,
        store_id: STORE_ID,
        opening_amt: 500,
        date_opened: new Date().toISOString(),
        document_no: 'TILL-001',
        uuid: TILL_UUID,
        open_by: 1,
      }],
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tills_synced).toBeGreaterThanOrEqual(1);
  });

  it('till record exists in Supabase', async () => {
    const db = getSupabase();
    const { data } = await db.from('till').select('*').eq('account_id', ACCOUNT_ID);
    expect(data?.length).toBeGreaterThanOrEqual(1);
    expect(data![0].opening_amt).toBe(500);
  });

  it('syncs orders then closes till with reconciliation', async () => {
    // Push 2 cash orders
    await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: '1970-01-01T00:00:00.000Z',
      orders: [
        { order_id: STORE_ID + 1, terminal_id: TERMINAL_ID, store_id: STORE_ID, till_id: TILL_ID, grand_total: 300, subtotal: 260.87, tax_total: 39.13, qty_total: 2, is_paid: true, doc_status: 'CO', order_type: 'Sale', date_ordered: new Date().toISOString(), uuid: testUuid() },
        { order_id: STORE_ID + 2, terminal_id: TERMINAL_ID, store_id: STORE_ID, till_id: TILL_ID, grand_total: 200, subtotal: 173.91, tax_total: 26.09, qty_total: 1, is_paid: true, doc_status: 'CO', order_type: 'Sale', date_ordered: new Date().toISOString(), uuid: testUuid() },
      ],
    });

    // Close the till (upsert with same till_id)
    const res = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: '1970-01-01T00:00:00.000Z',
      tills: [{
        till_id: TILL_ID,
        terminal_id: TERMINAL_ID,
        store_id: STORE_ID,
        opening_amt: 500,
        closing_amt: 1000,
        cash_amt: 1000,
        card_amt: 0,
        date_opened: new Date(Date.now() - 3600000).toISOString(),
        date_closed: new Date().toISOString(),
        document_no: 'TILL-001',
        uuid: TILL_UUID,
        open_by: 1,
        close_by: 1,
        subtotal: 434.78,
        tax_total: 65.22,
        grand_total: 500,
      }],
    });
    expect(res.status).toBe(200);
  }, 120000);

  it('till shows correct totals after close', async () => {
    const db = getSupabase();
    const { data } = await db.from('till').select('*').eq('account_id', ACCOUNT_ID).order('till_id', { ascending: false }).limit(1);
    expect(data?.length).toBe(1);
    const till = data![0];
    expect(till.opening_amt).toBe(500);
    expect(till.closing_amt).toBe(1000);
  });
});
