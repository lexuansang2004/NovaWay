import { expect, test, type Page, type Route } from '@playwright/test';

// WEB-01 (docs/web/WEB_ACCOUNT_RWD_SPEC.md §4.1, AC-WEBSESSION-01→09).
//
// FIXTURE UI — every backend response in this file is a Playwright route
// fixture, not the real API. These tests prove what the web app does with a
// given `/auth/me` outcome (network failure, 5xx, 403, 429, a hung request, a
// late answer from an older session); they are NOT evidence that the backend
// produces those outcomes. The real-backend regression lives in
// session-auth-regression.spec.ts.
//
// Assertions go beyond the DOM on purpose: sessionStorage is read directly,
// the signed-in email shown in the sidebar is what AuthContext holds, and the
// URL is the route. The service/store level of the same rules is covered
// without a browser in src/services/authSession.spec.ts.

const TOKEN_KEY = 'novaway_web_token';
const ME_URL = '**/api/auth/me';
const LOGIN_URL = '**/api/auth/login';
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };

const USER_A = { id: '00000000-0000-4000-8000-00000000000a', email: 'fixture-a@example.com' };
const USER_B = { id: '00000000-0000-4000-8000-00000000000b', email: 'fixture-b@example.com' };
const TOKEN_A = 'fixture-token-a';
const TOKEN_B = 'fixture-token-b';

// Seeds the token once per browser context. addInitScript re-runs on every
// document load, so without the marker a reload would resurrect a token the
// app had deliberately cleared.
async function seedToken(page: Page, token: string) {
  await page.addInitScript(
    ([key, value]) => {
      if (sessionStorage.getItem('__fixture_seeded')) return;
      sessionStorage.setItem('__fixture_seeded', '1');
      sessionStorage.setItem(key, value);
    },
    [TOKEN_KEY, token],
  );
}

const readToken = (page: Page) => page.evaluate((key) => sessionStorage.getItem(key), TOKEN_KEY);

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', headers: CORS, body: JSON.stringify(body) });

const apiError = (route: Route, status: number, errorCode: string) =>
  json(route, status, { error_code: errorCode, message: 'fixture' });

const bearer = (route: Route) => route.request().headers()['authorization'];

function trackPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  return errors;
}

// Holds matching requests open until the test decides how they end, so the
// order of "old answer" vs "newer event" is explicit instead of timing-based.
function holdRequests(page: Page, url: string, matches: (route: Route) => boolean = () => true) {
  const held: Route[] = [];
  const ready = page.route(url, (route) => {
    if (!matches(route)) return route.fallback();
    held.push(route);
  });
  return {
    ready,
    count: () => held.length,
    waitForCount: (count: number) => expect.poll(() => held.length).toBeGreaterThanOrEqual(count),
    answerAll: async (answer: (route: Route) => Promise<void>) => {
      // The app may already have aborted these; answering an aborted route
      // throws, which is fine — the point is that nothing changes either way.
      await Promise.all(held.map((route) => answer(route).catch(() => undefined)));
    },
  };
}

const checkingScreen = (page: Page) => page.getByText('Đang kiểm tra phiên đăng nhập...');
const retryButton = (page: Page) => page.getByRole('button', { name: 'Thử lại' });
const reloginButton = (page: Page) => page.getByRole('button', { name: 'Đăng nhập lại' });
const submitButton = (page: Page) => page.getByRole('button', { name: 'Đăng nhập', exact: true });
const dashboardHeading = (page: Page) => page.getByRole('link', { name: 'Dashboard' });

async function fillLoginForm(page: Page, email: string) {
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu').fill('fixture-password');
}

