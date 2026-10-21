import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const stored = (page: import('@playwright/test').Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('spendwise-workspace-v1')!));
test('inline category creation preserves the transaction draft and selects the result', async ({ page }) => {
  await page.goto('/#transactions');
  await page.getByRole('button', { name: 'Add transaction', exact: true }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Merchant or description').fill('Vet appointment');
  await dialog.getByLabel(/Amount \(/).fill('42.50');
  const picker = dialog.getByRole('combobox', { name: 'Category', exact: true });
  await picker.fill('Pet care');
  await expect(dialog.getByRole('option', { name: 'Add “Pet care”' })).toBeVisible();
  await dialog.getByRole('option', { name: 'Add “Pet care”' }).click();
  await expect(picker).toHaveValue('Pet care');
  await expect(dialog.getByLabel('Merchant or description')).toHaveValue('Vet appointment');
  await expect(dialog.getByLabel(/Amount \(/)).toHaveValue('42.50');
  await dialog.getByRole('button', { name: 'Add transaction', exact: true }).click();
  await expect(dialog).toBeHidden();
  const w = await stored(page),
    category = w.categories.find((c: { label: string }) => c.label === 'Pet care');
  expect(w.transactions[0]).toMatchObject({
    category: category.id,
    amount: 42.5,
    merchant: 'Vet appointment',
  });
  await page.reload();
  expect((await stored(page)).categories.some((c: { label: string }) => c.label === 'Pet care')).toBe(true);
});
test('income and recurring forms both support searchable inline categories', async ({ page }) => {
  await page.goto('/#transactions');
  await page.getByRole('button', { name: 'Add transaction', exact: true }).first().click();
  let dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Income', exact: true }).click();
  await dialog.getByRole('combobox', { name: 'Category', exact: true }).fill('Consulting');
  await dialog.getByRole('option', { name: 'Add “Consulting”' }).click();
  expect((await stored(page)).categories.find((c: { label: string }) => c.label === 'Consulting').type).toBe(
    'income',
  );
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.goto('/#bills');
  await page.getByRole('button', { name: 'Add recurring', exact: false }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox', { name: 'Category', exact: true }).fill('Pet insurance');
  await dialog.getByRole('option', { name: 'Add “Pet insurance”' }).click();
  await expect(dialog.getByRole('combobox', { name: 'Category', exact: true })).toHaveValue('Pet insurance');
  expect(
    (await stored(page)).categories.find((c: { label: string }) => c.label === 'Pet insurance').type,
  ).toBe('expense');
});
test('accounts can be created, edited, removed and removal can be undone', async ({ page }) => {
  await page.goto('/#accounts');
  await page.getByRole('button', { name: 'New account', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Account name', exactTrue).fill('Travel wallet');
  await dialog.getByRole('combobox', { name: 'Account type' }).selectOption('cash');
  await dialog.getByLabel(/Opening balance/).fill('90.25');
  await dialog.getByRole('button', { name: 'Save account' }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: 'Edit Travel wallet opening balance' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Account name', exactTrue).fill('Trip wallet');
  await dialog.getByRole('button', { name: 'Save account' }).click();
  await page.getByRole('button', { name: 'Remove Trip wallet account' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox', { name: 'Move records to' }).selectOption('cash');
  await dialog.getByRole('button', { name: 'Remove account', exact: true }).click();
  await expect(dialog).toBeHidden();
  expect((await stored(page)).accounts.some((a: { label: string }) => a.label === 'Trip wallet')).toBe(false);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect((await stored(page)).accounts.some((a: { label: string }) => a.label === 'Trip wallet')).toBe(true);
});
const exactTrue = { exact: true };
test('category settings can edit, pin, reorder and safely reassign a used category', async ({ page }) => {
  await page.goto('/#settings');
  await page.getByRole('button', { name: 'Edit Dining Out category', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Category name').fill('Eating out');
  await dialog.getByRole('button', { name: 'Save category' }).click();
  await page.getByRole('button', { name: 'Pin Eating out', exact: true }).click();
  expect(
    (await stored(page)).categories.find((c: { label: string }) => c.label === 'Eating out').pinned,
  ).toBe(true);
  await page.getByRole('button', { name: 'Remove Eating out category', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox', { name: 'Move to category' }).fill('Groceries');
  await dialog.getByRole('option', { name: 'Groceries', exact: true }).click();
  await dialog.getByRole('button', { name: 'Remove category', exact: true }).click();
  await expect(dialog).toBeHidden();
  expect((await stored(page)).categories.some((c: { label: string }) => c.label === 'Eating out')).toBe(
    false,
  );
  expect((await stored(page)).transactions.some((t: { category: string }) => t.category === 'dining')).toBe(
    false,
  );
});
test('unconfigured cloud sign-in is explicit, accessible and never simulates success', async ({ page }) => {
  await page.goto('/');
  const before = await stored(page);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.getByText('Cloud sign-in is not configured in this preview.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeDisabled();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations).toEqual([]);
  await page.getByRole('button', { name: 'Explore the demo' }).click();
  expect((await stored(page)).transactions).toEqual(before.transactions);
});
test('category picker supports keyboard creation and outside click does not swallow Save', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add transaction', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Merchant or description').fill('Keyboard entry');
  await dialog.getByLabel(/Amount \(/).fill('14');
  const picker = dialog.getByRole('combobox', { name: 'Category', exact: true });
  await picker.fill('Keyboard category');
  await picker.press('Enter');
  await expect(picker).toHaveValue('Keyboard category');
  await picker.click();
  await expect(picker).toHaveAttribute('aria-expanded', 'true');
  await dialog.getByRole('button', { name: 'Add transaction', exact: true }).click();
  await expect(dialog).toBeHidden();
  expect((await stored(page)).transactions[0].merchant).toBe('Keyboard entry');
});

test('exact summary balances do not wrap on a 320px phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/');
  await expect(page.locator('.metric-value')).toHaveCount(4);
  const fits = await page
    .locator('.metric-value')
    .evaluateAll((values) =>
      values.every(
        (value) => value.getBoundingClientRect().height <= parseFloat(getComputedStyle(value).lineHeight) + 1,
      ),
    );
  expect(fits).toBe(true);
});
