import { expect, test, type Locator, type Page } from '@playwright/test';

// WEB-04 / WEB-T03: actual dashboard UI with fixture auth/analytics data.
// Static Online and four em-dash placeholders stay static; no metric API is
// introduced. CSS text stress, touch emulation and native zoom are separate.
const TOKEN_KEY = 'novaway_web_token';
const TOKEN = 'fixture-dashboard-layout-token';
const USER = { id: '00000000-0000-4000-8000-000000000004', email: 'dashboard.layout@example.com' };
const LABELS = ['Chuyến đi hôm nay', 'Phương tiện hoạt động', 'Đồng bộ offline', 'Cảnh báo an toàn'];
const VEHICLES = [
  { id: '00000000-0000-4000-8000-000000000041', type: 'motorbike', license_plate: 'DEMO-M01', brand_model: 'Fixture bike', is_active: false },
  { id: '00000000-0000-4000-8000-000000000042', type: 'car', license_plate: 'DEMO-C01', brand_model: 'Fixture car', is_active: false },
];
const TRIPS = [
  { id: '00000000-0000-4000-8000-000000000051', vehicle_id: VEHICLES[0].id, status: 'ended', started_at: '2026-01-01T00:00:00.000Z', ended_at: '2026-01-01T00:05:00.000Z', distance_km: 1.2, duration_minutes: 5, mismatch_warning_count: 1 },
  { id: '00000000-0000-4000-8000-000000000052', vehicle_id: VEHICLES[1].id, status: 'ended', started_at: '2026-01-02T00:00:00.000Z', ended_at: '2026-01-02T00:10:00.000Z', distance_km: 2.3, duration_minutes: 10, mismatch_warning_count: 2 },
  { id: '00000000-0000-4000-8000-000000000053', vehicle_id: VEHICLES[0].id, status: 'active', started_at: '2026-01-03T00:00:00.000Z', ended_at: null, distance_km: 0, duration_minutes: 0, mismatch_warning_count: 0 },
];
interface ApiCall { method: string; path: string; token?: string; body: string | null }
const action = (page: Page) => page.getByRole('button', { name: 'Xem vị trí trực tiếp' });
const card = (page: Page, label: string) => page.getByRole('main').getByText(label, { exact: true }).locator('..').locator('..');

async function fixture(page: Page, analytics = false) {
  const calls: ApiCall[] = [];
  await page.addInitScript(([key, token]) => {
    if (sessionStorage.getItem('__dashboard_seeded')) return;
    sessionStorage.setItem('__dashboard_seeded', '1');
    sessionStorage.setItem(key, token);
  }, [TOKEN_KEY, TOKEN]);
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, body: '' });
    const path = new URL(request.url()).pathname;
    calls.push({ method: request.method(), path, token: request.headers()['authorization'], body: request.postData() });
    const body = path.endsWith('/auth/me') ? USER : path.endsWith('/vehicles') ? { vehicles: analytics ? VEHICLES : [] } : path.endsWith('/trips') ? { trips: analytics ? TRIPS : [] } : null;
    await route.fulfill({ status: body ? 200 : 500, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, body: JSON.stringify(body ?? { error_code: 'UNEXPECTED_FIXTURE_REQUEST', message: 'Unexpected fixture request' }) });
  });
  return calls;
}

async function finishEntrance(page: Page) {
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  await expect.poll(() => page.getByRole('heading', { name: 'Vị trí trực tiếp', exact: true }).evaluate((el) => {
    const hero = el.parentElement?.parentElement;
    const style = hero && getComputedStyle(hero);
    return style ? { opacity: Number(style.opacity), transform: style.transform } : null;
  })).toEqual({ opacity: 1, transform: 'none' });
}

