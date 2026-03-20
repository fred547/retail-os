import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
          gte: () => Promise.resolve({ data: [], error: null }),
          limit: () => ({ single: () => Promise.resolve({ data: null, error: null }) }),
        }),
        gte: () => Promise.resolve({ data: [], error: null }),
      }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
      upsert: () => Promise.resolve({ data: null, error: null }),
    }),
  }),
}));

function mockRequest(body: any): any {
  return { json: () => Promise.resolve(body) };
}

describe('API Security Tests', () => {

  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  it('sync rejects request with missing body fields', async () => {
    const { POST } = await import('../../app/api/sync/route');
    const res = await POST(mockRequest({}));
    expect(res.status).toBe(400);
  });

  it('sync auto-creates account when account_id is unknown', async () => {
    const { POST } = await import('../../app/api/sync/route');
    const res = await POST(mockRequest({ account_id: 'nonexistent', terminal_id: 1 }));
    // Unknown accounts are now auto-created defensively instead of rejected
    expect(res.status).toBe(200);
  });

  it('sync handles malformed JSON gracefully', async () => {
    const { POST } = await import('../../app/api/sync/route');
    const req = { json: () => Promise.reject(new Error('Invalid JSON')) };
    const res = await POST(req as any);
    expect(res.status).toBe(500);
  });

  it('register rejects request without account_id', async () => {
    const { POST } = await import('../../app/api/sync/register/route');
    const res = await POST(mockRequest({ email: 'test@test.com' }));
    expect(res.status).toBe(400);
  });

  it('health check returns 200', async () => {
    const { GET } = await import('../../app/api/sync/route');
    const res = await GET();
    expect(res.status).toBe(200);
  });
});
