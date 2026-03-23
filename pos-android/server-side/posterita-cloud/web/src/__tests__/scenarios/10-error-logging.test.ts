import { describe, it, expect, afterAll } from 'vitest';
import { SKIP_SCENARIOS, getSupabase, apiPost, testId } from './helpers';

const TAG = testId('errlog');

describe.skipIf(SKIP_SCENARIOS)('Scenario: Error Logging', () => {
  afterAll(async () => {
    const db = getSupabase();
    await db.from('error_logs').delete().eq('tag', TAG);
  }, 30000);

  it('logs an error via API', async () => {
    const res = await apiPost('/api/errors/log', {
      severity: 'ERROR',
      tag: TAG,
      message: 'Test error from scenario test',
      stacktrace: 'Error: Test\n  at test.ts:1:1',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('error exists in database', async () => {
    const db = getSupabase();
    const { data } = await db.from('error_logs')
      .select('*')
      .eq('tag', TAG)
      .order('created_at', { ascending: false })
      .limit(1);
    expect(data?.length).toBe(1);
    expect(data![0].message).toBe('Test error from scenario test');
    expect(data![0].severity).toBe('ERROR');
    expect(data![0].status).toBe('open');
  });

  it('logs a warning with minimal fields', async () => {
    const res = await apiPost('/api/errors/log', {
      severity: 'WARNING',
      tag: TAG,
      message: 'Minimal warning',
    });
    expect(res.status).toBe(200);
  });

  it('logs a fatal error', async () => {
    const res = await apiPost('/api/errors/log', {
      severity: 'FATAL',
      tag: TAG,
      message: 'Critical failure in test',
      stacktrace: 'FatalError: crash\n  at app.ts:99:1\n  at main.ts:10:5',
    });
    expect(res.status).toBe(200);

    const db = getSupabase();
    const { data } = await db.from('error_logs')
      .select('severity')
      .eq('tag', TAG)
      .eq('severity', 'FATAL');
    expect(data?.length).toBe(1);
  });

  it('handles empty message gracefully', async () => {
    const res = await apiPost('/api/errors/log', {
      tag: TAG,
      message: '',
    });
    // Should not crash — error logging must be resilient
    expect([200, 400]).toContain(res.status);
  });
});
