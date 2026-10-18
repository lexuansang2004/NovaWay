import { expect, test, type Page, type TestInfo } from '@playwright/test';

// WEB-08 / WEB-T07: actual AnalyticsPage and Recharts, fixture REST only.
// CSS text stress is separate from the native zoom evidence owned by Lead.
const TOKEN_KEY = 'novaway_web_token';
const TOKEN = 'fixture-analytics-responsive-token';
const USER = { id: '00000000-0000-4000-8000-000000000801', email: 'analytics.layout@example.com' };
const VEHICLES = [
  { id: '00000000-0000-4000-8000-000000000811', type: 'motorbike', license_plate: 'FIXTURE-M08', brand_model: 'Fixture bike', is_active: false },
  { id: '00000000-0000-4000-8000-000000000812', type: 'car', license_plate: 'FIXTURE-C08', brand_model: 'Fixture car', is_active: false },
];
interface FixtureTrip {
  id: string; vehicle_id: string; status: 'ended' | 'active'; started_at: string; ended_at: string | null;
  distance_km: number; duration_minutes: number; mismatch_warning_count: number;
}
const TRIPS: FixtureTrip[] = [
  { id: 'trip-later', vehicle_id: VEHICLES[1].id, status: 'ended', started_at: '2026-01-02T03:00:00Z', ended_at: '2026-01-02T04:00:00Z', distance_km: 2.346, duration_minutes: 12.5, mismatch_warning_count: 2 },
  { id: 'trip-earlier', vehicle_id: VEHICLES[0].id, status: 'ended', started_at: '2026-01-01T01:00:00Z', ended_at: '2026-01-01T02:00:00Z', distance_km: 1.236, duration_minutes: 7.25, mismatch_warning_count: 1 },
  { id: 'trip-same-day', vehicle_id: VEHICLES[0].id, status: 'ended', started_at: '2026-01-01T03:00:00Z', ended_at: '2026-01-01T04:00:00Z', distance_km: 0.004, duration_minutes: 0.25, mismatch_warning_count: 0 },
  { id: 'trip-unknown-vehicle', vehicle_id: '00000000-0000-4000-8000-000000000819', status: 'ended', started_at: '2026-01-03T01:00:00Z', ended_at: '2026-01-03T02:00:00Z', distance_km: 3.454, duration_minutes: 9, mismatch_warning_count: 3 },
  { id: 'trip-active', vehicle_id: VEHICLES[0].id, status: 'active', started_at: '2026-01-04T01:00:00Z', ended_at: null, distance_km: 0, duration_minutes: 0, mismatch_warning_count: 0 },
];
const MANY_TRIPS = Array.from({ length: 45 }, (_, index): FixtureTrip => ({
  id: `many-${index}`, vehicle_id: VEHICLES[index % 2].id, status: 'ended',
  started_at: new Date(Date.UTC(2026, 0, index + 1, 1)).toISOString(),
  ended_at: new Date(Date.UTC(2026, 0, index + 1, 2)).toISOString(),
  distance_km: index === 44 ? 1234567890.126 : index + 0.123,
  duration_minutes: index === 44 ? 987654321.25 : index + 0.25,
  mismatch_warning_count: index === 44 ? 123456789 : index % 3,
}));
interface ApiCall { method: string; path: string; token?: string; body: string | null }
type FixtureOptions = { trips?: FixtureTrip[]; error?: 'trips' | 'vehicles'; wait?: Promise<void> };

async function fixture(page: Page, options: FixtureOptions = {}) {
  const calls: ApiCall[] = [];
  await page.addInitScript(([key, token]) => sessionStorage.setItem(key, token), [TOKEN_KEY, TOKEN]);
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 200, headers, body: '' });
    const path = new URL(request.url()).pathname;
    calls.push({ method: request.method(), path, token: request.headers()['authorization'], body: request.postData() });
    if (path !== '/api/auth/me' && options.wait) await options.wait;
    const failed = path === `/api/${options.error}`;
    const body = path === '/api/auth/me' ? USER : path === '/api/vehicles' ? { vehicles: VEHICLES } : path === '/api/trips' ? { trips: options.trips ?? TRIPS } : null;
    await route.fulfill({ status: failed || !body ? 500 : 200, contentType: 'application/json', headers,
      body: JSON.stringify(failed || !body ? { error_code: 'FIXTURE_UNAVAILABLE', message: 'Fixture request unavailable' } : body) });
  });
  return calls;
}

