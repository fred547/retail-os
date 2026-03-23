import { test as setup } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'e2e-test@posterita.test';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'E2E_Test_Pw_2026!';

setup('authenticate as owner', async ({ page }) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.warn('No Supabase keys — skipping auth. Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.');
    await page.context().storageState({ path: 'e2e/.auth/user.json' });
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Step 1: Ensure test user exists in Supabase Auth
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existing = existingUsers?.users?.find(u => u.email === TEST_EMAIL);

  if (!existing) {
    const { data: newUser, error } = await supabase.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { firstname: 'E2E Test', role: 'owner' },
    });
    if (error) {
      console.warn(`Failed to create test user: ${error.message}`);
      await page.context().storageState({ path: 'e2e/.auth/user.json' });
      return;
    }
    console.log(`Created test user: ${TEST_EMAIL} (${newUser.user?.id})`);

    // Step 2: Link to an existing owner so getSessionAccountId() works
    // Find the first owner with accounts
    const { data: owners } = await supabase
      .from('owner')
      .select('id, email')
      .eq('is_active', true)
      .limit(1);

    if (owners && owners.length > 0) {
      const ownerId = owners[0].id;

      // Set auth_uid on the owner to link Supabase Auth user → owner
      await supabase
        .from('owner')
        .update({ auth_uid: newUser.user?.id })
        .eq('id', ownerId);

      console.log(`Linked test user to owner ${ownerId} (${owners[0].email})`);
    }
  } else {
    // Ensure password is up to date
    await supabase.auth.admin.updateUserById(existing.id, { password: TEST_PASSWORD });
  }

  // Step 3: Log in via browser to set Supabase Auth cookies
  await page.goto('/customer/login');
  await page.waitForLoadState('networkidle');

  await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL);
  await page.fill('input[type="password"], input[name="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In")');

  // Wait for redirect — could be customer dashboard or manager platform
  try {
    await page.waitForURL(/\/(customer|manager\/platform|platform)/, { timeout: 15000 });
    console.log(`Auth setup: logged in as ${TEST_EMAIL}`);
  } catch {
    console.warn(`Auth setup: redirect timed out. Current URL: ${page.url()}`);
  }

  await page.context().storageState({ path: 'e2e/.auth/user.json' });
});
