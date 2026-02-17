/**
 * Screenshot generation script for PR CI
 * Takes screenshots of key pages in desktop and mobile viewports
 * Uses mocked API responses for consistent, deterministic screenshots
 */

import { chromium } from 'playwright';
import { resolve, dirname } from 'path';
import { mkdir, readFile } from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCREENSHOT_DIR = resolve(__dirname, '../screenshots');
const MOCKS_DIR = resolve(__dirname, 'mocks');
const BASE_URL = process.env.BASE_URL || 'http://localhost:4173';
const MAX_LOG_URL_LENGTH = 80;

// Viewport configurations
const VIEWPORTS = {
  desktop: { width: 1920, height: 1080 },
  mobile: { width: 375, height: 667 },
};

// Pages to screenshot
const PAGES = [
  { name: 'home', path: '/', waitFor: 'h1' },
  { name: 'crystal-mountain', path: '/resort/crystal-mountain-wa', waitFor: 'h1' },
];

// Load mock data
async function loadMockData() {
  const mockFile = resolve(MOCKS_DIR, 'crystal-mountain-forecast.json');
  const content = await readFile(mockFile, 'utf-8');
  return JSON.parse(content);
}

async function takeScreenshots() {
  console.log('Starting screenshot generation...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Screenshot directory: ${SCREENSHOT_DIR}`);
  console.log('Using mocked API responses for deterministic screenshots');

  // Ensure screenshot directory exists
  await mkdir(SCREENSHOT_DIR, { recursive: true });

  // Load mock data
  const mockForecast = await loadMockData();

  // Launch browser
  const browser = await chromium.launch();
  
  try {
    for (const viewport of Object.keys(VIEWPORTS)) {
      console.log(`\nTaking ${viewport} screenshots...`);
      
      const context = await browser.newContext({
        viewport: VIEWPORTS[viewport],
        serviceWorkers: 'block',
      });
      
      const page = await context.newPage();
      
      // Intercept Open-Meteo API calls and return mock data
      await page.route('**/*open-meteo.com/**', async (route) => {
        const url = route.request().url();
        console.log(`  🔀 Intercepted API call: ${url.substring(0, MAX_LOG_URL_LENGTH)}...`);
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockForecast),
        });
      });
      
      for (const pageConfig of PAGES) {
        const url = `${BASE_URL}${pageConfig.path}`;
        console.log(`  📸 ${pageConfig.name} (${viewport}): ${url}`);
        
        try {
          // Navigate to page
          await page.goto(url, { waitUntil: 'networkidle' });
          
          // Wait for main content to be visible
          await page.waitForSelector(pageConfig.waitFor, { timeout: 10000 });
          
          // Give a bit more time for fonts, images, etc to load
          await page.waitForTimeout(2000);
          
          // Take screenshot
          const filename = `${pageConfig.name}-${viewport}.png`;
          const filepath = resolve(SCREENSHOT_DIR, filename);
          await page.screenshot({ path: filepath, fullPage: true });
          
          console.log(`     ✓ Saved to ${filename}`);
        } catch (error) {
          console.error(`     ✗ Failed: ${error.message}`);
          throw error;
        }
      }
      
      await context.close();
    }
  } finally {
    await browser.close();
  }
  
  console.log('\n✓ All screenshots generated successfully!');
}

// Run the script
takeScreenshots().catch((error) => {
  console.error('Screenshot generation failed:', error);
  process.exit(1);
});
