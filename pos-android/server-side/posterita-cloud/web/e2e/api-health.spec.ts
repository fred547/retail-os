import { test, expect } from '@playwright/test';

test.describe('API Health', () => {
  test('sync endpoint returns 400 without body', async ({ request }) => {
    const response = await request.post('/api/sync', {
      data: {},
    });
    expect(response.status()).toBe(400);
  });

  test('signup endpoint rejects empty body', async ({ request }) => {
    const response = await request.post('/api/auth/signup', {
      data: {},
    });
    expect(response.status()).toBe(400);
  });

  test('lookup endpoint requires email or phone', async ({ request }) => {
    const response = await request.post('/api/auth/lookup', {
      data: {},
    });
    expect(response.status()).toBe(400);
  });

  test('OTT validate rejects invalid token', async ({ request }) => {
    const response = await request.post('/api/auth/ott/validate', {
      data: { token: 'invalid-token-12345' },
    });
    // Should be 401 or 400
    expect([400, 401, 404]).toContain(response.status());
  });

  test('data proxy rejects unauthenticated request', async ({ request }) => {
    const response = await request.post('/api/data', {
      data: { table: 'product', select: '*' },
    });
    expect(response.status()).toBe(401);
  });

  test('sync register rejects null account_id', async ({ request }) => {
    const response = await request.post('/api/sync/register', {
      data: { account_id: 'null' },
    });
    expect(response.status()).toBe(400);
  });
});