// These four failed against the unfixed code (recorded in docs/REVIEW_NOTES.md):
// the guard stayed on "Đang kiểm tra phiên đăng nhập..." with no way out, and
// /login reported an unhandled rejection.
test.describe('regression: /auth/me fails with something other than 401', () => {
  for (const failure of ['network', '500'] as const) {
    test(`protected route leaves the checking screen when /auth/me fails (${failure})`, async ({ page }) => {
      await seedToken(page, TOKEN_A);
      await page.route(ME_URL, (route) =>
        failure === 'network' ? route.abort('failed') : apiError(route, 500, 'INTERNAL_ERROR'),
      );

      await page.goto('/dashboard');

      await expect(retryButton(page)).toBeVisible();
      await expect(reloginButton(page)).toBeVisible();
      await expect(checkingScreen(page)).toHaveCount(0);
      expect(await readToken(page)).toBe(TOKEN_A);
    });

    test(`/login has no unhandled rejection and stays usable when /auth/me fails (${failure})`, async ({
      page,
    }) => {
      const pageErrors = trackPageErrors(page);
      await seedToken(page, TOKEN_A);
      await page.route(ME_URL, (route) =>
        failure === 'network' ? route.abort('failed') : apiError(route, 500, 'INTERNAL_ERROR'),
      );

      await page.goto('/login');

      await expect(page.getByRole('alert')).toBeVisible();
      await expect(page.getByLabel('Email')).toBeEditable();
      await expect(submitButton(page)).toBeEnabled();
      expect(await readToken(page)).toBe(TOKEN_A);
      expect(pageErrors).toEqual([]);
    });
  }
});

test.describe('AC-WEBSESSION-01 — no token, 200, 401', () => {
  test('no token: protected route goes to /login and never calls /auth/me', async ({ page }) => {
    let meCalls = 0;
    await page.route(ME_URL, (route) => {
      meCalls += 1;
      return json(route, 200, USER_A);
    });

    await page.goto('/account/profile');

    await expect(page).toHaveURL(/\/login$/);
    await expect(submitButton(page)).toBeVisible();
    expect(meCalls).toBe(0);
  });

  test('200: the requested protected route is shown with the signed-in user', async ({ page }) => {
    await seedToken(page, TOKEN_A);
    await page.route(ME_URL, (route) => json(route, 200, USER_A));

    await page.goto('/account/profile');

    await expect(page).toHaveURL(/\/account\/profile$/);
    await expect(page.getByRole('heading', { name: 'Hồ sơ cá nhân' })).toBeVisible();
    await expect(page.getByText(USER_A.email)).toBeVisible();
    expect(await readToken(page)).toBe(TOKEN_A);
  });

  test('401: the local session is cleared, /login is shown and no protected content appears', async ({
    page,
  }) => {
    await seedToken(page, TOKEN_A);
    await page.route(ME_URL, (route) => apiError(route, 401, 'UNAUTHORIZED'));

    await page.goto('/account/profile');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Hồ sơ cá nhân' })).toHaveCount(0);
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(await readToken(page)).toBeNull();
  });
});

test.describe('AC-WEBSESSION-02 — 403 and 429 are not a credentials error', () => {
  for (const [status, expectedText] of [
    [403, 'Máy chủ từ chối yêu cầu kiểm tra phiên đăng nhập'],
    [429, 'Có quá nhiều yêu cầu trong thời gian ngắn'],
  ] as const) {
    test(`${status}: error screen with its own message, token kept`, async ({ page }) => {
      let meCalls = 0;
      await seedToken(page, TOKEN_A);
      await page.route(ME_URL, (route) => {
        meCalls += 1;
        return apiError(route, status, 'FIXTURE');
      });

      await page.goto('/dashboard');

      const alert = page.getByRole('alert');
      await expect(alert).toContainText(expectedText);
      await expect(alert).not.toContainText(/mật khẩu|sai/i);
      await expect(retryButton(page)).toBeVisible();
      await expect(reloginButton(page)).toBeVisible();
      await expect(page).toHaveURL(/\/dashboard$/);
      expect(await readToken(page)).toBe(TOKEN_A);

      // No automatic retry: the count stays where the mount left it. (React
      // StrictMode double-invokes effects in dev, so "where the mount left
      // it" is read rather than assumed to be 1.)
      const callsAfterMount = meCalls;
      await page.waitForTimeout(1500);
      expect(meCalls).toBe(callsAfterMount);
    });
  }
});

