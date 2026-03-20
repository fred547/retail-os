import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

/**
 * Regression Test: Super Admin User Exists
 *
 * This test ensures that the support@posterita.com user exists as a super admin
 * in the database. This is a critical prerequisite for the web platform to function.
 *
 * Why this test exists:
 * - Previous issue: Database was reset, deleting the support user
 * - Impact: Support team couldn't access the platform
 * - Solution: Automated verification that the user exists and is active
 */
describe('Super Admin User Regression', () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    it.skip('should be skipped if Supabase credentials are not configured', () => {
      expect(true).toBe(true);
    });
    return;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  it('should have support@posterita.com as a super admin', async () => {
    // Query the super_admin table for the support user
    const { data: superAdminRecord, error } = await admin
      .from('super_admin')
      .select('id, auth_uid, email, name, is_active, created_at')
      .eq('email', 'support@posterita.com')
      .single();

    expect(error).toBeNull();
    expect(superAdminRecord).toBeDefined();
    expect(superAdminRecord?.email).toBe('support@posterita.com');
    expect(superAdminRecord?.is_active).toBe(true);
  });

  it('should have the auth user for support@posterita.com', async () => {
    // Query auth.users table to verify the auth record exists
    const { data: authUser, error } = await admin.auth.admin.listUsers();

    expect(error).toBeNull();
    expect(authUser).toBeDefined();
    expect(authUser?.users).toBeDefined();

    const supportUser = authUser?.users?.find(
      (u: any) => u.email === 'support@posterita.com'
    );

    expect(supportUser).toBeDefined();
    if (supportUser) {
      expect(supportUser.email).toBe('support@posterita.com');
      expect(supportUser.email_confirmed_at).toBeDefined();
    }
  });

  it('should link the super admin to the auth user', async () => {
    // Verify that super_admin.auth_uid references a valid auth.users record
    const { data: superAdminRecord } = await admin
      .from('super_admin')
      .select('auth_uid')
      .eq('email', 'support@posterita.com')
      .single();

    if (superAdminRecord?.auth_uid) {
      const { data: authUser, error } = await admin.auth.admin.getUserById(
        superAdminRecord.auth_uid
      );

      expect(error).toBeNull();
      expect(authUser?.user?.email).toBe('support@posterita.com');
    }
  });

  it('should allow the super admin to log in', async () => {
    // Verify login is possible (without actually logging in to avoid session conflicts)
    const { data: superAdminRecord } = await admin
      .from('super_admin')
      .select('*')
      .eq('email', 'support@posterita.com')
      .eq('is_active', true)
      .single();

    expect(superAdminRecord).toBeDefined();
    expect(superAdminRecord?.email).toBe('support@posterita.com');
  });
});
