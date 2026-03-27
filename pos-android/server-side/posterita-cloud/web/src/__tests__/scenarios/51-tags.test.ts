/**
 * Scenario 51: Tags — Grouped Product/Customer/Order Classification
 *
 * Tests the full tag lifecycle:
 * 1. Create tag groups (Season, Margin)
 * 2. Create tags within groups
 * 3. Assign tags to products
 * 4. Query tags by product
 * 5. Bulk assign/remove
 * 6. Duplicate rejection
 * 7. Soft-delete cascade (group → tags)
 * 8. Tag report endpoint
 */
import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { getSupabase, SKIP_SCENARIOS, apiGetAuth, apiPostAuth } from './helpers';

const PREFIX = `test_tags_${Date.now()}`;

describe.skipIf(SKIP_SCENARIOS)('Scenario 51: Tags', () => {
  let db: ReturnType<typeof getSupabase>;
  let accountId: string;
  let groupId1: number; // Season
  let groupId2: number; // Margin
  let tagSummer: number;
  let tagWinter: number;
  let tagHigh: number;
  let tagLow: number;
  let productId: number;

  beforeAll(async () => {
    db = getSupabase();
    // Create own test account + product (self-contained, no demo dependency)
    accountId = `test_tags_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await db.from('account').insert({
      account_id: accountId, businessname: 'Tags Test', type: 'testing', status: 'active', currency: 'MUR',
    });
    const { data: cat } = await db.from('productcategory').insert({
      account_id: accountId, name: 'Test Cat', isactive: 'Y',
    }).select('productcategory_id').single();
    const { data: prod } = await db.from('product').insert({
      account_id: accountId, name: 'Test Product', sellingprice: 100,
      productcategory_id: cat!.productcategory_id, isactive: 'Y',
    }).select('product_id').single();
    productId = prod!.product_id;
  }, 30000);

  afterAll(async () => {
    if (!accountId) return;
    // Clean up all test data
    await db.from('product_tag').delete().eq('account_id', accountId);
    await db.from('tag').delete().eq('account_id', accountId);
    await db.from('tag_group').delete().eq('account_id', accountId);
    await db.from('product').delete().eq('account_id', accountId);
    await db.from('productcategory').delete().eq('account_id', accountId);
    await db.from('account').delete().eq('account_id', accountId);
  }, 30000);

  // --- Group CRUD ---

  it('POST /api/tags/groups creates a group', async () => {
    const res = await apiPostAuth('/api/tags/groups', {
      name: `${PREFIX} Season`,
      description: 'Seasonal classification',
      color: '#F59E0B',
    }, accountId);
    expect(res.status).toBe(201);
    const json = await res.json();
    groupId1 = json.group.tag_group_id;
    expect(json.group.name).toContain('Season');
    expect(json.group.color).toBe('#F59E0B');
  });

  it('POST creates second group', async () => {
    const res = await apiPostAuth('/api/tags/groups', {
      name: `${PREFIX} Margin`,
      color: '#10B981',
    }, accountId);
    expect(res.status).toBe(201);
    groupId2 = (await res.json()).group.tag_group_id;
  });

  it('POST rejects duplicate group name', async () => {
    const res = await apiPostAuth('/api/tags/groups', {
      name: `${PREFIX} Season`,
    }, accountId);
    expect(res.status).toBe(409);
  });

  it('GET /api/tags/groups lists groups', async () => {
    const res = await apiGetAuth('/api/tags/groups', accountId);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.groups.length).toBeGreaterThanOrEqual(2);
  });

  // --- Tag CRUD ---

  it('POST /api/tags creates tags within group', async () => {
    const r1 = await apiPostAuth('/api/tags', { tag_group_id: groupId1, name: `${PREFIX} Summer` }, accountId);
    expect(r1.status).toBe(201);
    tagSummer = (await r1.json()).tag.tag_id;

    const r2 = await apiPostAuth('/api/tags', { tag_group_id: groupId1, name: `${PREFIX} Winter` }, accountId);
    expect(r2.status).toBe(201);
    tagWinter = (await r2.json()).tag.tag_id;

    const r3 = await apiPostAuth('/api/tags', { tag_group_id: groupId2, name: `${PREFIX} High` }, accountId);
    expect(r3.status).toBe(201);
    tagHigh = (await r3.json()).tag.tag_id;

    const r4 = await apiPostAuth('/api/tags', { tag_group_id: groupId2, name: `${PREFIX} Low` }, accountId);
    expect(r4.status).toBe(201);
    tagLow = (await r4.json()).tag.tag_id;
  });

  it('POST rejects duplicate tag name in same group', async () => {
    const res = await apiPostAuth('/api/tags', {
      tag_group_id: groupId1,
      name: `${PREFIX} Summer`,
    }, accountId);
    expect(res.status).toBe(409);
  });

  it('GET /api/tags lists tags filtered by group', async () => {
    const res = await apiGetAuth(`/api/tags?group_id=${groupId1}`, accountId);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.tags.length).toBe(2);
  });

  it('GET /api/tags/groups nests tags under groups', async () => {
    const res = await apiGetAuth('/api/tags/groups', accountId);
    const json = await res.json();
    const seasonGroup = json.groups.find((g: any) => g.tag_group_id === groupId1);
    expect(seasonGroup.tags.length).toBe(2);
  });

  // --- Tag Assignment ---

  it('POST /api/tags/assign assigns tags to product', async () => {
    const res = await apiPostAuth('/api/tags/assign', {
      entity_type: 'product',
      entity_ids: [productId],
      add_tag_ids: [tagSummer, tagHigh],
    }, accountId);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.added).toBe(2);
  });

  it('verify product_tag junction rows created', async () => {
    const { data } = await db.from('product_tag')
      .select('tag_id')
      .eq('product_id', productId)
      .eq('account_id', accountId);
    const tagIds = data!.map((r: any) => r.tag_id);
    expect(tagIds).toContain(tagSummer);
    expect(tagIds).toContain(tagHigh);
  });

  it('POST /api/tags/assign removes tags from product', async () => {
    const res = await apiPostAuth('/api/tags/assign', {
      entity_type: 'product',
      entity_ids: [productId],
      remove_tag_ids: [tagHigh],
    }, accountId);
    expect(res.status).toBe(200);
    expect((await res.json()).removed).toBe(1);
  });

  it('POST /api/tags/assign rejects invalid entity_type', async () => {
    const res = await apiPostAuth('/api/tags/assign', {
      entity_type: 'invalid',
      entity_ids: [1],
      add_tag_ids: [1],
    }, accountId);
    expect(res.status).toBe(400);
  });

  // --- Report ---

  it('GET /api/tags/report returns breakdown', async () => {
    const res = await apiGetAuth('/api/tags/report', accountId);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('breakdown');
    expect(json).toHaveProperty('summary');
  });

  // --- Soft Delete Cascade ---

  it('DELETE /api/tags/groups cascades to tags', async () => {
    // Delete group 2 (Margin → High, Low)
    const res = await fetch(`https://web.posterita.com/api/tags/groups/${groupId2}`, {
      method: 'DELETE',
      headers: { Cookie: `posterita_account_cache=${accountId}` },
    });
    expect(res.status).toBe(200);

    // Verify group is soft-deleted
    const { data: group } = await db.from('tag_group').select('is_deleted').eq('tag_group_id', groupId2).single();
    expect(group!.is_deleted).toBe(true);

    // Verify tags in group are soft-deleted
    const { data: tags } = await db.from('tag').select('is_deleted').in('tag_id', [tagHigh, tagLow]);
    for (const t of tags!) {
      expect(t.is_deleted).toBe(true);
    }
  });

  // --- PATCH ---

  it('PATCH /api/tags/groups updates group', async () => {
    const res = await fetch(`https://web.posterita.com/api/tags/groups/${groupId1}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: `posterita_account_cache=${accountId}` },
      body: JSON.stringify({ color: '#EF4444' }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.group.color).toBe('#EF4444');
  });
});
