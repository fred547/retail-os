import { test as setup, expect } from '@playwright/test';

const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'fred@tamakgroup.com';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || '';

setup('authenticate as owner', async ({ page }) => {
  // Skip if no password configured
  if (!TEST_PASSWORD) {
    console.warn('E2E_TEST_PASSWORD not set — skipping auth setup. Tests will run against public pages only.');
    // Create empty auth state so dependent tests don't fail
    await page.context().storageState({ path: 'e2e/.auth/user.json' });
    return;
  }

  await page.goto('/login');

  // Click "Manager Login" or navigate to manager login
  const managerLink = page.locator('a:has-text("Manager"), button:has-text("Manager")');
  if (await managerLink.isVisible({ timeout: 3000 }).catch(() => false)) {
    await managerLink.click();
  } else {
    await page.goto('/manager/login');
  }

  await page.waitForLoadState('networkidle');

  // Fill login form
  await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL);
  await page.fill('input[type="password"], input[name="password"]', TEST_PASSWORD);

  // Submit
  await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In")');

  // Wait for successful navigation (platform or dashboard)
  await page.waitForURL(/\/(manager\/platform|customer|platform)/, { timeout: 15000 });

  // Save auth state
  await page.context().storageState({ path: 'e2e/.auth/user.json' });
});
