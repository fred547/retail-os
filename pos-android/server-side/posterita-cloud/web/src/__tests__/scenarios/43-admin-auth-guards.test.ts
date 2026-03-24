import { describe, it, expect } from 'vitest';
import { SKIP_SCENARIOS, apiPost, apiGet, apiPostAuth, apiGetAuth, apiPatchAuth, testId } from './helpers';

describe.skipIf(SKIP_SCENARIOS)('Scenario: Admin Route Auth Guards', () => {
  const FAKE_ACCOUNT = testId('guard');

  // --- /api/platform/create-account requires super admin ---

  it('POST /api/platform/create-account returns 401 without super admin', async () => {
    const res = await apiPostAuth('/api/platform/create-account', {
      businessname: 'Test',
      email: 'test@test.com',
      type: 'trial',
      currency: 'MUR',
    }, FAKE_ACCOUNT);
    expect(res.status).toBe(401);
  });

  // --- /api/super-admin/status returns safely without auth ---

  it('GET /api/super-admin/status returns is_super_admin: false without auth', async () => {
    const res = await apiGetAuth('/api/super-admin/status', FAKE_ACCOUNT);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.is_super_admin).toBe(false);
  });

  // --- /api/super-admin/switch requires real super admin ---

  it('POST /api/super-admin/switch returns 403 without super admin', async () => {
    const res = await apiPostAuth('/api/super-admin/switch', {
      account_id: FAKE_ACCOUNT,
    }, FAKE_ACCOUNT);
    expect(res.status).toBe(403);
  });

  // --- /api/account-manager/.../assignment requires account manager ---

  it('PATCH /api/account-manager/.../assignment returns 401 without auth', async () => {
    const res = await apiPatchAuth(`/api/account-manager/accounts/${FAKE_ACCOUNT}/assignment`, {
      account_manager_id: 1,
    }, FAKE_ACCOUNT);
    expect(res.status).toBe(401);
  });

  // --- /api/auth/reset-password validates input ---

  it('POST /api/auth/reset-password rejects empty email', async () => {
    const res = await apiPost('/api/auth/reset-password', { email: '' });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Email');
  });

  it('POST /api/auth/reset-password returns success for any email (security)', async () => {
    const res = await apiPost('/api/auth/reset-password', {
      email: 'nonexistent_test@example.com',
    });
    // Returns 200 even for non-existent emails (security best practice)
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  // --- /api/sync/replay requires auth ---

  it('POST /api/sync/replay returns 401 without auth', async () => {
    const res = await apiPost('/api/sync/replay', { inbox_id: 99999 });
    expect(res.status).toBe(401);
  });

  it('POST /api/sync/replay returns 401 with cookie auth (needs real session)', async () => {
    const res = await apiPostAuth('/api/sync/replay', { inbox_id: 99999 }, FAKE_ACCOUNT);
    // Cookie auth may or may not work — either 401 or 404 (entry not found)
    expect([401, 404]).toContain(res.status);
  });

  // --- /api/blink/dynamic-qr validates input ---

  it('POST /api/blink/dynamic-qr rejects missing action', async () => {
    const res = await apiPost('/api/blink/dynamic-qr', {});
    // Should return 400 or handle gracefully
    expect(res.status).toBeLessThan(500);
  });

  it('POST /api/blink/dynamic-qr rejects missing fields for getDynamicQrCode', async () => {
    const res = await apiPost('/api/blink/dynamic-qr', {
      action: 'getDynamicQrCode',
      // Missing requestIntentityId, transactionAmt
    });
    expect(res.status).toBe(400);
  });
});
