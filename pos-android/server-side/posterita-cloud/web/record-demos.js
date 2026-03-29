const { chromium } = require('playwright');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const DEMOS_DIR = '/Users/fredericktsang/retailOs/www/demos';
const VIEWPORT = { width: 1280, height: 720 };

async function recordDemo(name, actions) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    recordVideo: { dir: DEMOS_DIR, size: VIEWPORT },
  });
  const page = await context.newPage();

  try {
    await actions(page);
  } catch (e) {
    console.log(`ERROR [${name}]:`, e.message.slice(0, 100));
  }

  await page.close();
  const videoPath = await page.video().path();
  await context.close();
  await browser.close();

  // Rename video
  const finalPath = path.join(DEMOS_DIR, `${name}.webm`);
  if (fs.existsSync(videoPath)) {
    fs.renameSync(videoPath, finalPath);
    console.log(`OK: ${name} → ${finalPath}`);

    // Convert to GIF
    const gifPath = path.join(DEMOS_DIR, `${name}.gif`);
    try {
      execSync(
        `ffmpeg -y -i "${finalPath}" -vf "fps=8,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer" -loop 0 "${gifPath}"`,
        { stdio: 'pipe', timeout: 60000 }
      );
      const sizeMB = (fs.statSync(gifPath).size / 1024 / 1024).toFixed(1);
      console.log(`  GIF: ${gifPath} (${sizeMB} MB)`);
    } catch (e) {
      console.log(`  GIF conversion failed: ${e.message.slice(0, 60)}`);
    }
  }
}

async function loginAndNavigate(page) {
  await page.goto('https://web.posterita.com/customer/login', { waitUntil: 'load', timeout: 20000 });
  await page.waitForSelector('input', { timeout: 10000 });
  await page.waitForTimeout(1000);

  const inputs = await page.locator('input').all();
  for (const inp of inputs) {
    const type = await inp.getAttribute('type');
    if (type === 'email' || type === 'text') await inp.fill('e2e-test@posterita.test');
    else if (type === 'password') await inp.fill('E2E_Test_Pw_2026!');
  }
  const btn = page.locator('button[type="submit"]').first();
  if (await btn.count() > 0) await btn.click();
  await page.waitForTimeout(6000);
}

(async () => {
  console.log('Recording platform demos...\n');

  // 1. Login Flow
  await recordDemo('01-login', async (page) => {
    await page.goto('https://web.posterita.com/login', { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(3000);
    // Click customer portal
    const customerLink = page.locator('a[href*="customer/login"]').first();
    if (await customerLink.count() > 0) await customerLink.click();
    await page.waitForTimeout(3000);
  });

  // 2. Dashboard
  await recordDemo('02-dashboard', async (page) => {
    await loginAndNavigate(page);
    await page.waitForTimeout(3000);
    // Scroll down slowly
    await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
    await page.waitForTimeout(2000);
  });

  // 3. Products + Catalogue
  await recordDemo('03-products', async (page) => {
    await loginAndNavigate(page);
    await page.goto('https://web.posterita.com/products', { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(3000);
    await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
    await page.waitForTimeout(2000);
  });

  // 4. Reports
  await recordDemo('04-reports', async (page) => {
    await loginAndNavigate(page);
    await page.goto('https://web.posterita.com/reports', { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(3000);
    await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
    await page.waitForTimeout(2000);
  });

  // 5. Staff & Workforce
  await recordDemo('05-staff', async (page) => {
    await loginAndNavigate(page);
    await page.goto('https://web.posterita.com/staff', { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(3000);
    await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
    await page.waitForTimeout(2000);
  });

  // 6. Integrations
  await recordDemo('06-integrations', async (page) => {
    await loginAndNavigate(page);
    await page.goto('https://web.posterita.com/integrations', { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(3000);
  });

  // 7. Loyalty
  await recordDemo('07-loyalty', async (page) => {
    await loginAndNavigate(page);
    await page.goto('https://web.posterita.com/loyalty', { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(3000);
    await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
    await page.waitForTimeout(2000);
  });

  // 8. Stores + Setup
  await recordDemo('08-stores', async (page) => {
    await loginAndNavigate(page);
    await page.goto('https://web.posterita.com/stores', { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.goto('https://web.posterita.com/terminals', { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.goto('https://web.posterita.com/users', { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(2000);
  });

  // 9. Suppliers
  await recordDemo('09-suppliers', async (page) => {
    await loginAndNavigate(page);
    await page.goto('https://web.posterita.com/suppliers', { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(3000);
  });

  // 10. Tags
  await recordDemo('10-tags', async (page) => {
    await loginAndNavigate(page);
    await page.goto('https://web.posterita.com/tags', { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(3000);
  });

  // 11. Billing
  await recordDemo('11-billing', async (page) => {
    await loginAndNavigate(page);
    await page.goto('https://web.posterita.com/billing', { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(3000);
    await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
    await page.waitForTimeout(2000);
  });

  // 12. Sidebar navigation tour
  await recordDemo('12-sidebar-tour', async (page) => {
    await loginAndNavigate(page);
    const routes = ['products', 'orders', 'customers', 'loyalty', 'shifts', 'promotions', 'reports'];
    for (const route of routes) {
      await page.goto(`https://web.posterita.com/${route}`, { waitUntil: 'load', timeout: 15000 });
      await page.waitForTimeout(1500);
    }
  });

  // 13. Signup flow
  await recordDemo('13-signup', async (page) => {
    await page.goto('https://web.posterita.com/customer/signup', { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(2000);
    // Fill step 1
    const firstNameInput = page.locator('input[placeholder="John"]').first();
    if (await firstNameInput.count() > 0) {
      await firstNameInput.fill('Demo');
      await page.waitForTimeout(500);
    }
    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.count() > 0) {
      await emailInput.fill('demo@example.com');
      await page.waitForTimeout(500);
    }
    const pwInput = page.locator('input[type="password"]').first();
    if (await pwInput.count() > 0) {
      await pwInput.fill('demo123456');
      await page.waitForTimeout(500);
    }
    await page.waitForTimeout(2000);
    // Click continue to show step 2
    const continueBtn = page.locator('button:has-text("Continue")').first();
    if (await continueBtn.count() > 0) await continueBtn.click();
    await page.waitForTimeout(3000);
  });

  console.log('\nAll demos recorded!');
  console.log('Files in:', DEMOS_DIR);
  execSync(`ls -lh ${DEMOS_DIR}/*.gif 2>/dev/null || echo "No GIFs yet"`, { stdio: 'inherit' });
})();
