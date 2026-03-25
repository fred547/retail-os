import { describe, it, expect } from 'vitest';
import { SKIP_SCENARIOS, apiGet } from './helpers';

describe.skipIf(SKIP_SCENARIOS)('Scenario: Changelog, Debug & Infrastructure', () => {
  it('changelog returns commit history', async () => {
    const res = await apiGet('/api/changelog');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.commits).toBeDefined();
    expect(Array.isArray(body.commits)).toBe(true);
    expect(body.commits.length).toBeGreaterThan(0);
    // Each commit has required fields
    const commit = body.commits[0];
    expect(commit.sha).toBeTruthy();
    expect(commit.message).toBeTruthy();
    expect(commit.date).toBeTruthy();
  });

  it('changelog includes version info', async () => {
    const res = await apiGet('/api/changelog');
    const body = await res.json();
    expect(body.version).toBeDefined();
    expect(body.version.sha).toBeTruthy();
  });

  it('debug session returns structure without auth', async () => {
    const res = await apiGet('/api/debug/session');
    expect(res.status).toBe(200);
    const body = await res.json();
    // Without auth cookie, fields should be null/empty but response should be valid JSON
    expect(body).toHaveProperty('auth_user_id');
    expect(body).toHaveProperty('resolved_account_id');
  });

  it('infrastructure returns service status', async () => {
    const res = await apiGet('/api/infrastructure');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.services).toBeDefined();
    expect(body.services.supabase).toBeDefined();
    expect(body.services.vercel).toBeDefined();
    expect(body.totalCost).toBeDefined();
    expect(body.timestamp).toBeTruthy();
  });

  it('infrastructure includes Supabase row counts', async () => {
    const res = await apiGet('/api/infrastructure');
    const body = await res.json();
    expect(body.services.supabase.tables).toBeDefined();
    expect(body.services.supabase.totalRows).toBeGreaterThanOrEqual(0);
  });
});
