import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getSupabase, apiPost, apiGet, testId } from './helpers';

const ACCOUNT_ID = testId('enroll');
const STORE_ID = 80000 + Math.floor(Math.random() * 9000);
const TERMINAL_ID = STORE_ID;

describe('Scenario: Device Enrollment', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({ account_id: ACCOUNT_ID, businessname: 'Enroll Test', type: 'live', status: 'active', currency: 'MUR' });
    await db.from('store').insert({ store_id: STORE_ID, account_id: ACCOUNT_ID, name: 'Enroll Store', isactive: 'Y' });
    await db.from('terminal').insert({ terminal_id: TERMINAL_ID, account_id: ACCOUNT_ID, store_id: STORE_ID, name: 'POS 1', isactive: 'Y' });
    await db.from('pos_user').insert({
      account_id: ACCOUNT_ID, username: 'enroll_user', firstname: 'Test', lastname: 'User',
      pin: '1234', role: 'STAFF', isactive: 'Y', isadmin: 'N', issalesrep: 'Y',
    });
    // Add a product so enrollment has data to return
    const { data: cat } = await db.from('productcategory').insert({
      account_id: ACCOUNT_ID, name: 'Enroll Cat', isactive: 'Y', position: 1,
    }).select().single();
    await db.from('product').insert({
      account_id: ACCOUNT_ID, name: 'Enroll Product', sellingprice: 100,
      productcategory_id: cat!.productcategory_id, isactive: 'Y', product_status: 'live',
    });
    await db.from('tax').insert({ account_id: ACCOUNT_ID, name: 'VAT 15%', rate: 15, isactive: 'Y' });
  });

  afterAll(async () => {
    const db = getSupabase();
    await db.from('product').delete().eq('account_id', ACCOUNT_ID);
    await db.from('productcategory').delete().eq('account_id', ACCOUNT_ID);
    await db.from('tax').delete().eq('account_id', ACCOUNT_ID);
    await db.from('pos_user').delete().eq('account_id', ACCOUNT_ID);
    await db.from('terminal').delete().eq('account_id', ACCOUNT_ID);
    await db.from('store').delete().eq('account_id', ACCOUNT_ID);
    await db.from('account').delete().eq('account_id', ACCOUNT_ID);
  });

  it('enroll health check returns ok', async () => {
    const res = await apiGet('/api/enroll');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('posterita-device-enrollment');
  });

  it('enrolls a device with valid context', async () => {
    const res = await apiPost('/api/enroll', {
      account_id: ACCOUNT_ID,
      store_id: STORE_ID,
      terminal_id: TERMINAL_ID,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.account).toBeTruthy();
    expect(body.enrolled_store).toBeTruthy();
    expect(body.enrolled_terminal).toBeTruthy();
    expect(body.stores?.length).toBeGreaterThanOrEqual(1);
    expect(body.terminals?.length).toBeGreaterThanOrEqual(1);
    expect(body.users?.length).toBeGreaterThanOrEqual(1);
    expect(body.taxes?.length).toBeGreaterThanOrEqual(1);
    expect(body.sync_secret).toBeTruthy();
    expect(body.server_time).toBeTruthy();
  });

  it('enrollment returns products for the account', async () => {
    const res = await apiPost('/api/enroll', {
      account_id: ACCOUNT_ID,
      store_id: STORE_ID,
      terminal_id: TERMINAL_ID,
    });
    const body = await res.json();
    expect(body.products?.length).toBeGreaterThanOrEqual(1);
    expect(body.products?.some((p: any) => p.name === 'Enroll Product')).toBe(true);
  });

  it('enrollment returns categories', async () => {
    const res = await apiPost('/api/enroll', {
      account_id: ACCOUNT_ID,
      store_id: STORE_ID,
      terminal_id: TERMINAL_ID,
    });
    const body = await res.json();
    expect(body.categories?.length).toBeGreaterThanOrEqual(1);
    expect(body.categories?.some((c: any) => c.name === 'Enroll Cat')).toBe(true);
  });

  it('rejects enrollment with missing account_id', async () => {
    const res = await apiPost('/api/enroll', {
      store_id: STORE_ID,
      terminal_id: TERMINAL_ID,
    });
    expect(res.status).not.toBe(200);
  });
});
