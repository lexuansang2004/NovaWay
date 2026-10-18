import { expect, test, type Locator, type Page } from '@playwright/test';

// WEB-09 / WEB-T08 (docs/web/WEB_ACCOUNT_RWD_SPEC.md §4.2; AC-WEBPROFILE-01…04).
//
// FIXTURE UI — the real app (router, AppLayout guard, session store,
// AuthContext, shell and the profile page) runs unchanged; only the REST
// transport is a Playwright route fixture. Every request the page sends is
// recorded with method, path, Bearer and body, so "read-only" is asserted on
// the wire, not from a screenshot. Synthetic accounts only (example.com).
//
// CSS text stress (html font-size 32px) is a stress test, NOT native browser
// zoom or native text-only zoom; those are separate checks outside this file.

const TOKEN_KEY = 'novaway_web_token';
const TOKEN_A = 'fixture-profile-token-a';
const TOKEN_B = 'fixture-profile-token-b';
const USER_A = { id: '00000000-0000-4000-8000-0000000009a1', email: 'profile.reader.a@example.com' };
const USER_B = { id: '00000000-0000-4000-8000-0000000009b2', email: 'profile.reader.b@example.com' };
// Presentation stress: local part65/total155; deliberately exceeds the normal
// 64-character local-part limit. Valid-boundary coverage is separate (review §61).
const LONG_LOCAL = 'very.long.profile.local.part.for.reflow.checks.only.1234567890abc';
const LONG_EMAIL = `${LONG_LOCAL}@extremely-long-subdomain-label-used-for-layout-checks.department.organisation.example.com`;
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };

interface ApiCall {
  method: string;
  path: string;
  token?: string;
  body: string | null;
}

interface FixtureOptions {
  token?: string | null;
  users?: Record<string, { id: string; email: string } & Record<string, unknown>>;
  me?: 'ok' | 401 | 'network';
}

// Seeds the token once per context (addInitScript re-runs on every load, so
// without the marker a reload would resurrect a token the app had cleared).
async function fixture(page: Page, options: FixtureOptions = {}) {
  const calls: ApiCall[] = [];
  const token = options.token === undefined ? TOKEN_A : options.token;
  const users = options.users ?? { [TOKEN_A]: USER_A, [TOKEN_B]: USER_B };
  if (token) {
    await page.addInitScript(
      ([key, value]) => {
        if (sessionStorage.getItem('__profile_seeded')) return;
        sessionStorage.setItem('__profile_seeded', '1');
        sessionStorage.setItem(key, value);
      },
      [TOKEN_KEY, token],
    );
  }
  // Records any use of camera or geolocation by the page.
  await page.addInitScript(() => {
    const w = window as unknown as { __sensitiveApiCalls: string[] };
    w.__sensitiveApiCalls = [];
    const record = (name: string) => () => {
      w.__sensitiveApiCalls.push(name);
      throw new Error(`fixture: ${name} must not be used`);
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition = record('geolocation.getCurrentPosition');
      navigator.geolocation.watchPosition = record('geolocation.watchPosition');
    }
    if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = record('mediaDevices.getUserMedia');
  });
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: CORS, body: '' });
    const path = new URL(request.url()).pathname;
    const bearer = request.headers()['authorization'];
    calls.push({ method: request.method(), path, token: bearer, body: request.postData() });
    const json = (status: number, body: unknown) =>
      route.fulfill({ status, contentType: 'application/json', headers: CORS, body: JSON.stringify(body) });
    if (path.endsWith('/auth/me')) {
      if (options.me === 'network') return route.abort('failed');
      if (options.me === 401) return json(401, { error_code: 'UNAUTHORIZED', message: 'fixture' });
      const user = users[bearer?.replace('Bearer ', '') ?? ''];
      return user ? json(200, user) : json(401, { error_code: 'UNAUTHORIZED', message: 'fixture' });
    }
    if (path.endsWith('/auth/login') && request.method() === 'POST') {
      const { email } = JSON.parse(request.postData() ?? '{}') as { email?: string };
      const entry = Object.entries(users).find(([, user]) => user.email === email);
      return entry
        ? json(200, { access_token: entry[0], user: { id: entry[1].id, email: entry[1].email } })
        : json(401, { error_code: 'INVALID_CREDENTIALS', message: 'fixture' });
    }
    return json(500, { error_code: 'UNEXPECTED_FIXTURE_REQUEST', message: 'Unexpected fixture request' });
  });
  return calls;
}

