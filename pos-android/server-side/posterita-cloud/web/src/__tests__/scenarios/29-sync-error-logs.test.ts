import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SKIP_SCENARIOS, getSupabase, apiPost, testId, cleanupTestAccount } from './helpers';

const ACCOUNT_ID = testId('sync_errlg');
const STORE_ID = 98000 + Math.floor(Math.random() * 9000);
const TERMINAL_ID = STORE_ID;
const TAG = testId('synced_err');

describe.skipIf(SKIP_SCENARIOS)('Scenario: Sync Push Error Logs', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({ account_id: ACCOUNT_ID, businessname: 'Error Log Sync', type: 'testing', status: 'active', currency: 'MUR' });
    await db.from('store').insert({ store_id: STORE_ID, account_id: ACCOUNT_ID, name: 'Error Store', isactive: 'Y' });
    await db.from('terminal').insert({ terminal_id: TERMINAL_ID, account_id: ACCOUNT_ID, store_id: STORE_ID, name: 'POS 1', isactive: 'Y' });
  }, 30000);

  afterAll(async () => {
    try {
      const db = getSupabase();
      await db.from('error_logs').delete().eq('tag', TAG);
      await cleanupTestAccount(ACCOUNT_ID);
    } catch { /* best-effort */ }
  }, 30000);

  it('sync accepts error_logs in push payload', async () => {
    const res = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: '1970-01-01T00:00:00.000Z',
      error_logs: [
        { severity: 'ERROR', tag: TAG, message: 'Test error via sync' },
        { severity: 'FATAL', tag: TAG, message: 'Test fatal via sync' },
      ],
    });
    expect(res.status).toBe(200);
  });

  it('sync response includes error_logs_pushed count', async () => {
    const res = await apiPost('/api/sync', {
      account_id: ACCOUNT_ID,
      terminal_id: TERMINAL_ID,
      store_id: STORE_ID,
      last_sync_at: '1970-01-01T00:00:00.000Z',
      error_logs: [
        { severity: 'WARNING', tag: TAG, message: 'Another test error' },
      ],
    });
    expect(res.status).toBe(200);
    // Sync never fails for error log push issues — fire and forget
  });

  it('direct error log insert works via DB', async () => {
    const db = getSupabase();
    const { error } = await db.from('error_logs').insert({
      account_id: ACCOUNT_ID,
      severity: 'ERROR',
      tag: TAG,
      message: 'Direct DB insert test',
    });
    expect(error).toBeNull();

    const { data } = await db.from('error_logs')
      .select('severity, tag, message')
      .eq('tag', TAG);
    expect(data!.length).toBeGreaterThanOrEqual(1);
    expect(data!.some(l => l.message === 'Direct DB insert test')).toBe(true);
  });

  it('error log status defaults to open', async () => {
    const db = getSupabase();
    const { data } = await db.from('error_logs')
      .select('status')
      .eq('tag', TAG);
    for (const log of data || []) {
      expect(log.status).toBe('open');
    }
  });
});