test.describe('AC-WEBSESSION-03 — 15 second timeout', () => {
  test('a hung /auth/me ends in the error screen at 15s, keeps the token, and a late answer changes nothing', async ({
    page,
  }) => {
    await page.clock.install();
    await seedToken(page, TOKEN_A);
    const hung = holdRequests(page, ME_URL);
    await hung.ready;

    await page.goto('/dashboard');
    await expect(checkingScreen(page)).toBeVisible();
    await hung.waitForCount(1);

    await page.clock.fastForward(14_000);
    await expect(checkingScreen(page)).toBeVisible();
    await expect(retryButton(page)).toHaveCount(0);

    await page.clock.fastForward(1_000);
    await expect(page.getByRole('alert')).toContainText('mất quá nhiều thời gian');
    await expect(retryButton(page)).toBeVisible();
    expect(await readToken(page)).toBe(TOKEN_A);

    // The server finally answers 401 for the request that was given up on.
    await hung.answerAll((route) => apiError(route, 401, 'UNAUTHORIZED'));
    await page.waitForTimeout(300);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(retryButton(page)).toBeVisible();
    expect(await readToken(page)).toBe(TOKEN_A);
  });
});

test.describe('AC-WEBSESSION-04 — retry', () => {
  test('retry succeeds and lands on the route that was requested', async ({ page }) => {
    let healthy = false;
    await seedToken(page, TOKEN_A);
    await page.route(ME_URL, (route) =>
      healthy ? json(route, 200, USER_A) : apiError(route, 500, 'INTERNAL_ERROR'),
    );

    await page.goto('/account/privacy');
    await expect(retryButton(page)).toBeVisible();
    await expect(page).toHaveURL(/\/account\/privacy$/);

    healthy = true;
    await retryButton(page).click();

    await expect(page.getByRole('heading', { name: 'Quyền riêng tư' })).toBeVisible();
    await expect(page).toHaveURL(/\/account\/privacy$/);
    await expect(page.getByText(USER_A.email)).toBeVisible();
  });

  test('retry that fails again returns to the error screen with the token kept', async ({ page }) => {
    await seedToken(page, TOKEN_A);
    await page.route(ME_URL, (route) => route.abort('failed'));

    await page.goto('/dashboard');
    await expect(retryButton(page)).toBeVisible();
    await retryButton(page).click();

    await expect(retryButton(page)).toBeVisible();
    expect(await readToken(page)).toBe(TOKEN_A);
  });

  test('clicking retry repeatedly starts one check, shows the busy state, and is not doubled', async ({
    page,
  }) => {
    let failing = true;
    let callsSinceRetry = 0;
    await seedToken(page, TOKEN_A);
    const held: Route[] = [];
    await page.route(ME_URL, (route) => {
      if (failing) return apiError(route, 500, 'INTERNAL_ERROR');
      callsSinceRetry += 1;
      held.push(route);
    });

    await page.goto('/dashboard');
    await expect(retryButton(page)).toBeVisible();

    failing = false;
    await retryButton(page).dblclick();
    await expect(checkingScreen(page)).toBeVisible();
    await expect(retryButton(page)).toHaveCount(0);
    await expect.poll(() => callsSinceRetry).toBe(1);
    await page.waitForTimeout(500);
    expect(callsSinceRetry).toBe(1);

    await Promise.all(held.map((route) => json(route, 200, USER_A)));
    await expect(dashboardHeading(page)).toBeVisible();
  });
});