const main = (page: Page) => page.getByRole('main');
const heading = (page: Page) => main(page).getByRole('heading', { level: 1, name: 'Hồ sơ cá nhân' });
const emailLabel = (page: Page) => main(page).getByText('Email đăng nhập', { exact: true });
const emailValue = (page: Page, email: string) => main(page).getByText(email, { exact: true });
const backLink = (page: Page) => main(page).getByRole('link', { name: 'Về Dashboard' });
const readToken = (page: Page) => page.evaluate((key) => sessionStorage.getItem(key), TOKEN_KEY);

async function expectProfile(page: Page, email: string) {
  await expect(heading(page)).toBeVisible();
  await expect(emailLabel(page)).toBeVisible();
  await expect(emailValue(page, email)).toBeVisible();
  await expect(emailValue(page, email)).toHaveText(email);
  await expect(backLink(page)).toHaveAttribute('href', '/dashboard');
}

// Every request made while the profile page is open: only the session check,
// GET /api/auth/me with the current Bearer and no body.
function onlySessionChecks(calls: ApiCall[], token: string) {
  expect(calls.length).toBeGreaterThan(0);
  for (const call of calls) expect(call).toEqual({ method: 'GET', path: '/api/auth/me', token: `Bearer ${token}`, body: null });
}

async function noSensitiveApis(page: Page) {
  expect(await page.evaluate(() => (window as unknown as { __sensitiveApiCalls: string[] }).__sensitiveApiCalls)).toEqual([]);
}

// The email is fully readable without relying on a tooltip, ellipsis or a
// clipping ancestor: it is not cut by its own box, every ancestor up to <main>
// fully contains it, no horizontal page or main scroll, and nothing in main
// spills sideways. overflow:hidden would not satisfy the ancestor check.
async function expectEmailFullyReadable(page: Page, email: string) {
  const value = emailValue(page, email);
  await expect(value).toHaveText(email);
  const report = await value.evaluate((el) => {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const mainEl = el.closest('main')!;
    const clippedBy: string[] = [];
    for (let node = el.parentElement; node && node !== mainEl.parentElement; node = node.parentElement) {
      const box = node.getBoundingClientRect();
      if (rect.left < box.left - 1 || rect.right > box.right + 1) clippedBy.push(`${node.tagName}.${node.className}`);
    }
    const spills = [...mainEl.querySelectorAll('h1, h2, p, dt, dd, a, span')].flatMap((child) => {
      const r = child.getBoundingClientRect();
      if (!child.textContent?.trim() || !r.width) return [];
      const m = mainEl.getBoundingClientRect();
      return r.left < m.left - 1 || r.right > m.right + 1 ? [child.textContent.slice(0, 40)] : [];
    });
    return {
      ownOverflow: el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1,
      textOverflow: style.textOverflow,
      whiteSpace: style.whiteSpace,
      title: el.getAttribute('title'),
      clippedBy,
      spills,
      documentScrolls: document.documentElement.scrollWidth > window.innerWidth,
      mainScrolls: mainEl.scrollWidth > mainEl.clientWidth + 1,
    };
  });
  expect(report).toEqual({
    ownOverflow: false,
    textOverflow: 'clip',
    whiteSpace: 'normal',
    title: null,
    clippedBy: [],
    spills: [],
    documentScrolls: false,
    mainScrolls: false,
  });
}