const filter = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const summary = (page: Page) => page.locator('summary').filter({ hasText: 'Đọc số liệu từng chuyến' });
const dataList = (page: Page) => page.getByRole('list', { name: 'Số liệu từng chuyến' });
const card = (page: Page, label: string) => page.getByRole('main').getByText(label, { exact: true }).locator('..').locator('..');

async function loaded(page: Page) {
  await expect(card(page, 'Tổng quãng đường')).toBeVisible();
  await expect(page.locator('.recharts-bar-rectangle')).not.toHaveCount(0);
}

async function openData(page: Page) {
  await summary(page).scrollIntoViewIfNeeded();
  await summary(page).click();
  await expect(dataList(page)).toBeVisible();
}

async function screenshot(page: Page, testInfo: TestInfo, name = 'layout') {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

async function chartScreenshot(page: Page, testInfo: TestInfo) {
  const path = testInfo.outputPath('chart.png');
  await page.locator('.recharts-responsive-container').locator('..').screenshot({ path });
  await testInfo.attach('chart', { path, contentType: 'image/png' });
}

async function contained(page: Page) {
  const failures = await page.getByRole('main').evaluate((main) => {
    const bounds = main.getBoundingClientRect();
    return [...main.querySelectorAll('h1, h2, p, li, dt, dd, button, summary')].flatMap((element) => {
      if (!element.textContent?.trim() || !element.getClientRects().length || !element.clientWidth) return [];
      const rect = element.getBoundingClientRect();
      return rect.left < bounds.left - 1 || rect.right > bounds.right + 1 || element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1
        ? [{ text: element.textContent, left: rect.left, right: rect.right, width: element.clientWidth, scroll: element.scrollWidth }]
        : [];
    });
  });
  expect(failures).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

async function chartContained(page: Page) {
  // Check rendered glyph rectangles against the SVG, not only document overflow.
  await expect.poll(() => page.locator('.recharts-wrapper').evaluate((chart) => {
    const ticks = [...chart.querySelectorAll('.recharts-cartesian-axis-tick-label text')];
    return ticks.length ? ticks.flatMap((tick) => {
      const bounds = tick.closest('svg')!.getBoundingClientRect();
      const rect = tick.getBoundingClientRect();
      return rect.left < bounds.left - 1 || rect.right > bounds.right + 1 || rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1
        ? [{ text: tick.textContent, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, svg: { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom } }]
        : [];
    }) : ['No axis ticks rendered'];
  })).toEqual([]);
  await expect.poll(() => page.locator('.recharts-xAxis-tick-labels text').evaluateAll((ticks) => {
    if (!ticks.length) return ['No X-axis ticks rendered'];
    const boxes = ticks.map((tick) => ({ text: tick.textContent, rect: tick.getBoundingClientRect() })).sort((a, b) => a.rect.left - b.rect.left);
    return boxes.slice(1).flatMap((box, index) => box.rect.left < boxes[index].rect.right + 1
      ? [{ previous: boxes[index].text, current: box.text, overlap: boxes[index].rect.right - box.rect.left }]
      : []);
  })).toEqual([]);
  await expect(page.locator('.recharts-cartesian-grid')).toBeVisible();
  await expect(page.locator('.recharts-line-dot, .recharts-line-curve').first()).toBeVisible();
  // Auto axis widths change the plot after a text resize. Wait for the real
  // animated marks to rejoin that plot rather than taking an intermediate frame.
  await expect.poll(() => page.locator('.recharts-wrapper').evaluate((chart) => {
    const grid = chart.querySelector('.recharts-cartesian-grid-horizontal line')?.getBoundingClientRect();
    const marks = [...chart.querySelectorAll('.recharts-line-dot, .recharts-bar-rectangle')];
    if (!grid || !marks.length) return ['No plot geometry'];
    return marks.flatMap((mark) => {
      const rect = mark.getBoundingClientRect();
      const center = (rect.left + rect.right) / 2;
      return center < grid.left - 1 || center > grid.right + 1 ? [{ center, left: grid.left, right: grid.right }] : [];
    });
  })).toEqual([]);
}

function readOnly(calls: ApiCall[]) {
  expect(calls.some((call) => call.path === '/api/trips')).toBe(true);
  expect(calls.some((call) => call.path === '/api/vehicles')).toBe(true);
  for (const call of calls) expect(call).toEqual({ method: 'GET', path: expect.stringMatching(/^\/api\/(auth\/me|trips|vehicles)$/), token: `Bearer ${TOKEN}`, body: null });
}

test.describe('responsive analytics — fixture UI', () => {
  test.beforeEach(async ({ browser }, testInfo) => {
    testInfo.annotations.push({ type: 'browser-version', description: browser.version() });
  });

  test('controls have 44px targets and expose the selected filter at 320px', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 568 });
    const calls = await fixture(page);
    await page.goto('/trip-history');
    await loaded(page);
    await screenshot(page, testInfo);
    for (const name of ['Tất cả', 'Xe máy', 'Ô tô']) {
      const box = await filter(page, name).boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
      await expect(filter(page, name)).toHaveAttribute('aria-pressed', name === 'Tất cả' ? 'true' : 'false');
    }
    await contained(page);
    readOnly(calls);
  });

  test('keyboard data access preserves ordering, same-day trips, formulas and filters without hover', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 568 });
    const calls = await fixture(page);
    await page.goto('/trip-history');
    await loaded(page);
    await expect(card(page, 'Tổng quãng đường').getByText('7.0 km', { exact: true })).toBeVisible();
    await expect(card(page, 'Tổng thời gian').getByText('29 phút', { exact: true })).toBeVisible();
    await expect(card(page, 'Cảnh báo an toàn').getByText('6', { exact: true })).toBeVisible();
    await expect(summary(page)).toHaveCount(1);
    await filter(page, 'Ô tô').focus();
    for (let index = 0; index < 4; index++) {
      await page.keyboard.press('Tab');
      if (await summary(page).evaluate((element) => element === document.activeElement)) break;
    }
    await expect(summary(page)).toBeFocused();
    expect(await summary(page).evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe('none');
    await page.keyboard.press('Enter');
    await expect(dataList(page)).toBeVisible();
    const rows = dataList(page).getByRole('listitem');
    await expect(rows).toHaveCount(4);
    for (const [index, text] of ['1.24 km', '0 km', '2.35 km', '3.45 km'].entries()) await expect(rows.nth(index)).toContainText(text);
    await expect(rows.nth(0)).toContainText('7.25 phút');
    await expect(rows.nth(0)).toContainText('Số cảnh báo an toàn1');
    // ICU date punctuation can vary by browser version; the day/month and
    // separate same-day rows are the existing product behavior under test.
    await expect(rows.nth(0)).toContainText(/01[/-]01/);
    await expect(rows.nth(1)).toContainText(/01[/-]01/);
    await expect(rows.nth(2)).toContainText(/02[/-]01/);
    await expect(rows.nth(3)).toContainText(/03[/-]01/);
    await filter(page, 'Xe máy').focus();
    await page.keyboard.press('Space');
    await expect(filter(page, 'Xe máy')).toHaveAttribute('aria-pressed', 'true');
    await expect(rows).toHaveCount(2);
    await expect(card(page, 'Tổng quãng đường').getByText('1.2 km', { exact: true })).toBeVisible();
    await expect(card(page, 'Tổng thời gian').getByText('7.5 phút', { exact: true })).toBeVisible();
    await filter(page, 'Ô tô').focus();
    await page.keyboard.press('Enter');
    await expect(rows).toHaveCount(1);
    await expect(card(page, 'Tổng quãng đường').getByText('2.3 km', { exact: true })).toBeVisible();
    await expect(card(page, 'Tổng thời gian').getByText('12.5 phút', { exact: true })).toBeVisible();
    await expect(card(page, 'Cảnh báo an toàn').getByText('2', { exact: true })).toBeVisible();
    await filter(page, 'Tất cả').click();
    await expect(rows).toHaveCount(4);
    await summary(page).scrollIntoViewIfNeeded();
    await expect(summary(page)).toBeInViewport();
    await contained(page);
    await screenshot(page, testInfo);
    readOnly(calls);
  });

  for (const viewport of [
    { width: 320, height: 568 }, { width: 390, height: 844 }, { width: 768, height: 1024 },
    { width: 1024, height: 768 }, { width: 1280, height: 720 }, { width: 1440, height: 900 },
  ]) test(`many trips and large values ${viewport.width}×${viewport.height}: chart, legend, totals and list fit`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const calls = await fixture(page, { trips: MANY_TRIPS });
    await page.goto('/trip-history');
    await loaded(page);
    await expect(card(page, 'Tổng quãng đường').getByText('1234568841.5 km', { exact: true })).toBeVisible();
    await expect(card(page, 'Tổng thời gian').getByText('987655278.25 phút', { exact: true })).toBeVisible();
    await expect(card(page, 'Cảnh báo an toàn').getByText('123456832', { exact: true })).toBeVisible();
    await chartContained(page);
    await chartScreenshot(page, testInfo);
    await openData(page);
    await expect(dataList(page).getByRole('listitem')).toHaveCount(45);
    await expect(dataList(page).getByRole('listitem').last()).toContainText('1234567890.13 km');
    await expect(dataList(page).getByRole('listitem').last()).toContainText('987654321.25 phút');
    await expect(dataList(page).getByRole('listitem').last()).toContainText('123456789');
    await contained(page);
    await screenshot(page, testInfo);
    readOnly(calls);
  });

  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 720 }]) test(`CSS doubled text stress ${viewport.width}×${viewport.height}: chart labels and all data remain readable`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const calls = await fixture(page, { trips: MANY_TRIPS });
    await page.goto('/trip-history');
    await loaded(page);
    await page.addStyleTag({ content: 'html { font-size: 32px !important; }' });
    if (viewport.width === 390) {
      const first = await filter(page, 'Tất cả').boundingBox();
      const last = await filter(page, 'Ô tô').boundingBox();
      expect(last!.y).toBeGreaterThan(first!.y);
    }
    await chartContained(page);
    await chartScreenshot(page, testInfo);
    await openData(page);
    await contained(page);
    await expect(dataList(page).getByRole('listitem')).toHaveCount(45);
    const fonts = await page.locator('.recharts-cartesian-axis-tick-label text').evaluateAll((ticks) => ticks.map((tick) => Number.parseFloat(getComputedStyle(tick).fontSize)));
    expect(fonts.length).toBeGreaterThan(0);
    expect(fonts.every((font) => font >= 24)).toBe(true);
    await screenshot(page, testInfo);
    if (viewport.width === 390) {
      // Synthetic SVG glyph stress, separate from native Firefox text zoom.
      // A larger Y tick font verifies headroom even when glyph metrics exceed
      // the normal Chromium font's height at CSS root32.
      await page.addStyleTag({ content: '.recharts-yAxis-tick-labels text { font-size: 34px !important; }' });
      await filter(page, 'Ô tô').click();
      await chartContained(page);
      const heights = await page.locator('.recharts-yAxis-tick-labels text').evaluateAll((ticks) => ticks.map((tick) => tick.getBoundingClientRect().height));
      expect(heights.length).toBeGreaterThan(0);
      expect(Math.min(...heights)).toBeGreaterThanOrEqual(34);
      await screenshot(page, testInfo, 'synthetic-y-glyph-stress');
    }
    readOnly(calls);
  });

  test('sm/lg boundary resize and a narrow parent retain filter, keyboard focus and readable data', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const calls = await fixture(page);
    await page.goto('/trip-history');
    await loaded(page);
    await openData(page);
    await filter(page, 'Xe máy').click();
    await filter(page, 'Xe máy').focus();
    for (const width of [639, 640, 641, 1023, 1024, 1025, 1023, 641, 640, 639, 320]) {
      await page.setViewportSize({ width, height: 800 });
      await expect(filter(page, 'Xe máy')).toBeFocused();
      await expect(filter(page, 'Xe máy')).toHaveAttribute('aria-pressed', 'true');
      await expect(dataList(page).getByRole('listitem')).toHaveCount(2);
      await contained(page);
      await chartContained(page);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole('main').evaluate((main) => { main.style.width = '360px'; main.style.flex = '0 0 auto'; });
    await contained(page);
    await chartContained(page);
    await expect(filter(page, 'Xe máy')).toBeFocused();
    readOnly(calls);
  });

  test('desktop tooltip retains the rounded chart values', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const calls = await fixture(page);
    await page.goto('/trip-history');
    await loaded(page);
    await page.locator('.recharts-bar-rectangle').first().hover();
    const tooltip = page.locator('.recharts-tooltip-wrapper');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Quãng đường (km)');
    await expect(tooltip).toContainText('1.24');
    await expect(tooltip).toContainText('7.25');
    await screenshot(page, testInfo);
    readOnly(calls);
  });

  test('touch/DPR2 reads the same data and keeps the selected filter across orientation', async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, baseURL });
    try {
      const page = await context.newPage();
      const calls = await fixture(page);
      await page.goto('/trip-history');
      await loaded(page);
      expect(await page.evaluate(() => ({ touch: navigator.maxTouchPoints, dpr: devicePixelRatio }))).toEqual({ touch: 1, dpr: 2 });
      await filter(page, 'Ô tô').tap();
      await summary(page).scrollIntoViewIfNeeded();
      await summary(page).tap();
      await expect(dataList(page).getByRole('listitem')).toHaveCount(1);
      await expect(dataList(page)).toContainText('2.35 km');
      await expect(dataList(page)).toContainText('12.5 phút');
      for (const viewport of [{ width: 844, height: 390 }, { width: 390, height: 844 }]) {
        await page.setViewportSize(viewport);
        await expect(filter(page, 'Ô tô')).toHaveAttribute('aria-pressed', 'true');
        await contained(page);
        await chartContained(page);
      }
      await screenshot(page, testInfo);
      readOnly(calls);
    } finally { await context.close(); }
  });

  test('empty response and a type filter with no ended trip keep the existing empty state', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 568 });
    const calls = await fixture(page, { trips: [] });
    await page.goto('/trip-history');
    await expect(page.getByText('Chưa có chuyến đi nào đã kết thúc phù hợp bộ lọc.', { exact: true })).toBeVisible();
    await filter(page, 'Xe máy').click();
    await expect(filter(page, 'Xe máy')).toHaveAttribute('aria-pressed', 'true');
    await expect(summary(page)).toHaveCount(0);
    await contained(page);
    await screenshot(page, testInfo);
    readOnly(calls);
  });

  test('one ended trip changes to the existing empty state when its type is excluded', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    const calls = await fixture(page, { trips: [TRIPS[0], TRIPS[4]] });
    await page.goto('/trip-history');
    await loaded(page);
    await openData(page);
    await expect(dataList(page).getByRole('listitem')).toHaveCount(1);
    await filter(page, 'Xe máy').click();
    await expect(page.getByText('Chưa có chuyến đi nào đã kết thúc phù hợp bộ lọc.', { exact: true })).toBeVisible();
    await expect(summary(page)).toHaveCount(0);
    await expect(page.getByText('Tổng quãng đường', { exact: true })).toHaveCount(0);
    await filter(page, 'Ô tô').click();
    await loaded(page);
    await chartContained(page);
    await contained(page);
    readOnly(calls);
  });

  for (const error of ['trips', 'vehicles'] as const) test(`${error} API error remains readable without fabricated totals`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 568 });
    const calls = await fixture(page, { error });
    await page.goto('/trip-history');
    await expect(page.getByText('Không tải được dữ liệu chuyến đi.', { exact: true })).toBeVisible();
    await expect(summary(page)).toHaveCount(0);
    await expect(page.getByText('Tổng quãng đường', { exact: true })).toHaveCount(0);
    await contained(page);
    await screenshot(page, testInfo);
    readOnly(calls);
  });

  test('loading remains readable until both existing requests finish', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 568 });
    let release!: () => void;
    const wait = new Promise<void>((resolve) => { release = resolve; });
    const calls = await fixture(page, { wait });
    await page.goto('/trip-history');
    await expect(page.getByText('Đang tải dữ liệu...', { exact: true })).toBeVisible();
    await expect(summary(page)).toHaveCount(0);
    await contained(page);
    await screenshot(page, testInfo, 'loading');
    release();
    await loaded(page);
    await chartContained(page);
    readOnly(calls);
  });
});