// Independent review round 1, finding R02: on /login the notice used to vanish
// on retry with nothing in its place. The page keeps its form, so the busy
// state has to be shown next to it rather than as a full-page loader.
test.describe('AC-WEBSESSION-04 — retry on /login shows a busy state', () => {
  test('while /auth/me is pending after "Thử lại": accessible busy status, form still usable, token kept', async ({
    page,
  }) => {
    let failing = true;
    const held: Route[] = [];
    await seedToken(page, TOKEN_A);
    await page.route(ME_URL, (route) => {
      if (failing) return apiError(route, 500, 'INTERNAL_ERROR');
      held.push(route);
    });

    await page.goto('/login');
    await expect(retryButton(page)).toBeVisible();

    failing = false;
    await retryButton(page).click();
    await expect.poll(() => held.length).toBeGreaterThanOrEqual(1);

    const busy = page.getByRole('status');
    await expect(busy).toBeVisible();
    await expect(busy).toContainText('Đang kiểm tra lại phiên đăng nhập');
    await expect(busy).toHaveAttribute('aria-busy', 'true');
    await expect(page.getByRole('alert')).toHaveCount(0);
    // A second click cannot start a second check: "Thử lại" is not offered while busy.
    await expect(retryButton(page)).toHaveCount(0);
    await expect(page.getByLabel('Email')).toBeEditable();
    await expect(page.getByLabel('Mật khẩu')).toBeEditable();
    await expect(submitButton(page)).toBeEnabled();
    expect(await readToken(page)).toBe(TOKEN_A);
    const pendingRequests = held.length;
    await page.waitForTimeout(300);
    expect(held.length).toBe(pendingRequests);

    // The retry fails again: busy state goes away, the error notice is back.
    await Promise.all(held.map((route) => apiError(route, 500, 'INTERNAL_ERROR').catch(() => undefined)));
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(retryButton(page)).toBeVisible();
    expect(await readToken(page)).toBe(TOKEN_A);
  });

  test('signing in through the form while the retry is pending signs that user in; the retry cannot undo it', async ({
    page,
  }) => {
    let failing = true;
    const heldForA: Route[] = [];
    await seedToken(page, TOKEN_A);
    await page.route(ME_URL, (route) => {
      if (bearer(route) === `Bearer ${TOKEN_B}`) return json(route, 200, USER_B);
      if (failing) return apiError(route, 500, 'INTERNAL_ERROR');
      heldForA.push(route);
    });
    await page.route(LOGIN_URL, (route) => json(route, 200, { access_token: TOKEN_B, user: USER_B }));

    await page.goto('/login');
    await expect(retryButton(page)).toBeVisible();
    failing = false;
    await retryButton(page).click();
    await expect(page.getByRole('status')).toBeVisible();

    await fillLoginForm(page, USER_B.email);
    await submitButton(page).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText(USER_B.email)).toBeVisible();

    await Promise.all(heldForA.map((route) => json(route, 200, USER_A).catch(() => undefined)));
    await page.waitForTimeout(300);

    expect(await readToken(page)).toBe(TOKEN_B);
    await expect(page.getByText(USER_B.email)).toBeVisible();
    await expect(page.getByText(USER_A.email)).toHaveCount(0);
  });
});

test.describe('AC-WEBSESSION-05 — /login while the session check fails', () => {
  test('signing in through the form still works and replaces the old token', async ({ page }) => {
    const pageErrors = trackPageErrors(page);
    await seedToken(page, TOKEN_A);
    await page.route(ME_URL, (route) =>
      bearer(route) === `Bearer ${TOKEN_B}` ? json(route, 200, USER_B) : route.abort('failed'),
    );
    await page.route(LOGIN_URL, (route) => json(route, 200, { access_token: TOKEN_B, user: USER_B }));

    await page.goto('/login');
    await expect(page.getByRole('alert')).toBeVisible();

    await fillLoginForm(page, USER_B.email);
    await submitButton(page).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText(USER_B.email)).toBeVisible();
    expect(await readToken(page)).toBe(TOKEN_B);
    expect(pageErrors).toEqual([]);
  });

  test('retry on /login with a session that turns out valid goes to the dashboard', async ({ page }) => {
    let healthy = false;
    await seedToken(page, TOKEN_A);
    await page.route(ME_URL, (route) =>
      healthy ? json(route, 200, USER_A) : apiError(route, 500, 'INTERNAL_ERROR'),
    );

    await page.goto('/login');
    await expect(page.getByRole('alert')).toBeVisible();

    healthy = true;
    await retryButton(page).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText(USER_A.email)).toBeVisible();
  });

  test('"Đăng nhập lại" on /login drops the old session in place and leaves the form usable', async ({
    page,
  }) => {
    let meCalls = 0;
    await seedToken(page, TOKEN_A);
    await page.route(ME_URL, (route) => {
      meCalls += 1;
      return apiError(route, 500, 'INTERNAL_ERROR');
    });

    await page.goto('/login');
    await expect(reloginButton(page)).toBeVisible();
    const callsBefore = meCalls;

    await reloginButton(page).click();

    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByLabel('Email')).toBeEditable();
    expect(await readToken(page)).toBeNull();
    expect(meCalls).toBe(callsBefore);
  });

  test('a wrong password is reported by the form, not as a session-check error', async ({ page }) => {
    await page.route(LOGIN_URL, (route) =>
      json(route, 401, { error_code: 'INVALID_CREDENTIALS', message: 'Email hoặc mật khẩu không đúng.' }),
    );

    await page.goto('/login');
    await fillLoginForm(page, USER_A.email);
    await submitButton(page).click();

    await expect(page.getByText('Email hoặc mật khẩu không đúng.')).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page).toHaveURL(/\/login$/);
    expect(await readToken(page)).toBeNull();
  });
});

