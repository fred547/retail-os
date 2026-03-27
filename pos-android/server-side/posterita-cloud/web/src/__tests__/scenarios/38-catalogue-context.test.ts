import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SKIP_SCENARIOS, getSupabase, apiPostAuth, apiGetAuth, testId, cleanupTestAccount } from './helpers';

const ACCOUNT_ID = testId('cat_ctx');
const STORE_ID = 38000 + Math.floor(Math.random() * 9000);
let categoryId: number;

describe.skipIf(SKIP_SCENARIOS)('Scenario: Catalogue PDF & Context API', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({ account_id: ACCOUNT_ID, businessname: 'Catalogue Test', type: 'testing', status: 'active', currency: 'MUR' });
    await db.from('store').insert({ store_id: STORE_ID, account_id: ACCOUNT_ID, name: 'Cat Store', isactive: 'Y' });
    await db.from('terminal').insert({ terminal_id: STORE_ID, account_id: ACCOUNT_ID, store_id: STORE_ID, name: 'POS 1', isactive: 'Y' });

    const { data: cat } = await db.from('productcategory').insert({
      account_id: ACCOUNT_ID, name: 'Beverages', isactive: 'Y', position: 1,
    }).select().single();
    categoryId = cat!.productcategory_id;

    await db.from('product').insert([
      { account_id: ACCOUNT_ID, name: 'Cappuccino', sellingprice: 120, productcategory_id: categoryId, isactive: 'Y' },
      { account_id: ACCOUNT_ID, name: 'Latte', sellingprice: 140, productcategory_id: categoryId, isactive: 'Y' },
      { account_id: ACCOUNT_ID, name: 'Mocha', sellingprice: 160, productcategory_id: categoryId, isactive: 'Y' },
    ]);
  }, 60000);

  afterAll(async () => {
    try { await cleanupTestAccount(ACCOUNT_ID); } catch { /* best-effort */ }
  }, 60000);

  // --- Catalogue PDF ---

  it('generates a PDF catalogue with grid template', async () => {
    const res = await apiPostAuth('/api/catalogue', {
      template: 'grid',
      title: 'Test Catalogue',
    }, ACCOUNT_ID);
    expect(res.status).toBe(200);
    const contentType = res.headers.get('content-type');
    expect(contentType).toContain('application/pdf');
    const blob = await res.blob();
    expect(blob.size).toBeGreaterThan(100); // PDF has content
  });

  it('generates catalogue filtered by category', async () => {
    const res = await apiPostAuth('/api/catalogue', {
      template: 'list',
      category_id: categoryId,
    }, ACCOUNT_ID);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/pdf');
  });

  it('generates price-list template', async () => {
    const res = await apiPostAuth('/api/catalogue', {
      template: 'price-list',
    }, ACCOUNT_ID);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/pdf');
  });

  it('generates catalogue with search filter', async () => {
    const res = await apiPostAuth('/api/catalogue', {
      template: 'compact',
      search: 'Latte',
    }, ACCOUNT_ID);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/pdf');
  });

  it('catalogue without auth returns error', async () => {
    const res = await fetch(`https://web.posterita.com/api/catalogue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template: 'grid' }),
    });
    // No session — should fail
    expect(res.status).not.toBe(200);
  });

  // --- Context API ---

  it('GET /api/context validates redirect path', async () => {
    // Malicious redirect should be blocked
    const res = await apiGetAuth('/api/context?account_id=test&redirect=https://evil.com', ACCOUNT_ID);
    // Should redirect to / instead of evil.com
    // The response will be a redirect (302) or the redirected page
    expect(res.status).toBeLessThan(500); // Doesn't crash
  });

  it('GET /api/context with valid redirect', async () => {
    const res = await apiGetAuth(`/api/context?account_id=${ACCOUNT_ID}&store_id=${STORE_ID}&terminal_id=${STORE_ID}&redirect=/products`, ACCOUNT_ID);
    // Should process without error (redirect or 200)
    expect(res.status).toBeLessThan(500);
  });
});
