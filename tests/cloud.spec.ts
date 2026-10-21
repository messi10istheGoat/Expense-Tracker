// Real Supabase client and app state, mocked HTTP boundary. Not a substitute for hosted Auth/email/device QA.
import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { makeWorkspace, type Workspace } from '../src/finance/model';
const A = '11111111-1111-4111-8111-111111111111',
  B = '22222222-2222-4222-8222-222222222222';
const tokens = new Map<string, string>();
function token(id: string) {
  const encode = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');
  const jwt = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: id, aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.fixture`;
  tokens.set(jwt, id);
  return jwt;
}
function user(id: string) {
  return {
    id,
    aud: 'authenticated',
    role: 'authenticated',
    email: id === A ? 'a@example.test' : 'b@example.test',
    email_confirmed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    app_metadata: { provider: 'email' },
    user_metadata: { display_name: id === A ? 'Alice' : 'Bob' },
  };
}
function backend() {
  const records = new Map<string, { payload: Workspace; revision: number }>();
  let offline = false;
  const attach = async (context: BrowserContext) =>
    context.route('https://spendwise-test.supabase.co/**', async (route) => {
      const request = route.request(),
        url = new URL(request.url()),
        method = request.method(),
        id = tokens.get((request.headers().authorization ?? '').replace('Bearer ', ''));
      const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': '*',
      };
      const reply = (body: unknown, status = 200) =>
        route.fulfill({ status, contentType: 'application/json', headers, body: JSON.stringify(body) });
      if (method === 'OPTIONS') return route.fulfill({ status: 204, headers });
      if (offline && url.pathname.startsWith('/rest/')) return route.abort('internetdisconnected');
      if (url.pathname === '/auth/v1/token') {
        const body = request.postDataJSON(),
          uid = body.email === 'b@example.test' ? B : A;
        return reply({
          access_token: token(uid),
          refresh_token: `refresh-${uid}`,
          expires_in: 3600,
          token_type: 'bearer',
          user: user(uid),
        });
      }
      if (url.pathname === '/auth/v1/user')
        return id ? reply(user(id)) : reply({ message: 'Unauthorized' }, 401);
      if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204, headers });
      if (!id) return reply({ message: 'Unauthorized' }, 401);
      if (url.pathname === '/rest/v1/workspaces') {
        const w = records.get(id);
        return reply(w ? [url.searchParams.get('select') === 'revision' ? { revision: w.revision } : w] : []);
      }
      if (url.pathname === '/rest/v1/rpc/save_workspace') {
        const body = request.postDataJSON(),
          old = records.get(id);
        if ((old?.revision ?? 0) !== body.p_expected_revision)
          return reply({ code: '40001', message: 'Workspace changed' }, 409);
        const row = { payload: body.p_payload as Workspace, revision: (old?.revision ?? 0) + 1 };
        records.set(id, row);
        return reply([row]);
      }
      return reply({ message: 'Unhandled test endpoint' }, 404);
    });
  return {
    records,
    attach,
    setOffline: (value: boolean) => {
      offline = value;
    },
  };
}
async function login(page: Page, email = 'a@example.test') {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('a-long-test-passphrase');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('.workspace-main')).toBeVisible();
}
async function add(page: Page, name: string) {
  await page.getByRole('button', { name: 'Add transaction', exact: true }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Merchant or description').fill(name);
  await dialog.getByLabel(/Amount \(/).fill('23.50');
  await dialog.getByRole('button', { name: 'Add transaction', exact: true }).click();
  await expect(dialog).toBeHidden();
}
test('customer login starts empty, syncs acknowledged records across devices, and isolates another customer', async ({
  browser,
  context,
  page,
}) => {
  const cloud = backend();
  await cloud.attach(context);
  await login(page);
  expect(cloud.records.get(A)?.payload.transactions).toHaveLength(0);
  expect(cloud.records.get(A)?.payload.demo).toBe(false);
  await add(page, 'Cloud coffee');
  await expect.poll(() => cloud.records.get(A)?.payload.transactions.length).toBe(1);
  const second = await browser.newContext();
  await cloud.attach(second);
  const other = await second.newPage();
  await login(other);
  await expect(other.getByText('Cloud coffee', { exact: true })).toBeVisible();
  await second.close();
  const third = await browser.newContext();
  await cloud.attach(third);
  const bob = await third.newPage();
  await login(bob, 'b@example.test');
  await expect(bob.getByText('Cloud coffee', { exact: true })).toHaveCount(0);
  expect(cloud.records.get(B)?.payload.transactions).toHaveLength(0);
  await third.close();
});
test('unchanged and newer remote refreshes preserve an open transaction draft', async ({ context, page }) => {
  const cloud = backend();
  await cloud.attach(context);
  await login(page);
  await page.getByRole('button', { name: 'Add transaction', exact: true }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Merchant or description').fill('Unsaved draft');
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(dialog.getByLabel('Merchant or description')).toHaveValue('Unsaved draft');
  const row = cloud.records.get(A)!;
  cloud.records.set(A, {
    revision: row.revision + 1,
    payload: { ...row.payload, profile: { ...row.payload.profile, name: 'Other device' } },
  });
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect.poll(() => page.locator('.workspace-avatar').first().textContent()).toBe('O');
  await expect(dialog.getByLabel('Merchant or description')).toHaveValue('Unsaved draft');
});
test('offline edits recover after reload and a conflict requires an explicit version choice', async ({
  context,
  page,
}) => {
  const cloud = backend();
  await cloud.attach(context);
  await login(page);
  cloud.setOffline(true);
  await add(page, 'Offline edit');
  await expect
    .poll(() => page.evaluate((id) => !!localStorage.getItem(`spendwise-outbox-v1:${id}`), A))
    .toBe(true);
  await page.reload();
  await expect(page.locator('.workspace-main')).toBeVisible();
  await expect(page.getByText('Offline edit', { exact: true })).toBeVisible();
  const row = cloud.records.get(A)!;
  cloud.records.set(A, {
    payload: { ...makeWorkspace(false), profile: { ...row.payload.profile, name: 'Cloud changed' } },
    revision: row.revision + 1,
  });
  cloud.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.getByRole('button', { name: 'Review sync', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Review sync', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Choose which records to keep' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Use cloud version' })).toBeDisabled();
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button', { name: 'Use cloud version' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Offline edit', { exact: true })).toHaveCount(0);
  expect(await page.evaluate((id) => localStorage.getItem(`spendwise-outbox-v1:${id}`), A)).toBeNull();
});
test('sign-out clears this customer’s cached financial records without deleting saved cloud records', async ({
  context,
  page,
}) => {
  const cloud = backend();
  await cloud.attach(context);
  await login(page);
  await add(page, 'Saved record');
  await expect.poll(() => cloud.records.get(A)?.payload.transactions.length).toBe(1);
  await expect
    .poll(() => page.evaluate((id) => localStorage.getItem(`spendwise-outbox-v1:${id}`), A))
    .toBeNull();
  await page.getByRole('button', { name: 'Open account', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  expect(
    await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('spendwise-outbox-v1:'))),
  ).toEqual([]);
  expect(cloud.records.get(A)?.payload.transactions).toHaveLength(1);
});

test('a second tab cannot overwrite the same account recovery file', async ({ context, page }) => {
  const cloud = backend();
  await cloud.attach(context);
  await login(page);
  const other = await context.newPage();
  await other.goto('/');
  await expect(other.getByRole('heading', { name: 'Spendwise is open in another tab' })).toBeVisible();
  await page.close();
  await expect(other.locator('.workspace-main')).toBeVisible();
});

test('an open editor refuses to overwrite a record changed by another device', async ({ context, page }) => {
  const cloud = backend();
  await cloud.attach(context);
  await login(page);
  await add(page, 'Original record');
  await expect.poll(() => cloud.records.get(A)?.payload.transactions.length).toBe(1);
  await page.getByRole('button', { name: 'Edit Original record', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Merchant or description').fill('My unsaved edit');
  const old = cloud.records.get(A)!;
  cloud.records.set(A, {
    payload: { ...old.payload, transactions: old.payload.transactions.map((t) => ({ ...t, amount: 99 })) },
    revision: old.revision + 1,
  });
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect
    .poll(() =>
      page.evaluate(
        (id) =>
          JSON.parse(localStorage.getItem(`spendwise-outbox-v1:${id}:saved`)!).workspace.transactions[0]
            .amount,
        A,
      ),
    )
    .toBe(99);
  await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('changed or was removed');
  await expect(dialog.getByLabel('Merchant or description')).toHaveValue('My unsaved edit');
  expect(cloud.records.get(A)?.payload.transactions[0]).toMatchObject({
    merchant: 'Original record',
    amount: 99,
  });
});
