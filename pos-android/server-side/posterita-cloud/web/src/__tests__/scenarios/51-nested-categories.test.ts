import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SKIP_SCENARIOS, getSupabase, testId } from './helpers';

const ACCOUNT_ID = testId('nested_cat');
let mainCatId: number;
let subCatId: number;
let subSubCatId: number;
let leafOnlyCatId: number;
let productId: number;

describe.skipIf(SKIP_SCENARIOS)('Scenario: Nested Categories (3-level hierarchy)', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({
      account_id: ACCOUNT_ID, businessname: 'Nested Cat Test', type: 'testing', status: 'active', currency: 'MUR',
    });
  }, 30000);

  afterAll(async () => {
    const db = getSupabase();
    await db.from('product').delete().eq('account_id', ACCOUNT_ID);
    await db.from('productcategory').delete().eq('account_id', ACCOUNT_ID);
    await db.from('account').delete().eq('account_id', ACCOUNT_ID);
  }, 30000);

  // ── Creation ──────────────────────────────────────────

  it('creates a top-level (main) category with level 0', async () => {
    const db = getSupabase();
    const { data, error } = await db.from('productcategory').insert({
      account_id: ACCOUNT_ID, name: 'Electronics', isactive: 'Y', position: 1,
      parent_category_id: null, level: 0,
    }).select().single();
    expect(error).toBeNull();
    expect(data!.level).toBe(0);
    expect(data!.parent_category_id).toBeNull();
    mainCatId = data!.productcategory_id;
  });

  it('creates a sub-category (level 1) under main', async () => {
    const db = getSupabase();
    const { data, error } = await db.from('productcategory').insert({
      account_id: ACCOUNT_ID, name: 'Phones', isactive: 'Y', position: 1,
      parent_category_id: mainCatId, level: 1,
    }).select().single();
    expect(error).toBeNull();
    expect(data!.level).toBe(1);
    expect(data!.parent_category_id).toBe(mainCatId);
    subCatId = data!.productcategory_id;
  });

  it('creates a sub-sub-category (level 2) under sub', async () => {
    const db = getSupabase();
    const { data, error } = await db.from('productcategory').insert({
      account_id: ACCOUNT_ID, name: 'Smartphones', isactive: 'Y', position: 1,
      parent_category_id: subCatId, level: 2,
    }).select().single();
    expect(error).toBeNull();
    expect(data!.level).toBe(2);
    expect(data!.parent_category_id).toBe(subCatId);
    subSubCatId = data!.productcategory_id;
  });

  it('creates a standalone leaf category (no children)', async () => {
    const db = getSupabase();
    const { data, error } = await db.from('productcategory').insert({
      account_id: ACCOUNT_ID, name: 'Accessories', isactive: 'Y', position: 2,
      parent_category_id: null, level: 0,
    }).select().single();
    expect(error).toBeNull();
    leafOnlyCatId = data!.productcategory_id;
  });

  // ── Hierarchy queries ─────────────────────────────────

  it('queries all categories for account', async () => {
    const db = getSupabase();
    const { data } = await db.from('productcategory')
      .select('productcategory_id, name, parent_category_id, level')
      .eq('account_id', ACCOUNT_ID)
      .order('level')
      .order('name');
    expect(data!.length).toBe(4);
    // Level distribution
    expect(data!.filter(c => c.level === 0).length).toBe(2); // Electronics, Accessories
    expect(data!.filter(c => c.level === 1).length).toBe(1); // Phones
    expect(data!.filter(c => c.level === 2).length).toBe(1); // Smartphones
  });

  it('queries children of a parent', async () => {
    const db = getSupabase();
    const { data } = await db.from('productcategory')
      .select('name, level')
      .eq('account_id', ACCOUNT_ID)
      .eq('parent_category_id', mainCatId);
    expect(data!.length).toBe(1);
    expect(data![0].name).toBe('Phones');
  });

  it('queries grandchildren (sub-sub) of main via two hops', async () => {
    const db = getSupabase();
    // Get children of main
    const { data: children } = await db.from('productcategory')
      .select('productcategory_id')
      .eq('account_id', ACCOUNT_ID)
      .eq('parent_category_id', mainCatId);
    const childIds = children!.map(c => c.productcategory_id);
    expect(childIds.length).toBe(1);

    // Get grandchildren
    const { data: grandchildren } = await db.from('productcategory')
      .select('name, level')
      .eq('account_id', ACCOUNT_ID)
      .in('parent_category_id', childIds);
    expect(grandchildren!.length).toBe(1);
    expect(grandchildren![0].name).toBe('Smartphones');
    expect(grandchildren![0].level).toBe(2);
  });

  it('finds leaf categories (no children)', async () => {
    const db = getSupabase();
    // Get all categories
    const { data: all } = await db.from('productcategory')
      .select('productcategory_id, name')
      .eq('account_id', ACCOUNT_ID);
    // Get all parent_category_ids that are referenced
    const { data: withChildren } = await db.from('productcategory')
      .select('parent_category_id')
      .eq('account_id', ACCOUNT_ID)
      .not('parent_category_id', 'is', null);
    const parentIds = new Set(withChildren!.map(c => c.parent_category_id));
    const leaves = all!.filter(c => !parentIds.has(c.productcategory_id));
    expect(leaves.length).toBe(2); // Smartphones + Accessories
    expect(leaves.map(l => l.name).sort()).toEqual(['Accessories', 'Smartphones']);
  });

  // ── Product assignment ────────────────────────────────

  it('assigns a product to a leaf category', async () => {
    const db = getSupabase();
    const { data, error } = await db.from('product').insert({
      account_id: ACCOUNT_ID, name: 'iPhone 15', sellingprice: 45000,
      productcategory_id: subSubCatId, isactive: 'Y',
    }).select('product_id, productcategory_id').single();
    expect(error).toBeNull();
    expect(data!.productcategory_id).toBe(subSubCatId);
    productId = data!.product_id;
  });

  it('queries products in a specific leaf category', async () => {
    const db = getSupabase();
    const { data } = await db.from('product')
      .select('name')
      .eq('account_id', ACCOUNT_ID)
      .eq('productcategory_id', subSubCatId);
    expect(data!.length).toBe(1);
    expect(data![0].name).toBe('iPhone 15');
  });

  it('queries products across a subtree (parent + descendants)', async () => {
    const db = getSupabase();
    // Add product in sub-category too
    await db.from('product').insert({
      account_id: ACCOUNT_ID, name: 'Phone Case', sellingprice: 500,
      productcategory_id: subCatId, isactive: 'Y',
    });

    // Collect all descendant category IDs of Electronics (mainCatId)
    const subtreeIds = [mainCatId, subCatId, subSubCatId];
    const { data } = await db.from('product')
      .select('name')
      .eq('account_id', ACCOUNT_ID)
      .in('productcategory_id', subtreeIds)
      .order('name');
    expect(data!.length).toBe(2);
    expect(data!.map(p => p.name)).toEqual(['iPhone 15', 'Phone Case']);
  });

  // ── Updates & edge cases ──────────────────────────────

  it('moves a sub-category to a different parent', async () => {
    const db = getSupabase();
    // Move Phones under Accessories (leafOnlyCatId)
    const { error } = await db.from('productcategory')
      .update({ parent_category_id: leafOnlyCatId, level: 1 })
      .eq('productcategory_id', subCatId);
    expect(error).toBeNull();

    // Verify new parent
    const { data } = await db.from('productcategory')
      .select('parent_category_id')
      .eq('productcategory_id', subCatId)
      .single();
    expect(data!.parent_category_id).toBe(leafOnlyCatId);

    // Move it back
    await db.from('productcategory')
      .update({ parent_category_id: mainCatId, level: 1 })
      .eq('productcategory_id', subCatId);
  });

  it('soft-deletes a category and excludes from active queries', async () => {
    const db = getSupabase();
    // Soft-delete the standalone leaf
    await db.from('productcategory')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('productcategory_id', leafOnlyCatId);

    // Query active only (the /api/data proxy auto-filters is_deleted=false)
    const { data } = await db.from('productcategory')
      .select('name')
      .eq('account_id', ACCOUNT_ID)
      .eq('is_deleted', false);
    expect(data!.length).toBe(3); // Electronics, Phones, Smartphones (Accessories soft-deleted)
    expect(data!.some(c => c.name === 'Accessories')).toBe(false);

    // Restore for cleanup
    await db.from('productcategory')
      .update({ is_deleted: false, deleted_at: null })
      .eq('productcategory_id', leafOnlyCatId);
  });

  it('existing categories without parent default to level 0', async () => {
    const db = getSupabase();
    // Insert without specifying parent_category_id or level
    const { data, error } = await db.from('productcategory').insert({
      account_id: ACCOUNT_ID, name: 'Legacy Flat Category', isactive: 'Y',
    }).select('parent_category_id, level').single();
    expect(error).toBeNull();
    expect(data!.parent_category_id).toBeNull();
    expect(data!.level).toBe(0);
  });

  // ── Sync protocol ────────────────────────────────────

  it('sync pull returns parent_category_id and level', async () => {
    const db = getSupabase();
    const { data } = await db.from('productcategory')
      .select('*')
      .eq('account_id', ACCOUNT_ID)
      .eq('is_deleted', false)
      .order('level');

    // Verify all records have the new fields
    for (const cat of data!) {
      expect(cat).toHaveProperty('parent_category_id');
      expect(cat).toHaveProperty('level');
      expect(typeof cat.level).toBe('number');
    }
  });

  // ── Account isolation ─────────────────────────────────

  it('categories are scoped to account_id', async () => {
    const db = getSupabase();
    const OTHER_ACCOUNT = testId('nested_cat_other');
    // Insert with different account
    await db.from('account').insert({
      account_id: OTHER_ACCOUNT, businessname: 'Other Account', type: 'testing', status: 'active', currency: 'MUR',
    });
    await db.from('productcategory').insert({
      account_id: OTHER_ACCOUNT, name: 'Should Not See', isactive: 'Y', level: 0,
    });

    // Query original account — should not see the other account's category
    const { data } = await db.from('productcategory')
      .select('name')
      .eq('account_id', ACCOUNT_ID);
    expect(data!.every(c => c.name !== 'Should Not See')).toBe(true);

    // Cleanup other account
    await db.from('productcategory').delete().eq('account_id', OTHER_ACCOUNT);
    await db.from('account').delete().eq('account_id', OTHER_ACCOUNT);
  });
});
