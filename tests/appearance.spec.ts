import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const designs = ['Minimal', 'Botanical', 'Brutalist', 'Neon'];
test.use({ reducedMotion: 'reduce' });
for (const name of designs)
  for (const mode of ['light', 'dark']) {
    test(`${name} ${mode}: persists, preserves finance data, and passes automated accessibility checks`, async ({
      page,
    }) => {
      await page.goto('/');
      await expect
        .poll(() => page.evaluate(() => localStorage.getItem('spendwise-workspace-v1')))
        .not.toBeNull();
      const before = await page.evaluate(() => localStorage.getItem('spendwise-workspace-v1'));
      await page.getByRole('button', { name: 'Open Style Studio' }).click();
      const dialog = page.getByRole('dialog', { name: 'Style Studio', exact: true });
      await dialog.getByRole('radio', { name: `${name} theme`, exact: true }).check();
      await dialog
        .getByRole('button', { name: mode === 'dark' ? 'After hours' : 'Light & airy', exact: false })
        .click();
      await expect(page.locator('html')).toHaveAttribute('data-style', name.toLowerCase());
      await expect(page.locator('html')).toHaveClass(mode === 'dark' ? /dark/ : /^(?!.*\bdark\b)/);
      await dialog.getByRole('button', { name: 'Close dialog' }).click();
      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('data-style', name.toLowerCase());
      expect(await page.evaluate(() => localStorage.getItem('spendwise-workspace-v1'))).toBe(before);
      await expect(page.locator('.cash-chart .recharts-area-curve').first()).toHaveAttribute(
        'stroke',
        'var(--chart-income)',
      );
      const overview = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(overview.violations).toEqual([]);
      await page.goto('/#settings');
      await expect(page.getByRole('radio', { name: `${name} theme`, exact: true })).toBeChecked();
      const settings = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(settings.violations).toEqual([]);
      await expect(page.locator('.studio-status')).toContainText(mode === 'dark' ? 'Dark' : 'Light');
      await page.goto('/#insights');
      await expect(page.locator('.heatmap [role="img"]')).toHaveCount(84);
      const insights = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(insights.violations).toEqual([]);
    });
  }
test('system mode follows device changes without forgetting the selected style', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/#settings');
  await page.getByRole('radio', { name: 'Neon theme' }).check();
  await page.getByRole('button', { name: 'Use device' }).click();
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.locator('html')).toHaveAttribute('data-style', 'neon');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.getByRole('button', { name: 'After hours', exact: false }).click();
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveClass(/dark/);
});
test('larger reading size works with reduced motion and keyboard theme selection', async ({ page }) => {
  await page.goto('/#settings');
  await page.getByRole('button', { name: 'Larger', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-text-size', 'large');
  const radio = page.getByRole('radio', { name: 'Minimal theme', exact: true });
  await radio.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'Botanical theme' })).toBeChecked();
  await page.getByRole('button', { name: 'Open Style Studio' }).click();
  const dialog = page.getByRole('dialog', { name: 'Style Studio', exact: true });
  await dialog.getByRole('radio', { name: 'Brutalist theme' }).check();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('radio', { name: 'Brutalist theme' })).toBeChecked();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-text-size', 'large');
  expect(await page.locator('.page-stack').evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  expect(
    await page.locator('.studio-intro p').evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(15);
});
test('each style fits all nine pages at this device size', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  const routes = [
    'overview',
    'transactions',
    'accounts',
    'budgets',
    'goals',
    'bills',
    'insights',
    'lab',
    'settings',
  ];
  for (const style of designs)
    for (const mode of ['light', 'dark']) {
      await page.evaluate(
        ({ style, mode }) => {
          localStorage.setItem('spendwise-style', style.toLowerCase());
          localStorage.setItem('spendwise-theme', mode);
        },
        { style, mode },
      );
      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('data-style', style.toLowerCase());
      for (const route of routes) {
        await page.goto(`/#${route}`);
        await expect(page.locator('h1')).toBeVisible();
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          `${style} ${mode} ${route}`,
        ).toBe(true);
      }
    }
});
test('appearance updates across tabs without changing financial records', async ({ page, context }) => {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('spendwise-workspace-v1'))).not.toBeNull();
  const before = await page.evaluate(() => localStorage.getItem('spendwise-workspace-v1'));
  const second = await context.newPage();
  await second.goto('/#settings');
  await second.getByRole('radio', { name: 'Neon theme' }).check();
  await second.getByRole('button', { name: 'After hours', exact: false }).click();
  await expect(second.locator('html')).toHaveClass(/dark/);
  await expect(page.locator('html')).toHaveAttribute('data-style', 'neon');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('button', { name: 'Switch to light mode', exact: true }).click();
  await expect(second.locator('html')).not.toHaveClass(/dark/);
  await expect(second.locator('.studio-status')).toContainText('Light');
  expect(await page.evaluate(() => localStorage.getItem('spendwise-workspace-v1'))).toBe(before);
  await second.close();
});

test('returning users retain the original Botanical theme and color mode', async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('spendwise-style')) localStorage.setItem('spendwise-theme', 'dark');
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-style', 'botanical');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('button', { name: 'Switch to light mode', exact: true }).click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-style', 'botanical');
  await expect(page.locator('html')).not.toHaveClass(/dark/);
});
