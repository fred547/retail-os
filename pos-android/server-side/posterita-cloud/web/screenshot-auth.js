const { chromium } = require('playwright');

const DIR = '/Users/fredericktsang/retailOs/www/screenshots';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();

  // Screenshot the login portal page first (it's a nice page)
  await page.goto('https://web.posterita.com/login', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: DIR + '/login-portal.png' });
  console.log('OK: login-portal');

  // Go to customer login
  await page.goto('https://web.posterita.com/customer/login', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: DIR + '/customer-login.png' });
  console.log('OK: customer-login');

  // Try to find login form
  try {
    await page.waitForSelector('input', { timeout: 8000 });
    const inputs = await page.locator('input').all();
    console.log('Found', inputs.length, 'inputs on customer login');

    // Fill credentials
    for (const inp of inputs) {
      const type = await inp.getAttribute('type');
      if (type === 'email' || type === 'text') {
        await inp.fill('e2e-test@posterita.test');
        console.log('Filled email');
      } else if (type === 'password') {
        await inp.fill('E2E_Test_Pw_2026!');
        console.log('Filled password');
      }
    }

    // Submit
    const btn = page.locator('button[type="submit"]').first();
    if (await btn.count() > 0) {
      await btn.click();
      console.log('Clicked submit');
    }

    await page.waitForTimeout(8000);
    console.log('URL after login:', page.url());
  } catch (e) {
    console.log('No inputs found on customer login:', e.message.slice(0, 60));
  }

  // If not authenticated, try manager login
  if (page.url().includes('login')) {
    console.log('Trying manager login...');
    await page.goto('https://web.posterita.com/manager/login', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: DIR + '/manager-login.png' });
    console.log('OK: manager-login');

    try {
      await page.waitForSelector('input', { timeout: 8000 });
      const inputs = await page.locator('input').all();
      console.log('Found', inputs.length, 'inputs on manager login');

      for (const inp of inputs) {
        const type = await inp.getAttribute('type');
        if (type === 'email' || type === 'text') {
          await inp.fill('e2e-test@posterita.test');
        } else if (type === 'password') {
          await inp.fill('E2E_Test_Pw_2026!');
        }
      }

      const btn = page.locator('button[type="submit"]').first();
      if (await btn.count() > 0) {
        await btn.click();
        console.log('Clicked manager submit');
      }

      await page.waitForTimeout(8000);
      console.log('URL after manager login:', page.url());
    } catch (e) {
      console.log('No inputs on manager login:', e.message.slice(0, 60));
    }
  }

  // Take screenshot of wherever we ended up
  await page.screenshot({ path: DIR + '/after-login.png' });
  console.log('OK: after-login at', page.url());

  // If we got past login, take all page screenshots
  if (!page.url().includes('login')) {
    const routes = [
      'products', 'orders', 'customers', 'inventory', 'reports',
      'staff', 'tags', 'quotations', 'integrations', 'stores',
      'suppliers', 'promotions', 'loyalty', 'pos'
    ];

    for (const route of routes) {
      try {
        await page.goto('https://web.posterita.com/' + route, {
          waitUntil: 'domcontentloaded',
          timeout: 15000
        });
        await page.waitForTimeout(4000);
        await page.screenshot({ path: DIR + '/' + route + '.png' });
        console.log('OK:', route);
      } catch (e) {
        console.log('SKIP:', route, '-', e.message.slice(0, 80));
      }
    }
  } else {
    console.log('Could not authenticate - only public screenshots taken');
  }

  await browser.close();
  console.log('Done!');
}

main().catch(function(e) { console.error('FATAL:', e.message); });
