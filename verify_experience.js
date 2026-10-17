const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const screenshotsDir = path.join(__dirname, 'screenshots');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

async function verify() {
  console.log('Launching Chrome from:', chromePath);
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  const consoleErrors = [];
  const consoleWarnings = [];
  const consoleLogs = [];

  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    consoleLogs.push({ type, text });
    if (type === 'error') {
      consoleErrors.push(text);
      console.error('[BROWSER ERROR]:', text);
    } else if (type === 'warn') {
      consoleWarnings.push(text);
      console.warn('[BROWSER WARN]:', text);
    } else {
      console.log(`[BROWSER ${type.toUpperCase()}]:`, text);
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
    console.error('[PAGE EXCEPTION]:', err.message);
  });

  console.log('Navigating to http://localhost:3000 ...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });

  // Wait 1.5s for initial frame and GSAP setup
  await new Promise(r => setTimeout(r, 1500));

  // Screenshot 1: Beat 1 Intro
  console.log('Capturing Beat 1 (Intro)...');
  await page.screenshot({ path: path.join(screenshotsDir, '01_hero_intro.png') });

  // Get exact ScrollTrigger max scroll distance
  const heroMetrics = await page.evaluate(() => {
    const hero = document.getElementById('hero-scroll-container');
    const maxScroll = hero ? hero.offsetHeight - window.innerHeight : 2000;
    return { maxScroll, totalHeight: hero ? hero.offsetHeight : 2880 };
  });

  const scrollToProgress = async (progress) => {
    const targetY = heroMetrics.maxScroll * progress;
    await page.evaluate(y => window.scrollTo(0, y), targetY);
    await new Promise(r => setTimeout(r, 800));
  };

  // Scroll to Beat 2: 30% progress (Figure Separation)
  console.log('Capturing Beat 2 (Separation - 30%)...');
  await scrollToProgress(0.30);
  await page.screenshot({ path: path.join(screenshotsDir, '02_figure_separation.png') });

  // Scroll to Beat 3: 49% progress (Exploded Hold)
  console.log('Capturing Beat 3 (Exploded Hold - 49%)...');
  await scrollToProgress(0.49);
  await page.screenshot({ path: path.join(screenshotsDir, '03_exploded_hold.png') });

  // Scroll to Beat 4: 68% progress (Printer Reveal)
  console.log('Capturing Beat 4 (Printer Reveal - 68%)...');
  await scrollToProgress(0.68);
  await page.screenshot({ path: path.join(screenshotsDir, '04_printer_reveal.png') });

  // Scroll to Beat 5: 88% progress (Settled Printer)
  console.log('Capturing Beat 5 (Settled Printer - 88%)...');
  await scrollToProgress(0.88);
  await page.screenshot({ path: path.join(screenshotsDir, '05_settled_printer.png') });

  // Scroll to section targets cleanly using element.offsetTop
  const scrollToElement = async (selector, offsetAdjustment = 0) => {
    await page.evaluate(({ sel, adj }) => {
      const el = document.querySelector(sel);
      if (el) {
        window.scrollTo(0, el.offsetTop + adj);
      }
    }, { sel: selector, adj: offsetAdjustment });
    await new Promise(r => setTimeout(r, 800));
  };

  // Scroll to Featured Products
  console.log('Capturing Featured Products...');
  await scrollToElement('#products');
  await page.screenshot({ path: path.join(screenshotsDir, '06_featured_products.png') });

  // Scroll to Categories
  console.log('Capturing Categories...');
  await scrollToElement('#categories');
  await page.screenshot({ path: path.join(screenshotsDir, '07_categories.png') });

  // Scroll to 3D Printing Service
  console.log('Capturing 3D Printing Service...');
  await scrollToElement('#printing-service');
  await page.screenshot({ path: path.join(screenshotsDir, '08_printing_service.png') });

  // Scroll to Why Us & Reviews
  console.log('Capturing Why Us & Reviews...');
  await scrollToElement('#why-us');
  await page.screenshot({ path: path.join(screenshotsDir, '09_trust_and_reviews.png') });

  // Scroll to Final CTA & Footer
  console.log('Capturing Final CTA & Footer...');
  await scrollToElement('.final-cta-section');
  await page.screenshot({ path: path.join(screenshotsDir, '10_final_cta_and_footer.png') });

  // Test Case: Mid-scroll reload recovery (Priority 2 verification)
  console.log('\nTesting mid-scroll reload recovery...');
  await page.evaluate(() => window.scrollTo(0, 1500));
  await new Promise(r => setTimeout(r, 400));
  console.log('Reloading page at scrollY = 1500...');
  await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));
  
  const midScrollStatus = await page.evaluate(() => {
    const canvas = document.getElementById('hero-canvas');
    const controller = window.heroController;
    return {
      scrollY: window.scrollY,
      targetProgress: controller ? controller.targetProgress : null,
      smoothProgress: controller ? controller.smoothProgress : null,
      currentGlobalFrame: controller ? controller.currentGlobalFrame : null,
      hasCanvas: Boolean(canvas && canvas.width > 0 && canvas.height > 0)
    };
  });
  console.log('Mid-scroll reload state:', midScrollStatus);

  // Test Case: 404 route handling verification (Priority 5)
  console.log('\nTesting 404 route handling via HTTP request...');
  const check404 = await new Promise((resolve) => {
    const http = require('http');
    http.get('http://localhost:3000/non-existent-test-page', (res) => {
      resolve(res.statusCode);
    }).on('error', () => resolve(0));
  });
  console.log('404 response status:', check404);
  if (check404 !== 404) {
    console.error('Expected 404 status but got:', check404);
    consoleErrors.push(`Expected 404 status code, got ${check404}`);
  }


  await browser.close();

  console.log('\n=== VERIFICATION SUMMARY ===');
  console.log('Total console logs:', consoleLogs.length);
  console.log('Total console warnings:', consoleWarnings.length);
  console.log('Total console errors:', consoleErrors.length);

  if (consoleErrors.length > 0) {
    console.error('Errors found:', consoleErrors);
    process.exit(1);
  } else {
    console.log('✓ Verification PASSED with ZERO runtime/console errors!');
  }
}

verify().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
