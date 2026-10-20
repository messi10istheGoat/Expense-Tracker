import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { iso, makeWorkspace, validateWorkspace, type Entry } from '../src/finance/model';
import { shiftDate } from '../src/finance/analytics';
const today = iso();
const first = `${today.slice(0, 7)}-01`;
const last = shiftDate(first, -1);
const workspace = makeWorkspace(false);
workspace.profile.currency = 'USD';
workspace.budgets = { ...workspace.budgets, housing: 300, dining: 100 };
const row = (id: string, date: string, amount: number, extra: Partial<Entry>): Entry => ({
  id,
  date,
  amount,
  merchant: 'Coffee Corner',
  type: 'expense',
  category: 'dining',
  account: 'credit',
  status: 'cleared',
  recurring: false,
  ...extra,
});
workspace.transactions = [
  row('rent', first, 200, { merchant: 'Studio rent', category: 'housing', account: 'checking' }),
  row('coffee', today, 50, { status: 'pending' }),
  row('salary', first, 1000, {
    merchant: 'Employer',
    category: 'salary',
    type: 'income',
    account: 'checking',
  }),
  row('prior', last, 25, {}),
];
validateWorkspace(workspace);
test.use({ reducedMotion: 'reduce' });
test.beforeEach(async ({ page }) => {
  await page.addInitScript((w) => {
    if (!localStorage.getItem('spendwise-workspace-v1'))
      localStorage.setItem('spendwise-workspace-v1', JSON.stringify(w));
  }, workspace);
  await page.goto('/#analytics');
  await expect(page.getByRole('heading', { name: 'Analytics', exact: true })).toBeVisible();
});
test('Analytics is immediately after Transactions and is reachable in the main navigation', async ({
  page,
}) => {
  const labels = await page.locator('.sidebar .nav-link').allTextContents();
  expect(labels.slice(0, 4)).toEqual(['Overview', 'Transactions', 'Analytics', 'Accounts']);
  await page.goto('/#transactions');
  await page.getByRole('button', { name: 'Analytics', exact: true }).click();
  await expect(page).toHaveURL(/#analytics$/);
  await expect(page.getByTestId('analytics-total-spending')).toContainText('$250');
});
test('account, category and status filters reconcile without mutating workspace data', async ({ page }) => {
  const before = await page.evaluate(() => localStorage.getItem('spendwise-workspace-v1'));
  await expect(page.getByTestId('analytics-total-spending')).toContainText('$250');
  await page.getByLabel('Analytics account', { exact: true }).selectOption('checking');
  await expect(page.getByTestId('analytics-total-spending')).toContainText('$200');
  await page.getByLabel('Analytics account', { exact: true }).selectOption('credit');
  await expect(page.getByTestId('analytics-total-spending')).toContainText('$50');
  await page.getByLabel('Analytics category', { exact: true }).selectOption('dining');
  await page.getByLabel('Analytics status', { exact: true }).selectOption('cleared');
  await expect(page.getByTestId('analytics-total-spending')).toContainText('$0');
  await expect(page.getByText('No logged income', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reset filters' }).click();
  await expect(page.getByTestId('analytics-total-spending')).toContainText('$250');
  expect(await page.evaluate(() => localStorage.getItem('spendwise-workspace-v1'))).toBe(before);
});
test('presets and validated custom dates apply to the whole report', async ({ page }) => {
  await page.getByLabel('Report period', { exact: true }).selectOption('lastMonth');
  await expect(page.getByTestId('analytics-total-spending')).toContainText('$25');
  await page.getByLabel('Report period', { exact: true }).selectOption('custom');
  await page.getByLabel('Start date', { exact: true }).fill(first);
  await page.getByLabel('End date', { exact: true }).fill(today);
  await page.getByRole('button', { name: 'Apply range' }).click();
  await expect(page.getByTestId('analytics-total-spending')).toContainText('$250');
  await page.getByLabel('Start date', { exact: true }).fill(today);
  await page.getByLabel('End date', { exact: true }).fill(last);
  await page.getByRole('button', { name: 'Apply range' }).click();
  await expect(page.getByRole('alert')).toHaveText('The start date must be on or before the end date.');
  await expect(page.getByTestId('analytics-total-spending')).toContainText('$250');
});
test('chart metrics, grouping, display type and comparison are functional', async ({ page }) => {
  await page.getByRole('button', { name: 'Income', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Income', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Bars', exact: true }).click();
  await expect(page.locator('.analytics-trend-chart .recharts-bar-rectangle').first()).toBeVisible();
  await page.getByLabel('Chart grouping', { exact: true }).selectOption('month');
  await page.getByText('View chart data & comparison dates', { exact: true }).click();
  await expect(page.locator('.analytics-chart-data tbody tr')).toHaveCount(1);
  await expect(page.locator('.analytics-chart-data tbody')).toContainText('$1,000.00');
  await expect(page.locator('.analytics-chart-data tbody')).toContainText('$250.00');
  await page.getByRole('checkbox', { name: 'Compare previous period' }).uncheck();
  await expect(page.locator('.analytics-chart-data th').filter({ hasText: 'Prior income' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Net flow', exact: true }).click();
  await expect(page.locator('.analytics-chart-head')).toContainText('$750');
});
test('category and merchant drill-down, search, record export and edit stay connected', async ({ page }) => {
  await page.getByRole('button', { name: 'Inspect Housing transactions', exact: true }).click();
  await expect(page.locator('.analytics-detail-title')).toContainText('Housing');
  await expect(page.locator('.analytics-transactions tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'Clear drill-down' }).click();
  await page.getByRole('button', { name: 'Inspect Coffee Corner spending', exact: true }).click();
  await expect(page.locator('.analytics-transactions tbody tr')).toHaveCount(1);
  await page.getByLabel('Search analytics transactions', { exact: true }).fill('missing merchant');
  await expect(page.getByRole('heading', { name: 'No matching records' })).toBeVisible();
  await page.getByLabel('Search analytics transactions', { exact: true }).fill('Coffee');
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export transactions', exact: true }).click();
  const file = await downloaded;
  const text = await readFile((await file.path())!, 'utf8');
  expect(text).toContain('Coffee Corner');
  expect(text).not.toContain('Studio rent');
  expect(text).not.toContain('Employer');
  await page
    .locator('.analytics-transactions')
    .getByRole('button', { name: /Coffee Corner/ })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Edit transaction', exact: true });
  await dialog.getByLabel(/Amount \(/).fill('60');
  await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByTestId('analytics-total-spending')).toContainText('$260');
});
test('report CSV includes only the selected accounts and real comparison values', async ({ page }) => {
  await page.getByLabel('Analytics account', { exact: true }).selectOption('credit');
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export report', exact: true }).click();
  const file = await downloaded;
  const text = await readFile((await file.path())!, 'utf8');
  expect(text).toContain('"expense","50","25"');
  expect(text).toContain('"Coffee Corner","50","1"');
  expect(text).not.toContain('Studio rent');
  expect(file.suggestedFilename()).toContain('spendwise-analytics');
});
test('empty data is honest and never produces invalid numerical output', async ({ page }) => {
  await page.evaluate(() => {
    const w = JSON.parse(localStorage.getItem('spendwise-workspace-v1')!);
    w.transactions = [];
    w.budgets = Object.fromEntries(Object.keys(w.budgets).map((k) => [k, 0]));
    localStorage.setItem('spendwise-workspace-v1', JSON.stringify(w));
  });
  await page.reload();
  await expect(page.getByTestId('analytics-total-spending')).toContainText('$0');
  await expect(page.getByRole('heading', { name: 'No spending in this view' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No matching records' })).toBeVisible();
  await expect(page.locator('.analytics-page')).not.toContainText(/NaN|Infinity/);
});
test('Analytics passes automated accessibility checks in all eight appearances', async ({ page }) => {
  test.setTimeout(90_000);
  for (const style of ['minimal', 'botanical', 'brutalist', 'neon'])
    for (const mode of ['light', 'dark']) {
      await page.evaluate(
        ({ style, mode }) => {
          localStorage.setItem('spendwise-style', style);
          localStorage.setItem('spendwise-theme', mode);
        },
        { style, mode },
      );
      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('data-style', style);
      await expect(page.locator('.analytics-hero')).toBeVisible();
      const report = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(report.violations, `${style} ${mode}`).toEqual([]);
    }
});

test('Analytics fits five widths and larger text across all eight appearances', async ({ page }) => {
  test.setTimeout(120_000);
  for (const textSize of ['standard', 'large']) {
    for (const width of textSize === 'standard' ? [320, 390, 768, 1024, 1440] : [320, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const style of ['minimal', 'botanical', 'brutalist', 'neon']) {
        for (const mode of ['light', 'dark']) {
          await page.evaluate(
            ({ style, mode, textSize }) => {
              localStorage.setItem('spendwise-style', style);
              localStorage.setItem('spendwise-theme', mode);
              localStorage.setItem('spendwise-text-size', textSize);
            },
            { style, mode, textSize },
          );
          await page.reload();
          await expect(page.locator('html')).toHaveAttribute('data-style', style);
          await expect(page.locator('html')).toHaveAttribute('data-text-size', textSize);
          expect(await page.locator('html').evaluate((el) => el.classList.contains('dark'))).toBe(
            mode === 'dark',
          );
          await expect(page.locator('.analytics-hero')).toBeVisible();
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
            `${style}/${mode}/${textSize}/${width}`,
          ).toBe(true);
        }
      }
    }
  }
});
