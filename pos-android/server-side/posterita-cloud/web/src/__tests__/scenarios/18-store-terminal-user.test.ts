import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SKIP_SCENARIOS, getSupabase, testId } from './helpers';

const ACCOUNT_ID = testId('stu_hier');
let storeId: number;
let terminalId: number;

describe.skipIf(SKIP_SCENARIOS)('Scenario: Store → Terminal → User Hierarchy', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({
      account_id: ACCOUNT_ID, businessname: 'Hierarchy Test', type: 'testing', status: 'active', currency: 'USD',
    });
  }, 30000);

  afterAll(async () => {
    const db = getSupabase();
    await db.from('pos_user').delete().eq('account_id', ACCOUNT_ID);
    await db.from('terminal').delete().eq('account_id', ACCOUNT_ID);
    await db.from('store').delete().eq('account_id', ACCOUNT_ID);
    await db.from('account').delete().eq('account_id', ACCOUNT_ID);
  }, 30000);

  it('creates a store with full details', async () => {
    const db = getSupabase();
    const { data, error } = await db.from('store').insert({
      account_id: ACCOUNT_ID,
      name: 'Downtown Store',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      country: 'US',
      currency: 'USD',
      isactive: 'Y',
    }).select().single();
    expect(error).toBeNull();
    expect(data.name).toBe('Downtown Store');
    expect(data.store_id).toBeDefined();
    storeId = data.store_id;
  });

  it('creates terminals with different types', async () => {
    const db = getSupabase();
    const { data, error } = await db.from('terminal').insert([
      { account_id: ACCOUNT_ID, store_id: storeId, name: 'Register 1', prefix: 'R1', terminal_type: 'pos_retail', isactive: 'Y' },
      { account_id: ACCOUNT_ID, store_id: storeId, name: 'Kitchen Display', prefix: 'KD', terminal_type: 'kds', isactive: 'Y' },
      { account_id: ACCOUNT_ID, store_id: storeId, name: 'Restaurant POS', prefix: 'RP', terminal_type: 'pos_restaurant', isactive: 'Y' },
    ]).select();
    expect(error).toBeNull();
    expect(data!.length).toBe(3);
    terminalId = data!.find(t => t.name === 'Register 1')!.terminal_id;
  });

  it('creates users with different roles', async () => {
    const db = getSupabase();
    // CHECK constraint: role must be 'OWNER', 'ADMIN', or 'STAFF'
    const { data, error } = await db.from('pos_user').insert([
      { account_id: ACCOUNT_ID, username: 'owner1', firstname: 'Jane', role: 'OWNER', pin: '1234', email: `owner_${Date.now()}@test.com` },
      { account_id: ACCOUNT_ID, username: 'cashier1', firstname: 'Bob', role: 'STAFF', pin: '5678' },
      { account_id: ACCOUNT_ID, username: 'admin1', firstname: 'Sue', role: 'ADMIN', pin: '9012' },
    ]).select();
    expect(error).toBeNull();
    expect(data!.length).toBe(3);
  });

  it('terminal types are queryable', async () => {
    const db = getSupabase();
    const { data } = await db.from('terminal')
      .select('name, terminal_type')
      .eq('account_id', ACCOUNT_ID)
      .eq('terminal_type', 'kds');
    expect(data!.length).toBe(1);
    expect(data![0].name).toBe('Kitchen Display');
  });

  it('user roles are distinct', async () => {
    const db = getSupabase();
    const { data } = await db.from('pos_user')
      .select('username, role')
      .eq('account_id', ACCOUNT_ID);
    const roles = data!.map(u => u.role);
    expect(roles).toContain('OWNER');
    expect(roles).toContain('STAFF');
    expect(roles).toContain('ADMIN');
  });

  it('store deactivation preserves terminals', async () => {
    const db = getSupabase();
    await db.from('store').update({ isactive: 'N' }).eq('store_id', storeId);

    const { data: terminals } = await db.from('terminal')
      .select('isactive')
      .eq('store_id', storeId);
    // Terminals should still exist even when store is inactive
    expect(terminals!.length).toBe(3);
    expect(terminals!.every(t => t.isactive === 'Y')).toBe(true);
  });
});
