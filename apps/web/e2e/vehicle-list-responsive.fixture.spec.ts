import { expect, test, type Locator, type Page, type Route } from '@playwright/test';
import type { Vehicle } from '../src/services/vehiclesService';

// WEB-05: actual list/card/inline-confirm UI with an isolated fixture API.
// VehicleForm is exercised at desktop only for CRUD regression; WEB-06 owns
// its responsive changes. CSS stress/touch emulation are not native devices.
const TOKEN_KEY = 'novaway_web_token';
const TOKEN = 'fixture-vehicle-layout-token';
const USER = { id: '00000000-0000-4000-8000-000000000005', email: 'vehicle.layout@example.com' };
const BRAND = 'LongNavigationResearchVehicleModel'.repeat(4).slice(0, 100);
const ERROR = `Không thể xử lý phương tiện ${'navigation.reference.'.repeat(14)}. Hãy thử lại sau.`;
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
const uuid = (index: number) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
function vehicles(count = 4): Vehicle[] {
  return Array.from({ length: count }, (_, index) => ({ id: uuid(index + 10), type: index % 2 ? 'car' : 'motorbike', license_plate: `DEMO-LONG-PLATE-${String(index + 1).padStart(4, '0')}`, brand_model: index === 3 ? null : BRAND, is_active: index === 0 }));
}
const article = (page: Page, vehicle: Vehicle) => page.getByRole('article', { name: `Phương tiện ${vehicle.license_plate}`, exact: true });
const edit = (page: Page, vehicle: Vehicle) => page.getByRole('button', { name: `Sửa phương tiện ${vehicle.license_plate}`, exact: true });
const remove = (page: Page, vehicle: Vehicle) => page.getByRole('button', { name: `Xoá phương tiện ${vehicle.license_plate}`, exact: true });
const activate = (page: Page, vehicle: Vehicle) => page.getByRole('button', { name: `Đặt phương tiện ${vehicle.license_plate} đang dùng`, exact: true });
const confirm = (page: Page, vehicle: Vehicle) => page.getByRole('button', { name: `Xác nhận xoá phương tiện ${vehicle.license_plate}`, exact: true });
const cancel = (page: Page, vehicle: Vehicle) => page.getByRole('button', { name: `Huỷ xoá phương tiện ${vehicle.license_plate}`, exact: true });
const add = (page: Page) => page.getByRole('button', { name: 'Thêm phương tiện', exact: true });
interface Call { method: string; path: string; body: unknown; token?: string }

async function fixture(page: Page, initial = vehicles(), options: { list?: (route: Route) => Promise<void>; deletion?: 'fail'; holdDeletion?: (complete: () => Promise<void>) => Promise<void> } = {}) {
  let rows = initial.map((vehicle) => ({ ...vehicle }));
  const calls: Call[] = [];
  await page.addInitScript(([key, value]) => sessionStorage.setItem(key, value), [TOKEN_KEY, TOKEN]);
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: CORS, body: '' });
    const method = request.method();
    const path = new URL(request.url()).pathname;
    const body = request.postData() ? request.postDataJSON() : null;
    calls.push({ method, path, body, token: request.headers()['authorization'] });
    const json = (status: number, value: unknown) => route.fulfill({ status, contentType: 'application/json', headers: CORS, body: JSON.stringify(value) });
    if (path === '/api/auth/me' && method === 'GET') return json(200, USER);
    if (path === '/api/vehicles' && method === 'GET') return options.list ? options.list(route) : json(200, { vehicles: rows });
    if (path === '/api/vehicles' && method === 'POST') {
      const row = { ...body, id: uuid(99), is_active: false, brand_model: body.brand_model ?? null } as Vehicle;
      rows.push(row);
      return json(201, row);
    }
    const match = path.match(/^\/api\/vehicles\/([^/]+)(\/activate)?$/);
    if (match) {
      const row = rows.find((vehicle) => vehicle.id === match[1]);
      if (!row) return json(404, { error_code: 'VEHICLE_NOT_FOUND', message: 'Fixture vehicle missing' });
      if (method === 'POST' && match[2]) {
        rows = rows.map((vehicle) => ({ ...vehicle, is_active: vehicle.id === row.id }));
        return json(200, { id: row.id, is_active: true });
      }
      if (method === 'PATCH' && !match[2]) {
        Object.assign(row, body);
        return json(200, row);
      }
      if (method === 'DELETE' && !match[2]) {
        if (options.deletion === 'fail') return json(403, { error_code: 'NOT_VEHICLE_OWNER', message: ERROR });
        const complete = async () => {
          rows = rows.filter((vehicle) => vehicle.id !== row.id);
          await route.fulfill({ status: 204, headers: CORS, body: '' });
        };
        return options.holdDeletion ? options.holdDeletion(complete) : complete();
      }
    }
    return json(500, { error_code: 'UNEXPECTED_FIXTURE_REQUEST', message: 'Unexpected fixture request' });
  });
  return calls;
}