async function textContained(page: Page) {
  const failures = await page.getByRole('main').evaluate((main) => {
    const bounds = main.getBoundingClientRect();
    return [...main.querySelectorAll('h1, h2, p, span, button')].flatMap((el) => {
      if (!el.textContent?.trim() || !el.getClientRects().length || !el.clientWidth) return [];
      const rect = el.getBoundingClientRect();
      return el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1 || rect.left < bounds.left - 1 || rect.right > bounds.right + 1
        ? [{ text: el.textContent, width: el.clientWidth, scrollWidth: el.scrollWidth, left: rect.left, right: rect.right, mainLeft: bounds.left, mainRight: bounds.right }]
        : [];
    });
  });
  expect(failures).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

async function reachable(target: Locator) {
  await target.scrollIntoViewIfNeeded();
  await expect(target).toBeInViewport({ ratio: 0.99 });
}

async function placeholders(page: Page) {
  const main = page.getByRole('main');
  await expect(main.getByText('Online', { exact: true })).toHaveCount(1);
  await expect(main.getByText('—', { exact: true })).toHaveCount(4);
  for (const label of LABELS) {
    await expect(main.getByText(label, { exact: true })).toHaveCount(1);
    await expect(card(page, label).getByText('—', { exact: true })).toHaveCount(1);
  }
}

function authOnly(calls: ApiCall[]) {
  expect(calls.length).toBeGreaterThan(0);
  for (const call of calls) expect(call).toEqual({ method: 'GET', path: '/api/auth/me', token: `Bearer ${TOKEN}`, body: null });
}

test.describe('responsive dashboard — fixture UI', () => {
  for (const viewport of [
    { width: 320, height: 568 }, { width: 360, height: 800 }, { width: 390, height: 844 },
    { width: 430, height: 932 }, { width: 844, height: 390 }, { width: 1280, height: 720 },
  ]) test(`WEB-T03 ${viewport.width}×${viewport.height}: headings, static values and action fit`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const calls = await fixture(page);
    await page.goto('/dashboard');
    await finishEntrance(page);
    await placeholders(page);
    await textContained(page);
    await reachable(action(page));
    if (viewport.width === 320) {
      const boxes = await Promise.all(LABELS.map((label) => card(page, label).boundingBox()));
      for (const box of boxes) expect(box!.x).toBeCloseTo(boxes[0]!.x);
      for (let index = 1; index < boxes.length; index++) expect(boxes[index]!.y).toBeGreaterThanOrEqual(boxes[index - 1]!.y + boxes[index - 1]!.height);
    }
    authOnly(calls);
    expect(await page.evaluate((key) => sessionStorage.getItem(key), TOKEN_KEY)).toBe(TOKEN);
  });

  for (const viewport of [
    { width: 320, height: 568 }, { width: 844, height: 390 }, { width: 1280, height: 720 },
  ]) test(`doubled CSS text stress ${viewport.width}×${viewport.height}: content remains inside main`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const calls = await fixture(page);
    await page.goto('/dashboard');
    await finishEntrance(page);
    await page.addStyleTag({ content: 'html { font-size: 32px !important; }' });
    await placeholders(page);
    await textContained(page);
    for (const label of LABELS) await reachable(card(page, label).getByText('—', { exact: true }));
    await reachable(action(page));
    authOnly(calls);
  });

  test('md/lg boundary resize retains route, static cards and action focus', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const calls = await fixture(page);
    await page.goto('/dashboard');
    await finishEntrance(page);
    await action(page).focus();
    for (const width of [767, 768, 769, 1023, 1024, 1025, 1023, 769, 768, 767, 320]) {
      await page.setViewportSize({ width, height: 800 });
      await expect(action(page)).toBeFocused();
      await expect(page).toHaveURL(/\/dashboard$/);
      await placeholders(page);
      await textContained(page);
      await reachable(action(page));
    }
    authOnly(calls);
  });

  test('keyboard action keeps the existing observation route and makes no write request', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 180 });
    const calls = await fixture(page);
    await page.goto('/dashboard');
    await finishEntrance(page);
    await action(page).focus();
    await reachable(action(page));
    await expect(action(page)).toBeFocused();
    expect(await action(page).evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe('none');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/start-trip$/);
    await expect(page.getByText('Chưa có chuyến đi nào đang diễn ra', { exact: true })).toBeVisible();
    expect(calls.every((call) => call.method === 'GET' && call.body === null)).toBe(true);
  });

  test('touch/DPR2 fixture taps the existing live-position action', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2, baseURL });
    try {
      const page = await context.newPage();
      const calls = await fixture(page);
      await page.goto('/dashboard');
      await finishEntrance(page);
      expect(await page.evaluate(() => ({ touch: navigator.maxTouchPoints, dpr: devicePixelRatio }))).toEqual({ touch: 1, dpr: 2 });
      await placeholders(page);
      await textContained(page);
      await reachable(action(page));
      const box = await action(page).boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
      await action(page).tap();
      await expect(page).toHaveURL(/\/start-trip$/);
      expect(calls.every((call) => call.method === 'GET' && call.body === null)).toBe(true);
    } finally {
      await context.close();
    }
  });

  test('shared StatCard preserves analytics totals, labels and existing type filter', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const calls = await fixture(page, true);
    await page.goto('/trip-history');
    await expect(card(page, 'Tổng quãng đường').getByText('3.5 km', { exact: true })).toBeVisible();
    await expect(card(page, 'Tổng thời gian').getByText('15 phút', { exact: true })).toBeVisible();
    await expect(card(page, 'Cảnh báo an toàn').getByText('3', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Xe máy', exact: true }).click();
    await expect(card(page, 'Tổng quãng đường').getByText('1.2 km', { exact: true })).toBeVisible();
    await expect(card(page, 'Tổng thời gian').getByText('5 phút', { exact: true })).toBeVisible();
    await expect(card(page, 'Cảnh báo an toàn').getByText('1', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Ô tô', exact: true }).click();
    await expect(card(page, 'Tổng quãng đường').getByText('2.3 km', { exact: true })).toBeVisible();
    await expect(card(page, 'Tổng thời gian').getByText('10 phút', { exact: true })).toBeVisible();
    await expect(card(page, 'Cảnh báo an toàn').getByText('2', { exact: true })).toBeVisible();
    expect(calls.every((call) => call.method === 'GET' && call.body === null && call.token === `Bearer ${TOKEN}` && ['/api/auth/me', '/api/trips', '/api/vehicles'].includes(call.path))).toBe(true);
  });
});
