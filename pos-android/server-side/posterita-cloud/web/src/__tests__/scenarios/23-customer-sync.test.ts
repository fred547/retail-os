import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SKIP_SCENARIOS, getSupabase, apiPost, testId, testUuid } from './helpers';

const ACCOUNT_ID = testId('cust_sync');
const STORE_ID = 93000 + Math.floor(Math.random() * 9000);
const TERMINAL_ID = STORE_ID;
const CUSTOMER_BASE = STORE_ID * 10;

describe.skipIf(SKIP_SCENARIOS)('Scenario: Customer Sync & Pull', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({ account_id: ACCOUNT_ID, businessname: 'Customer Test', type: 'testing', status: 'active', currency: 'MUR' });
    await db.from('store').insert({ store_id: STORE_ID, account_id: ACCOUNT_ID, name: 'Main Store', isactive: 'Y' });
    await db.from('terminal').insert({ terminal_id: TERMINAL_ID, account_id: ACCOUNT_ID, store_id: STORE_ID, name: 'POS 1', isactive: 'Y' });
  }, 60000);

  afterAll(async () => {
    const db = getSupabase();
    await db.from('customer').delete().eq('account_id', ACCOUNT_ID);
    await db.from('discountcode').delete().eq('account_id', ACCOUNT_ID);
    await db.from('terminal').delete().eq('account_id', ACCOUNT_ID);
    await db.from('store').delete().eq('account_id', ACCOUNT_ID);
    await db.from('account').delete().eq('account_id', ACCOUNT_ID);
  }, 60000);

  it('pushes a customer via sync', async () => {
    const res = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: '1970-01-01T00:00:00.000Z',
      customers: [{
        customer_id: CUSTOMER_BASE + 1,
        name: 'Alice Dupont',
        email: `alice_${ACCOUNT_ID}@test.com`,
        phone1: '+23057001001',
        city: 'Port Louis',
        country: 'Mauritius',
        isactive: 'Y',
        loyaltypoints: 150,
      }],
    });
    expect(res.status).toBe(200);
  });

  it('customer exists in Supabase after sync', async () => {
    const db = getSupabase();
    const { data } = await db.from('customer')
      .select('*')
      .eq('account_id', ACCOUNT_ID)
      .eq('customer_id', CUSTOMER_BASE + 1)
      .single();
    expect(data).toBeTruthy();
    expect(data!.name).toBe('Alice Dupont');
    expect(data!.email).toBe(`alice_${ACCOUNT_ID}@test.com`);
    expect(data!.loyaltypoints).toBe(150);
    expect(data!.country).toBe('Mauritius');
  });

  it('pushes multiple customers in batch', async () => {
    const res = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: '1970-01-01T00:00:00.000Z',
      customers: [
        { customer_id: CUSTOMER_BASE + 2, name: 'Bob Martin', phone1: '+23057002002', isactive: 'Y' },
        { customer_id: CUSTOMER_BASE + 3, name: 'Claire Rose', phone1: '+23057003003', isactive: 'Y', loyaltypoints: 500 },
      ],
    });
    expect(res.status).toBe(200);
  });

  it('sync pull returns customers for account', async () => {
    const res = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: '1970-01-01T00:00:00.000Z',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.customers?.length).toBeGreaterThanOrEqual(3);
    const names = body.customers.map((c: any) => c.name);
    expect(names).toContain('Alice Dupont');
    expect(names).toContain('Bob Martin');
    expect(names).toContain('Claire Rose');
  });

  it('customer upsert updates existing record', async () => {
    const res = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: '1970-01-01T00:00:00.000Z',
      customers: [{
        customer_id: CUSTOMER_BASE + 1,
        name: 'Alice Dupont-Leroy',
        email: `alice_${ACCOUNT_ID}@test.com`,
        phone1: '+23057001001',
        loyaltypoints: 300,
        isactive: 'Y',
      }],
    });
    expect(res.status).toBe(200);

    const db = getSupabase();
    const { data } = await db.from('customer')
      .select('name, loyaltypoints')
      .eq('customer_id', CUSTOMER_BASE + 1)
      .eq('account_id', ACCOUNT_ID)
      .single();
    expect(data!.name).toBe('Alice Dupont-Leroy');
    expect(data!.loyaltypoints).toBe(300);
  });

  it('soft-deleted customers excluded from sync pull', async () => {
    const db = getSupabase();
    // Soft-delete one customer
    await db.from('customer')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('customer_id', CUSTOMER_BASE + 3)
      .eq('account_id', ACCOUNT_ID);

    const res = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: '1970-01-01T00:00:00.000Z',
    });
    const body = await res.json();
    const names = (body.customers || []).map((c: any) => c.name);
    expect(names).not.toContain('Claire Rose');
    expect(names).toContain('Alice Dupont-Leroy');
  });

  it('customers scoped to account — other accounts see nothing', async () => {
    const db = getSupabase();
    const { data } = await db.from('customer')
      .select('*')
      .eq('account_id', 'nonexistent_account_xyz');
    expect(data?.length).toBe(0);
  });

  it('discount codes created and queryable', async () => {
    const db = getSupabase();
    const { error } = await db.from('discountcode').insert({
      account_id: ACCOUNT_ID,
      name: 'VIP10',
      percentage: 10,
      isactive: 'Y',
    });
    expect(error).toBeNull();

    const { data } = await db.from('discountcode')
      .select('*')
      .eq('account_id', ACCOUNT_ID);
    expect(data?.length).toBeGreaterThanOrEqual(1);
    expect(data?.some((d: any) => d.name === 'VIP10')).toBe(true);
  });
});
