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
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.goto(process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173');
await page.getByRole('heading', { name: 'Let’s make it yours' }).waitFor();
await page.screenshot({ path: `${output}/onboarding-desktop.png` });
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: `${output}/onboarding-mobile.png` });
await page.getByLabel('Your name', { exact: true }).fill('Nadia');
await page.getByRole('button', { name: 'Continue', exact: true }).click();
await page.getByLabel('Account name', { exact: true }).fill('Everyday wallet');
await page.getByLabel(/^Opening balance/).fill('250');
await page.getByRole('button', { name: 'Continue', exact: true }).click();
await page.getByRole('button', { name: 'Start using Spendwise' }).click();
await page.locator('.metric-grid').waitFor();
await page.getByRole('button', { name: 'Add transaction', exact: true }).first().click();
await page.getByLabel('Merchant or description').fill('Groceries');
await page
  .getByRole('dialog')
  .getByLabel(/Amount \(/)
  .fill('24.50');
await page.getByRole('dialog').getByRole('button', { name: 'Add transaction', exact: true }).click();
await page.getByRole('button', { name: 'Dismiss notification' }).click();
await page.setViewportSize({ width: 1440, height: 1000 });
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: `${output}/desktop.png` });
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: `${output}/mobile.png` });
await page.getByRole('button', { name: 'Get Pro', exact: true }).click();
await page.getByRole('dialog', { name: 'Spendwise Pro', exact: true }).waitFor();
await page.screenshot({ path: `${output}/paywall-mobile.png` });
await page.setViewportSize({ width: 1440, height: 1000 });
await page.screenshot({ path: `${output}/paywall-desktop.png` });
await page.getByRole('button', { name: 'Continue with Free', exact: true }).click();
await page.getByRole('button', { name: 'Add transaction', exact: true }).first().click();
await page.screenshot({ path: `${output}/entry.png` });
await browser.close();
