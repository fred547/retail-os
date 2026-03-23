import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ldyoiexyqvklujvwcaqq.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BASE_URL = process.env.SCENARIO_BASE_URL || 'https://web.posterita.com';

export function getSupabase(): SupabaseClient {
  if (!SUPABASE_SERVICE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY required for scenario tests');
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

export function apiUrl(path: string): string {
  return `${BASE_URL}${path}`;
}

export async function apiPost(path: string, body: any): Promise<Response> {
  return fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// Generate unique IDs for test data to avoid collisions
export function testId(prefix: string = 'test'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Clean up test data after tests
export async function cleanupTestAccount(accountId: string) {
  const db = getSupabase();
  // Delete in FK order
  await db.from('orders').delete().eq('account_id', accountId);
  await db.from('payment').delete().eq('account_id', accountId);
  await db.from('orderline').delete().eq('account_id', accountId);
  await db.from('till').delete().eq('account_id', accountId);
  await db.from('product').delete().eq('account_id', accountId);
  await db.from('productcategory').delete().eq('account_id', accountId);
  await db.from('tax').delete().eq('account_id', accountId);
  await db.from('terminal').delete().eq('account_id', accountId);
  await db.from('pos_user').delete().eq('account_id', accountId);
  await db.from('store').delete().eq('account_id', accountId);
  await db.from('owner_account_session').delete().eq('account_id', accountId);
  await db.from('account').delete().eq('account_id', accountId);
}
