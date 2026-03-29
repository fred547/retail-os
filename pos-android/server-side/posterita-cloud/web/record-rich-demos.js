const { chromium } = require('playwright');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const DEMOS_DIR = '/Users/fredericktsang/retailOs/www/demos';
const SCREENSHOTS_DIR = '/Users/fredericktsang/retailOs/www/img';
const VP = { width: 1440, height: 900 };

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: VP,
    deviceScaleFactor: 2,
    recordVideo: { dir: DEMOS_DIR, size: VP },
  });
  const page = await ctx.newPage();

  // Login via customer portal (test account has data now)
  console.log('Logging in...');
  await page.goto('https://web.posterita.com/customer/login', { waitUntil: 'domcontentloaded', timeout: 20000 });
  try {
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
    await page.waitForTimeout(8000);
    console.log('Logged in at:', page.url());
  } catch (e) {
    console.log('Login error:', e.message.slice(0, 80));
  }

  // Take rich screenshots of each page (wait longer for data to load)
  const pages = [
    { route: '', name: 'dashboard', wait: 5000, scroll: 400 },
    { route: 'products', name: 'products', wait: 5000, scroll: 300 },
    { route: 'orders', name: 'orders', wait: 5000, scroll: 300 },
    { route: 'customers', name: 'customers', wait: 5000, scroll: 300 },
    { route: 'reports', name: 'reports', wait: 5000, scroll: 400 },
    { route: 'staff', name: 'staff', wait: 4000, scroll: 400 },
    { route: 'loyalty', name: 'loyalty', wait: 4000, scroll: 300 },
    { route: 'promotions', name: 'promotions', wait: 4000, scroll: 0 },
    { route: 'shifts', name: 'shifts', wait: 4000, scroll: 0 },
    { route: 'tags', name: 'tags', wait: 4000, scroll: 0 },
    { route: 'integrations', name: 'integrations', wait: 4000, scroll: 0 },
    { route: 'stores', name: 'stores', wait: 4000, scroll: 0 },
    { route: 'suppliers', name: 'suppliers', wait: 4000, scroll: 0 },
    { route: 'inventory', name: 'inventory', wait: 4000, scroll: 0 },
    { route: 'billing', name: 'billing', wait: 4000, scroll: 400 },
    { route: 'categories', name: 'categories', wait: 4000, scroll: 0 },
  ];

  for (const p of pages) {
    try {
      const url = p.route ? `https://web.posterita.com/${p.route}` : 'https://web.posterita.com/customer';
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(p.wait);

      // Scroll if needed to show more content
      if (p.scroll > 0) {
        await page.evaluate((s) => window.scrollBy({ top: s, behavior: 'smooth' }), p.scroll);
        await page.waitForTimeout(1500);
      }

      // Take high-quality screenshot
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, `${p.name}.png`),
        fullPage: false
      });
      console.log(`OK: ${p.name}`);
    } catch (e) {
      console.log(`SKIP: ${p.name} - ${e.message.slice(0, 60)}`);
    }
  }

  // Record a smooth sidebar tour video (for GIF)
  console.log('\nRecording sidebar tour...');
  const tourRoutes = ['products', 'orders', 'customers', 'loyalty', 'promotions', 'reports', 'staff', 'shifts', 'integrations', 'billing'];
  for (const route of tourRoutes) {
    try {
      await page.goto(`https://web.posterita.com/${route}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(3000);
    } catch (e) {
      console.log(`Tour skip: ${route}`);
    }
  }

  await page.close();
  const videoPath = await page.video().path();
  await ctx.close();
  await browser.close();

  // Rename tour video
  const tourVideo = path.join(DEMOS_DIR, 'full-tour.webm');
  if (fs.existsSync(videoPath)) {
    fs.renameSync(videoPath, tourVideo);
    console.log(`Tour video: ${tourVideo}`);
  }

  // Create the platform tour GIF from fresh screenshots
  console.log('\nCreating animated GIFs...');

  const gifScreens = ['products', 'orders', 'customers', 'reports', 'staff', 'loyalty', 'promotions', 'integrations', 'billing'];
  const existingScreens = gifScreens.filter(s => fs.existsSync(path.join(SCREENSHOTS_DIR, `${s}.png`)));

  if (existingScreens.length >= 4) {
    const inputs = existingScreens.map(s => `-loop 1 -t 2.5 -i "${path.join(SCREENSHOTS_DIR, `${s}.png`)}"`).join(' ');
    const concatFilter = existingScreens.map((_, i) => `[${i}:v]`).join('') + `concat=n=${existingScreens.length}:v=1:a=0[v]`;
    const cmd = `ffmpeg -y ${inputs} -filter_complex "${concatFilter};[v]fps=4,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer" -loop 0 "${path.join(DEMOS_DIR, 'platform-tour.gif')}"`;

    try {
      execSync(cmd, { stdio: 'pipe', timeout: 120000 });
      const size = (fs.statSync(path.join(DEMOS_DIR, 'platform-tour.gif')).size / 1024).toFixed(0);
      console.log(`Platform tour GIF: ${size}KB (${existingScreens.length} screens)`);
    } catch (e) {
      console.log('GIF error:', e.message.slice(0, 80));
    }
  }

  console.log('\nDone! Screenshots in:', SCREENSHOTS_DIR);
  execSync(`ls -lh ${SCREENSHOTS_DIR}/*.png | wc -l`, { stdio: 'inherit' });
}

main().catch(e => console.error('FATAL:', e.message));
