import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SKIP_SCENARIOS, getSupabase, testId } from './helpers';

const ACCOUNT_ID = testId('rest_tbl');
let storeId: number;
let sectionIndoorId: number;
let sectionTakeawayId: number;

describe.skipIf(SKIP_SCENARIOS)('Scenario: Restaurant Tables & Sections', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({
      account_id: ACCOUNT_ID, businessname: 'Table Test Restaurant', type: 'live', status: 'active', currency: 'MUR',
    });
    const { data: store } = await db.from('store').insert({
      account_id: ACCOUNT_ID, name: 'Main Floor', city: 'Port Louis', country: 'MU', currency: 'MUR', isactive: 'Y',
    }).select('store_id').single();
    storeId = store!.store_id;
  }, 30000);

  afterAll(async () => {
    const db = getSupabase();
    await db.from('restaurant_table').delete().eq('account_id', ACCOUNT_ID);
    await db.from('table_section').delete().eq('account_id', ACCOUNT_ID);
    await db.from('store').delete().eq('account_id', ACCOUNT_ID);
    await db.from('account').delete().eq('account_id', ACCOUNT_ID);
  }, 30000);

  it('creates table sections with display order', async () => {
    const db = getSupabase();
    const { data, error } = await db.from('table_section').insert([
      { account_id: ACCOUNT_ID, store_id: storeId, name: 'Indoor', display_order: 1, color: '#4CAF50', is_active: true, is_takeaway: false },
      { account_id: ACCOUNT_ID, store_id: storeId, name: 'Patio', display_order: 2, color: '#FF9800', is_active: true, is_takeaway: false },
      { account_id: ACCOUNT_ID, store_id: storeId, name: 'Takeaway', display_order: 3, color: '#9E9E9E', is_active: true, is_takeaway: true },
    ]).select();
    expect(error).toBeNull();
    expect(data!.length).toBe(3);
    sectionIndoorId = data!.find(s => s.name === 'Indoor')!.section_id;
    sectionTakeawayId = data!.find(s => s.name === 'Takeaway')!.section_id;
  });

  it('creates tables assigned to sections', async () => {
    const db = getSupabase();
    const { data, error } = await db.from('restaurant_table').insert([
      { account_id: ACCOUNT_ID, store_id: storeId, table_name: 'Table 1', seats: 4, is_occupied: false, section_id: sectionIndoorId },
      { account_id: ACCOUNT_ID, store_id: storeId, table_name: 'Table 2', seats: 2, is_occupied: false, section_id: sectionIndoorId },
      { account_id: ACCOUNT_ID, store_id: storeId, table_name: 'Counter', seats: 6, is_occupied: false, section_id: sectionIndoorId },
    ]).select();
    expect(error).toBeNull();
    expect(data!.length).toBe(3);
  });

  it('queries tables filtered by section', async () => {
    const db = getSupabase();
    const { data } = await db.from('restaurant_table')
      .select('table_name, seats')
      .eq('account_id', ACCOUNT_ID)
      .eq('section_id', sectionIndoorId);
    expect(data!.length).toBe(3);
    expect(data!.some(t => t.table_name === 'Counter')).toBe(true);
  });

  it('marks table as occupied', async () => {
    const db = getSupabase();
    const { data: tables } = await db.from('restaurant_table')
      .select('table_id')
      .eq('account_id', ACCOUNT_ID)
      .eq('table_name', 'Table 1')
      .single();
    const { error } = await db.from('restaurant_table')
      .update({ is_occupied: true })
      .eq('table_id', tables!.table_id);
    expect(error).toBeNull();

    const { data: updated } = await db.from('restaurant_table')
      .select('is_occupied')
      .eq('table_id', tables!.table_id)
      .single();
    expect(updated!.is_occupied).toBe(true);
  });

  it('takeaway section flag is preserved', async () => {
    const db = getSupabase();
    const { data } = await db.from('table_section')
      .select('name, is_takeaway')
      .eq('account_id', ACCOUNT_ID)
      .eq('is_takeaway', true);
    expect(data!.length).toBe(1);
    expect(data![0].name).toBe('Takeaway');
  });

  it('sections scoped to account', async () => {
    const db = getSupabase();
    const { data } = await db.from('table_section')
      .select('*')
      .eq('account_id', 'nonexistent_rest_xyz');
    expect(data!.length).toBe(0);
  });
});
