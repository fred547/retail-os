import { describe, it, expect } from 'vitest';
import { apiGet, apiPost } from './helpers';

describe('Scenario: Monitor & Health Checks', () => {
  it('monitor returns overall status', async () => {
    const res = await apiGet('/api/monitor');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(['healthy', 'warning', 'degraded']).toContain(body.status);
    expect(body.timestamp).toBeTruthy();
    expect(body.total_ms).toBeGreaterThan(0);
  });

  it('monitor includes Supabase check', async () => {
    const res = await apiGet('/api/monitor');
    const body = await res.json();
    expect(body.checks.supabase).toBeTruthy();
    expect(body.checks.supabase.ms).toBeGreaterThanOrEqual(0);
  });

  it('monitor includes Render backend check', async () => {
    const res = await apiGet('/api/monitor');
    const body = await res.json();
    expect(body.checks.render_backend).toBeTruthy();
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
