import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const key = 'spendwise-workspace-v1';
const stored = (page: Page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key);
async function setup(page: Page, { name = 'Sam', opening = '0', currency = 'USD' } = {}) {
  await page.goto('/');
  await page.getByLabel('Your name', { exact: true }).fill(name);
  await page.getByLabel(/^Display currency/).selectOption(currency);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Account name', { exact: true }).fill('My wallet');
  await page.getByLabel(/^Opening balance/).fill(opening);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Start using Spendwise' }).click();
  await expect(page.locator('.workspace-main')).toBeVisible();
}
async function add(page: Page) {
  await page.getByRole('button', { name: 'Add transaction', exact: true }).first().click();
  const d = page.getByRole('dialog');
  await d.getByLabel('Merchant or description').fill('Local groceries');
  await d.getByLabel(/Amount \(/).fill('12.50');
  await d.getByRole('button', { name: 'Add transaction', exact: true }).click();
  await expect(d).toBeHidden();
}
async function audit(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations).toEqual([]);
}
async function fits(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}
test('fresh entry is local setup, remains incomplete on reload, and has no auth or sample money', async ({
  page,
}) => {
  await page.goto('/#analytics');
  await expect(page.getByRole('heading', { name: 'Let’s make it yours' })).toBeVisible();
  expect((await stored(page)).onboardingComplete).toBe(false);
  expect((await stored(page)).transactions).toEqual([]);
  expect((await stored(page)).profile.name).toBe('');
  await page.getByLabel('Your name', { exact: true }).fill('Draft name');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Let’s make it yours' })).toBeVisible();
  expect((await stored(page)).onboardingComplete).toBe(false);
  await expect(page.getByRole('textbox', { name: /email|password/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /sign in|sign up|log in/i })).toHaveCount(0);
});
test('setup saves the chosen identity, currency and opening balance only on this device', async ({
  page,
}) => {
  await setup(page, { name: 'Nadia', currency: 'BDT', opening: '2400.50' });
  const w = await stored(page);
  expect(w.profile).toMatchObject({ name: 'Nadia', currency: 'BDT', monthlyIncome: 0 });
  expect(w.onboardingComplete).toBe(true);
  expect(w.demo).toBe(false);
  expect(w.accounts).toHaveLength(1);
  expect(w.accounts[0].label).toBe('My wallet');
  expect(w.openings.checking).toBe(2400.5);
  expect(w.transactions).toEqual([]);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Let’s make it yours' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toHaveCount(0);
  expect((await stored(page)).profile.name).toBe('Nadia');
});
test('Free supports real transactions, inline categories, accounts and safe backups', async ({ page }) => {
  await setup(page, { opening: '100' });
  await page.getByRole('button', { name: 'Add transaction', exact: true }).first().click();
  const d = page.getByRole('dialog');
  await d.getByLabel('Merchant or description').fill('Free category test');
  await d.getByLabel(/Amount \(/).fill('7.25');
  await d.getByRole('combobox', { name: 'Category', exact: true }).fill('Pets');
  await d.getByRole('option', { name: 'Add “Pets”' }).click();
  await d.getByRole('button', { name: 'Add transaction', exact: true }).click();
  await expect(d).toBeHidden();
  await page.goto('/#accounts');
  await page.getByRole('button', { name: 'New account', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Account name', { exact: true }).fill('Savings jar');
  await page.getByRole('button', { name: 'Save account', exact: true }).click();
  expect((await stored(page)).accounts).toHaveLength(2);
  await page.goto('/#settings');
  await expect(page.getByText('Spendwise Free', { exact: true })).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download backup', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/spendwise-.*\.json/);
  expect((await stored(page)).transactions[0]).toMatchObject({
    merchant: 'Free category test',
    amount: 7.25,
  });
  const backup = await stored(page);
  await page.getByRole('textbox', { name: 'Your first name', exact: true }).fill('Changed');
  await page.getByRole('button', { name: 'Save preferences' }).click();
  await page.getByLabel('Choose Spendwise backup', { exact: true }).setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await page.getByRole('dialog').getByRole('button', { name: 'Replace & restore', exact: true }).click();
  expect((await stored(page)).profile.name).toBe('Sam');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect((await stored(page)).profile.name).toBe('Changed');
});
test('all six direct Pro links remain locked and cannot mutate financial data', async ({ page }) => {
  await setup(page);
  await add(page);
  const before = await stored(page);
  for (const feature of ['analytics', 'budgets', 'goals', 'bills', 'insights', 'lab']) {
    await page.goto(`/#${feature}`);
    await expect(page.locator('.locked-feature')).toBeVisible();
    await page.getByRole('button', { name: 'View subscription', exact: true }).click();
    const d = page.getByRole('dialog', { name: 'Spendwise Pro', exact: true });
    await expect(d).toBeVisible();
    await expect(d.getByRole('button', { name: /Subscribe to Pro/ })).toBeDisabled();
    await expect(
      d.getByText('Subscriptions are not available in this build yet.', { exact: true }),
    ).toBeVisible();
    await d.getByRole('button', { name: 'Continue with Free', exact: true }).click();
    expect(await stored(page)).toEqual(before);
  }
});
test('sidebar, bottom navigation, overview teaser and global search open the same paywall', async ({
  page,
  isMobile,
}) => {
  await setup(page);
  if (isMobile) {
    await page
      .getByRole('navigation', { name: 'Mobile navigation' })
      .getByRole('button', { name: /Analytics/ })
      .click();
  } else {
    await page
      .locator('.sidebar')
      .getByRole('button', { name: /Analytics/ })
      .click();
  }
  await expect(page.getByRole('dialog', { name: 'Spendwise Pro', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continue with Free', exact: true }).click();
  await page.getByRole('button', { name: 'Explore Pro', exact: false }).click();
  await expect(page.getByRole('dialog', { name: 'Spendwise Pro', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continue with Free', exact: true }).click();
  await page.getByRole('button', { name: 'Search workspace', exact: true }).click();
  const search = page.getByRole('dialog', { name: 'Search workspace', exact: true });
  await search.getByRole('textbox', { name: 'Search workspace', exact: true }).fill('Decision');
  await search.getByRole('button', { name: 'Decision lab', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Spendwise Pro', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Restore purchases', exact: true }).click();
  await expect(
    page.getByText(
      'Purchase restoration will be available after store billing is connected. No purchase was restored.',
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Continue with Free', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  expect((await stored(page)).transactions).toEqual([]);
});
test('stored plan flags and imported records cannot activate a subscription', async ({ page }) => {
  await setup(page);
  const before = await stored(page);
  await page.evaluate((key) => {
    localStorage.setItem('spendwise-pro', 'true');
    const w = JSON.parse(localStorage.getItem(key)!);
    w.plan = 'pro';
    w.isPro = true;
    localStorage.setItem(key, JSON.stringify(w));
  }, key);
  await page.goto('/#analytics');
  await expect(page.locator('.locked-feature')).toBeVisible();
  await page.reload();
  await expect(page.locator('.locked-feature')).toBeVisible();
  expect((await stored(page)).transactions).toEqual(before.transactions);
});
test('onboarding and paywall fit a 320px device and pass automated accessibility checks', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/');
  await fits(page);
  await audit(page);
  await page.getByLabel('Your name', { exact: true }).fill('Sam');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await fits(page);
  await audit(page);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await fits(page);
  await audit(page);
  await page.getByRole('button', { name: 'Start using Spendwise' }).click();
  await fits(page);
  await page.getByRole('button', { name: 'Get Pro', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Spendwise Pro', exact: true })).toBeVisible();
  await audit(page);
  expect(await page.getByRole('dialog').evaluate((d) => d.scrollWidth <= d.clientWidth + 1)).toBe(true);
});
test('corrupt stored records are recoverable, never silently replaced or a setup trap', async ({ page }) => {
  await page.addInitScript((key) => {
    if (!localStorage.getItem('test-seeded')) {
      localStorage.setItem(key, 'unreadable-but-recoverable');
      localStorage.setItem('test-seeded', '1');
    }
  }, key);
  await page.goto('/');
  await expect(page.getByText('Device storage needs attention.', { exact: true })).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe('unreadable-but-recoverable');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download raw stored data', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/spendwise-recovery/);
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Discard unreadable data and start again', exact: true }).click();
  await expect(page.getByText('Device storage needs attention.', { exact: true })).toHaveCount(0);
  await setup(page);
  expect((await stored(page)).onboardingComplete).toBe(true);
});
test('a valid backup can restore on a new device, but invalid import changes nothing', async ({
  page,
  browser,
}) => {
  await setup(page);
  await add(page);
  const backup = await stored(page);
  const context = await browser.newContext();
  const next = await context.newPage();
  await next.goto('/');
  await next
    .getByLabel('Restore a Spendwise backup')
    .setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"wrong":true}') });
  await expect(next.locator('.form-error')).toContainText('not a valid Spendwise backup');
  expect((await stored(next)).onboardingComplete).toBe(false);
  await next.getByLabel('Restore a Spendwise backup').setInputFiles({
    name: 'spendwise.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(next.getByRole('dialog', { name: 'Restore this backup?' })).toBeVisible();
  await next.getByRole('button', { name: 'Restore backup', exact: true }).click();
  await expect(next.locator('.workspace-main')).toBeVisible();
  expect(await stored(next)).toEqual(backup);
  await next.goto('/#goals');
  await expect(next.locator('.locked-feature')).toBeVisible();
  await context.close();
});
test('existing legacy records survive migration without granting Pro', async ({ page }) => {
  await setup(page);
  await add(page);
  const before = await stored(page);
  await page.evaluate((key) => {
    const w = JSON.parse(localStorage.getItem(key)!);
    delete w.onboardingComplete;
    localStorage.setItem(key, JSON.stringify(w));
  }, key);
  await page.reload();
  await expect(page.locator('.workspace-main')).toBeVisible();
  expect((await stored(page)).transactions).toEqual(before.transactions);
  await page.goto('/#analytics');
  await expect(page.locator('.locked-feature')).toBeVisible();
});
test('reset is explicit and returns to an empty first-run flow', async ({ page }) => {
  await setup(page);
  await add(page);
  await page.goto('/#settings');
  await page.getByRole('button', { name: 'Start an empty workspace', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start empty', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Let’s make it yours' })).toBeVisible();
  expect((await stored(page)).transactions).toEqual([]);
  expect((await stored(page)).onboardingComplete).toBe(false);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Let’s make it yours' })).toBeVisible();
});
test('setup, tracking and paywall make no third-party requests', async ({ page }) => {
  const external: string[] = [];
  const errors: string[] = [];
  page.on('request', (r) => {
    if (
      /^https?:/.test(r.url()) &&
      !r.url().startsWith(new URL(page.url() === 'about:blank' ? 'http://127.0.0.1:5176' : page.url()).origin)
    )
      external.push(r.url());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await setup(page);
  await add(page);
  await page.getByRole('button', { name: 'Get Pro', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Spendwise Pro', exact: true })).toBeVisible();
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});
test('storage failure stays visible and unsaved records can still be exported', async ({ page }) => {
  await setup(page);
  await page.evaluate((key) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k: string, v: string) {
      if (k === key) throw new DOMException('Storage full', 'QuotaExceededError');
      return original.call(this, k, v);
    };
  }, key);
  await add(page);
  await expect(page.locator('.storage-banner')).toContainText('storage needs attention');
  expect((await stored(page)).transactions).toEqual([]);
  await page.getByRole('button', { name: 'Manage data', exact: true }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download backup', exact: true }).click(),
  ]);
  const stream = await download.createReadStream();
  let content = '';
  for await (const chunk of stream!) content += chunk.toString();
  expect(JSON.parse(content).transactions[0]).toMatchObject({ merchant: 'Local groceries', amount: 12.5 });
});
