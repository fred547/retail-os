const { chromium } = require('playwright');

const DIR = '/Users/fredericktsang/retailOs/www/screenshots';

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();

  // Go to login
  await page.goto('https://web.posterita.com/login', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(2000);

  // Find all inputs to understand the form
  const html = await page.content();
  const inputMatch = html.match(/<input[^>]*>/gi) || [];
  console.log('Found inputs:', inputMatch.length);
  inputMatch.forEach(i => console.log('  ', i.slice(0, 120)));

  // Try different selectors for email
  const selectors = [
    'input[type="email"]',
    'input[name="email"]',
    'input[placeholder*="email" i]',
    'input[placeholder*="Email"]',
    'input#email',
    'input[autocomplete="email"]',
    'input:first-of-type',
  ];

  let emailSelector = null;
  for (const s of selectors) {
    const el = await page.$(s);
    if (el) {
      emailSelector = s;
      console.log('Found email input with selector:', s);
      break;
    }
  }

  if (!emailSelector) {
    console.log('Could not find email input, taking login page screenshot only');
    await browser.close();
    return;
  }

  // Fill and submit
  await page.fill(emailSelector, 'e2e-test@posterita.test');

  // Find password
  const pwSelectors = ['input[type="password"]', 'input[name="password"]', 'input[placeholder*="password" i]'];
  for (const s of pwSelectors) {
    const el = await page.$(s);
    if (el) {
      await page.fill(s, 'E2E_Test_Pw_2026!');
      console.log('Found password input with selector:', s);
      break;
    }
  }

  // Submit
  const btnSelectors = ['button[type="submit"]', 'button:has-text("Sign in")', 'button:has-text("Login")', 'button:has-text("Log in")'];
  for (const s of btnSelectors) {
    const el = await page.$(s);
    if (el) {
      await el.click();
      console.log('Clicked submit with selector:', s);
      break;
    }
  }

  await page.waitForTimeout(6000);
  console.log('Current URL after login:', page.url());

  // Check if we're logged in (not still on /login)
  if (page.url().includes('/login')) {
    console.log('Login may have failed, taking error screenshot');
    await page.screenshot({ path: DIR + '/login-error.png' });
    await browser.close();
    return;
  }

  // Dashboard
  await page.screenshot({ path: DIR + '/dashboard.png' });
  console.log('OK: dashboard');

  // Navigate to each page
  const routes = [
    'products', 'orders', 'customers', 'inventory', 'reports',
    'staff', 'tags', 'quotations', 'integrations', 'stores',
    'suppliers', 'promotions', 'loyalty', 'pos'
  ];

  for (const route of routes) {
    try {
      await page.goto('https://web.posterita.com/' + route, {
        waitUntil: 'networkidle',
        timeout: 15000
      });
      await page.waitForTimeout(3000);
      await page.screenshot({ path: DIR + '/' + route + '.png' });
      console.log('OK:', route);
    } catch (e) {
      console.log('SKIP:', route, '-', e.message.slice(0, 80));
    }
  }

  await browser.close();
  console.log('Done!');
}

main().catch(e => console.error('FATAL:', e.message));
