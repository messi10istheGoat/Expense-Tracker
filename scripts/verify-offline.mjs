// Integration check against the built app at its actual GitHub Pages subpath.
// Run npm run build first. Install Chromium with npx playwright install chromium.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
const base = '/Expense-Tracker/';
const dist = path.resolve('dist');
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const name = decodeURIComponent(url.pathname).slice(base.length) || 'index.html';
  const file = path.resolve(dist, name);
  if (!url.pathname.startsWith(base) || !file.startsWith(`${dist}${path.sep}`)) {
    res.writeHead(404);
    res.end();
    return;
  }
  try {
    const mime =
      {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
        '.webmanifest': 'application/manifest+json',
      }[path.extname(file)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-store' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const root = `http://127.0.0.1:${server.address().port}${base}`;
let browser;
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
    ],
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  const external = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (req) => {
    if (!req.url().startsWith(root) && !req.url().startsWith('data:')) external.push(req.url());
  });
  const openApp = () => page.locator('.workspace-main').waitFor();
  await page.goto(root);
  await page.getByRole('heading', { name: 'Let’s make it yours' }).waitFor();
  assert.equal(
    await page.evaluate(() => JSON.parse(localStorage.getItem('spendwise-workspace-v1')).onboardingComplete),
    false,
  );
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.getByRole('heading', { name: 'Let’s make it yours' }).waitFor();
  assert(
    await page.evaluate(() => !!navigator.serviceWorker.controller),
    'Service worker must control the page',
  );
  await context.setOffline(true);
  await page.reload();
  await page.getByLabel('Your name', { exact: true }).fill('Offline profile');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel(/^Opening balance/).fill('100');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Start using Spendwise' }).click();
  await openApp();
  await page.getByRole('button', { name: 'Add transaction', exact: true }).click();
  await page.getByLabel('Merchant or description').fill('Offline groceries');
  await page
    .getByRole('dialog')
    .getByLabel(/Amount \(/)
    .fill('12.25');
  await page.getByRole('dialog').getByRole('button', { name: 'Add transaction', exact: true }).click();
  await page.reload();
  await openApp();
  assert(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem('spendwise-workspace-v1')).transactions.some(
        (t) => t.merchant === 'Offline groceries' && t.amount === 12.25,
      ),
    ),
    'Offline edits must persist',
  );
  const financialRecords = await page.evaluate(() => localStorage.getItem('spendwise-workspace-v1'));
  await page.getByRole('button', { name: 'Open Style Studio' }).click({ noWaitAfter: true });
  const studio = page.getByRole('dialog', { name: 'Style Studio', exact: true });
  await studio.waitFor({ state: 'visible' });
  await studio.getByRole('radio', { name: 'Neon theme' }).check();
  await studio.getByRole('button', { name: 'After hours', exact: false }).click();
  await studio.getByRole('button', { name: 'Larger', exact: true }).click();
  await studio.getByRole('button', { name: 'Close dialog' }).click();
  await page.reload();
  await openApp();
  assert.equal(await page.locator('html').getAttribute('data-style'), 'neon');
  assert.equal(await page.locator('html').getAttribute('data-text-size'), 'large');
  assert(await page.locator('html').evaluate((root) => root.classList.contains('dark')));
  assert.equal(
    await page.evaluate(() => localStorage.getItem('spendwise-workspace-v1')),
    financialRecords,
    'Offline appearance changes must not modify financial records',
  );
  // The Glassmorphism landscape is embedded in the app shell, not a network dependency.
  await page.getByRole('button', { name: 'Open Style Studio' }).click({ noWaitAfter: true });
  await page
    .getByRole('dialog', { name: 'Style Studio', exact: true })
    .getByRole('radio', { name: 'Glassmorphism theme', exact: true })
    .check();
  await page
    .getByRole('dialog', { name: 'Style Studio', exact: true })
    .getByRole('button', { name: 'Close dialog' })
    .click();
  await page.reload();
  await openApp();
  assert.equal(await page.locator('html').getAttribute('data-style'), 'glass');
  assert(
    (
      await page.locator('.spendwise').evaluate((el) => getComputedStyle(el, '::before').backgroundImage)
    ).includes('data:image/jpeg;base64,'),
    'The glass landscape must be bundled and available offline',
  );
  for (const feature of ['analytics', 'budgets', 'goals', 'bills', 'insights', 'lab']) {
    await page.goto(`${root}#${feature}`);
    await openApp();
    await page.locator('.locked-feature').waitFor();
    await page.getByRole('button', { name: 'View subscription', exact: true }).click();
    const paywall = page.getByRole('dialog', { name: 'Spendwise Pro', exact: true });
    await paywall.waitFor({ state: 'visible' });
    assert(
      await paywall.getByRole('button', { name: /Subscribe to Pro/ }).isDisabled(),
      'Production paywall must not simulate purchasing',
    );
    await paywall.getByRole('button', { name: 'Continue with Free', exact: true }).click();
    await page.reload();
    await openApp();
    await page.locator('.locked-feature').waitFor();
  }
  assert.equal(
    await page.getByLabel('Search analytics transactions', { exact: true }).count(),
    0,
    'Locked analytics must not mount',
  );
  assert.equal(
    await page.evaluate(() => localStorage.getItem('spendwise-workspace-v1')),
    financialRecords,
    'Gates and paywalls must not modify financial records',
  );
  const bundle = await readFile(path.join(dist, 'index.html'), 'utf8');
  assert(!bundle.includes('VITE_E2E_LEGACY'), 'Production must remove the development entitlement flag');
  assert(!bundle.includes('supabase.co'), 'Production must not contain the removed backend');
  await page.goto(root);
  await openApp();
  await page.getByRole('heading', { name: 'Overview', exact: true }).waitFor();
  assert.equal(await page.getByRole('heading', { name: 'Overview', exact: true }).count(), 1);
  assert.deepEqual(errors, []);
  assert.deepEqual(external, [], 'The app must not request external fonts, billing, or financial services');
  console.log(
    'PASS: production subpath, service worker control, offline reload, offline first-run setup, offline transaction/appearance persistence, all six production Pro gates, disabled billing, bundled glass landscape, no test entitlement flag, and no third-party requests.',
  );
} finally {
  if (browser) await browser.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
