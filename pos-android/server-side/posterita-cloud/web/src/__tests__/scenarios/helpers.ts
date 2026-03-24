import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID, createHmac } from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ldyoiexyqvklujvwcaqq.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BASE_URL = process.env.SCENARIO_BASE_URL || 'https://web.posterita.com';

/** true when env var is missing — use with describe.skipIf(SKIP_SCENARIOS) */
export const SKIP_SCENARIOS = !SUPABASE_SERVICE_KEY;

export function getSupabase(): SupabaseClient {
  if (!SUPABASE_SERVICE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY required for scenario tests');
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

export function apiUrl(path: string): string {
  return `${BASE_URL}${path}`;
}

export async function apiPost(path: string, body: any, timeoutMs?: number): Promise<Response> {
  const opts: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
  if (timeoutMs) {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeoutMs);
    opts.signal = controller.signal;
  }
  return fetch(apiUrl(path), opts);
}

export async function apiGet(path: string): Promise<Response> {
  return fetch(apiUrl(path), { method: 'GET' });
}

export async function apiPatch(path: string, body: any): Promise<Response> {
  return fetch(apiUrl(path), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function apiDelete(path: string): Promise<Response> {
  return fetch(apiUrl(path), { method: 'DELETE' });
}

// Authenticated API helpers — set posterita_account_cache cookie to bypass auth
// This cookie is the fast path in getSessionAccountId() (1-hour TTL, skips all DB lookups)

export async function apiPostAuth(path: string, body: any, accountId: string): Promise<Response> {
  return fetch(apiUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `posterita_account_cache=${accountId}`,
    },
    body: JSON.stringify(body),
  });
}

export async function apiGetAuth(path: string, accountId: string): Promise<Response> {
  return fetch(apiUrl(path), {
    method: 'GET',
    headers: { 'Cookie': `posterita_account_cache=${accountId}` },
  });
}

export async function apiPatchAuth(path: string, body: any, accountId: string): Promise<Response> {
  return fetch(apiUrl(path), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `posterita_account_cache=${accountId}`,
    },
    body: JSON.stringify(body),
  });
}

export async function apiDeleteAuth(path: string, accountId: string): Promise<Response> {
  return fetch(apiUrl(path), {
    method: 'DELETE',
    headers: { 'Cookie': `posterita_account_cache=${accountId}` },
  });
}

// Generate unique IDs for test data to avoid collisions
export function testId(prefix: string = 'test'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Generate a valid UUID v4 (required for Supabase UUID columns)
export function testUuid(): string {
  return randomUUID();
}

// POST with HMAC sync authentication (required by /api/auth/ott)
export async function apiPostHmac(path: string, body: any, syncSecret: string): Promise<Response> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payload = `${timestamp}.${JSON.stringify(body)}`;
  const signature = createHmac('sha256', syncSecret).update(payload).digest('hex');
  return fetch(apiUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-sync-timestamp': timestamp,
      'x-sync-signature': signature,
    },
    body: JSON.stringify(body),
  });
}

// Clean up test data after tests — parallelized for speed
export async function cleanupTestAccount(accountId: string) {
  const db = getSupabase();
  // Layer 1: leaf tables (no FK deps on each other)
  await Promise.all([
    db.from('orders').delete().eq('account_id', accountId),
    db.from('payment').delete().eq('account_id', accountId),
    db.from('orderline').delete().eq('account_id', accountId),
    db.from('till').delete().eq('account_id', accountId),
    db.from('modifier').delete().eq('account_id', accountId),
    db.from('category_station_mapping').delete().eq('account_id', accountId),
    db.from('preparation_station').delete().eq('account_id', accountId),
    db.from('inventory_count_entry').delete().eq('account_id', accountId),
    db.from('inventory_count_session').delete().eq('account_id', accountId),
  ]);
  // Layer 2: tables that reference categories/stores
  await Promise.all([
    db.from('product').delete().eq('account_id', accountId),
    db.from('productcategory').delete().eq('account_id', accountId),
    db.from('tax').delete().eq('account_id', accountId),
    db.from('terminal').delete().eq('account_id', accountId),
    db.from('pos_user').delete().eq('account_id', accountId),
  ]);
  // Layer 3: store and account
  await Promise.all([
    db.from('store').delete().eq('account_id', accountId),
    db.from('owner_account_session').delete().eq('account_id', accountId),
  ]);
  await db.from('account').delete().eq('account_id', accountId);
}
