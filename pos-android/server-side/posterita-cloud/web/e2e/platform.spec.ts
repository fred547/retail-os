import { test, expect } from '@playwright/test';

test.describe('Platform & Dashboard', () => {
  test('dashboard loads with stats cards', async ({ page }) => {
    await page.goto('/customer');
    await page.waitForLoadState('networkidle');

    // Should have some content (either stats or "waiting for sync" message)
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('products page loads', async ({ page }) => {
    await page.goto('/customer/products');
    await page.waitForLoadState('networkidle');

    // Should show products heading or empty state
    const heading = page.locator('text=product').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('categories page loads', async ({ page }) => {
    await page.goto('/customer/categories');
    await page.waitForLoadState('networkidle');

    const heading = page.locator('text=Categor').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('orders page loads', async ({ page }) => {
    await page.goto('/customer/orders');
    await page.waitForLoadState('networkidle');

    const heading = page.locator('text=Order').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('stores page loads', async ({ page }) => {
    await page.goto('/customer/stores');
    await page.waitForLoadState('networkidle');

    const heading = page.locator('text=Store').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('terminals page loads', async ({ page }) => {
    await page.goto('/customer/terminals');
    await page.waitForLoadState('networkidle');

    const heading = page.locator('text=Terminal').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('users page loads', async ({ page }) => {
    await page.goto('/customer/users');
    await page.waitForLoadState('networkidle');

    const heading = page.locator('text=User').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('settings page loads', async ({ page }) => {
    await page.goto('/customer/settings');
    await page.waitForLoadState('networkidle');

    const heading = page.locator('text=Setting').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('reports page loads', async ({ page }) => {
    await page.goto('/customer/reports');
    await page.waitForLoadState('networkidle');

    const heading = page.locator('text=Report').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('sidebar navigation is visible', async ({ page }) => {
    await page.goto('/customer');
    await page.waitForLoadState('networkidle');

    // On desktop, sidebar should be visible
    if (page.viewportSize()!.width >= 1024) {
      const sidebar = page.locator('aside').first();
      await expect(sidebar).toBeVisible();
    }
  });

  test('sign out button exists', async ({ page }) => {
    await page.goto('/customer');
    await page.waitForLoadState('networkidle');

    // Look for sign out in sidebar
    if (page.viewportSize()!.width >= 1024) {
      const signOut = page.locator('button:has-text("Sign Out")');
      await expect(signOut).toBeVisible();
    }
  });
});
