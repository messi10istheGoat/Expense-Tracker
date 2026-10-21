// Captures the actual app, not generated mockups. Run against a local development server.
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const output = process.env.REVIEW_DIR || 'test-results/review';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
await page.goto(process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173');
await page.locator('.metric-grid').waitFor();
await page.screenshot({ path: `${output}/desktop.png` });
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: `${output}/mobile.png` });
await page.getByRole('button', { name: 'Add transaction', exact: true }).first().click();
await page.screenshot({ path: `${output}/entry.png` });
await browser.close();
