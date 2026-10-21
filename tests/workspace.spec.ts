import { test, expect, type Page } from '@playwright/test';
async function route(page: Page, name: string) {
  await page.goto(`/#${name}`);
  await expect(page.locator('.workspace-main')).toBeVisible();
}
async function stored(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('spendwise-workspace-v1')!));
}

test('all pages fit the viewport and load without runtime errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const name of [
    'overview',
    'transactions',
    'analytics',
    'accounts',
    'budgets',
    'goals',
    'bills',
    'insights',
    'lab',
    'settings',
  ]) {
    await route(page, name);
    await expect(page.locator('h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});
test('transaction capture, edit, persistence, and deletion', async ({ page }) => {
  await route(page, 'transactions');
  await page.getByRole('button', { name: 'Add transaction', exact: true }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Merchant or description').fill('Test Coffee Moment');
  await dialog.getByLabel(/Amount \(/).fill('12.75');
  await dialog.getByRole('button', { name: 'Add transaction', exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('textbox', { name: 'Search transactions' }).fill('Test Coffee Moment');
  await page.getByRole('button', { name: 'Edit Test Coffee Moment' }).click();
  await page
    .getByRole('dialog')
    .getByLabel(/Amount \(/)
    .fill('15.25');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.reload();
  expect(
    (await stored(page)).transactions.find((t: { merchant: string }) => t.merchant === 'Test Coffee Moment')
      .amount,
  ).toBe(15.25);
  await page.getByRole('textbox', { name: 'Search transactions' }).fill('Test Coffee Moment');
  await page.getByRole('button', { name: 'Edit Test Coffee Moment' }).click();
  await page.getByRole('button', { name: 'Delete transaction', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Delete this money moment?', exact: true })
    .getByRole('button', { name: 'Delete transaction', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'A clean slate' })).toBeVisible();
  expect(
    (await stored(page)).transactions.some((t: { merchant: string }) => t.merchant === 'Test Coffee Moment'),
  ).toBe(false);
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
});
test('quick capture fills reviewable details without silently saving', async ({ page }) => {
  await route(page, 'overview');
  const before = (await stored(page)).transactions.length;
  await page.getByRole('button', { name: 'Add transaction', exact: true }).click();
  await page.getByLabel('Quick capture', { exact: true }).fill('Coffee 6.50 yesterday #dining');
  await page.getByRole('button', { name: 'Fill transaction from quick capture' }).click();
  await expect(page.getByLabel('Merchant or description')).toHaveValue('Coffee');
  await expect(page.getByLabel(/Amount \(/)).toHaveValue('6.5');
  expect((await stored(page)).transactions.length).toBe(before);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
});
test('budget edits survive a reload', async ({ page }) => {
  await route(page, 'budgets');
  await page.getByRole('button', { name: 'Edit Groceries budget', exact: true }).click();
  await page.getByLabel(/Monthly limit/).fill('725');
  await page.getByRole('button', { name: 'Save budget' }).click();
  await page.reload();
  expect((await stored(page)).budgets.groceries).toBe(725);
});
test('a goal can be created and funded without changing bank balances', async ({ page }) => {
  await route(page, 'goals');
  const before = await stored(page);
  await page.getByRole('button', { name: 'New goal', exact: true }).click();
  await page.getByLabel('Goal name', { exact: true }).fill('Test Dream');
  await page.getByLabel(/Target \(/).fill('1000');
  await page.getByRole('button', { name: 'Create goal', exact: true }).click();
  const card = page
    .locator('.goal-card')
    .filter({ has: page.getByRole('heading', { name: 'Test Dream', exact: true }) });
  await card.getByRole('button', { name: 'Record savings' }).click();
  await page.getByLabel(/Amount to add/).fill('125.50');
  await page.getByRole('dialog').getByRole('button', { name: 'Record savings' }).click();
  const after = await stored(page);
  expect(after.goals.find((g: { name: string }) => g.name === 'Test Dream').saved).toBe(125.5);
  expect(after.openings).toEqual(before.openings);
  expect(after.transactions.length).toBe(before.transactions.length);
});
test('paying a bill logs one expense and advances the due date', async ({ page }) => {
  await route(page, 'bills');
  const before = await stored(page);
  const row = page.locator('.bill-row').first();
  const name = await row.locator('h3').innerText();
  const previousBill = before.bills.find((b: { name: string }) => b.name === name);
  await row.getByRole('button', { name: 'Mark paid' }).click();
  await page.getByRole('button', { name: 'Record payment', exact: true }).click();
  const after = await stored(page);
  expect(after.transactions.length).toBe(before.transactions.length + 1);
  expect(after.bills.find((b: { name: string }) => b.name === name).nextDue).not.toBe(previousBill.nextDue);
  expect(after.transactions[0].merchant).toBe(name);
});
test('Decision Lab saves a pause and prepares a reviewable transaction draft', async ({ page }) => {
  await route(page, 'lab');
  await page.getByLabel('What are you thinking about?').fill('Test Camera');
  await page.getByRole('spinbutton', { name: 'Purchase amount' }).fill('250');
  await page.getByRole('button', { name: 'Sleep on it' }).click();
  await page.reload();
  await expect(page.locator('.wish-card').filter({ hasText: 'Test Camera' })).toBeVisible();
  await page
    .locator('.wish-card')
    .filter({ hasText: 'Test Camera' })
    .getByRole('button', { name: 'Revisit the trade-offs' })
    .click();
  await page.getByRole('button', { name: 'Log the purchase' }).click();
  await expect(page.getByRole('dialog').getByLabel('Merchant or description')).toHaveValue('Test Camera');
  await expect(page.getByRole('dialog').getByLabel(/Amount \(/)).toHaveValue('250');
});
test('search and keyboard shortcuts are functional', async ({ page }) => {
  await route(page, 'overview');
  await page.getByRole('button', { name: 'Search workspace', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search workspace' }).fill('goals');
  await page.getByRole('dialog').getByRole('button', { name: 'Savings goals' }).click();
  await expect(page).toHaveURL(/#goals/);
  await page.keyboard.press('n');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});
test('backup validation protects data and valid restore requires confirmation', async ({ page }) => {
  await route(page, 'settings');
  const before = await stored(page);
  await page.getByLabel('Choose Spendwise backup').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"version": 999}'),
  });
  await expect(page.getByRole('alert')).toContainText('not a valid Spendwise backup');
  expect((await stored(page)).transactions.length).toBe(before.transactions.length);
  const backup = { ...before, profile: { ...before.profile, name: 'Restored' } };
  await page.getByLabel('Choose Spendwise backup').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(page.getByRole('heading', { name: 'Restore this backup?' })).toBeVisible();
  expect((await stored(page)).profile.name).toBe(before.profile.name);
  await page.getByRole('button', { name: 'Replace & restore', exact: true }).click();
  await expect.poll(async () => (await stored(page)).profile.name).toBe('Restored');
});
test('personal reset is confirmed and dark theme persists', async ({ page }) => {
  await route(page, 'settings');
  await page.getByRole('button', { name: 'After hours', exact: false }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('button', { name: 'Start an empty workspace' }).click();
  await page.getByRole('button', { name: 'Start empty', exact: true }).click();
  await expect.poll(async () => (await stored(page)).transactions.length).toBe(0);
  expect((await stored(page)).demo).toBe(false);
  await route(page, 'overview');
  await expect(page.getByText('No transactions yet')).toBeVisible();
});

test('internal transfer changes account records without counting an expense', async ({ page }) => {
  await route(page, 'accounts');
  const before = await stored(page);
  await page.getByRole('button', { name: 'Record transfer', exact: true }).click();
  await page.getByRole('dialog').getByLabel('To', { exact: true }).selectOption('savings');
  await page.getByRole('dialog').getByLabel('Amount', { exact: false }).fill('75.50');
  await page.getByRole('dialog').getByRole('button', { name: 'Record transfer', exact: true }).click();
  const after = await stored(page);
  expect(after.transfers).toHaveLength(before.transfers.length + 1);
  expect(after.transfers[0]).toMatchObject({ from: 'checking', to: 'savings', amount: 75.5 });
  expect(after.transactions).toEqual(before.transactions);
  await page.reload();
  expect((await stored(page)).transfers[0].amount).toBe(75.5);
});

test('CSV exports the filtered records, not the whole workspace', async ({ page }) => {
  await route(page, 'transactions');
  await page.getByRole('textbox', { name: 'Search transactions' }).fill('nonexistent-merchant-test');
  const filePromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const file = await filePromise;
  expect(file.suggestedFilename()).toMatch(/^spendwise-.*\.csv$/);
  const stream = await file.createReadStream();
  const chunks = [];
  if (stream) for await (const chunk of stream) chunks.push(chunk);
  expect(Buffer.concat(chunks).toString()).toBe('Date,Merchant,Type,Category,Account,Amount,Status,Note');
});

test('storage failures are visible without blocking a usable workspace', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Storage blocked', 'QuotaExceededError');
    };
  });
  await route(page, 'overview');
  await expect(page.getByRole('alert')).toContainText('Browser storage needs attention');
  await expect(page.getByRole('button', { name: 'Add transaction', exact: true })).toBeVisible();
  await route(page, 'settings');
  await expect(page.getByRole('button', { name: 'Download backup' })).toBeVisible();
});
