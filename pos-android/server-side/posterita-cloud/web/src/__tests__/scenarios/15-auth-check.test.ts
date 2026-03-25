import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SKIP_SCENARIOS, getSupabase, apiPost, testId } from './helpers';

const TEST_EMAIL = `scentest_${Date.now()}@test-check.com`;
const TEST_PHONE = `+230${Date.now().toString().slice(-8)}`;
let ownerId: string;

describe.skipIf(SKIP_SCENARIOS)('Scenario: Auth Check (Email/Phone Uniqueness)', () => {
  beforeAll(async () => {
    const db = getSupabase();
    const { data } = await db.from('owner').insert({
      email: TEST_EMAIL,
      phone: TEST_PHONE,
      name: 'Check Test Owner',
    }).select('id').single();
    ownerId = data!.id;
  }, 30000);

  afterAll(async () => {
    const db = getSupabase();
    await db.from('owner').delete().eq('id', ownerId);
  }, 30000);

  it('detects existing email', async () => {
    const res = await apiPost('/api/auth/check', { email: TEST_EMAIL });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.exists).toBe(true);
    expect(body.matched_on).toBe('email');
  });

  it('detects existing phone', async () => {
    const res = await apiPost('/api/auth/check', { phone: TEST_PHONE });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.exists).toBe(true);
    expect(body.matched_on).toBe('phone');
  });

  it('returns false for non-existent email', async () => {
    const res = await apiPost('/api/auth/check', { email: 'nonexistent_xyz_999@nowhere.com' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.exists).toBe(false);
  });

  it('returns false for non-existent phone', async () => {
    const res = await apiPost('/api/auth/check', { phone: '+99900000000' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.exists).toBe(false);
  });

  it('handles empty request gracefully', async () => {
    const res = await apiPost('/api/auth/check', {});
    // Should return 200 with exists:false or 400, but not crash
    expect([200, 400]).toContain(res.status);
  });
});
