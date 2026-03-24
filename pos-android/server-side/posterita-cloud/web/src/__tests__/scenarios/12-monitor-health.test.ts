import { describe, it, expect, beforeAll } from 'vitest';
import { SKIP_SCENARIOS, apiGet } from './helpers';

let monitorBody: any;

describe.skipIf(SKIP_SCENARIOS)('Scenario: Monitor & Health Checks', () => {
  beforeAll(async () => {
    const res = await apiGet('/api/monitor');
    expect(res.status).toBe(200);
    monitorBody = await res.json();
  }, 30000);

  it('monitor returns overall status', () => {
    expect(['healthy', 'warning', 'degraded']).toContain(monitorBody.status);
    expect(monitorBody.timestamp).toBeTruthy();
    expect(monitorBody.total_ms).toBeGreaterThan(0);
  });

  it('monitor includes Supabase check', () => {
    expect(monitorBody.checks.supabase).toBeTruthy();
    expect(monitorBody.checks.supabase.ms).toBeGreaterThanOrEqual(0);
  });

  it('monitor includes Render backend check', () => {
    expect(monitorBody.checks.render_backend).toBeTruthy();
  });

  it('sync API health check returns 200', async () => {
    const res = await apiGet('/api/sync');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  it('enroll health check returns 200', async () => {
    const res = await apiGet('/api/enroll');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
});