// Scrolls the target (and its scrolling ancestors, i.e. <main>) for real and
// checks it can be brought fully on screen. A target taller than the viewport
// (the long email under CSS text stress) is checked in two parts instead:
// its first and its last line can each be scrolled into view.
async function reachable(target: Locator) {
  const fits = await target.evaluate((el) => {
    el.scrollIntoView({ block: 'center', inline: 'nearest' });
    return el.getBoundingClientRect().height <= window.innerHeight;
  });
  if (fits) {
    await expect(target).toBeInViewport({ ratio: 0.99 });
    return;
  }
  for (const block of ['start', 'end'] as const) {
    const edge = await target.evaluate((el, where) => {
      el.scrollIntoView({ block: where, inline: 'nearest' });
      const rect = el.getBoundingClientRect();
      return where === 'start' ? rect.top : rect.bottom;
    }, block);
    expect(edge).toBeGreaterThanOrEqual(-1);
    expect(edge).toBeLessThanOrEqual(await target.evaluate(() => window.innerHeight + 1));
  }
}

async function openAccountMenu(page: Page, email: string) {
  const opener = page.getByRole('button', { name: 'Mở menu điều hướng' });
  if (await opener.isVisible()) await opener.click();
  await page.getByRole('button', { name: `Tài khoản: ${email}` }).click();
}

async function signInThroughForm(page: Page, email: string) {
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu').fill('fixture-password');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test.describe('AC-WEBPROFILE-01 — shows the signed-in email, with a way back', () => {
  test('deep link: heading, label, exact email of A, link to /dashboard; only GET /auth/me', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const calls = await fixture(page);

    await page.goto('/account/profile');

    await expectProfile(page, USER_A.email);
    await expect(main(page).getByText(USER_B.email)).toHaveCount(0);
    onlySessionChecks(calls, TOKEN_A);
    await noSensitiveApis(page);

    await backLink(page).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    onlySessionChecks(calls, TOKEN_A);
  });

  for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }]) {
    test(`from the account menu at ${viewport.width}×${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const calls = await fixture(page);
      await page.goto('/dashboard');
      await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();

      await openAccountMenu(page, USER_A.email);
      await page.getByRole('menuitem', { name: 'Hồ sơ cá nhân' }).click();

      await expect(page).toHaveURL(/\/account\/profile$/);
      await expectProfile(page, USER_A.email);
      onlySessionChecks(calls, TOKEN_A);
    });
  }

  test('reload keeps the route and shows the same email after a fresh session check', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const calls = await fixture(page);
    await page.goto('/account/profile');
    await expectProfile(page, USER_A.email);
    const checksBefore = calls.length;

    await page.reload();

    await expect(page).toHaveURL(/\/account\/profile$/);
    await expectProfile(page, USER_A.email);
    expect(calls.length).toBeGreaterThan(checksBefore);
    onlySessionChecks(calls, TOKEN_A);
    expect(await readToken(page)).toBe(TOKEN_A);
  });
});

test.describe('AC-WEBPROFILE-02 — a long email is fully readable (WEB-T08 C + V06)', () => {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 844, height: 390 },
    { width: 1280, height: 720 },
  ]) {
    test(`${viewport.width}×${viewport.height}: wraps inside main, no truncation, link stays reachable`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const calls = await fixture(page, { users: { [TOKEN_A]: { id: USER_A.id, email: LONG_EMAIL } } });

      await page.goto('/account/profile');

      await expectProfile(page, LONG_EMAIL);
      await expectEmailFullyReadable(page, LONG_EMAIL);
      await reachable(backLink(page));
      onlySessionChecks(calls, TOKEN_A);
    });
  }

  for (const viewport of [{ width: 320, height: 568 }, { width: 1280, height: 720 }]) {
    test(`CSS text stress (html 32px, not native zoom) ${viewport.width}×${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const calls = await fixture(page, { users: { [TOKEN_A]: { id: USER_A.id, email: LONG_EMAIL } } });
      await page.goto('/account/profile');
      await expectProfile(page, LONG_EMAIL);

      await page.addStyleTag({ content: 'html { font-size: 32px !important; }' });

      await expectEmailFullyReadable(page, LONG_EMAIL);
      await reachable(emailValue(page, LONG_EMAIL));
      await reachable(backLink(page));
      const box = await backLink(page).boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      onlySessionChecks(calls, TOKEN_A);
    });
  }

  test('resize across the 1024 shell breakpoint and orientation keeps route, email and focus', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const calls = await fixture(page, { users: { [TOKEN_A]: { id: USER_A.id, email: LONG_EMAIL } } });
    await page.goto('/account/profile');
    await expectProfile(page, LONG_EMAIL);
    await backLink(page).focus();

    for (const size of [
      { width: 1025, height: 800 }, { width: 1024, height: 800 }, { width: 1023, height: 800 },
      { width: 844, height: 390 }, { width: 390, height: 844 }, { width: 320, height: 568 },
      { width: 1023, height: 800 }, { width: 1024, height: 800 }, { width: 1280, height: 720 },
    ]) {
      await page.setViewportSize(size);
      await expect(page).toHaveURL(/\/account\/profile$/);
      await expect(backLink(page)).toBeFocused();
      await expectEmailFullyReadable(page, LONG_EMAIL);
    }
    onlySessionChecks(calls, TOKEN_A);
  });
});

