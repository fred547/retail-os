import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SKIP_SCENARIOS, getSupabase, apiPost, testId, testUuid } from './helpers';

const ACCOUNT_ID = testId('device');
const STORE_ID = 96000 + Math.floor(Math.random() * 9000);
const TERMINAL_ID = STORE_ID;
const DEVICE_ID = `test-device-${Date.now()}`;
const DEVICE_ID_2 = `test-device2-${Date.now()}`;

describe.skipIf(SKIP_SCENARIOS)('Scenario: Device Registration via Sync', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({ account_id: ACCOUNT_ID, businessname: 'Device Test', type: 'live', status: 'active', currency: 'MUR' });
    await db.from('store').insert({ store_id: STORE_ID, account_id: ACCOUNT_ID, name: 'Device Store', isactive: 'Y' });
    await db.from('terminal').insert({ terminal_id: TERMINAL_ID, account_id: ACCOUNT_ID, store_id: STORE_ID, name: 'POS 1', isactive: 'Y' });
  }, 60000);

  afterAll(async () => {
    const db = getSupabase();
    await db.from('registered_device').delete().eq('account_id', ACCOUNT_ID);
    await db.from('terminal').delete().eq('account_id', ACCOUNT_ID);
    await db.from('store').delete().eq('account_id', ACCOUNT_ID);
    await db.from('account').delete().eq('account_id', ACCOUNT_ID);
  }, 60000);

  it('sync with device_id registers the device', async () => {
    const res = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: '1970-01-01T00:00:00.000Z',
      device_id: DEVICE_ID,
      device_model: 'Pixel 7',
      app_version: '2.1.0',
      os_version: 'Android 14',
    });
    expect(res.status).toBe(200);
  });

  it('device record exists in registered_device table', async () => {
    const db = getSupabase();
    const { data } = await db.from('registered_device')
      .select('*')
      .eq('device_id', DEVICE_ID)
      .eq('account_id', ACCOUNT_ID)
      .single();
    expect(data).toBeTruthy();
    expect(data!.device_model).toBe('Pixel 7');
    expect(data!.app_version).toBe('2.1.0');
    expect(data!.os_version).toBe('Android 14');
    expect(data!.terminal_id).toBe(TERMINAL_ID);
    expect(data!.is_active).toBe(true);
    expect(data!.last_sync_at).toBeTruthy();
  });

  it('subsequent sync updates last_sync_at and app_version', async () => {
    const db = getSupabase();
    const { data: before } = await db.from('registered_device')
      .select('last_sync_at')
      .eq('device_id', DEVICE_ID)
      .eq('account_id', ACCOUNT_ID)
      .single();

    // Small delay to ensure timestamp changes
    await new Promise(r => setTimeout(r, 1100));

    await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: new Date().toISOString(),
      device_id: DEVICE_ID,
      device_model: 'Pixel 7',
      app_version: '2.2.0',
      os_version: 'Android 14',
    });

    const { data: after } = await db.from('registered_device')
      .select('last_sync_at, app_version')
      .eq('device_id', DEVICE_ID)
      .eq('account_id', ACCOUNT_ID)
      .single();
    expect(after!.app_version).toBe('2.2.0');
    expect(new Date(after!.last_sync_at).getTime()).toBeGreaterThan(new Date(before!.last_sync_at).getTime());
  });

  it('multiple devices can register for same account', async () => {
    await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: '1970-01-01T00:00:00.000Z',
      device_id: DEVICE_ID_2,
      device_model: 'Samsung Galaxy S24',
      app_version: '2.1.0',
    });

    const db = getSupabase();
    const { data } = await db.from('registered_device')
      .select('device_id, device_model')
      .eq('account_id', ACCOUNT_ID);
    expect(data!.length).toBe(2);
    const models = data!.map(d => d.device_model);
    expect(models).toContain('Pixel 7');
    expect(models).toContain('Samsung Galaxy S24');
  });

  it('sync without device_id does not create device record', async () => {
    const otherAccount = testId('no_dev');
    const db = getSupabase();
    await db.from('account').insert({ account_id: otherAccount, businessname: 'No Device', type: 'live', status: 'active', currency: 'MUR' });
    await db.from('store').insert({ store_id: STORE_ID + 1, account_id: otherAccount, name: 'S', isactive: 'Y' });
    await db.from('terminal').insert({ terminal_id: STORE_ID + 1, account_id: otherAccount, store_id: STORE_ID + 1, name: 'T', isactive: 'Y' });

    await apiPost('/api/sync', {
      account_id: otherAccount,
      terminal_id: STORE_ID + 1,
      store_id: STORE_ID + 1,
      last_sync_at: '1970-01-01T00:00:00.000Z',
      // no device_id
    });

    const { data } = await db.from('registered_device')
      .select('*')
      .eq('account_id', otherAccount);
    expect(data?.length ?? 0).toBe(0);

    // Cleanup
    await db.from('terminal').delete().eq('account_id', otherAccount);
    await db.from('store').delete().eq('account_id', otherAccount);
    await db.from('account').delete().eq('account_id', otherAccount);
  });

  it('sync logs request to sync_request_log', async () => {
    const db = getSupabase();
    const { data } = await db.from('sync_request_log')
      .select('device_id, device_model, app_version')
      .eq('account_id', ACCOUNT_ID)
      .eq('device_id', DEVICE_ID)
      .order('request_at', { ascending: false })
      .limit(1);
    expect(data!.length).toBe(1);
    expect(data![0].device_id).toBe(DEVICE_ID);
  });
});
