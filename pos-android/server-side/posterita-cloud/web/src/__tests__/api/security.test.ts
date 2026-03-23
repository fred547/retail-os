import { describe, it, expect, vi, beforeEach } from 'vitest';

// Fully chainable Supabase mock
function createChain() {
  const result = { data: null, error: null };
  const chain: any = {};
  const methods = ['select', 'eq', 'gte', 'order', 'limit', 'in', 'neq', 'is', 'not', 'or', 'ilike'] as const;
  for (const m of methods) { chain[m] = () => chain; }
  for (const m of ['insert', 'update', 'upsert', 'delete'] as const) { chain[m] = () => chain; }
  chain.single = () => Promise.resolve(result);
  chain.maybeSingle = () => Promise.resolve(result);
  chain.then = (ok: Function, err?: Function) => Promise.resolve(result).then(ok as any, err as any);
  return chain;
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => createChain(),
  }),
}));

function mockRequest(body: any, headers?: Record<string, string>): any {
  const hdrs = new Map(Object.entries(headers ?? {})); return { json: () => Promise.resolve(body), headers: { get: (key: string) => hdrs.get(key) ?? null } };
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
