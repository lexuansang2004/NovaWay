import { expect, test, type Locator, type Page, type Route } from '@playwright/test';

// WEB-03, WEB-T01: actual React UI with fixture API responses. Viewport/text
// stress and reduced-height keyboard emulation do not prove physical devices
// or native browser/text-only zoom; those checks are recorded separately.
const TOKEN_KEY = 'novaway_web_token';
const TOKEN = 'fixture-login-layout-token';
const USER = { id: '00000000-0000-4000-8000-000000000003', email: 'layout.user@example.com' };
const PASSWORD = 'fixture-password';
const LONG_ERROR = `Không thể đăng nhập tài khoản ${'navigation.long.email.segment.'.repeat(8)}user@example.com. Hãy kiểm tra email và mật khẩu rồi thử lại.`;
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
const submit = (page: Page) => page.getByRole('button', { name: 'Đăng nhập', exact: true });
const emailField = (page: Page) => page.getByLabel('Email', { exact: true });
const passwordField = (page: Page) => page.getByLabel('Mật khẩu', { exact: true });
const json = (route: Route, status: number, body: unknown) => route.fulfill({ status, contentType: 'application/json', headers: CORS, body: JSON.stringify(body) });

async function fixture(page: Page, options: { token?: boolean; me?: (route: Route) => Promise<void>; login?: (route: Route) => Promise<void> } = {}) {
  if (options.token) await page.addInitScript(([key, value]) => sessionStorage.setItem(key, value), [TOKEN_KEY, TOKEN]);
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === 'OPTIONS') return json(route, 200, {});
    if (path.endsWith('/auth/me')) return options.me ? options.me(route) : json(route, 200, USER);
    if (path.endsWith('/auth/login')) return options.login ? options.login(route) : json(route, 200, { user: USER, access_token: TOKEN });
    return json(route, 200, path.endsWith('/vehicles') ? { vehicles: [] } : { trips: [] });
  });
}

async function finishEntrance(page: Page) {
  const heading = page.getByRole('heading', { name: 'Đăng nhập NovaWay' });
  await expect(heading).toBeVisible();
  // Framer Motion is JS-driven. Poll its actual final transform, not a sleep.
  await expect.poll(() => heading.evaluate((el) => {
    const panel = el.parentElement?.parentElement;
    const style = panel && getComputedStyle(panel);
    return style ? { opacity: Number(style.opacity), transform: style.transform } : null;
  })).toEqual({ opacity: 1, transform: 'none' });
}

