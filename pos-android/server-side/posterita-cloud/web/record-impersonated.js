const { chromium } = require('playwright');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const DEMOS_DIR = '/Users/fredericktsang/retailOs/www/demos';
const IMG_DIR = '/Users/fredericktsang/retailOs/www/img';
const VP = { width: 1440, height: 900 };

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: VP, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  // Step 1: Login as account manager
  console.log('Step 1: Login as account manager...');
  await page.goto('https://web.posterita.com/customer/login', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForSelector('input', { timeout: 10000 });
  await page.waitForTimeout(1000);
  const inputs = await page.locator('input').all();
  for (const inp of inputs) {
    const type = await inp.getAttribute('type');
    if (type === 'email' || type === 'text') await inp.fill('e2e-test@posterita.test');
    else if (type === 'password') await inp.fill('E2E_Test_Pw_2026!');
  }
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(6000);
  console.log('  At:', page.url());

  // Step 2: Switch to Yadea demo account via super-admin API
  console.log('Step 2: Impersonate Yadea demo...');
  const switchRes = await page.evaluate(async () => {
    const res = await fetch('/api/super-admin/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_id: 'demo_c962a50d' }),
    });
    return { status: res.status, body: await res.json() };
  });
  console.log('  Switch result:', JSON.stringify(switchRes));

  if (switchRes.status !== 200) {
    console.log('Failed to impersonate. Trying direct customer routes...');
  }

  // Step 3: Navigate to customer pages (which should now use impersonated account)
  const routes = [
    { path: '/customer', name: 'dashboard', wait: 5000 },
    { path: '/customer/products', name: 'products', wait: 5000 },
    { path: '/customer/orders', name: 'orders', wait: 5000 },
    { path: '/customer/customers', name: 'customers', wait: 5000 },
    { path: '/customer/reports', name: 'reports', wait: 5000 },
    { path: '/customer/staff', name: 'staff', wait: 4000 },
    { path: '/customer/loyalty', name: 'loyalty', wait: 4000 },
    { path: '/customer/promotions', name: 'promotions', wait: 4000 },
    { path: '/customer/shifts', name: 'shifts', wait: 4000 },
    { path: '/customer/tags', name: 'tags', wait: 4000 },
    { path: '/customer/integrations', name: 'integrations', wait: 4000 },
    { path: '/customer/stores', name: 'stores', wait: 4000 },
    { path: '/customer/suppliers', name: 'suppliers', wait: 4000 },
    { path: '/customer/billing', name: 'billing', wait: 4000 },
    { path: '/customer/categories', name: 'categories', wait: 4000 },
  ];

  for (const r of routes) {
    try {
      await page.goto('https://web.posterita.com' + r.path, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(r.wait);
      await page.screenshot({ path: path.join(IMG_DIR, r.name + '.png') });
      console.log('OK:', r.name);
    } catch (e) {
      console.log('SKIP:', r.name, '-', e.message.slice(0, 60));
    }
  }

  // Also get the dashboard without /customer prefix
  try {
    await page.goto('https://web.posterita.com/products', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.join(IMG_DIR, 'products-alt.png') });
    console.log('OK: products-alt');
  } catch (e) {
    console.log('SKIP: products-alt');
  }

  await browser.close();

  // Create platform tour GIF from new screenshots
  console.log('\nCreating platform tour GIF...');
  const gifScreens = ['products', 'orders', 'customers', 'reports', 'staff', 'loyalty', 'promotions', 'shifts', 'integrations', 'stores'];
  const existing = gifScreens.filter(s => fs.existsSync(path.join(IMG_DIR, s + '.png')));

  if (existing.length >= 3) {
    const inputs = existing.map(s => `-loop 1 -t 2 -i "${path.join(IMG_DIR, s + '.png')}"`).join(' ');
    const concat = existing.map((_, i) => `[${i}:v]`).join('') + `concat=n=${existing.length}:v=1:a=0[v]`;
    const cmd = `ffmpeg -y ${inputs} -filter_complex "${concat};[v]fps=4,scale=720:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer" -loop 0 "${path.join(DEMOS_DIR, 'platform-tour.gif')}"`;
    try {
      execSync(cmd, { stdio: 'pipe', timeout: 120000 });
      const kb = (fs.statSync(path.join(DEMOS_DIR, 'platform-tour.gif')).size / 1024).toFixed(0);
      console.log('Tour GIF:', kb + 'KB (' + existing.length + ' screens)');
    } catch (e) {
      console.log('GIF error:', e.message.slice(0, 60));
    }
  }

  console.log('\nDone!');
}

main().catch(e => console.error('FATAL:', e.message));