test.describe('AC-WEBSESSION-07 — the explicit "Đăng nhập lại" action', () => {
  test('old token still valid: session is dropped locally, /login is usable, nothing redirects back, Back shows no account content', async ({
    page,
  }) => {
    let healthy = true;
    let meCalls = 0;
    const otherApiCalls: string[] = [];
    await seedToken(page, TOKEN_A);
    await page.addInitScript(() => localStorage.setItem('fixture-preference', 'keep-me'));
    await page.route('**/api/**', (route) => {
      otherApiCalls.push(`${route.request().method()} ${route.request().url()}`);
      return route.fallback();
    });
    await page.route(ME_URL, (route) => {
      meCalls += 1;
      return healthy ? json(route, 200, USER_A) : apiError(route, 500, 'INTERNAL_ERROR');
    });

    // Signed in as A with two protected entries in history, then a reload
    // whose session check fails.
    await page.goto('/dashboard');
    await expect(page.getByText(USER_A.email)).toBeVisible();
    await page.getByRole('link', { name: 'Offline Sync' }).click();
    await expect(page).toHaveURL(/\/offline-sync$/);
    healthy = false;
    await page.reload();
    await expect(reloginButton(page)).toBeVisible();
    await expect(page.getByText(USER_A.email)).toHaveCount(0);

    // The network recovers and the old token would be accepted again...
    healthy = true;
    const callsBefore = meCalls;
    await reloginButton(page).click();

    // ...but the user chose to sign in again.
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByLabel('Email')).toBeEditable();
    await expect(submitButton(page)).toBeEnabled();
    expect(await readToken(page)).toBeNull();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/login$/);
    // No token means no check: the old session is never asked about again.
    expect(meCalls).toBe(callsBefore);
    // Local only: nothing but /auth/me was ever requested (no revoke call),
    // and the preference in localStorage is untouched.
    expect(otherApiCalls).toEqual([]);
    expect(await page.evaluate(() => localStorage.getItem('fixture-preference'))).toBe('keep-me');

    // Back to the protected entry behind it: the guard sends it to /login.
    await page.goBack();
    await expect(page).toHaveURL(/\/login$/);
    await expect(submitButton(page)).toBeVisible();
    await expect(page.getByText(USER_A.email)).toHaveCount(0);
    expect(await readToken(page)).toBeNull();
    expect(meCalls).toBe(callsBefore);
  });

  test('old token invalid: same result, and the form signs a new user in', async ({ page }) => {
    await seedToken(page, TOKEN_A);
    await page.route(ME_URL, (route) => {
      if (bearer(route) === `Bearer ${TOKEN_B}`) return json(route, 200, USER_B);
      return apiError(route, 500, 'INTERNAL_ERROR');
    });
    await page.route(LOGIN_URL, (route) => json(route, 200, { access_token: TOKEN_B, user: USER_B }));

    await page.goto('/dashboard');
    await reloginButton(page).click();
    await expect(page).toHaveURL(/\/login$/);
    expect(await readToken(page)).toBeNull();

    await fillLoginForm(page, USER_B.email);
    await submitButton(page).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText(USER_B.email)).toBeVisible();
    expect(await readToken(page)).toBe(TOKEN_B);
  });

  test('network recovers just after "Đăng nhập lại": the late 200 for the old token cannot sign the user back in', async ({
    page,
  }) => {
    await page.clock.install();
    await seedToken(page, TOKEN_A);
    const hung = holdRequests(page, ME_URL);
    await hung.ready;

    await page.goto('/dashboard');
    await hung.waitForCount(1);
    await page.clock.fastForward(15_000);
    await expect(reloginButton(page)).toBeVisible();

    await reloginButton(page).click();
    await expect(page).toHaveURL(/\/login$/);
    expect(await readToken(page)).toBeNull();

    await hung.answerAll((route) => json(route, 200, USER_A));
    await page.waitForTimeout(500);

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByLabel('Email')).toBeEditable();
    await expect(page.getByText(USER_A.email)).toHaveCount(0);
    expect(await readToken(page)).toBeNull();
  });
});

