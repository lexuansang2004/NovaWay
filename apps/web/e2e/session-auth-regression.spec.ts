import { expect, test, type Page } from '@playwright/test';

// WEB-01 regression against the REAL backend (docs/TEST_STRATEGY.md §2.12:
// "giữ ít nhất một lượt regression với backend thật"). Nothing here is a
// fixture: accounts are registered through the real API and every /auth/login
// and /auth/me goes to the running backend. It guards the flows the session
// rewrite must not have broken (AC-WEBSESSION-01 / -06):
// sign in → move around → sign out → Browser Back → sign in as someone else.
//
// Like the other real-backend suites it needs the backend + Postgres running
// (see playwright.config.ts) and therefore runs in the CI `e2e` job.

const API_BASE_URL = process.env.E2E_API_BASE_URL ?? 'http://localhost:3000/api';
const TOKEN_KEY = 'novaway_web_token';
const PASSWORD = 'E2ePass123!';

const uniqueEmail = (label: string) =>
  `e2e-session-${label}-${Date.now()}-${Math.floor(Math.random() * 10_000)}@example.com`;

const readToken = (page: Page) => page.evaluate((key) => sessionStorage.getItem(key), TOKEN_KEY);

async function signIn(page: Page, email: string) {
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu').fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function signOut(page: Page, email: string) {
  await page.getByRole('button', { name: new RegExp(email) }).click();
  await page.getByRole('menuitem', { name: 'Đăng xuất' }).click();
  await expect(page).toHaveURL(/\/login$/);
}

test('sign in, navigate, sign out, Browser Back, then sign in as another account', async ({ page, request }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));

  const emailA = uniqueEmail('a');
  const emailB = uniqueEmail('b');
  for (const email of [emailA, emailB]) {
    const res = await request.post(`${API_BASE_URL}/auth/register`, { data: { email, password: PASSWORD } });
    expect(res.ok(), await res.text()).toBeTruthy();
  }

  // A signs in and moves between protected routes.
  await page.goto('/login');
  await signIn(page, emailA);
  await expect(page.getByText(emailA)).toBeVisible();
  const tokenA = await readToken(page);
  expect(tokenA).toBeTruthy();

  await page.getByRole('link', { name: 'Offline Sync' }).click();
  await expect(page).toHaveURL(/\/offline-sync$/);
  await expect(page.getByText(emailA)).toBeVisible();

  // Reload: the real /auth/me still accepts the token and the route is kept.
  await page.reload();
  await expect(page).toHaveURL(/\/offline-sync$/);
  await expect(page.getByText(emailA)).toBeVisible();
  expect(await readToken(page)).toBe(tokenA);

  // WEB-09: the profile page, reached from the account menu, shows A's email
  // as returned by the real /auth/me. Read-only: no request beyond GET.
  const profileRequests: string[] = [];
  const recordProfileRequest = (req: { method: () => string; url: () => string }) => {
    if (req.url().includes('/api/')) profileRequests.push(`${req.method()} ${new URL(req.url()).pathname}`);
  };
  await page.getByRole('button', { name: `Tài khoản: ${emailA}` }).click();
  page.on('request', recordProfileRequest);
  await page.getByRole('menuitem', { name: 'Hồ sơ cá nhân' }).click();
  await expect(page).toHaveURL(/\/account\/profile$/);
  await expect(page.getByRole('main').getByText(emailA, { exact: true })).toBeVisible();
  page.off('request', recordProfileRequest);
  expect(profileRequests.every((entry) => entry.startsWith('GET '))).toBe(true);

  // A signs out; Back must not show A's content again.
  await signOut(page, emailA);
  expect(await readToken(page)).toBeNull();
  await page.goBack();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText(emailA)).toHaveCount(0);
  expect(await readToken(page)).toBeNull();

  // B signs in on the same browser: only B is shown, with B's own token.
  await signIn(page, emailB);
  await expect(page.getByText(emailB)).toBeVisible();
  await expect(page.getByText(emailA)).toHaveCount(0);
  const tokenB = await readToken(page);
  expect(tokenB).toBeTruthy();
  expect(tokenB).not.toBe(tokenA);

  // The backend agrees about who that token belongs to.
  const me = await request.get(`${API_BASE_URL}/auth/me`, { headers: { Authorization: `Bearer ${tokenB}` } });
  expect(await me.json()).toMatchObject({ email: emailB });

  // WEB-09: deep link and reload of the profile show B only, from the real /auth/me.
  await page.goto('/account/profile');
  await expect(page.getByRole('main').getByText(emailB, { exact: true })).toBeVisible();
  await expect(page.getByText(emailA)).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('main').getByText(emailB, { exact: true })).toBeVisible();
  await expect(page.getByText(emailA)).toHaveCount(0);

  // Back from B's dashboard never lands on anything of A's.
  await page.goBack();
  await expect(page.getByText(emailA)).toHaveCount(0);

  expect(pageErrors).toEqual([]);
});

test('a token the real backend rejects is cleared and the protected route goes to /login', async ({ page }) => {
  await page.addInitScript((key) => {
    if (sessionStorage.getItem('__seeded')) return;
    sessionStorage.setItem('__seeded', '1');
    sessionStorage.setItem(key, 'not-a-real-jwt');
  }, TOKEN_KEY);

  await page.goto('/account/profile');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeEnabled();
  expect(await readToken(page)).toBeNull();
});
