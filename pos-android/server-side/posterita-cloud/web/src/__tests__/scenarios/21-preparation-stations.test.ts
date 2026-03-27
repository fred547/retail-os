import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SKIP_SCENARIOS, getSupabase, apiPost, testId, cleanupTestAccount } from './helpers';

const ACCOUNT_ID = testId('kitchen');
const STORE_ID = 91000 + Math.floor(Math.random() * 9000);
const TERMINAL_ID = STORE_ID;
let kitchenStationId: number;
let barStationId: number;
let dessertStationId: number;
let foodCategoryId: number;
let drinksCategoryId: number;
let dessertCategoryId: number;
let burgerProductId: number;

describe.skipIf(SKIP_SCENARIOS)('Scenario: Preparation Stations & Routing', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({ account_id: ACCOUNT_ID, businessname: 'Kitchen Test', type: 'testing', status: 'active', currency: 'MUR' });
    await db.from('store').insert({ store_id: STORE_ID, account_id: ACCOUNT_ID, name: 'Restaurant', isactive: 'Y' });
    await db.from('terminal').insert({ terminal_id: TERMINAL_ID, account_id: ACCOUNT_ID, store_id: STORE_ID, name: 'POS 1', isactive: 'Y', terminal_type: 'pos_restaurant' });

    // Create 3 categories
    const { data: cats } = await db.from('productcategory').insert([
      { account_id: ACCOUNT_ID, name: 'Food', isactive: 'Y', position: 1 },
      { account_id: ACCOUNT_ID, name: 'Drinks', isactive: 'Y', position: 2 },
      { account_id: ACCOUNT_ID, name: 'Desserts', isactive: 'Y', position: 3 },
    ]).select();
    foodCategoryId = cats!.find(c => c.name === 'Food')!.productcategory_id;
    drinksCategoryId = cats!.find(c => c.name === 'Drinks')!.productcategory_id;
    dessertCategoryId = cats!.find(c => c.name === 'Desserts')!.productcategory_id;
  }, 30000);

  afterAll(async () => {
    try { await cleanupTestAccount(ACCOUNT_ID); } catch { /* best-effort */ }
  }, 30000);

  it('creates preparation stations with different types', async () => {
    const db = getSupabase();
    const { data, error } = await db.from('preparation_station').insert([
      { account_id: ACCOUNT_ID, store_id: STORE_ID, name: 'Grill Station', station_type: 'kitchen', color: '#EF4444', display_order: 1, is_active: true },
      { account_id: ACCOUNT_ID, store_id: STORE_ID, name: 'Bar', station_type: 'bar', color: '#3B82F6', display_order: 2, is_active: true },
      { account_id: ACCOUNT_ID, store_id: STORE_ID, name: 'Pastry Corner', station_type: 'dessert', color: '#F59E0B', display_order: 3, is_active: true },
    ]).select();
    expect(error).toBeNull();
    expect(data!.length).toBe(3);
    kitchenStationId = data!.find(s => s.name === 'Grill Station')!.station_id;
    barStationId = data!.find(s => s.name === 'Bar')!.station_id;
    dessertStationId = data!.find(s => s.name === 'Pastry Corner')!.station_id;
  });

  it('maps categories to stations', async () => {
    const db = getSupabase();
    const { data, error } = await db.from('category_station_mapping').insert([
      { account_id: ACCOUNT_ID, category_id: foodCategoryId, station_id: kitchenStationId },
      { account_id: ACCOUNT_ID, category_id: drinksCategoryId, station_id: barStationId },
      { account_id: ACCOUNT_ID, category_id: dessertCategoryId, station_id: dessertStationId },
    ]).select();
    expect(error).toBeNull();
    expect(data!.length).toBe(3);
  });

  it('queries mappings by station', async () => {
    const db = getSupabase();
    const { data } = await db.from('category_station_mapping')
      .select('*')
      .eq('account_id', ACCOUNT_ID)
      .eq('station_id', kitchenStationId);
    expect(data!.length).toBe(1);
    expect(data![0].category_id).toBe(foodCategoryId);
  });

  it('product can override station assignment', async () => {
    const db = getSupabase();
    // Create a food product that goes to bar instead of kitchen
    const { data, error } = await db.from('product').insert({
      account_id: ACCOUNT_ID, name: 'Burger with Beer', sellingprice: 350,
      productcategory_id: foodCategoryId, isactive: 'Y',
      station_override_id: barStationId,
    }).select().single();
    expect(error).toBeNull();
    expect(data.station_override_id).toBe(barStationId);
    burgerProductId = data.product_id;
  });

  it('station override takes priority over category mapping', async () => {
    const db = getSupabase();
    // The product's category maps to kitchen, but override sends it to bar
    const { data: product } = await db.from('product')
      .select('station_override_id, productcategory_id')
      .eq('product_id', burgerProductId)
      .single();
    const { data: mapping } = await db.from('category_station_mapping')
      .select('station_id')
      .eq('category_id', product!.productcategory_id)
      .eq('account_id', ACCOUNT_ID)
      .single();
    // Category maps to kitchen
    expect(mapping!.station_id).toBe(kitchenStationId);
    // But product override points to bar
    expect(product!.station_override_id).toBe(barStationId);
    // Override should take priority (resolved client-side by StationResolver)
    expect(product!.station_override_id).not.toBe(mapping!.station_id);
  });

  it('sync pulls stations for store', async () => {
    const res = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: '1970-01-01T00:00:00.000Z',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.preparation_stations?.length).toBe(3);
    const stationNames = body.preparation_stations.map((s: any) => s.name);
    expect(stationNames).toContain('Grill Station');
    expect(stationNames).toContain('Bar');
    expect(stationNames).toContain('Pastry Corner');
  });

  it('sync pulls category-station mappings', async () => {
    const res = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: '1970-01-01T00:00:00.000Z',
    });
    const body = await res.json();
    expect(body.category_station_mappings?.length).toBe(3);
  });

  it('deactivated station excluded from active queries', async () => {
    const db = getSupabase();
    await db.from('preparation_station')
      .update({ is_active: false })
      .eq('station_id', dessertStationId);

    const { data } = await db.from('preparation_station')
      .select('*')
      .eq('account_id', ACCOUNT_ID)
      .eq('is_active', true);
    expect(data!.length).toBe(2);
    expect(data!.find(s => s.name === 'Pastry Corner')).toBeUndefined();
  });

  it('stations scoped to account — other accounts see nothing', async () => {
    const db = getSupabase();
    const { data } = await db.from('preparation_station')
      .select('*')
      .eq('account_id', 'nonexistent_account');
    expect(data?.length).toBe(0);
  });
});
