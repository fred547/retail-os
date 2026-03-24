import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SKIP_SCENARIOS, getSupabase, apiPost, testId, testUuid, cleanupTestAccount } from './helpers';

const ACCOUNT_ID = testId('rest_ord');
const STORE_ID = 92000 + Math.floor(Math.random() * 9000);
const TERMINAL_ID = STORE_ID;
const ORDER_BASE = STORE_ID * 10;
let sectionId: number;
let takeawaySectionId: number;
let tableId: number;

describe.skipIf(SKIP_SCENARIOS)('Scenario: Restaurant Orders & Tables', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({ account_id: ACCOUNT_ID, businessname: 'Restaurant Orders', type: 'live', status: 'active', currency: 'MUR' });
    await db.from('store').insert({ store_id: STORE_ID, account_id: ACCOUNT_ID, name: 'Bistro', isactive: 'Y' });
    await db.from('terminal').insert({ terminal_id: TERMINAL_ID, account_id: ACCOUNT_ID, store_id: STORE_ID, name: 'Restaurant POS', isactive: 'Y', terminal_type: 'pos_restaurant' });

    // Create sections
    const { data: sections } = await db.from('table_section').insert([
      { account_id: ACCOUNT_ID, store_id: STORE_ID, name: 'Dining Room', display_order: 1, color: '#10B981', is_active: true, is_takeaway: false },
      { account_id: ACCOUNT_ID, store_id: STORE_ID, name: 'Takeaway', display_order: 2, color: '#F59E0B', is_active: true, is_takeaway: true },
    ]).select();
    sectionId = sections!.find(s => s.name === 'Dining Room')!.section_id;
    takeawaySectionId = sections!.find(s => s.name === 'Takeaway')!.section_id;

    // Create tables in dining room
    const { data: tables } = await db.from('restaurant_table').insert([
      { account_id: ACCOUNT_ID, store_id: STORE_ID, terminal_id: TERMINAL_ID, table_name: 'Table 1', seats: 4, section_id: sectionId },
      { account_id: ACCOUNT_ID, store_id: STORE_ID, terminal_id: TERMINAL_ID, table_name: 'Table 2', seats: 2, section_id: sectionId },
      { account_id: ACCOUNT_ID, store_id: STORE_ID, terminal_id: TERMINAL_ID, table_name: 'Table 3', seats: 6, section_id: sectionId },
    ]).select();
    tableId = tables![0].table_id;
  }, 30000);

  afterAll(async () => {
    try {
      const db = getSupabase();
      await db.from('restaurant_table').delete().eq('account_id', ACCOUNT_ID);
      await db.from('table_section').delete().eq('account_id', ACCOUNT_ID);
      await cleanupTestAccount(ACCOUNT_ID);
    } catch { /* best-effort */ }
  }, 30000);

  it('tables linked to section correctly', async () => {
    const db = getSupabase();
    const { data } = await db.from('restaurant_table')
      .select('*')
      .eq('section_id', sectionId);
    expect(data!.length).toBe(3);
    expect(data!.every(t => t.section_id === sectionId)).toBe(true);
  });

  it('marks table as occupied with order', async () => {
    const db = getSupabase();
    const orderId = ORDER_BASE + 1;
    // Place order on table
    await db.from('restaurant_table')
      .update({ is_occupied: true, current_order_id: String(orderId) })
      .eq('table_id', tableId);

    const { data } = await db.from('restaurant_table')
      .select('is_occupied, current_order_id')
      .eq('table_id', tableId)
      .single();
    expect(data!.is_occupied).toBe(true);
    expect(data!.current_order_id).toBe(String(orderId));
  });

  it('syncs dine-in order linked to table', async () => {
    const orderId = ORDER_BASE + 1;
    const res = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: '1970-01-01T00:00:00.000Z',
      orders: [{
        order_id: orderId,
        terminal_id: TERMINAL_ID,
        store_id: STORE_ID,
        document_no: 'DINE-001',
        grand_total: 850,
        subtotal: 739.13,
        tax_total: 110.87,
        qty_total: 3,
        is_paid: true,
        doc_status: 'CO',
        order_type: 'Dine-in',
        date_ordered: new Date().toISOString(),
        uuid: testUuid(),
      }],
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.orders_synced).toBeGreaterThanOrEqual(1);
  });

  it('clears table after order completion', async () => {
    const db = getSupabase();
    await db.from('restaurant_table')
      .update({ is_occupied: false, current_order_id: null })
      .eq('table_id', tableId);

    const { data } = await db.from('restaurant_table')
      .select('is_occupied, current_order_id')
      .eq('table_id', tableId)
      .single();
    expect(data!.is_occupied).toBe(false);
    expect(data!.current_order_id).toBeNull();
  });

  it('transfers table to different section', async () => {
    const db = getSupabase();
    // Move Table 1 from Dining Room to Takeaway
    await db.from('restaurant_table')
      .update({ section_id: takeawaySectionId })
      .eq('table_id', tableId);

    const { data: diningTables } = await db.from('restaurant_table')
      .select('*')
      .eq('section_id', sectionId);
    expect(diningTables!.length).toBe(2);

    const { data: takeawayTables } = await db.from('restaurant_table')
      .select('*')
      .eq('section_id', takeawaySectionId);
    expect(takeawayTables!.length).toBe(1);
    expect(takeawayTables![0].table_name).toBe('Table 1');
  });

  it('sync pulls table sections and restaurant tables', async () => {
    const res = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: '1970-01-01T00:00:00.000Z',
    });
    const body = await res.json();
    expect(body.table_sections?.length).toBe(2);
    expect(body.restaurant_tables?.length).toBe(3);
    const takeaway = body.table_sections?.find((s: any) => s.name === 'Takeaway');
    expect(takeaway?.is_takeaway).toBe(true);
  });

  it('takeaway section has is_takeaway flag', async () => {
    const db = getSupabase();
    const { data } = await db.from('table_section')
      .select('is_takeaway')
      .eq('section_id', takeawaySectionId)
      .single();
    expect(data!.is_takeaway).toBe(true);
  });
});
