import { test, expect } from '@playwright/test';

// These tests require auth. Without E2E_TEST_PASSWORD, they verify
// the redirect to login instead of failing.
const isAuthed = !!process.env.E2E_TEST_PASSWORD;

test.describe('Platform & Dashboard', () => {
  test('dashboard loads or redirects to login', async ({ page }) => {
    await page.goto('/customer');
    await page.waitForLoadState('networkidle');

    if (isAuthed) {
      const content = page.locator('main');
      await expect(content).toBeVisible();
    } else {
      await expect(page).toHaveURL(/\/(login|customer\/login|manager)/);
    }
  });

  const pages = [
    { path: '/customer/products', text: 'product' },
    { path: '/customer/categories', text: 'Categor' },
    { path: '/customer/orders', text: 'Order' },
    { path: '/customer/stores', text: 'Store' },
    { path: '/customer/terminals', text: 'Terminal' },
    { path: '/customer/users', text: 'User' },
    { path: '/customer/settings', text: 'Setting' },
    { path: '/customer/reports', text: 'Report' },
  ];

  for (const { path, text } of pages) {
    test(`${path.split('/').pop()} page loads or redirects`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      if (isAuthed) {
        const heading = page.locator(`text=${text}`).first();
        await expect(heading).toBeVisible({ timeout: 10000 });
      } else {
        await expect(page).toHaveURL(/\/(login|customer\/login)/);
      }
    });
  }

  test('sidebar visible on desktop (when authed)', async ({ page }) => {
    test.skip(!isAuthed, 'Requires authentication');
    await page.goto('/customer');
    await page.waitForLoadState('networkidle');

    if (page.viewportSize()!.width >= 1024) {
      const sidebar = page.locator('aside').first();
      await expect(sidebar).toBeVisible();
    }
  });

  test('sign out button exists (when authed)', async ({ page }) => {
    test.skip(!isAuthed, 'Requires authentication');
    await page.goto('/customer');
    await page.waitForLoadState('networkidle');

    if (page.viewportSize()!.width >= 1024) {
      const signOut = page.locator('button:has-text("Sign Out")');
      await expect(signOut).toBeVisible();
    }
  });
});
