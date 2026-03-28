const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const pages = [
    { url: 'https://web.posterita.com/login', name: 'login', waitFor: 2000 },
    { url: 'https://web.posterita.com/pos', name: 'pos-checkout', waitFor: 3000 },
    { url: 'https://web.posterita.com/pos/setup', name: 'pos-setup', waitFor: 2000 },
  ];

  // Public pages that don't need auth
  const publicPages = [
    { url: 'https://web.posterita.com/login', name: 'login' },
    { url: 'https://web.posterita.com/download', name: 'download' },
    { url: 'https://web.posterita.com/offline', name: 'offline' },
  ];

  for (const p of publicPages) {
    try {
      const page = await context.newPage();
      await page.goto(p.url, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000);
      await page.screenshot({
        path: `screenshots/${p.name}.png`,
        fullPage: false
      });
      console.log(`OK: ${p.name}`);
      await page.close();
    } catch (e) {
      console.log(`SKIP: ${p.name} - ${e.message.slice(0, 80)}`);
    }
  }

  // Try authenticated pages
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;

  if (email && password) {
    const page = await context.newPage();
    try {
      await page.goto('https://web.posterita.com/login', { waitUntil: 'networkidle', timeout: 15000 });
      await page.fill('input[type="email"]', email);
      await page.fill('input[type="password"]', password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);

      // Dashboard
      await page.screenshot({ path: 'screenshots/dashboard.png' });
      console.log('OK: dashboard');

      // Products
      await page.goto('https://web.posterita.com/products', { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshots/products.png' });
      console.log('OK: products');

      // Orders
      await page.goto('https://web.posterita.com/orders', { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshots/orders.png' });
      console.log('OK: orders');

      // Customers
      await page.goto('https://web.posterita.com/customers', { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshots/customers.png' });
      console.log('OK: customers');

      // Inventory
      await page.goto('https://web.posterita.com/inventory', { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshots/inventory.png' });
      console.log('OK: inventory');

      // Reports
      await page.goto('https://web.posterita.com/reports', { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshots/reports.png' });
      console.log('OK: reports');

      // Staff/Shifts
      await page.goto('https://web.posterita.com/staff', { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshots/staff.png' });
      console.log('OK: staff');

      // Tags
      await page.goto('https://web.posterita.com/tags', { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshots/tags.png' });
      console.log('OK: tags');

      // Quotations
      await page.goto('https://web.posterita.com/quotations', { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshots/quotations.png' });
      console.log('OK: quotations');

      // Integrations
      await page.goto('https://web.posterita.com/integrations', { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshots/integrations.png' });
      console.log('OK: integrations');

      // Stores
      await page.goto('https://web.posterita.com/stores', { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshots/stores.png' });
      console.log('OK: stores');

      // Suppliers
      await page.goto('https://web.posterita.com/suppliers', { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshots/suppliers.png' });
      console.log('OK: suppliers');

    } catch (e) {
      console.log(`AUTH ERROR: ${e.message.slice(0, 120)}`);
    }
    await page.close();
  } else {
    console.log('SKIP: authenticated pages (no E2E_TEST_EMAIL/E2E_TEST_PASSWORD)');
  }

  await browser.close();
  console.log('Done!');
})();