test.describe('AC-WEBSESSION-08 — /auth/me for A is still pending when B signs in', () => {
  for (const lateAnswer of ['401', '200', '500'] as const) {
    test(`A answers ${lateAnswer} after B signed in: B's token, user and route are untouched`, async ({
      page,
    }) => {
      const pageErrors = trackPageErrors(page);
      await seedToken(page, TOKEN_A);
      // Playwright consults the most recently registered route first: the
      // generic answer for B goes in first, the hold for A's token on top.
      await page.route(ME_URL, (route) => json(route, 200, USER_B));
      const pendingForA = holdRequests(page, ME_URL, (route) => bearer(route) === `Bearer ${TOKEN_A}`);
      await pendingForA.ready;
      await page.route(LOGIN_URL, (route) => json(route, 200, { access_token: TOKEN_B, user: USER_B }));

      await page.goto('/login');
      await pendingForA.waitForCount(1);

      await fillLoginForm(page, USER_B.email);
      await submitButton(page).click();
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(page.getByText(USER_B.email)).toBeVisible();

      await pendingForA.answerAll((route) => {
        if (lateAnswer === '200') return json(route, 200, USER_A);
        return apiError(route, Number(lateAnswer), 'FIXTURE');
      });
      await page.waitForTimeout(500);

      expect(await readToken(page)).toBe(TOKEN_B);
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(page.getByText(USER_B.email)).toBeVisible();
      await expect(page.getByText(USER_A.email)).toHaveCount(0);
      await expect(page.getByRole('alert')).toHaveCount(0);
      expect(pageErrors).toEqual([]);
    });
  }
});

// Reachable through the UI: the check that timed out answers after the user
// has already started a retry. (A check that is still pending at logout is
// not reachable through the UI — the guard only checks on mount and the
// logout item only exists once that check has finished — so that case, and
// unmount, are covered at the store level in src/services/authSession.spec.ts.)
test.describe('AC-WEBSESSION-09 — the timed-out check answers after a retry has started', () => {
  for (const lateAnswer of ['401', '200', '500'] as const) {
    test(`late ${lateAnswer} from the timed-out check does not decide the retry`, async ({ page }) => {
      await page.clock.install();
      await seedToken(page, TOKEN_A);
      const held: Route[] = [];
      await page.route(ME_URL, (route) => {
        held.push(route);
      });

      await page.goto('/account/profile');
      await expect.poll(() => held.length).toBeGreaterThanOrEqual(1);
      await page.clock.fastForward(15_000);
      await expect(retryButton(page)).toBeVisible();
      const timedOut = [...held];

      await retryButton(page).click();
      await expect(checkingScreen(page)).toBeVisible();
      await expect.poll(() => held.length).toBe(timedOut.length + 1);

      await Promise.all(
        timedOut.map((route) =>
          (lateAnswer === '200'
            ? json(route, 200, USER_B)
            : apiError(route, Number(lateAnswer), 'FIXTURE')
          ).catch(() => undefined),
        ),
      );
      await page.waitForTimeout(500);

      // Still waiting for the retry: not signed out by the old 401, not
      // signed in (as the wrong user) by the old 200, not failed by the old 500.
      await expect(checkingScreen(page)).toBeVisible();
      await expect(page).toHaveURL(/\/account\/profile$/);
      expect(await readToken(page)).toBe(TOKEN_A);

      await json(held[held.length - 1], 200, USER_A);
      await expect(page.getByRole('heading', { name: 'Hồ sơ cá nhân' })).toBeVisible();
      await expect(page.getByText(USER_A.email)).toBeVisible();
      await expect(page.getByText(USER_B.email)).toHaveCount(0);
    });
  }
});