test.describe('AC-WEBPROFILE-03 — read only, nothing made up', () => {
  test('no form or write control; only email shown even if /me were to send more', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    // Off-contract extras that the page must NOT render (the real /me only
    // returns id and email — docs/API_CONTRACT.md §1).
    const extras = {
      password_hash: 'fixture-hash-must-not-render',
      created_at: '2026-01-02T03:04:05.000Z',
      name: 'Fixture Display Name',
      phone: '0900000000',
      avatar_url: 'https://images.example.com/avatar.png',
      verified: true,
    };
    const calls = await fixture(page, { users: { [TOKEN_A]: { ...USER_A, ...extras } } });

    await page.goto('/account/profile');
    await expectProfile(page, USER_A.email);

    const area = main(page);
    await expect(area.locator('form, input, textarea, select, [contenteditable="true"]')).toHaveCount(0);
    await expect(area.getByRole('button')).toHaveCount(0);
    await expect(area.locator('img')).toHaveCount(0);
    const text = await area.innerText();
    for (const forbidden of [
      extras.password_hash, extras.name, extras.phone, extras.avatar_url, extras.created_at,
      '2026', USER_A.id, TOKEN_A, 'Lưu', 'mật khẩu', 'Mật khẩu',
    ]) {
      expect(text, `profile must not show ${forbidden}`).not.toContain(forbidden);
    }
    expect(await page.content()).not.toContain(extras.password_hash);
    onlySessionChecks(calls, TOKEN_A);
    await noSensitiveApis(page);
  });
});

