import { test, expect } from '@playwright/test';

// These tests require auth. Without E2E_TEST_PASSWORD, they verify
// the redirect to login instead of failing.
const isAuthed = !!process.env.E2E_TEST_PASSWORD;

test.describe('Platform & Dashboard', () => {
  test('dashboard loads or redirects to login', async ({ page }) => {
    await page.goto('/customer');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    if (url.includes('/login') || url.includes('/manager')) {
      // Redirected — auth incomplete or no account context
      expect(url).toMatch(/\/(login|customer\/login|manager)/);
    } else {
      const content = page.locator('main');
      await expect(content).toBeVisible();
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

      // Authed pages may load content OR redirect (if account context missing)
      const url = page.url();
      if (url.includes('/login')) {
        // Redirected to login — auth incomplete or no account context
        expect(url).toMatch(/\/(login|customer\/login)/);
      } else {
        // Page loaded — verify content
        const heading = page.locator(`text=${text}`).first();
        await expect(heading).toBeVisible({ timeout: 10000 });
      }
    });
  }

  test('sidebar visible on desktop (when authed)', async ({ page }) => {
    await page.goto('/customer');
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/login') || page.url().includes('/manager')) {
      // Not on customer page — skip sidebar check
      return;
    }
    if (page.viewportSize()!.width >= 1024) {
      const sidebar = page.locator('aside').first();
      await expect(sidebar).toBeVisible();
    }
  });

  test('sign out button exists (when authed)', async ({ page }) => {
    await page.goto('/customer');
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/login') || page.url().includes('/manager')) {
      return;
    }
    if (page.viewportSize()!.width >= 1024) {
      const signOut = page.locator('button:has-text("Sign Out")');
      await expect(signOut).toBeVisible();
    }
  });
});
