import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getSupabase, testId } from './helpers';

const ACCOUNT_DRAFT = testId('lc_draft');
const ACCOUNT_ACTIVE = testId('lc_active');
const ACCOUNT_SUSPENDED = testId('lc_susp');

describe('Scenario: Account Lifecycle', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert([
      { account_id: ACCOUNT_DRAFT, businessname: 'Draft Co', type: 'live', status: 'draft', currency: 'MUR' },
      { account_id: ACCOUNT_ACTIVE, businessname: 'Active Co', type: 'live', status: 'active', currency: 'USD' },
      { account_id: ACCOUNT_SUSPENDED, businessname: 'Suspended Co', type: 'live', status: 'suspended', currency: 'EUR' },
    ]);
  });

  afterAll(async () => {
    const db = getSupabase();
    await db.from('account_lifecycle_log').delete().in('account_id', [ACCOUNT_DRAFT, ACCOUNT_ACTIVE, ACCOUNT_SUSPENDED]);
    await db.from('account').delete().in('account_id', [ACCOUNT_DRAFT, ACCOUNT_ACTIVE, ACCOUNT_SUSPENDED]);
  });

  it('draft account transitions to onboarding', async () => {
    const db = getSupabase();
    const { error } = await db.from('account')
      .update({ status: 'onboarding' })
      .eq('account_id', ACCOUNT_DRAFT);
    expect(error).toBeNull();

    const { data } = await db.from('account')
      .select('status')
      .eq('account_id', ACCOUNT_DRAFT)
      .single();
    expect(data!.status).toBe('onboarding');
  });

  it('onboarding transitions to active', async () => {
    const db = getSupabase();
    const { error } = await db.from('account')
      .update({ status: 'active' })
      .eq('account_id', ACCOUNT_DRAFT);
    expect(error).toBeNull();

    const { data } = await db.from('account')
      .select('status')
      .eq('account_id', ACCOUNT_DRAFT)
      .single();
    expect(data!.status).toBe('active');
  });

  it('active account transitions to suspended', async () => {
    const db = getSupabase();
    const { error } = await db.from('account')
      .update({ status: 'suspended' })
      .eq('account_id', ACCOUNT_ACTIVE);
    expect(error).toBeNull();

    const { data } = await db.from('account')
      .select('status')
      .eq('account_id', ACCOUNT_ACTIVE)
      .single();
    expect(data!.status).toBe('suspended');
  });

  it('suspended account transitions to archived', async () => {
    const db = getSupabase();
    const { error } = await db.from('account')
      .update({ status: 'archived' })
      .eq('account_id', ACCOUNT_SUSPENDED);
    expect(error).toBeNull();

    const { data } = await db.from('account')
      .select('status')
      .eq('account_id', ACCOUNT_SUSPENDED)
      .single();
    expect(data!.status).toBe('archived');
  });

  it('account type preserved through transitions', async () => {
    const db = getSupabase();
    const { data: accounts } = await db.from('account')
      .select('account_id, type')
      .in('account_id', [ACCOUNT_DRAFT, ACCOUNT_ACTIVE, ACCOUNT_SUSPENDED]);
    for (const acc of accounts || []) {
      expect(acc.type).toBe('live');
    }
  });

  it('currency preserved through transitions', async () => {
    const db = getSupabase();
    const { data } = await db.from('account')
      .select('currency')
      .eq('account_id', ACCOUNT_DRAFT)
      .single();
    expect(data!.currency).toBe('MUR');
  });
});