test.describe('AC-WEBPROFILE-04 — switching accounts never shows the previous email', () => {
  test('A views profile → logout → Back → B signs in → profile and Back show only B', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const calls = await fixture(page);
    // A protected entry (/dashboard) sits behind the profile in history, so
    // Back after logout really returns to a protected route. (Logout replaces
    // the current entry with /login.)
    await page.goto('/dashboard');
    await openAccountMenu(page, USER_A.email);
    await page.getByRole('menuitem', { name: 'Hồ sơ cá nhân' }).click();
    await expect(page).toHaveURL(/\/account\/profile$/);
    await expectProfile(page, USER_A.email);

    await openAccountMenu(page, USER_A.email);
    await page.getByRole('menuitem', { name: 'Đăng xuất' }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect(await readToken(page)).toBeNull();

    await page.goBack(); // to the /dashboard entry: the guard sends it to /login
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText(USER_A.email)).toHaveCount(0);
    expect(await readToken(page)).toBeNull();

    await signInThroughForm(page, USER_B.email);
    // In-app navigation first (same JS session as A's visit, so any state the
    // page kept in memory would still be there), then a deep link.
    await openAccountMenu(page, USER_B.email);
    await page.getByRole('menuitem', { name: 'Hồ sơ cá nhân' }).click();
    await expectProfile(page, USER_B.email);
    await expect(page.getByText(USER_A.email)).toHaveCount(0);
    await page.goto('/account/profile');
    await expectProfile(page, USER_B.email);
    await expect(page.getByText(USER_A.email)).toHaveCount(0);
    expect(await readToken(page)).toBe(TOKEN_B);

    await page.goBack();
    await expect(page.getByText(USER_A.email)).toHaveCount(0);

    // Setup traffic (the login POST) is its own flow; everything else is a
    // read-only session check, and after the switch only with B's token.
    const login = calls.filter((call) => call.path === '/api/auth/login');
    expect(login).toHaveLength(1);
    expect(login[0].method).toBe('POST');
    const rest = calls.filter((call) => call.path !== '/api/auth/login');
    for (const call of rest) expect(call).toMatchObject({ method: 'GET', path: '/api/auth/me', body: null });
    const afterSwitch = rest.slice(rest.findIndex((call) => call.token === `Bearer ${TOKEN_B}`));
    for (const call of afterSwitch) expect(call.token).toBe(`Bearer ${TOKEN_B}`);
  });

  test('no token: deep link goes to /login without a session check or profile content', async ({ page }) => {
    const calls = await fixture(page, { token: null });
    await page.goto('/account/profile');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Hồ sơ cá nhân' })).toHaveCount(0);
    expect(calls).toEqual([]);
  });

  test('401: session cleared, /login, no profile content (WEB-01 semantics unchanged)', async ({ page }) => {
    await fixture(page, { me: 401 });
    await page.goto('/account/profile');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Hồ sơ cá nhân' })).toHaveCount(0);
    await expect(page.getByText(USER_A.email)).toHaveCount(0);
    expect(await readToken(page)).toBeNull();
  });

  test('network failure: WEB-01 error screen, token kept, no profile content', async ({ page }) => {
    await fixture(page, { me: 'network' });
    await page.goto('/account/profile');
    await expect(page.getByRole('button', { name: 'Thử lại' })).toBeVisible();
    await expect(page).toHaveURL(/\/account\/profile$/);
    await expect(page.getByRole('heading', { name: 'Hồ sơ cá nhân' })).toHaveCount(0);
    await expect(page.getByText(USER_A.email)).toHaveCount(0);
    expect(await readToken(page)).toBe(TOKEN_A);
  });
});

test.describe('keyboard and touch', () => {
  test('Tab reaches "Về Dashboard" with a visible focus ring, Shift+Tab leaves it, Enter navigates', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const calls = await fixture(page);
    await page.goto('/account/profile');
    await expectProfile(page, USER_A.email);

    await page.locator('body').focus();
    let reached = false;
    for (let step = 0; step < 40 && !reached; step += 1) {
      await page.keyboard.press('Tab');
      reached = await backLink(page).evaluate((el) => el === document.activeElement);
    }
    expect(reached).toBe(true);
    const ring = await backLink(page).evaluate((el) => {
      const style = getComputedStyle(el);
      return { outline: style.outlineStyle, width: parseFloat(style.outlineWidth), shadow: style.boxShadow };
    });
    expect(ring.outline !== 'none' && ring.width > 0 || ring.shadow !== 'none').toBe(true);

    await page.keyboard.press('Shift+Tab');
    await expect(backLink(page)).not.toBeFocused();
    await page.keyboard.press('Tab');
    await expect(backLink(page)).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/dashboard$/);
    onlySessionChecks(calls, TOKEN_A);
  });

  test('touch/DPR2 at 390×844: 44px target, tap returns to the dashboard', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2, baseURL });
    try {
      const page = await context.newPage();
      const calls = await fixture(page);
      await page.goto('/account/profile');
      await expectProfile(page, USER_A.email);
      expect(await page.evaluate(() => ({ touch: navigator.maxTouchPoints > 0, dpr: devicePixelRatio }))).toEqual({ touch: true, dpr: 2 });
      await reachable(backLink(page));
      const box = await backLink(page).boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
      await backLink(page).tap();
      await expect(page).toHaveURL(/\/dashboard$/);
      onlySessionChecks(calls, TOKEN_A);
    } finally {
      await context.close();
    }
  });
});
