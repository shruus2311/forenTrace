import { execFileSync } from 'node:child_process';
import { expect, test, type Page } from '@playwright/test';

const evidenceRoute = (url: URL) => url.pathname === '/api/v1/evidence';
const custodyRoute = (url: URL) => url.pathname === '/api/v1/custody';

async function signIn(page: Page) {
  await page.goto('/');
  await page.getByLabel('Investigator ID').fill('browser-investigator');
  await page.getByLabel('Password', { exact: true }).fill('forentrace-e2e-test-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

async function selectOriginal(page: Page, filename: string) {
  await page.getByRole('button', { name: 'Register Evidence', exact: true }).click();
  await page.getByLabel('Evidence file').setInputFiles({
    name: filename, mimeType: 'text/plain', buffer: Buffer.from('ForenTrace browser fixture ' + filename),
  });
}

test('registers evidence and downloads a verifiable signed custody export', async ({ page }) => {
  const filename = 'custody-browser.txt';
  await signIn(page);
  await selectOriginal(page, filename);
  await page.getByRole('button', { name: 'Register and seal' }).click();
  await expect(page.getByRole('row', { name: new RegExp(filename) })).toBeVisible();

  await page.getByRole('button', { name: /Chain of Custody/ }).click();
  await page.getByLabel('Evidence', { exact: true }).selectOption({ label: filename });
  await page.getByLabel('Transferred from').fill('Intake');
  await page.getByLabel('Transferred to').fill('Vault');
  await page.getByLabel('Transfer purpose').fill('Browser integration');
  await page.getByLabel('Location', { exact: true }).fill('Test workstation');
  let firstKey: string | undefined;
  await page.route(custodyRoute, async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    firstKey = route.request().headers()['idempotency-key'];
    expect((await route.fetch()).status()).toBe(201);
    await route.fulfill({ status: 503, json: { detail: 'Controlled lost acknowledgement' } });
  });
  const sign = page.getByRole('button', { name: 'Affix Custodial Signature' });
  await sign.click();
  await expect(page.getByText('Retry this transfer with the same details.', { exact: true })).toBeVisible();
  await expect(page.getByText('Total blocks: 1', { exact: true })).toBeVisible();
  expect(firstKey).toMatch(/^[0-9a-f-]{36}$/);
  await page.unroute(custodyRoute);
  await page.getByLabel('Transfer purpose').fill('Browser integration ');
  const retry = page.waitForResponse((response) => custodyRoute(new URL(response.url())) && response.request().method() === 'POST');
  await sign.click();
  const retried = await retry;
  expect(retried.status()).toBe(201);
  expect(retried.request().headers()['idempotency-key']).toBe(firstKey);
  await expect(page.getByText('Custody Block Signed', { exact: true })).toBeVisible();
  await expect(page.getByText('Total blocks: 1', { exact: true })).toBeVisible();

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Signed Ledger' }).click();
  execFileSync(process.env.FORENTRACE_E2E_PYTHON!, [
    '-m', 'app.verify_ledger', 'verify', await (await download).path(), '--public-key',
    process.env.FORENTRACE_E2E_PUBLIC_KEY!, '--case-id', 'browser-case', '--organization-id', 'browser-lab',
  ]);
});

test('retries an unconfirmed registration with the same key and publishes one row', async ({ page }) => {
  const filename = 'retry-browser.txt';
  await signIn(page);
  await selectOriginal(page, filename);
  let firstKey: string | undefined;
  await page.route(evidenceRoute, async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    firstKey = route.request().headers()['idempotency-key'];
    const accepted = await route.fetch();
    expect(accepted.status()).toBe(201);
    await route.fulfill({ status: 503, json: { detail: 'Controlled lost acknowledgement' } });
  });
  const submit = page.getByRole('button', { name: 'Register and seal' });
  await submit.click();
  await expect(page.getByRole('alert')).toBeVisible();
  expect(firstKey).toMatch(/^[0-9a-f-]{36}$/);
  await page.unroute(evidenceRoute);
  const retry = page.waitForResponse((response) => evidenceRoute(new URL(response.url())) && response.request().method() === 'POST');
  await submit.click();
  const response = await retry;
  expect(response.status()).toBe(201);
  expect(response.request().headers()['idempotency-key']).toBe(firstKey);
  await expect(page.getByRole('row', { name: new RegExp(filename) })).toHaveCount(1);
});

test('enforces evidence and organization scope through search and lineage', async ({ page, playwright }) => {
  await signIn(page);
  await page.getByRole('button', { name: 'Forensic Analysis', exact: true }).click();
  await page.getByLabel('Evidence, report, or CISA KEV term').fill('restricted');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Original evidence (0)' })).toBeVisible();
  const lineage = '/api/v1/analysis/lineage?' + new URLSearchParams({
    case_id: 'browser-case', evidence_id: process.env.FORENTRACE_E2E_RESTRICTED_ID!,
  });
  expect((await page.request.get(lineage)).status()).toBe(404);

  const otherOrg = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:5173' });
  try {
    const login = await otherOrg.post('/api/v1/auth/login', {
      data: { username: 'browser-outsider', password: 'forentrace-e2e-test-password' },
    });
    expect(login.status()).toBe(200);
    expect((await otherOrg.get(lineage)).status()).toBe(403);
  } finally {
    await otherOrg.dispose();
  }
});

test('shows an unavailable analysis queue and lets the investigator retry', async ({ page }) => {
  await signIn(page);
  const jobs = (url: URL) => url.pathname === '/api/v1/analysis/jobs';
  await page.route(jobs, (route) => route.fulfill({ status: 503, json: { detail: 'Controlled outage' } }));
  await page.getByRole('button', { name: 'Forensic Analysis', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Analysis jobs are unavailable.');
  await expect(page.getByText('No analysis jobs found.', { exact: true })).toHaveCount(0);
  await page.unroute(jobs);
  await page.getByRole('button', { name: 'Refresh Jobs' }).click();
  await expect(page.getByText('No analysis jobs found.', { exact: true })).toBeVisible();
});

test('clears the evidence vault while loading a different case', async ({ page }) => {
  const filename = 'case-switch-browser.txt';
  await signIn(page);
  await selectOriginal(page, filename);
  await page.getByRole('button', { name: 'Register and seal' }).click();
  const row = page.getByRole('row', { name: new RegExp(filename) });
  await expect(row).toBeVisible();
  let release!: () => void;
  const wait = new Promise<void>((resolve) => { release = resolve; });
  await page.route((url) => evidenceRoute(url) && url.searchParams.get('case_id') === 'browser-secondary', async (route) => {
    await wait;
    await route.continue();
  });
  try {
    await page.getByLabel('Assigned case').selectOption('browser-secondary');
    await expect(page.getByText('Loading evidence records…')).toBeVisible();
    await expect(row).toHaveCount(0);
  } finally {
    release();
  }
  await expect(page.getByText('No evidence records found.')).toBeVisible();
  await page.getByLabel('Assigned case').selectOption('browser-case');
  await expect(row).toBeVisible();
});