async function textFits(page: Page) {
  const clipped = await page.locator('h1, h2, p, label').evaluateAll((elements) => elements.flatMap((el) => {
    const style = getComputedStyle(el);
    if (!el.getClientRects().length || style.visibility === 'hidden' || !el.clientWidth) return [];
    return el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1
      ? [{ text: el.textContent, width: el.clientWidth, scrollWidth: el.scrollWidth, height: el.clientHeight, scrollHeight: el.scrollHeight }]
      : [];
  }));
  expect(clipped).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

async function reachable(target: Locator) {
  await target.scrollIntoViewIfNeeded();
  await expect(target).toBeInViewport({ ratio: 0.99 });
  const box = await target.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(44);
  expect(box?.height).toBeGreaterThanOrEqual(44);
}

async function fill(page: Page) {
  await emailField(page).fill(USER.email);
  await passwordField(page).fill(PASSWORD);
}

test.describe('responsive login — fixture UI', () => {
  for (const viewport of [
    { width: 320, height: 568 }, { width: 360, height: 800 },
    { width: 390, height: 844 }, { width: 430, height: 932 },
    { width: 844, height: 390 }, { width: 1024, height: 768 },
    { width: 1280, height: 720 },
  ]) test(`WEB-T01 ${viewport.width}×${viewport.height}: empty form, labels and submit fit`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await fixture(page);
    await page.goto('/login');
    await finishEntrance(page);
    await textFits(page);
    await reachable(emailField(page));
    await reachable(passwordField(page));
    await reachable(submit(page));
    await expect(emailField(page)).toHaveValue('');
    await expect(passwordField(page)).toHaveValue('');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('long credential error reflows at 320px and doubled CSS text without hiding content', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await fixture(page, { login: (route) => json(route, 401, { error_code: 'INVALID_CREDENTIALS', message: LONG_ERROR }) });
    await page.goto('/login');
    await finishEntrance(page);
    await page.addStyleTag({ content: 'html { font-size: 32px !important; }' });
    await fill(page);
    await submit(page).click();
    await expect(page.getByText(LONG_ERROR, { exact: true })).toBeVisible();
    await textFits(page);
    await reachable(emailField(page));
    await reachable(passwordField(page));
    await reachable(submit(page));
    await expect(emailField(page)).toHaveValue(USER.email);
    await expect(passwordField(page)).toHaveValue(PASSWORD);
    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate((key) => sessionStorage.getItem(key), TOKEN_KEY)).toBeNull();
  });

  test('WEB-VB3 and reduced-height keyboard emulation preserve field values and focus', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await fixture(page);
    await page.goto('/login');
    await finishEntrance(page);
    await fill(page);
    await emailField(page).focus();
    for (const viewport of [
      { width: 1023, height: 800 }, { width: 1024, height: 800 }, { width: 1025, height: 800 },
      { width: 844, height: 390 }, { width: 390, height: 320 }, { width: 320, height: 180 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await expect(emailField(page)).toHaveValue(USER.email);
      await expect(passwordField(page)).toHaveValue(PASSWORD);
      await expect(emailField(page)).toBeFocused();
      await textFits(page);
      await reachable(emailField(page));
      await reachable(passwordField(page));
      await reachable(submit(page));
      await expect(page).toHaveURL(/\/login$/);
    }
  });

  test('submitting and API error remain readable while resize preserves data and focused field', async ({ page }) => {
    let held: Route | undefined;
    let payload: unknown;
    await page.setViewportSize({ width: 320, height: 568 });
    await fixture(page, { login: async (route) => { held = route; payload = route.request().postDataJSON(); } });
    await page.goto('/login');
    await finishEntrance(page);
    await fill(page);
    await submit(page).click();
    await expect.poll(() => Boolean(held)).toBe(true);
    expect(payload).toEqual({ email: USER.email, password: PASSWORD });
    const busy = page.getByRole('button', { name: 'Đang đăng nhập...' });
    await expect(busy).toBeDisabled();
    await reachable(busy);
    await passwordField(page).focus();
    for (const width of [844, 1023, 1024, 1025, 320]) {
      await page.setViewportSize({ width, height: 390 });
      await expect(passwordField(page)).toBeFocused();
      await expect(emailField(page)).toHaveValue(USER.email);
      await expect(passwordField(page)).toHaveValue(PASSWORD);
      await textFits(page);
    }
    await json(held!, 401, { error_code: 'INVALID_CREDENTIALS', message: LONG_ERROR });
    await expect(page.getByText(LONG_ERROR, { exact: true })).toBeVisible();
    await expect(passwordField(page)).toBeFocused();
    await expect(submit(page)).toBeEnabled();
    await textFits(page);
    await reachable(submit(page));
  });

  for (const failure of ['network', '500', '403', '429'] as const) test(`session ${failure} notice and form reflow with doubled CSS text`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await fixture(page, { token: true, me: (route) => failure === 'network'
      ? route.abort('failed') : json(route, Number(failure), { error_code: 'FIXTURE_ERROR', message: 'fixture' }) });
    await page.goto('/login');
    await finishEntrance(page);
    await expect(page.getByRole('alert')).toBeVisible();
    await page.addStyleTag({ content: 'html { font-size: 32px !important; }' });
    await fill(page);
    await textFits(page);
    for (const control of [page.getByRole('button', { name: 'Thử lại' }), page.getByRole('button', { name: 'Đăng nhập lại' }), emailField(page), passwordField(page), submit(page)]) await reachable(control);
    await expect(emailField(page)).toHaveValue(USER.email);
    await expect(passwordField(page)).toHaveValue(PASSWORD);
    expect(await page.evaluate((key) => sessionStorage.getItem(key), TOKEN_KEY)).toBe(TOKEN);
  });

  test('timeout then manual retry preserve form and expose a readable busy status', async ({ page }) => {
    const held: Route[] = [];
    await page.clock.install();
    await page.setViewportSize({ width: 320, height: 568 });
    await fixture(page, { token: true, me: async (route) => { held.push(route); } });
    await page.goto('/login');
    await page.getByRole('heading', { name: 'Đăng nhập NovaWay' }).waitFor();
    await fill(page);
    await expect.poll(() => held.length).toBeGreaterThan(0);
    await page.clock.fastForward(15_000);
    await expect(page.getByRole('alert')).toBeVisible();
    await page.addStyleTag({ content: 'html { font-size: 32px !important; }' });
    await textFits(page);
    const count = held.length;
    await page.getByRole('button', { name: 'Thử lại' }).click();
    await expect.poll(() => held.length).toBeGreaterThan(count);
    await expect(page.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    await passwordField(page).focus();
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(passwordField(page)).toBeFocused();
    await expect(emailField(page)).toHaveValue(USER.email);
    await expect(passwordField(page)).toHaveValue(PASSWORD);
    await textFits(page);
    await reachable(submit(page));
    await json(held[held.length - 1], 500, { error_code: 'INTERNAL_ERROR', message: 'fixture' });
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(passwordField(page)).toBeFocused();
    await textFits(page);
    expect(await page.evaluate((key) => sessionStorage.getItem(key), TOKEN_KEY)).toBe(TOKEN);
  });

  test('existing native email validity and successful login remain unchanged', async ({ page }) => {
    let requests = 0;
    await page.setViewportSize({ width: 320, height: 568 });
    await fixture(page, { login: (route) => { requests += 1; return json(route, 200, { user: USER, access_token: TOKEN }); } });
    await page.goto('/login');
    await finishEntrance(page);
    await emailField(page).fill('invalid-email');
    await passwordField(page).fill(PASSWORD);
    await submit(page).click();
    expect(await emailField(page).evaluate((el) => (el as HTMLInputElement).validity.typeMismatch)).toBe(true);
    expect(requests).toBe(0);
    await emailField(page).fill(USER.email);
    await submit(page).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    expect(requests).toBe(1);
    expect(await page.evaluate((key) => sessionStorage.getItem(key), TOKEN_KEY)).toBe(TOKEN);
  });

  test('keyboard order keeps visible focus on email, password and submit', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await fixture(page);
    await page.goto('/login');
    await finishEntrance(page);
    await page.keyboard.press('Tab');
    await expect(emailField(page)).toBeFocused();
    expect(await emailField(page).evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe('none');
    await emailField(page).fill(USER.email);
    await page.keyboard.press('Tab');
    await expect(passwordField(page)).toBeFocused();
    expect(await passwordField(page).evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe('none');
    await passwordField(page).fill(PASSWORD);
    await page.keyboard.press('Tab');
    await expect(submit(page)).toBeFocused();
    await reachable(submit(page));
    expect(await submit(page).evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe('none');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('touch/DPR2 fixture accepts input and submit taps after reduced-height emulation', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2, baseURL });
    try {
      const page = await context.newPage();
      await fixture(page);
      await page.goto('/login');
      await finishEntrance(page);
      expect(await page.evaluate(() => ({ touch: navigator.maxTouchPoints, dpr: devicePixelRatio }))).toEqual({ touch: 1, dpr: 2 });
      await emailField(page).tap();
      await expect(emailField(page)).toBeFocused();
      await emailField(page).fill(USER.email);
      await passwordField(page).tap();
      await expect(passwordField(page)).toBeFocused();
      await passwordField(page).fill(PASSWORD);
      await page.setViewportSize({ width: 390, height: 320 });
      await expect(passwordField(page)).toBeFocused();
      await expect(emailField(page)).toHaveValue(USER.email);
      await expect(passwordField(page)).toHaveValue(PASSWORD);
      await textFits(page);
      await reachable(submit(page));
      await submit(page).tap();
      await expect(page).toHaveURL(/\/dashboard$/);
      expect(await page.evaluate((key) => sessionStorage.getItem(key), TOKEN_KEY)).toBe(TOKEN);
    } finally {
      await context.close();
    }
  });
});
