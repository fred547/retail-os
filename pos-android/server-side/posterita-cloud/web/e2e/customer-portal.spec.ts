import { test, expect } from '@playwright/test';

test.describe('Customer Portal', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/customer/login');
    await expect(page).toHaveURL(/\/customer\/login/);
    // Should have a login form
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
  });

  test('unauthenticated access redirects to login', async ({ browser }) => {
    // Fresh context with no auth
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/customer/products');
    await expect(page).toHaveURL(/\/customer\/login/);

    await context.close();
  });

  test('login page has correct structure', async ({ page }) => {
    await page.goto('/customer/login');

    // Should have email input
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await expect(emailInput).toBeVisible();

    // Should have password input
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    await expect(passwordInput).toBeVisible();

    // Should have submit button
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In")');
    await expect(submitButton).toBeVisible();
  });
});
