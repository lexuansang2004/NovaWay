import { expect, test, type Locator, type Page } from '@playwright/test';

// WEB-02 / AC-RWD-01→04,09,10. Fixture UI, NOT real backend/device evidence.
// CSS viewports and CSS text-stress are not browser zoom or OS text scaling.
// Real browser zoom/text-only zoom and screen-reader checks are recorded separately.
const TOKEN_KEY = 'novaway_web_token';
const EMAIL = 'navigation.long.email.for.reflow.and.focus.verification@example.com';
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
const opener = (page: Page) => page.getByRole('button', { name: 'Mở menu điều hướng' });
const drawer = (page: Page) => page.getByRole('dialog', { name: 'Điều hướng NovaWay' });
const closer = (page: Page) => page.getByRole('button', { name: 'Đóng menu điều hướng' });
const account = (page: Page) => page.getByRole('button', { name: `Tài khoản: ${EMAIL}` });

async function fixture(page: Page, authenticated = true) {
  await page.addInitScript(({ key, authenticated }) => {
    if (sessionStorage.getItem('__navigation_seeded')) return;
    sessionStorage.setItem('__navigation_seeded', '1');
    if (authenticated) sessionStorage.setItem(key, 'fixture-navigation-token');
  }, { key: TOKEN_KEY, authenticated });
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const body = url.pathname.endsWith('/auth/me')
      ? { id: '00000000-0000-4000-8000-000000000002', email: EMAIL }
      : url.pathname.endsWith('/vehicles') ? { vehicles: [] } : { trips: [] };
    await route.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(body) });
  });
}

async function noLock(page: Page) {
  await expect.poll(() => page.evaluate(() => ({
    pointer: getComputedStyle(document.body).pointerEvents,
    lock: document.body.hasAttribute('data-scroll-locked'),
  }))).toEqual({ pointer: 'auto', lock: false });
  await expect(page.getByTestId('navigation-backdrop')).toHaveCount(0);
}

