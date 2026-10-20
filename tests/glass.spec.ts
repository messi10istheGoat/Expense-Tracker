import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.use({ reducedMotion: 'reduce' });
const routes = {
  overview: /Good /,
  transactions: 'Transactions',
  analytics: 'Analytics',
  accounts: 'Accounts',
  budgets: 'Budgets',
  goals: 'Savings goals',
  bills: 'Bills & subscriptions',
  insights: 'Insights',
  lab: 'Decision lab',
  settings: 'Your little corner',
};
for (const mode of ['light', 'dark'] as const) {
  test(`Glassmorphism ${mode} covers every page, the Studio, and financial dialogs`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/#settings');
    await expect(page.locator('.theme-choice-input')).toHaveCount(5);
    await page.getByRole('radio', { name: 'Glassmorphism theme', exact: true }).check();
    await page
      .getByRole('button', { name: mode === 'light' ? 'Light & airy' : 'After hours', exact: false })
      .click();
    await expect(page.locator('html')).toHaveAttribute('data-style', 'glass');
    await expect(page.locator('html')).toHaveClass(mode === 'dark' ? /dark/ : /^(?!.*\bdark\b)/);
    const before = await page.evaluate(() => localStorage.getItem('spendwise-workspace-v1'));
    for (const [route, title] of Object.entries(routes)) {
      await page.goto(`/#${route}`);
      await expect(page.locator('h1')).toContainText(title);
      const report = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(report.violations, `${mode}/${route}`).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.getByRole('button', { name: 'Open Style Studio' }).click();
    const studio = page.getByRole('dialog', { name: 'Style Studio', exact: true });
    await expect(studio.getByRole('radio', { name: 'Glassmorphism theme', exact: true })).toBeChecked();
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations,
    ).toEqual([]);
    await page.keyboard.press('Escape');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-style', 'glass');
    expect(await page.evaluate(() => localStorage.getItem('spendwise-workspace-v1'))).toBe(before);
    await page.goto('/#overview');
    expect(
      await page.locator('.spendwise').evaluate((el) => getComputedStyle(el, '::before').backgroundImage),
    ).toContain('url(');
    await page.getByRole('button', { name: 'Add transaction', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations,
    ).toEqual([]);
  });
  test(`Glassmorphism ${mode} respects reduced transparency without losing readable summary tiles`, async ({
    page,
    context,
  }) => {
    await page.goto('/');
    await page.evaluate((mode) => {
      localStorage.setItem('spendwise-style', 'glass');
      localStorage.setItem('spendwise-theme', mode);
    }, mode);
    await page.reload();
    const session = await context.newCDPSession(page);
    await session.send('Emulation.setEmulatedMedia', {
      features: [
        { name: 'prefers-reduced-transparency', value: 'reduce' },
        { name: 'prefers-reduced-motion', value: 'reduce' },
      ],
    });
    expect(await page.evaluate(() => matchMedia('(prefers-reduced-transparency: reduce)').matches)).toBe(
      true,
    );
    expect(await page.locator('.spendwise').evaluate((el) => getComputedStyle(el, '::before').display)).toBe(
      'none',
    );
    expect(
      await page.locator('.workspace-header').evaluate((el) => getComputedStyle(el).backdropFilter),
    ).toBe('none');
    for (const route of ['overview', 'analytics']) {
      await page.goto(`/#${route}`);
      await expect(page.locator('h1')).toBeVisible();
      expect(
        (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations,
      ).toEqual([]);
    }
    await session.detach();
  });
}

test('a transaction saved in Glassmorphism survives reload and updates the workspace', async ({ page }) => {
  await page.goto('/#settings');
  await page.getByRole('radio', { name: 'Glassmorphism theme', exact: true }).check();
  const count = await page.evaluate(
    () => JSON.parse(localStorage.getItem('spendwise-workspace-v1')!).transactions.length,
  );
  await page.getByRole('button', { name: 'Add transaction', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Merchant or description').fill('Glass workspace test');
  await dialog.getByLabel(/Amount \(/).fill('23.45');
  await dialog.getByRole('button', { name: 'Add transaction', exact: true }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-style', 'glass');
  const records = await page.evaluate(
    () => JSON.parse(localStorage.getItem('spendwise-workspace-v1')!).transactions,
  );
  expect(records).toHaveLength(count + 1);
  expect(
    records.some(
      (r: { merchant: string; amount: number }) =>
        r.merchant === 'Glass workspace test' && r.amount === 23.45,
    ),
  ).toBe(true);
});