async function textContained(page: Page) {
  const failures = await page.getByRole('main').evaluate((main) => {
    const bounds = main.getBoundingClientRect();
    return [...main.querySelectorAll('h1, p, span, button')].flatMap((el) => {
      if (!el.textContent?.trim() || !el.getClientRects().length || !el.clientWidth) return [];
      const box = el.getBoundingClientRect();
      return el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1 || box.left < bounds.left - 1 || box.right > bounds.right + 1
        ? [{ text: el.textContent, width: el.clientWidth, scrollWidth: el.scrollWidth, left: box.left, right: box.right, mainLeft: bounds.left, mainRight: bounds.right }]
        : [];
    });
  });
  expect(failures).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

async function reachable(target: Locator) {
  await target.scrollIntoViewIfNeeded();
  await expect(target).toBeInViewport({ ratio: 0.99 });
  const box = await target.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
}
function authenticated(calls: Call[]) {
  expect(calls.length).toBeGreaterThan(0);
  expect(calls.every((call) => call.token === `Bearer ${TOKEN}`)).toBe(true);
}

test.describe('responsive vehicle list — fixture UI', () => {
  test('legal long names reflow at 320px doubled CSS text, including inline delete', async ({ page }) => {
    const rows = vehicles(1);
    expect(rows[0].license_plate).toHaveLength(20);
    expect(rows[0].brand_model).toHaveLength(100);
    await page.setViewportSize({ width: 320, height: 568 });
    const calls = await fixture(page, rows);
    await page.goto('/vehicles');
    await expect(page.getByText(BRAND, { exact: true })).toBeVisible();
    await page.addStyleTag({ content: 'html { font-size: 32px !important; }' });
    await textContained(page);
    await reachable(add(page));
    await reachable(edit(page, rows[0]));
    await reachable(remove(page, rows[0]));
    await remove(page, rows[0]).click();
    await expect(cancel(page, rows[0])).toBeFocused();
    await textContained(page);
    await reachable(confirm(page, rows[0]));
    await reachable(cancel(page, rows[0]));
    await cancel(page, rows[0]).click();
    await expect(remove(page, rows[0])).toBeFocused();
    expect(calls.every((call) => call.method === 'GET' && call.body === null)).toBe(true);
    authenticated(calls);
  });

  for (const viewport of [
    { width: 320, height: 568 }, { width: 844, height: 390 },
    { width: 768, height: 1024 }, { width: 1024, height: 768 }, { width: 1280, height: 720 },
  ]) test(`WEB-T04 ${viewport.width}×${viewport.height}: names, active badge and named actions fit`, async ({ page }) => {
    const rows = vehicles();
    await page.setViewportSize(viewport);
    const calls = await fixture(page, rows);
    await page.goto('/vehicles');
    await expect(page.getByRole('article')).toHaveCount(rows.length);
    await textContained(page);
    await reachable(add(page));
    for (const vehicle of rows) {
      const row = article(page, vehicle);
      await expect(row.getByText(vehicle.license_plate, { exact: true })).toHaveCount(1);
      await expect(row.getByText(vehicle.brand_model ?? (vehicle.type === 'car' ? 'Ô tô' : 'Xe máy'), { exact: true })).toHaveCount(1);
      await expect(row.getByText('Đang hoạt động', { exact: true })).toHaveCount(vehicle.is_active ? 1 : 0);
      await reachable(edit(page, vehicle));
      await reachable(remove(page, vehicle));
      if (!vehicle.is_active) await reachable(activate(page, vehicle));
    }
    expect(calls.every((call) => call.method === 'GET' && call.body === null && ['/api/auth/me', '/api/vehicles'].includes(call.path))).toBe(true);
    authenticated(calls);
  });

  test('many vehicles and resize retain readable rows and inline confirmation state', async ({ page }) => {
    const rows = vehicles(12);
    await page.setViewportSize({ width: 320, height: 568 });
    await fixture(page, rows);
    await page.goto('/vehicles');
    await expect(page.getByRole('article')).toHaveCount(12);
    await textContained(page);
    await remove(page, rows[11]).click();
    for (const width of [844, 1023, 1024, 1025, 320]) {
      await page.setViewportSize({ width, height: 390 });
      await expect(page.getByRole('article')).toHaveCount(12);
      await expect(cancel(page, rows[11])).toBeFocused();
      await textContained(page);
      await reachable(confirm(page, rows[11]));
      await reachable(cancel(page, rows[11]));
    }
  });

  test('loading and empty state keep the add action readable and usable', async ({ page }) => {
    const held: Route[] = [];
    await page.setViewportSize({ width: 320, height: 568 });
    await fixture(page, [], { list: async (route) => { held.push(route); } });
    await page.goto('/vehicles');
    await expect(page.getByText('Đang tải...', { exact: true })).toBeVisible();
    await reachable(add(page));
    await textContained(page);
    await expect.poll(() => held.length).toBeGreaterThan(0);
    await Promise.all(held.map((route) => route.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: '{"vehicles":[]}' })));
    await expect(page.getByText('Chưa có phương tiện nào. Thêm phương tiện đầu tiên của bạn.', { exact: true })).toBeVisible();
    await textContained(page);
    await reachable(add(page));
    await add(page).click();
    await expect(page.getByLabel('Biển số', { exact: true })).toBeVisible();
  });

  test('list API error retains the token and wraps without a fake retry feature', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await fixture(page, [], { list: (route) => route.fulfill({ status: 500, contentType: 'application/json', headers: CORS, body: JSON.stringify({ error_code: 'INTERNAL_ERROR', message: ERROR }) }) });
    await page.goto('/vehicles');
    await expect(page.getByText(ERROR, { exact: true })).toBeVisible();
    await page.addStyleTag({ content: 'html { font-size: 32px !important; }' });
    await textContained(page);
    await reachable(add(page));
    expect(await page.evaluate((key) => sessionStorage.getItem(key), TOKEN_KEY)).toBe(TOKEN);
  });

  for (const active of [true, false]) test(`keyboard ${active ? 'active' : 'inactive'} vehicle delete/cancel retains focus and does not delete`, async ({ page }) => {
    const rows = vehicles(1).map((vehicle) => ({ ...vehicle, is_active: active }));
    await page.setViewportSize({ width: 320, height: 568 });
    const calls = await fixture(page, rows);
    await page.goto('/vehicles');
    await remove(page, rows[0]).focus();
    await page.keyboard.press('Space');
    await expect(cancel(page, rows[0])).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(confirm(page, rows[0])).toBeFocused();
    await reachable(confirm(page, rows[0]));
    expect(await confirm(page, rows[0]).evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe('none');
    await page.keyboard.press('Tab');
    await expect(cancel(page, rows[0])).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(remove(page, rows[0])).toBeFocused();
    await expect(article(page, rows[0])).toHaveCount(1);
    expect(calls.some((call) => call.method === 'DELETE')).toBe(false);
  });

  for (const failure of [false, true]) test(`inline delete ${failure ? 'API error' : 'success'} preserves contract and focus`, async ({ page }) => {
    const rows = vehicles(1);
    await page.setViewportSize({ width: 320, height: 568 });
    const calls = await fixture(page, rows, { deletion: failure ? 'fail' : undefined });
    await page.goto('/vehicles');
    await remove(page, rows[0]).click();
    await confirm(page, rows[0]).press('Enter');
    await expect.poll(() => calls.filter((call) => call.method === 'DELETE').length).toBe(1);
    expect(calls.find((call) => call.method === 'DELETE')).toEqual({ method: 'DELETE', path: `/api/vehicles/${rows[0].id}`, body: null, token: `Bearer ${TOKEN}` });
    if (failure) {
      await expect(page.getByText(ERROR, { exact: true })).toBeVisible();
      await expect(article(page, rows[0])).toHaveCount(1);
      await expect(confirm(page, rows[0])).toBeFocused();
      await page.addStyleTag({ content: 'html { font-size: 32px !important; }' });
      await textContained(page);
      await reachable(cancel(page, rows[0]));
    } else {
      await expect(article(page, rows[0])).toHaveCount(0);
      await expect(add(page)).toBeFocused();
      await expect(page.getByText('Chưa có phương tiện nào. Thêm phương tiện đầu tiên của bạn.', { exact: true })).toBeVisible();
    }
    authenticated(calls);
  });

  for (const focusTarget of ['confirm', 'add', 'other-row'] as const) test(`delayed successful delete restores only its own lost focus: ${focusTarget}`, async ({ page }) => {
    const rows = vehicles(2);
    let complete: (() => Promise<void>) | undefined;
    await page.setViewportSize({ width: 320, height: 568 });
    const calls = await fixture(page, rows, { holdDeletion: async (finish) => { complete = finish; } });
    await page.goto('/vehicles');
    await remove(page, rows[0]).click();
    await confirm(page, rows[0]).press('Enter');
    await expect.poll(() => Boolean(complete)).toBe(true);
    const expectedFocus = focusTarget === 'other-row' ? edit(page, rows[1]) : add(page);
    if (focusTarget !== 'confirm') await expectedFocus.focus();
    await complete!();
    await expect(article(page, rows[0])).toHaveCount(0);
    await expect(article(page, rows[1])).toHaveCount(1);
    await expect(expectedFocus).toBeFocused();
    expect(calls.filter((call) => call.method === 'DELETE')).toHaveLength(1);
    authenticated(calls);
  });

  test('delayed delete after route unmount does not steal current navigation focus', async ({ page }) => {
    const rows = vehicles(1);
    let complete: (() => Promise<void>) | undefined;
    await page.setViewportSize({ width: 1280, height: 720 });
    await fixture(page, rows, { holdDeletion: async (finish) => { complete = finish; } });
    await page.goto('/vehicles');
    await remove(page, rows[0]).click();
    await confirm(page, rows[0]).press('Enter');
    await expect.poll(() => Boolean(complete)).toBe(true);
    const dashboard = page.getByRole('link', { name: 'Dashboard', exact: true });
    await dashboard.click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(dashboard).toBeFocused();
    await complete!();
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
    await expect(dashboard).toBeFocused();
  });

  test('desktop CRUD regression keeps exact create, update, activate and delete requests', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const calls = await fixture(page, vehicles(1));
    await page.goto('/vehicles');
    await add(page).click();
    await page.getByLabel('Loại xe', { exact: true }).selectOption('car');
    await page.getByLabel('Biển số', { exact: true }).fill('DEMO-CRUD-01');
    await page.getByLabel('Hãng/Dòng xe (tuỳ chọn)', { exact: true }).fill('Fixture Car');
    await page.getByRole('button', { name: 'Lưu', exact: true }).click();
    const created: Vehicle = { id: uuid(99), type: 'car', license_plate: 'DEMO-CRUD-01', brand_model: 'Fixture Car', is_active: false };
    await expect(article(page, created)).toHaveCount(1);
    await edit(page, created).click();
    await page.getByLabel('Hãng/Dòng xe (tuỳ chọn)', { exact: true }).fill('Fixture Car Updated');
    await page.getByRole('button', { name: 'Lưu', exact: true }).click();
    await expect(article(page, created).getByText('Fixture Car Updated', { exact: true })).toBeVisible();
    await activate(page, created).click();
    await expect(article(page, created).getByText('Đang hoạt động', { exact: true })).toBeVisible();
    await remove(page, created).click();
    await confirm(page, created).click();
    await expect(article(page, created)).toHaveCount(0);
    expect(calls.filter((call) => call.method !== 'GET')).toEqual([
      { method: 'POST', path: '/api/vehicles', body: { type: 'car', license_plate: 'DEMO-CRUD-01', brand_model: 'Fixture Car' }, token: `Bearer ${TOKEN}` },
      { method: 'PATCH', path: `/api/vehicles/${created.id}`, body: { type: 'car', license_plate: 'DEMO-CRUD-01', brand_model: 'Fixture Car Updated' }, token: `Bearer ${TOKEN}` },
      { method: 'POST', path: `/api/vehicles/${created.id}/activate`, body: null, token: `Bearer ${TOKEN}` },
      { method: 'DELETE', path: `/api/vehicles/${created.id}`, body: null, token: `Bearer ${TOKEN}` },
    ]);
    authenticated(calls);
  });

  test('touch/DPR2 fixture uses named delete and cancel with real taps', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2, baseURL });
    try {
      const page = await context.newPage();
      const rows = vehicles(1);
      const calls = await fixture(page, rows);
      await page.goto('/vehicles');
      expect(await page.evaluate(() => ({ touch: navigator.maxTouchPoints, dpr: devicePixelRatio }))).toEqual({ touch: 1, dpr: 2 });
      await reachable(remove(page, rows[0]));
      await remove(page, rows[0]).tap();
      // Existing inline UI reuses the former delete Button as cancel. Do not
      // introduce an autofocus default on the destructive confirmation.
      await expect(cancel(page, rows[0])).toBeFocused();
      await reachable(cancel(page, rows[0]));
      await cancel(page, rows[0]).tap();
      await expect(remove(page, rows[0])).toBeFocused();
      await expect(article(page, rows[0])).toHaveCount(1);
      expect(calls.some((call) => call.method === 'DELETE')).toBe(false);
    } finally {
      await context.close();
    }
  });
});