async function reachableTarget(target: Locator) {
  await target.scrollIntoViewIfNeeded();
  await expect(target).toBeInViewport();
  const box = await target.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(await target.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
}

test.describe('responsive navigation — fixture UI', () => {
  for (const viewport of [
    { width: 320, height: 568 }, { width: 844, height: 390 },
    { width: 1024, height: 768 }, { width: 1280, height: 720 },
  ]) {
    test(`WEB-V ${viewport.width}×${viewport.height}: shell/menu reflow and touch targets`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await fixture(page);
      await page.goto('/account/profile');
      await expect(page.getByRole('heading', { name: 'Hồ sơ cá nhân' })).toBeVisible();
      if (viewport.width < 1024) {
        await reachableTarget(opener(page));
        await expect(page.getByRole('navigation')).toHaveCount(0);
        await opener(page).click();
        await expect(drawer(page)).toBeVisible();
        await reachableTarget(closer(page));
      } else {
        await expect(opener(page)).toHaveCount(0);
        await expect(page.getByTestId('desktop-navigation')).toBeVisible();
      }
      await expect(page.getByRole('navigation', { name: 'Điều hướng chính' })).toHaveCount(1);
      for (const link of await page.getByRole('navigation').getByRole('link').all()) await reachableTarget(link);
      await reachableTarget(account(page));
      // Test text containers, not just document overflow (overflow-hidden can mask clipping).
      // Scoped to the shell (<aside>): since WEB-09 the profile page in <main> shows the same email.
      const email = page.getByRole('complementary').getByText(EMAIL, { exact: true });
      expect(await email.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await account(page).click();
      for (const item of await page.getByRole('menuitem').all()) await reachableTarget(item);
      await page.keyboard.press('Escape');
      await expect(account(page)).toBeFocused();
      if (viewport.width < 1024) {
        await page.keyboard.press('Escape');
        await expect(opener(page)).toBeFocused();
      }
      await noLock(page);
    });
  }

  test('drawer keyboard focus, Escape, close button, backdrop and hidden navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await fixture(page);
    await page.goto('/help');
    await opener(page).focus();
    await page.keyboard.press('Enter');
    await expect(closer(page)).toBeFocused();
    // Last tab stop loops to the first, and Shift+Tab loops backwards.
    await page.keyboard.press('Shift+Tab');
    await expect(account(page)).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(closer(page)).toBeFocused();
    expect(await closer(page).evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
    await page.keyboard.press('Escape');
    await expect(opener(page)).toBeFocused();
    await expect(page.getByRole('navigation')).toHaveCount(0);
    await opener(page).click();
    await closer(page).click();
    await expect(opener(page)).toBeFocused();
    await opener(page).click();
    await page.getByTestId('navigation-backdrop').click({ position: { x: 380, y: 100 } });
    await expect(drawer(page)).toHaveCount(0);
    await expect(opener(page)).toBeFocused();
    await noLock(page);
  });

  test('current route and new route close the drawer; nested account route does too', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await fixture(page);
    await page.goto('/offline-sync');
    await opener(page).click();
    await page.getByRole('link', { name: 'Offline Sync', exact: true }).click();
    await expect(drawer(page)).toHaveCount(0);
    await expect(opener(page)).toBeFocused();
    await opener(page).click();
    await page.getByRole('link', { name: 'Quản lý phương tiện' }).click();
    await expect(page).toHaveURL(/\/vehicles$/);
    await expect(drawer(page)).toHaveCount(0);
    await opener(page).click();
    await account(page).click();
    await page.getByRole('menuitem', { name: 'Hồ sơ cá nhân' }).click();
    await expect(page).toHaveURL(/\/account\/profile$/);
    await expect(drawer(page)).toHaveCount(0);
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(opener(page)).toBeFocused();
    await noLock(page);
  });

  for (const nested of [false, true]) {
    test(`WEB-VB3 resize 1023↔1024↔1025 cleans navigation${nested ? ' and open account portal' : ''}`, async ({ page }) => {
      await page.setViewportSize({ width: 1023, height: 800 });
      await fixture(page);
      await page.goto('/help');
      await opener(page).click();
      if (nested) await account(page).click();
      await page.setViewportSize({ width: 1024, height: 800 });
      await expect(drawer(page)).toHaveCount(0);
      await expect(page.getByRole('menu')).toHaveCount(0);
      await expect(page.getByRole('navigation')).toHaveCount(1);
      await expect(page.getByRole('link', { name: 'Dashboard', exact: true })).toBeFocused();
      await noLock(page);
      await page.setViewportSize({ width: 1025, height: 800 });
      if (nested) await account(page).click();
      await page.setViewportSize({ width: 1023, height: 800 });
      await expect(opener(page)).toBeFocused();
      await expect(drawer(page)).toHaveCount(0);
      await expect(page.getByRole('menu')).toHaveCount(0);
      await expect(page.getByRole('navigation')).toHaveCount(0);
      await noLock(page);
      await opener(page).click();
      await expect(drawer(page)).toBeVisible();
      await expect(page).toHaveURL(/\/help$/);
    });
  }

  test('resize keeps Outlet/form state and form focus when navigation is closed', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await fixture(page);
    await page.goto('/vehicles');
    await page.getByRole('button', { name: 'Thêm phương tiện' }).click();
    const input = page.getByLabel('Biển số', { exact: true });
    await input.fill('TEST-123');
    for (const width of [1023, 1024, 1025, 844]) {
      await page.setViewportSize({ width, height: 720 });
      await expect(input).toHaveValue('TEST-123');
      await expect(input).toBeFocused();
      await expect(page).toHaveURL(/\/vehicles$/);
    }
  });

  for (const height of [180, 568]) test(`short viewport 320×${height} and doubled CSS text stress keep all navigation reachable (not browser zoom)`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height });
    await fixture(page);
    await page.goto('/help');
    await page.addStyleTag({ content: 'html { font-size: 32px !important; }' });
    await opener(page).click();
    await reachableTarget(closer(page));
    for (const link of await page.getByRole('navigation').getByRole('link').all()) await reachableTarget(link);
    const email = page.getByText(EMAIL, { exact: true });
    await expect(email).toHaveText(EMAIL);
    expect(await email.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await reachableTarget(account(page));
    await account(page).click();
    await expect(page).toHaveURL(/\/help$/);
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    // Position is checked after the actual entrance animation, before any scroll/resize.
    await menu.evaluate((el) => Promise.all(el.getAnimations().map((animation) => animation.finished.catch(() => undefined))));
    await expect(menu).toBeInViewport({ ratio: 0.99 });
    for (const item of await page.getByRole('menuitem').all()) await reachableTarget(item);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(account(page)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(drawer(page)).toHaveCount(0);
    await noLock(page);
  });

  test('open account menu stays inside viewport across repeated height changes', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await fixture(page);
    await page.goto('/help');
    await page.addStyleTag({ content: 'html { font-size: 32px !important; }' });
    await opener(page).click();
    await account(page).click();
    const initialMenu = page.getByRole('menu');
    await expect(initialMenu).toBeVisible();
    await initialMenu.evaluate((el) => Promise.all(el.getAnimations().map((animation) => animation.finished.catch(() => undefined))));
    await expect(initialMenu).toBeInViewport({ ratio: 0.99 });
    for (const height of [180, 390, 568, 180, 568]) {
      await page.setViewportSize({ width: 320, height });
      const menu = page.getByRole('menu');
      await expect(menu).toBeInViewport({ ratio: 0.99 });
      for (const item of await page.getByRole('menuitem').all()) await reachableTarget(item);
    }
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(drawer(page)).toHaveCount(0);
    await noLock(page);
  });

  test('touch/DPR2 emulation opens, closes and navigates with taps', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2, baseURL });
    try {
      const page = await context.newPage();
      await fixture(page);
      await page.goto('/help');
      expect(await page.evaluate(() => ({ touch: navigator.maxTouchPoints, dpr: devicePixelRatio }))).toEqual({ touch: 1, dpr: 2 });
      await opener(page).tap();
      await expect(drawer(page)).toBeVisible();
      await account(page).tap();
      await page.getByRole('menuitem', { name: 'Hồ sơ cá nhân' }).tap();
      await expect(page).toHaveURL(/\/account\/profile$/);
      await expect(drawer(page)).toHaveCount(0);
      await opener(page).tap();
      await page.getByRole('link', { name: 'Quản lý phương tiện' }).tap();
      await expect(page).toHaveURL(/\/vehicles$/);
      await expect(drawer(page)).toHaveCount(0);
      await opener(page).tap();
      await page.getByTestId('navigation-backdrop').tap({ position: { x: 380, y: 100 } });
      await expect(drawer(page)).toHaveCount(0);
      await noLock(page);
    } finally {
      await context.close();
    }
  });

  test('deep link, unknown route, logout and Browser Back retain auth guard', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await fixture(page);
    await page.goto('/unknown-web02');
    await expect(page.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeVisible();
    await opener(page).click();
    await account(page).click();
    await page.getByRole('menuitem', { name: 'Trợ giúp' }).click();
    await expect(page).toHaveURL(/\/help$/);
    await opener(page).click();
    await account(page).click();
    await page.getByRole('menuitem', { name: 'Đăng xuất' }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(key => sessionStorage.getItem(key), TOKEN_KEY)).toBeNull();
    await page.goBack();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText(EMAIL, { exact: true })).toHaveCount(0);
    await noLock(page);
  });

  test('no token or expired token on mobile deep link never exposes navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await fixture(page, false);
    await page.goto('/account/profile');
    await expect(page).toHaveURL(/\/login$/);
    await expect(opener(page)).toHaveCount(0);
    await page.evaluate(key => sessionStorage.setItem(key, 'expired-fixture'), TOKEN_KEY);
    await page.route('**/api/auth/me', route => route.fulfill({ status: 401, contentType: 'application/json', headers: CORS, body: '{}' }));
    await page.goto('/account/profile');
    await expect(page).toHaveURL(/\/login$/);
    await expect(opener(page)).toHaveCount(0);
  });
});
