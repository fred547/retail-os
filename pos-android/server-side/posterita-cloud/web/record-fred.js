const { chromium } = require('playwright');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const IMG = '/Users/fredericktsang/retailOs/www/img';
const DEMOS = '/Users/fredericktsang/retailOs/www/demos';
const VP = { width: 1440, height: 900 };

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: VP, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  // Login as fred
  console.log('Logging in as fred@tamakgroup.com...');
  await page.goto('https://web.posterita.com/customer/login', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForSelector('input', { timeout: 10000 });
  await page.waitForTimeout(1000);
  const inputs = await page.locator('input').all();
  for (const inp of inputs) {
    const type = await inp.getAttribute('type');
    if (type === 'email' || type === 'text') await inp.fill('fred@tamakgroup.com');
    else if (type === 'password') await inp.fill('123456');
  }
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(8000);
  console.log('At:', page.url());

  // Check if we're on manager portal — if so, switch to Yadea demo
  if (page.url().includes('manager')) {
    console.log('On manager portal — switching to Yadea demo...');
    const switchRes = await page.evaluate(async () => {
      const res = await fetch('/api/super-admin/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: 'demo_c962a50d' }),
      });
      return { status: res.status, body: await res.json() };
    });
    console.log('Switch:', JSON.stringify(switchRes));
    await page.waitForTimeout(2000);
  }

  // Take screenshots of all key pages
  const pages = [
    { path: '/customer', name: 'dashboard', wait: 5000 },
    { path: '/customer/products', name: 'products', wait: 5000 },
    { path: '/customer/orders', name: 'orders', wait: 5000 },
    { path: '/customer/customers', name: 'customers', wait: 5000 },
    { path: '/customer/reports', name: 'reports', wait: 6000 },
    { path: '/customer/staff', name: 'staff', wait: 5000 },
    { path: '/customer/loyalty', name: 'loyalty', wait: 4000 },
    { path: '/customer/promotions', name: 'promotions', wait: 4000 },
    { path: '/customer/shifts', name: 'shifts', wait: 4000 },
    { path: '/customer/tags', name: 'tags', wait: 4000 },
    { path: '/customer/integrations', name: 'integrations', wait: 4000 },
    { path: '/customer/stores', name: 'stores', wait: 4000 },
    { path: '/customer/suppliers', name: 'suppliers', wait: 4000 },
    { path: '/customer/billing', name: 'billing', wait: 5000 },
    { path: '/customer/categories', name: 'categories', wait: 4000 },
    { path: '/customer/quotations', name: 'quotations', wait: 4000 },
    { path: '/customer/inventory', name: 'inventory', wait: 4000 },
  ];

  for (const p of pages) {
    try {
      await page.goto('https://web.posterita.com' + p.path, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(p.wait);
      await page.screenshot({ path: path.join(IMG, p.name + '.png') });
      console.log('OK:', p.name);
    } catch (e) {
      // Try without /customer prefix
      try {
        const altPath = p.path.replace('/customer/', '/');
        await page.goto('https://web.posterita.com' + altPath, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForTimeout(p.wait);
        await page.screenshot({ path: path.join(IMG, p.name + '.png') });
        console.log('OK (alt):', p.name);
      } catch (e2) {
        console.log('SKIP:', p.name, '-', e2.message.slice(0, 50));
      }
    }
  }

  // Also capture login portal and signup
  await page.goto('https://web.posterita.com/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(IMG, 'login-portal.png') });
  console.log('OK: login-portal');

  await browser.close();

  // Build platform tour GIF from new screenshots
  console.log('\nBuilding platform tour GIF...');
  const gifOrder = ['products', 'orders', 'customers', 'reports', 'staff', 'loyalty', 'promotions', 'shifts', 'integrations', 'stores', 'billing'];
  const existing = gifOrder.filter(s => fs.existsSync(path.join(IMG, s + '.png')));
  console.log('Screens for GIF:', existing.join(', '));

  if (existing.length >= 3) {
    const inp = existing.map(s => `-loop 1 -t 2 -i "${path.join(IMG, s + '.png')}"`).join(' ');
    const concat = existing.map((_, i) => `[${i}:v]`).join('') + `concat=n=${existing.length}:v=1:a=0[v]`;
    const cmd = `ffmpeg -y ${inp} -filter_complex "${concat};[v]fps=4,scale=720:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer" -loop 0 "${path.join(DEMOS, 'platform-tour.gif')}"`;
    try {
      execSync(cmd, { stdio: 'pipe', timeout: 120000 });
      const kb = (fs.statSync(path.join(DEMOS, 'platform-tour.gif')).size / 1024).toFixed(0);
      console.log('Tour GIF:', kb + 'KB');
    } catch (e) {
      console.log('GIF error:', e.message.slice(0, 60));
    }
  }

  console.log('\nDone!');
}

main().catch(e => console.error('FATAL:', e.message));
