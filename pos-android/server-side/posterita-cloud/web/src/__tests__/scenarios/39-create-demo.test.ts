import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SKIP_SCENARIOS, getSupabase, apiPost, testId, cleanupTestAccount } from './helpers';

const OWNER_EMAIL = `demo_${Date.now()}@test.posterita.com`;
const OWNER_PHONE = `+2305${Date.now().toString().slice(-7)}`;
let ownerId: number;
let demoAccountId: string;

describe.skipIf(SKIP_SCENARIOS)('Scenario: Create Demo Brand (/api/account/create-demo)', () => {
  beforeAll(async () => {
    const db = getSupabase();
    const { data: owner } = await db.from('owner').insert({
      name: 'Demo Test Owner',
      email: OWNER_EMAIL,
      phone: OWNER_PHONE,
      is_active: true,
    }).select().single();
    ownerId = owner!.id;
  }, 60000);

  afterAll(async () => {
    const db = getSupabase();
    if (demoAccountId) {
      try { await cleanupTestAccount(demoAccountId); } catch { /* best-effort */ }
    }
    if (ownerId) await db.from('owner').delete().eq('id', ownerId);
  }, 60000);

  it('creates a demo brand with seeded products', async () => {
    const res = await apiPost('/api/account/create-demo', {
      name: 'My Demo Store',
      currency: 'MUR',
      owner_email: OWNER_EMAIL,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.account_id).toBeTruthy();
    expect(body.store_id).toBeTruthy();
    expect(body.terminal_id).toBeTruthy();
    expect(body.product_count).toBe(15);
    demoAccountId = body.account_id;
  });

  it('demo account has correct type and status', async () => {
    const db = getSupabase();
    const { data } = await db.from('account')
      .select('type, status, currency, owner_id')
      .eq('account_id', demoAccountId)
      .single();
    expect(data!.type).toBe('demo');
    expect(data!.status).toBe('testing');
    expect(data!.currency).toBe('MUR');
    expect(data!.owner_id).toBe(ownerId);
  });

  it('demo has 15 products with categories', async () => {
    const db = getSupabase();
    const { data: products } = await db.from('product')
      .select('name, sellingprice, isactive')
      .eq('account_id', demoAccountId);
    expect(products!.length).toBe(15);
    expect(products!.every(p => p.isactive === 'Y')).toBe(true);

    const { data: categories } = await db.from('productcategory')
      .select('name')
      .eq('account_id', demoAccountId);
    expect(categories!.length).toBeGreaterThanOrEqual(3);
  });

  it('demo has taxes and a store with terminal', async () => {
    const db = getSupabase();
    const { data: taxes } = await db.from('tax')
      .select('name, rate')
      .eq('account_id', demoAccountId);
    expect(taxes!.length).toBeGreaterThanOrEqual(1);

    const { data: stores } = await db.from('store')
      .select('name')
      .eq('account_id', demoAccountId);
    expect(stores!.length).toBe(1);

    const { data: terminals } = await db.from('terminal')
      .select('name')
      .eq('account_id', demoAccountId);
    expect(terminals!.length).toBe(1);
  });

  it('rejects demo creation with invalid owner', async () => {
    const res = await apiPost('/api/account/create-demo', {
      name: 'Bad Demo',
      currency: 'MUR',
      owner_email: 'nonexistent@fake.com',
    });
    expect(res.status).toBe(400);
  });

  it('rejects demo creation with null email', async () => {
    const res = await apiPost('/api/account/create-demo', {
      name: 'Null Demo',
      currency: 'MUR',
      owner_email: 'null',
    });
    expect(res.status).toBe(400);
  });
});
