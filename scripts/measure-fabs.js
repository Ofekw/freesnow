/**
 * Measure the rendered sizes of the three FAB buttons in the fab-group
 * to diagnose why they appear different sizes.
 */

import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4173';

async function measureFabs() {
  console.log('Launching browser to measure FAB buttons...');
  console.log(`Base URL: ${BASE_URL}`);

  const browser = await chromium.launch();

  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      serviceWorkers: 'block',
    });

    const page = await context.newPage();

    // Mock API calls so the page loads without real data
    await page.route('**/*open-meteo.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('.fab-group', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Measure all .fab buttons inside .fab-group
    const measurements = await page.evaluate(() => {
      const fabGroup = document.querySelector('.fab-group');
      if (!fabGroup) return { error: 'No .fab-group found' };

      const fabs = fabGroup.querySelectorAll('.fab');
      const results = [];

      fabs.forEach((fab, i) => {
        const rect = fab.getBoundingClientRect();
        const computed = window.getComputedStyle(fab);
        results.push({
          index: i,
          text: fab.textContent?.trim(),
          className: fab.className,
          width: rect.width,
          height: rect.height,
          padding: computed.padding,
          paddingTop: computed.paddingTop,
          paddingRight: computed.paddingRight,
          paddingBottom: computed.paddingBottom,
          paddingLeft: computed.paddingLeft,
          fontSize: computed.fontSize,
          lineHeight: computed.lineHeight,
          boxSizing: computed.boxSizing,
          borderWidth: computed.borderWidth,
          display: computed.display,
          alignItems: computed.alignItems,
          gap: computed.gap,
          minWidth: computed.minWidth,
          minHeight: computed.minHeight,
        });
      });

      return { fabGroupRect: fabGroup.getBoundingClientRect(), fabs: results };
    });

    console.log('\n=== FAB Group Measurements ===\n');
    console.log(JSON.stringify(measurements, null, 2));

    // Also take a screenshot of just the fab-group for reference
    const fabGroup = page.locator('.fab-group');
    await fabGroup.screenshot({ path: 'screenshots/fab-group-debug.png' });
    console.log('\nScreenshot saved to screenshots/fab-group-debug.png');

    await context.close();
  } finally {
    await browser.close();
  }
}

measureFabs().catch((error) => {
  console.error('Measurement failed:', error);
  process.exit(1);
});
