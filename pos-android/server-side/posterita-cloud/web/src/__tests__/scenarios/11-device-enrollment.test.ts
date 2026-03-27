import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SKIP_SCENARIOS, getSupabase, apiPost, apiGet, testId, cleanupTestAccount } from './helpers';

const ACCOUNT_ID = testId('enroll');
const STORE_ID = 80000 + Math.floor(Math.random() * 9000);
const TERMINAL_ID = STORE_ID;
let enrollBody: any;

describe.skipIf(SKIP_SCENARIOS)('Scenario: Device Enrollment', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({ account_id: ACCOUNT_ID, businessname: 'Enroll Test', type: 'testing', status: 'active', currency: 'MUR' });
    await db.from('store').insert({ store_id: STORE_ID, account_id: ACCOUNT_ID, name: 'Enroll Store', isactive: 'Y' });
    await db.from('terminal').insert({ terminal_id: TERMINAL_ID, account_id: ACCOUNT_ID, store_id: STORE_ID, name: 'POS 1', isactive: 'Y' });
    const { data: cat } = await db.from('productcategory').insert({
      account_id: ACCOUNT_ID, name: 'Enroll Cat', isactive: 'Y', position: 1,
    }).select().single();
    await Promise.all([
      db.from('pos_user').insert({
        account_id: ACCOUNT_ID, username: 'enroll_user', firstname: 'Test', lastname: 'User',
        pin: '1234', role: 'STAFF', isactive: 'Y', isadmin: 'N', issalesrep: 'Y',
      }),
      db.from('product').insert({
        account_id: ACCOUNT_ID, name: 'Enroll Product', sellingprice: 100,
        productcategory_id: cat!.productcategory_id, isactive: 'Y', product_status: 'live',
      }),
      db.from('tax').insert({ account_id: ACCOUNT_ID, name: 'VAT 15%', rate: 15, isactive: 'Y' }),
    ]);
  }, 30000);

  afterAll(async () => {
    try { await cleanupTestAccount(ACCOUNT_ID); } catch { /* best-effort */ }
  }, 30000);

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
    enrollBody = await res.json();
    expect(enrollBody.success).toBe(true);
    expect(enrollBody.account).toBeTruthy();
    expect(enrollBody.enrolled_store).toBeTruthy();
    expect(enrollBody.enrolled_terminal).toBeTruthy();
    expect(enrollBody.stores?.length).toBeGreaterThanOrEqual(1);
    expect(enrollBody.terminals?.length).toBeGreaterThanOrEqual(1);
    expect(enrollBody.users?.length).toBeGreaterThanOrEqual(1);
    expect(enrollBody.taxes?.length).toBeGreaterThanOrEqual(1);
    expect(enrollBody.sync_secret).toBeTruthy();
    expect(enrollBody.server_time).toBeTruthy();
  });

  it('enrollment returns products for the account', () => {
    expect(enrollBody.products?.length).toBeGreaterThanOrEqual(1);
    expect(enrollBody.products?.some((p: any) => p.name === 'Enroll Product')).toBe(true);
  });

  it('enrollment returns categories', () => {
    expect(enrollBody.categories?.length).toBeGreaterThanOrEqual(1);
    expect(enrollBody.categories?.some((c: any) => c.name === 'Enroll Cat')).toBe(true);
  });

  it('rejects enrollment with missing account_id', async () => {
    const res = await apiPost('/api/enroll', {
      store_id: STORE_ID,
      terminal_id: TERMINAL_ID,
    });
    expect(res.status).not.toBe(200);
  });
});
